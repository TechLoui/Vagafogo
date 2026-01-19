import { Client, LocalAuth } from "whatsapp-web.js";
import qrcode from "qrcode";
import { collection, doc, getDoc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { db } from "./firebase";

type WhatsappStatus =
  | "idle"
  | "initializing"
  | "qr"
  | "ready"
  | "auth_failure"
  | "disconnected";

type WhatsappStatusPayload = {
  status: WhatsappStatus;
  qr?: string | null;
  lastError?: string | null;
  lastQrAt?: string | null;
  info?: {
    wid?: string;
    pushname?: string;
  };
};

type WhatsappConfig = {
  ativo?: boolean;
  mensagemConfirmacao?: string;
};

type ResultadoEnvio = {
  enviado: boolean;
  motivo?: string;
  mensagem?: string;
  telefone?: string;
};

type ResultadoProcessamento = {
  enviados: number;
  falhas: number;
  motivo?: string;
};

const TEMPLATE_PADRAO =
  "Ola {nome}! Sua reserva foi confirmada para {datareserva} {horario}. Atividade: {atividade}. Participantes: {participantes}.";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const formatCurrency = (valor: number) =>
  currencyFormatter.format(Number.isFinite(valor) ? valor : 0);

const parseNumber = (value: string | undefined, fallback: number) => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const INIT_MAX_RETRIES = parseNumber(process.env.WHATSAPP_INIT_RETRIES, 3);
const INIT_RETRY_DELAY_MS = parseNumber(process.env.WHATSAPP_INIT_RETRY_DELAY_MS, 5000);

let client: Client | null = null;
let status: WhatsappStatus = "idle";
let qrDataUrl: string | null = null;
let lastError: string | null = null;
let lastQrAt: number | null = null;
let lastInfo: WhatsappStatusPayload["info"] | null = null;
let initializing = false;
let processingPending = false;
let initRetries = 0;
let retryTimer: NodeJS.Timeout | null = null;

const clearRetryTimer = () => {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
};

const scheduleRetry = (reason?: string | null) => {
  if (INIT_MAX_RETRIES <= 0) return;
  if (initRetries >= INIT_MAX_RETRIES) return;
  initRetries += 1;
  clearRetryTimer();
  retryTimer = setTimeout(() => {
    retryTimer = null;
    iniciarWhatsApp();
  }, INIT_RETRY_DELAY_MS);
  if (reason) {
    lastError = reason;
  }
};

const handleInitFailure = (error?: unknown) => {
  status = "disconnected";
  initializing = false;
  lastError = (error as { message?: string })?.message || "init_error";
  qrDataUrl = null;
  lastInfo = null;
  if (client) {
    client.destroy().catch(() => undefined);
  }
  client = null;
  scheduleRetry(lastError);
};

const formatDateKey = (date: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(date);

const obterDataReserva = (valor: unknown): string => {
  if (!valor) return "";
  if (typeof valor === "string") {
    const trimmed = valor.trim();
    const isoMatch = /^(\d{4}-\d{2}-\d{2})/.exec(trimmed);
    if (isoMatch) return isoMatch[1];
    const brMatch = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(trimmed);
    if (brMatch) return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return formatDateKey(parsed);
    }
    return "";
  }
  if (valor instanceof Date) {
    return formatDateKey(valor);
  }
  const maybeDate = (valor as { toDate?: () => Date }).toDate?.();
  if (maybeDate instanceof Date) {
    return formatDateKey(maybeDate);
  }
  return "";
};

const obterNumeroWhatsapp = async (telefone: string) => {
  if (!client) return null;
  try {
    const id = await client.getNumberId(telefone);
    return id?._serialized ?? null;
  } catch (error) {
    console.warn("[whatsapp] Erro ao validar numero:", error);
    return null;
  }
};

export function iniciarWhatsApp(): void {
  if (client || initializing) {
    return;
  }

  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;

  clearRetryTimer();
  initializing = true;
  status = "initializing";
  lastError = null;

  client = new Client({
    authStrategy: new LocalAuth({ clientId: "vagafogo" }),
    puppeteer: {
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      ...(executablePath ? { executablePath } : {}),
    },
  });

  client.on("qr", async (qr) => {
    status = "qr";
    lastQrAt = Date.now();
    try {
      qrDataUrl = await qrcode.toDataURL(qr);
    } catch (error: any) {
      lastError = error?.message || "qr_error";
    }
  });

  client.on("ready", () => {
    status = "ready";
    initializing = false;
    initRetries = 0;
    qrDataUrl = null;
    lastError = null;
    lastInfo = {
      wid: client?.info?.wid?._serialized,
      pushname: client?.info?.pushname,
    };
    void processarPendentesWhatsapp();
  });

  client.on("authenticated", () => {
    status = "initializing";
    initializing = false;
    lastError = null;
  });

  client.on("auth_failure", (msg) => {
    status = "auth_failure";
    initializing = false;
    lastError = msg?.toString() || "auth_failure";
  });

  client.on("disconnected", (reason) => {
    status = "disconnected";
    initializing = false;
    const reasonText = reason?.toString() || "disconnected";
    lastError = reasonText;
    qrDataUrl = null;
    lastInfo = null;
    client = null;
    if (!reasonText.toLowerCase().includes("logout")) {
      scheduleRetry(reasonText);
    }
  });

  client.initialize().catch((error: any) => {
    console.error("[whatsapp] Falha ao inicializar:", error);
    handleInitFailure(error);
  });
}

export async function desconectarWhatsApp(): Promise<void> {
  clearRetryTimer();
  initRetries = 0;
  if (!client) {
    status = "disconnected";
    return;
  }

  try {
    await client.logout();
  } finally {
    status = "disconnected";
    qrDataUrl = null;
    lastInfo = null;
    client = null;
  }
}

export function obterStatusWhatsApp(): WhatsappStatusPayload {
  return {
    status,
    qr: qrDataUrl,
    lastError,
    lastQrAt: lastQrAt ? new Date(lastQrAt).toISOString() : null,
    info: lastInfo ?? undefined,
  };
}

const formatarDataReserva = (valor: unknown) => {
  if (!valor) return "";
  if (typeof valor === "string") {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
    if (match) {
      return `${match[3]}/${match[2]}/${match[1]}`;
    }
    return valor;
  }
  if (valor instanceof Date) {
    const dia = String(valor.getDate()).padStart(2, "0");
    const mes = String(valor.getMonth() + 1).padStart(2, "0");
    const ano = valor.getFullYear();
    return `${dia}/${mes}/${ano}`;
  }
  const maybeDate = (valor as { toDate?: () => Date }).toDate?.();
  if (maybeDate instanceof Date) {
    return formatarDataReserva(maybeDate);
  }
  return "";
};

const montarMensagem = (template: string, reserva: Record<string, any>) => {
  const dados: Record<string, string> = {
    nome: reserva?.nome ?? "",
    datareserva: formatarDataReserva(reserva?.data),
    data: formatarDataReserva(reserva?.data),
    horario: reserva?.horario ?? "",
    atividade: reserva?.atividade ?? "",
    participantes: String(reserva?.participantes ?? ""),
    telefone: reserva?.telefone ?? "",
    valor: formatCurrency(Number(reserva?.valor ?? 0)),
    status: reserva?.status ?? "",
  };

  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, chave) => {
    const valor = dados[chave];
    return valor !== undefined ? valor : match;
  });
};

const normalizarTelefone = (telefone?: string) => {
  if (!telefone) return "";
  const digits = telefone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    return digits;
  }
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }
  return digits;
};

const obterConfig = async (): Promise<WhatsappConfig> => {
  const ref = doc(db, "configuracoes", "whatsapp");
  const snap = await getDoc(ref);
  if (!snap.exists()) return {};
  return snap.data() as WhatsappConfig;
};

export async function enviarConfirmacaoWhatsapp(
  reservaId: string,
  reserva: Record<string, any>,
  configOverride?: WhatsappConfig
): Promise<ResultadoEnvio> {
  iniciarWhatsApp();

  const config = configOverride ?? (await obterConfig());
  if (!config.ativo) {
    return { enviado: false, motivo: "config_desativado" };
  }

  const telefone = normalizarTelefone(reserva?.telefone);
  if (!telefone) {
    return { enviado: false, motivo: "telefone_invalido" };
  }

  const template = (config.mensagemConfirmacao || TEMPLATE_PADRAO).trim();
  if (!template) {
    return { enviado: false, motivo: "mensagem_vazia" };
  }

  if (!client || status !== "ready") {
    return { enviado: false, motivo: "whatsapp_nao_conectado" };
  }

  const mensagem = montarMensagem(template, {
    ...reserva,
    id: reservaId,
  });

  const whatsappId = await obterNumeroWhatsapp(telefone);
  if (!whatsappId) {
    return { enviado: false, motivo: "telefone_sem_whatsapp" };
  }

  try {
    await client.sendMessage(whatsappId, mensagem, { sendSeen: false });
  } catch (error: any) {
    return { enviado: false, motivo: error?.message || "erro_envio" };
  }
  return {
    enviado: true,
    mensagem,
    telefone,
  };
}

export async function processarPendentesWhatsapp(): Promise<ResultadoProcessamento> {
  if (processingPending) {
    return { enviados: 0, falhas: 0, motivo: "em_andamento" };
  }
  processingPending = true;

  try {
    iniciarWhatsApp();

    const config = await obterConfig();
    if (!config.ativo) {
      return { enviados: 0, falhas: 0, motivo: "config_desativado" };
    }

    if (!client || status !== "ready") {
      return { enviados: 0, falhas: 0, motivo: "whatsapp_nao_conectado" };
    }

    const statusElegiveis = ["pago", "Pago", "PAGO"];
    const snapshot = await getDocs(
      query(collection(db, "reservas"), where("status", "in", statusElegiveis))
    );

    let enviados = 0;
    let falhas = 0;
    const hoje = formatDateKey(new Date());

    for (const docSnap of snapshot.docs) {
      const reserva = docSnap.data() as Record<string, any>;
      const dataReserva = obterDataReserva(reserva.data);
      if (!dataReserva || dataReserva < hoje) {
        continue;
      }
      if (reserva.whatsappEnviado === true) {
        continue;
      }

      try {
        const resultado = await enviarConfirmacaoWhatsapp(docSnap.id, reserva, config);
        if (resultado.enviado) {
          await updateDoc(doc(db, "reservas", docSnap.id), {
            whatsappEnviado: true,
            dataWhatsappEnviado: new Date(),
            whatsappMensagem: resultado.mensagem ?? "",
            whatsappTelefone: resultado.telefone ?? "",
          });
          enviados += 1;
        } else {
          falhas += 1;
          console.warn(
            `[whatsapp] pendente nao enviado ${docSnap.id}: ${resultado.motivo ?? "erro"}`
          );
        }
      } catch (error) {
        falhas += 1;
        console.error(`[whatsapp] erro ao enviar ${docSnap.id}:`, error);
      }
    }

    return { enviados, falhas };
  } catch (error) {
    console.error("[whatsapp] erro ao processar pendentes:", error);
    return { enviados: 0, falhas: 0, motivo: "erro" };
  } finally {
    processingPending = false;
  }
}
