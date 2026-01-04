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

let client: Client | null = null;
let status: WhatsappStatus = "idle";
let qrDataUrl: string | null = null;
let lastError: string | null = null;
let lastQrAt: number | null = null;
let lastInfo: WhatsappStatusPayload["info"] | null = null;
let initializing = false;
let processingPending = false;

export function iniciarWhatsApp(): void {
  if (client || initializing) {
    return;
  }

  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;

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
    lastError = reason?.toString() || "disconnected";
    qrDataUrl = null;
    lastInfo = null;
    client = null;
  });

  client.initialize().catch((error: any) => {
    status = "disconnected";
    initializing = false;
    lastError = error?.message || "init_error";
    qrDataUrl = null;
    lastInfo = null;
    client = null;
  });
}

export async function desconectarWhatsApp(): Promise<void> {
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

  await client.sendMessage(`${telefone}@c.us`, mensagem);
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

    const statusElegiveis = ["pago", "confirmado", "Pago", "Confirmado"];
    const snapshot = await getDocs(
      query(collection(db, "reservas"), where("status", "in", statusElegiveis))
    );

    let enviados = 0;
    let falhas = 0;

    for (const docSnap of snapshot.docs) {
      const reserva = docSnap.data() as Record<string, any>;
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
