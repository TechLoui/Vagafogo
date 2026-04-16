import cron from "node-cron";
import {
  collection,
  deleteDoc,
  deleteField,
  getDocs,
  limit,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import { obterFirestoreAdmin } from "./firebaseAdmin";
import { normalizarStatusReserva, reservaEstaConfirmada } from "./reservaStatus";

type ReservaRetentionSnapshot = {
  status?: unknown;
  confirmada?: unknown;
  criadoEm?: unknown;
  expiraEmLimpeza?: unknown;
};

const STATUS_PRE_RESERVA = new Set([
  "pre_reserva",
  "pre-reserva",
  "pre reserva",
]);

const STATUS_LIMPEZA_AUTOMATICA = new Set([
  "aguardando",
  "aguardando_pagamento",
  "aguardando pagamento",
  "pending",
  "processing",
  "processando",
  "em_analise",
  "em analise",
  "em_processamento",
  "em processamento",
  "expired",
  "expirado",
  "cancelado",
  "cancelled",
  "canceled",
  "unpaid",
  "nao_pago",
  "nao pago",
  "failed",
  "recusado",
  "refused",
]);

const STATUS_QUERY_LEGADO = [
  "aguardando",
  "aguardando_pagamento",
  "pending",
  "processing",
  "processando",
  "em_analise",
  "em_processamento",
  "expired",
  "expirado",
  "cancelado",
  "cancelled",
  "canceled",
  "unpaid",
  "nao_pago",
  "failed",
  "recusado",
  "refused",
];

const parsePositiveInteger = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
};

const RETENTION_HOURS = parsePositiveInteger(
  process.env.RESERVA_CLEANUP_WINDOW_HOURS,
  48
);
const CLEANUP_BATCH_LIMIT = Math.min(
  parsePositiveInteger(process.env.RESERVA_CLEANUP_BATCH_LIMIT, 200),
  450
);
const CLEANUP_CRON_EXPRESSION =
  process.env.RESERVA_CLEANUP_CRON?.trim() || "17 * * * *";
const CLEANUP_ENABLED =
  (process.env.RESERVA_CLEANUP_ENABLED ?? "true").trim().toLowerCase() !==
  "false";
const LEGACY_CLEANUP_ENABLED =
  (process.env.RESERVA_CLEANUP_LEGACY_ENABLED ?? "true")
    .trim()
    .toLowerCase() !== "false";
const LEGACY_CLEANUP_BATCH_LIMIT = Math.min(
  parsePositiveInteger(process.env.RESERVA_CLEANUP_LEGACY_BATCH_LIMIT, 200),
  400
);

const RESERVAS_COLLECTION = collection(db, "reservas");

let cleanupInitialized = false;
let cleanupRunning = false;
let legacyCleanupRunning = false;

const chunkArray = <T>(items: T[], size: number) => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const normalizarTimestamp = (value: unknown): Timestamp | null => {
  if (!value) return null;
  if (value instanceof Timestamp) {
    return value;
  }
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? Timestamp.fromDate(value) : null;
  }
  if (typeof value === "object" && value !== null) {
    const possibleTimestamp = value as {
      seconds?: unknown;
      nanoseconds?: unknown;
      toDate?: () => Date;
    };
    if (
      typeof possibleTimestamp.seconds === "number" &&
      typeof possibleTimestamp.nanoseconds === "number"
    ) {
      return new Timestamp(
        possibleTimestamp.seconds,
        possibleTimestamp.nanoseconds
      );
    }
    if (typeof possibleTimestamp.toDate === "function") {
      const convertedDate = possibleTimestamp.toDate();
      return Number.isFinite(convertedDate.getTime())
        ? Timestamp.fromDate(convertedDate)
        : null;
    }
  }
  if (typeof value === "string" || typeof value === "number") {
    const parsedDate = new Date(value);
    return Number.isFinite(parsedDate.getTime())
      ? Timestamp.fromDate(parsedDate)
      : null;
  }
  return null;
};

const calcularTimestampExpiracao = (base: Timestamp) =>
  Timestamp.fromMillis(base.toMillis() + RETENTION_HOURS * 60 * 60 * 1000);

const batchDeleteDocs = async (refs: Array<{ delete: () => Promise<unknown> }>) => {
  if (refs.length === 0) {
    return;
  }
  await Promise.all(refs.map((ref) => ref.delete()));
};

export const reservaDeveExpirarAutomaticamente = (
  reserva?: ReservaRetentionSnapshot
) => {
  if (reservaEstaConfirmada(reserva)) {
    return false;
  }

  const status = normalizarStatusReserva(reserva?.status);
  if (!status || STATUS_PRE_RESERVA.has(status)) {
    return false;
  }

  return STATUS_LIMPEZA_AUTOMATICA.has(status);
};

export const obterCamposRetencaoReservaNaCriacao = (
  reserva?: ReservaRetentionSnapshot
) => {
  const criadoEm = normalizarTimestamp(reserva?.criadoEm) ?? Timestamp.now();

  if (!reservaDeveExpirarAutomaticamente(reserva)) {
    return { criadoEm };
  }

  return {
    criadoEm,
    expiraEmLimpeza: calcularTimestampExpiracao(criadoEm),
  };
};

export const obterCamposRetencaoReservaNaAtualizacao = (
  reserva?: ReservaRetentionSnapshot
) => {
  if (!reservaDeveExpirarAutomaticamente(reserva)) {
    return {
      expiraEmLimpeza: deleteField(),
    };
  }

  const criadoEmExistente = normalizarTimestamp(reserva?.criadoEm);
  const criadoEm = criadoEmExistente ?? Timestamp.now();

  return {
    ...(criadoEmExistente ? {} : { criadoEm }),
    expiraEmLimpeza: calcularTimestampExpiracao(criadoEm),
  };
};

const removerReservas = async (
  reservasParaRemover: Array<{ id: string; ref: any }>
) => {
  if (reservasParaRemover.length === 0) {
    return [] as string[];
  }

  await Promise.all(reservasParaRemover.map((reserva) => deleteDoc(reserva.ref)));
  return reservasParaRemover.map((reserva) => reserva.id);
};

export async function limparReservasNaoPagasExpiradas(origem = "cron") {
  if (cleanupRunning) {
    return {
      origem,
      removidas: 0,
      ignorado: true,
    };
  }

  cleanupRunning = true;
  const startedAt = Date.now();

  try {
    const agora = Timestamp.now();
    const removidas = new Set<string>();

    const snapshotExpiracao = await getDocs(
      query(
        RESERVAS_COLLECTION,
        where("expiraEmLimpeza", "<=", agora),
        limit(CLEANUP_BATCH_LIMIT)
      )
    );

    const docsExpirados = snapshotExpiracao.docs.map((docSnap) => ({
      id: docSnap.id,
      ref: docSnap.ref,
    }));

    for (const id of await removerReservas(docsExpirados)) {
      removidas.add(id);
    }

    const vagasRestantesNoLote = CLEANUP_BATCH_LIMIT - removidas.size;
    if (vagasRestantesNoLote > 0) {
      const cutoffMs = agora.toMillis() - RETENTION_HOURS * 60 * 60 * 1000;

      for (const chunk of chunkArray(STATUS_QUERY_LEGADO, 10)) {
        if (removidas.size >= CLEANUP_BATCH_LIMIT) {
          break;
        }

        const snapshotLegado = await getDocs(
          query(
            RESERVAS_COLLECTION,
            where("status", "in", chunk),
            limit(CLEANUP_BATCH_LIMIT - removidas.size)
          )
        );

        const docsLegados = snapshotLegado.docs
          .filter((docSnap) => {
            if (removidas.has(docSnap.id)) {
              return false;
            }

            const data = docSnap.data() as ReservaRetentionSnapshot;
            if (data.expiraEmLimpeza) {
              return false;
            }

            if (!reservaDeveExpirarAutomaticamente(data)) {
              return false;
            }

            const criadoEm = normalizarTimestamp(data.criadoEm);
            if (!criadoEm) {
              return false;
            }

            return criadoEm.toMillis() <= cutoffMs;
          })
          .map((docSnap) => ({
            id: docSnap.id,
            ref: docSnap.ref,
          }));

        for (const id of await removerReservas(docsLegados)) {
          removidas.add(id);
        }
      }
    }

    if (removidas.size > 0) {
      console.log(
        `[cleanup] ${removidas.size} reserva(s) nao paga(s) removida(s) automaticamente em ${Date.now() - startedAt}ms. Origem: ${origem}.`
      );
    }

    return {
      origem,
      removidas: removidas.size,
      duracaoMs: Date.now() - startedAt,
      ignorado: false,
    };
  } catch (error) {
    console.error("[cleanup] Erro ao remover reservas nao pagas expiradas:", error);
    throw error;
  } finally {
    cleanupRunning = false;
  }
}

export async function processarReservasLegadasNaoPagas(origem = "startup") {
  if (!LEGACY_CLEANUP_ENABLED) {
    return {
      origem,
      removidas: 0,
      atualizadas: 0,
      ignorado: true,
      motivo: "desabilitado",
    };
  }

  if (legacyCleanupRunning) {
    return {
      origem,
      removidas: 0,
      atualizadas: 0,
      ignorado: true,
      motivo: "execucao_em_andamento",
    };
  }

  const adminDb = obterFirestoreAdmin();
  if (!adminDb) {
    return {
      origem,
      removidas: 0,
      atualizadas: 0,
      ignorado: true,
      motivo: "firebase_admin_indisponivel",
    };
  }

  legacyCleanupRunning = true;
  const startedAt = Date.now();

  try {
    const cutoffMs = Date.now() - RETENTION_HOURS * 60 * 60 * 1000;
    let removidas = 0;
    let atualizadas = 0;

    for (const chunk of chunkArray(STATUS_QUERY_LEGADO, 10)) {
      if (removidas + atualizadas >= LEGACY_CLEANUP_BATCH_LIMIT) {
        break;
      }

      const snapshot = await adminDb
        .collection("reservas")
        .where("status", "in", chunk)
        .limit(LEGACY_CLEANUP_BATCH_LIMIT - (removidas + atualizadas))
        .get();

      const deletions: Array<{ delete: () => Promise<unknown> }> = [];
      const updates: Array<{ ref: any; data: Record<string, unknown> }> = [];

      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data() as ReservaRetentionSnapshot;

        if (!reservaDeveExpirarAutomaticamente(data)) {
          return;
        }

        if (normalizarTimestamp(data.criadoEm)) {
          return;
        }

        const criadoEm = Timestamp.fromMillis(docSnap.createTime.toMillis());
        const expiraEmLimpeza = calcularTimestampExpiracao(criadoEm);

        if (criadoEm.toMillis() <= cutoffMs) {
          deletions.push(docSnap.ref);
          return;
        }

        updates.push({
          ref: docSnap.ref,
          data: {
            criadoEm,
            expiraEmLimpeza,
          },
        });
      });

      await batchDeleteDocs(deletions);
      removidas += deletions.length;

      for (const item of updates) {
        await item.ref.update(item.data);
      }
      atualizadas += updates.length;
    }

    if (removidas > 0 || atualizadas > 0) {
      console.log(
        `[cleanup-legacy] ${removidas} reserva(s) legadas removida(s) e ${atualizadas} atualizada(s) em ${Date.now() - startedAt}ms. Origem: ${origem}.`
      );
    }

    return {
      origem,
      removidas,
      atualizadas,
      duracaoMs: Date.now() - startedAt,
      ignorado: false,
    };
  } catch (error) {
    console.error("[cleanup-legacy] Erro ao processar reservas legadas:", error);
    throw error;
  } finally {
    legacyCleanupRunning = false;
  }
}

export const iniciarLimpezaAutomaticaReservas = () => {
  if (!CLEANUP_ENABLED || cleanupInitialized) {
    return;
  }

  cleanupInitialized = true;

  try {
    cron.schedule(
      CLEANUP_CRON_EXPRESSION,
      () => {
        void limparReservasNaoPagasExpiradas("cron").catch((error) => {
          console.error("[cleanup] Falha na execucao agendada:", error);
        });
      },
      {
        timezone: process.env.TZ || "America/Sao_Paulo",
      }
    );

    console.log(
      `[cleanup] Limpeza automatica de reservas nao pagas habilitada (${RETENTION_HOURS}h, cron "${CLEANUP_CRON_EXPRESSION}").`
    );

    setTimeout(() => {
      void processarReservasLegadasNaoPagas("startup-legacy").catch((error) => {
        console.error("[cleanup-legacy] Falha na execucao inicial:", error);
      });
    }, 10_000);

    setTimeout(() => {
      void limparReservasNaoPagasExpiradas("startup").catch((error) => {
        console.error("[cleanup] Falha na execucao inicial:", error);
      });
    }, 15_000);
  } catch (error) {
    cleanupInitialized = false;
    console.error("[cleanup] Nao foi possivel agendar a limpeza automatica:", error);
  }
};
