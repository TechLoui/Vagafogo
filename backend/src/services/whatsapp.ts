import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { obterStorageBucketAdmin } from "./firebaseAdmin";
import { requestAgentService } from "./agentGateway";

type WhatsappStatus =
  | "idle"
  | "initializing"
  | "qr"
  | "ready"
  | "auth_failure"
  | "disconnected";

export type WhatsappStatusPayload = {
  status: WhatsappStatus;
  qr?: string | null;
  lastError?: string | null;
  lastQrAt?: string | null;
  authStrategy?: "remote" | "local";
  info?: {
    wid?: string;
    pushname?: string;
  };
};

export type WhatsappConfig = {
  mensagemBoasVindas?: string;
  confirmacaoAutomaticaAtiva?: boolean;
  mensagemConfirmacaoAutomatica?: string;
  lembreteDiaAtivo?: boolean;
  horarioLembreteDia?: string;
  mensagemLembreteDia?: string;
  intervaloLembreteDiaMinSegundos?: number;
  intervaloLembreteDiaMaxSegundos?: number;
};

export type ResultadoEnvio = {
  enviado: boolean;
  motivo?: string;
  mensagem?: string;
  telefone?: string;
  messageId?: string;
  midiaEnviada?: boolean;
};

export type WhatsappMediaPayload = {
  storagePath: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  filename: string;
  sizeBytes: number;
};

export type WhatsappAckEvent = {
  messageId: string;
  ack: number;
};

export type WhatsappInboundEvent = {
  telefone: string;
  mensagem: string;
  messageId: string;
  recebidoEm: Date;
};

const TEMPLATE_BOAS_VINDAS_PADRAO =
  "Olá {nome}! 🌿 Seja muito bem-vindo(a) à Fazenda Vagafogo. É um prazer receber você hoje! Tenha uma experiência incrível.";

const TEMPLATE_CONFIRMACAO_PADRAO =
  "Olá {nome}! ✅ Seu pagamento foi confirmado automaticamente e sua reserva na Fazenda Vagafogo está garantida. Não é necessário enviar comprovante.\n\n📅 Data: {data}\n⏰ Horário: {horario}\n🎫 Atividade: {atividade}\n👥 Participantes: {participantes}\n💰 Valor: {valor}\n\n🚗 Durante o trajeto, fique atento às placas indicando a estrada de acesso à Fazenda Vagafogo.\n📍 https://maps.google.com/?q=-15.824453,-48.995220\n\nNos vemos em breve! 🌿";

const BLOCO_LOCALIZACAO_CONFIRMACAO =
  "🚗 Durante o trajeto, fique atento às placas indicando a estrada de acesso à Fazenda Vagafogo.\n📍 https://maps.google.com/?q=-15.824453,-48.995220";

const incluirLocalizacaoConfirmacao = (mensagem: string) => {
  const texto = String(mensagem ?? "").trim();
  if (!texto || /maps\.google\.com\/\?q=-15\.824453,-48\.995220/i.test(texto)) return texto;
  return `${texto}\n\n${BLOCO_LOCALIZACAO_CONFIRMACAO}`;
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const normalizarTelefone = (telefone?: string) => {
  const digits = String(telefone ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
};

const formatarDataReserva = (valor: unknown): string => {
  if (!valor) return "";
  if (typeof valor === "string") {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : valor;
  }
  if (valor instanceof Date) {
    const dia = String(valor.getDate()).padStart(2, "0");
    const mes = String(valor.getMonth() + 1).padStart(2, "0");
    return `${dia}/${mes}/${valor.getFullYear()}`;
  }
  const maybeDate = (valor as { toDate?: () => Date } | null)?.toDate?.();
  return maybeDate instanceof Date ? formatarDataReserva(maybeDate) : "";
};

const montarMensagem = (template: string, reserva: Record<string, any>) => {
  const dados: Record<string, string> = {
    nome: String(reserva?.nome ?? reserva?.Nome ?? ""),
    datareserva: formatarDataReserva(reserva?.data ?? reserva?.Data),
    data: formatarDataReserva(reserva?.data ?? reserva?.Data),
    horario: String(reserva?.horario ?? reserva?.Horario ?? ""),
    atividade: String(reserva?.atividade ?? reserva?.Atividade ?? ""),
    participantes: String(reserva?.participantes ?? reserva?.Participantes ?? ""),
    telefone: String(reserva?.telefone ?? reserva?.Telefone ?? ""),
    valor: currencyFormatter.format(Number(reserva?.valor ?? reserva?.Valor ?? 0) || 0),
    status: String(reserva?.status ?? reserva?.Status ?? ""),
  };
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, chave) => dados[chave] ?? match);
};

const obterConfig = async (): Promise<WhatsappConfig> => {
  const snap = await getDoc(doc(db, "configuracoes", "whatsapp"));
  return snap.exists() ? snap.data() as WhatsappConfig : {};
};

const respostaComoObjeto = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

const resultadoGateway = (
  response: Awaited<ReturnType<typeof requestAgentService>>,
  telefone: string,
  mensagem: string,
  midiaEnviada = false,
): ResultadoEnvio => {
  const body = respostaComoObjeto(response.body);
  if (response.status >= 300 || body.ok !== true) {
    return {
      enviado: false,
      motivo: String(body.error ?? `AGENT_GATEWAY_HTTP_${response.status}`),
      telefone,
    };
  }
  return {
    enviado: true,
    telefone,
    mensagem,
    messageId: body.messageId ? String(body.messageId) : undefined,
    midiaEnviada,
  };
};

const enviarTransacional = async (
  telefone: string,
  mensagem: string,
  requestId: string,
  nomeContato?: unknown,
) => resultadoGateway(await requestAgentService("gateway", "/api/whatsapp/transactional-send", {
  method: "POST",
  body: {
    phone: telefone,
    text: mensagem,
    requestId: requestId.slice(0, 160),
    contactName: String(nomeContato ?? "").trim().slice(0, 120),
  },
  timeoutMs: 30_000,
}), telefone, mensagem);

export async function obterStatusWhatsApp(): Promise<WhatsappStatusPayload> {
  const response = await requestAgentService("gateway", "/api/whatsapp/status", { timeoutMs: 15_000 });
  const body = respostaComoObjeto(response.body);
  if (response.status >= 300) {
    return {
      status: "disconnected",
      qr: null,
      lastError: String(body.error ?? `AGENT_GATEWAY_HTTP_${response.status}`),
    };
  }
  const ready = body.ready === true;
  const connected = body.connected === true;
  return {
    status: ready ? "ready" : connected ? "initializing" : "disconnected",
    qr: null,
    lastError: body.lastError ? String(body.lastError) : null,
    authStrategy: "remote",
    info: {
      wid: String(body.connectedWid ?? body.connectedNumber ?? "") || undefined,
      pushname: "Jatobá — Fazenda Vagafogo",
    },
  };
}

// Compatibilidade com integrações antigas. A conexão agora pertence
// exclusivamente ao gateway Baileys do Agente; este serviço não abre navegador.
export function iniciarWhatsApp(): void {
  console.info("[whatsapp] Conexão centralizada no gateway do Agente; nenhum Chromium local será iniciado.");
}

export async function desconectarWhatsApp(): Promise<void> {
  const response = await requestAgentService("gateway", "/api/whatsapp/logout", {
    method: "POST",
    timeoutMs: 30_000,
  });
  if (response.status >= 300) {
    const body = respostaComoObjeto(response.body);
    throw new Error(String(body.error ?? `AGENT_GATEWAY_HTTP_${response.status}`));
  }
}

export async function encerrarWhatsAppSeMemoriaAlta(_rssMB: number): Promise<void> {
  // O backend principal não mantém mais navegador ou socket de WhatsApp.
}

export function logarConfigWhatsapp(): void {
  console.log("[whatsapp][config] Provedor centralizado: Agente/Baileys (sem Chromium no backend principal).", {
    gatewayConfigurado: Boolean((process.env.AGENT_GATEWAY_URL ?? "").trim()),
    campanhasHabilitadas: (process.env.WHATSAPP_CAMPAIGNS_ENABLED ?? "false").trim().toLowerCase() === "true",
  });
}

export async function enviarMensagemWhatsappGerenciada(
  telefoneInformado: string,
  mensagemInformada: string,
  midia?: WhatsappMediaPayload,
): Promise<ResultadoEnvio> {
  const telefone = normalizarTelefone(telefoneInformado);
  const mensagem = String(mensagemInformada ?? "").trim().slice(0, 4096);
  if (!telefone) return { enviado: false, motivo: "telefone_invalido" };
  if (!mensagem) return { enviado: false, motivo: "mensagem_vazia", telefone };

  let mediaBody: { dataUrl: string; filename: string } | undefined;
  if (midia) {
    if (!/^crm-campanhas\/[A-Za-z0-9_-]+\/[A-Za-z0-9._-]+$/.test(midia.storagePath)) {
      return { enviado: false, motivo: "midia_invalida", telefone };
    }
    const bucket = obterStorageBucketAdmin();
    if (!bucket) return { enviado: false, motivo: "storage_indisponivel", telefone };
    const [buffer] = await bucket.file(midia.storagePath).download();
    if (!buffer.length || buffer.length > 5 * 1024 * 1024) {
      return { enviado: false, motivo: "midia_tamanho_invalido", telefone };
    }
    mediaBody = {
      dataUrl: `data:${midia.mimeType};base64,${buffer.toString("base64")}`,
      filename: midia.filename.slice(0, 120) || "campanha.jpg",
    };
  }

  const response = await requestAgentService("gateway", "/api/whatsapp/campaign-send", {
    method: "POST",
    body: { phone: telefone, text: mensagem, ...(mediaBody ? { media: mediaBody } : {}) },
    timeoutMs: 45_000,
  });
  return resultadoGateway(response, telefone, mensagem, Boolean(mediaBody));
}

export async function prepararBoasVindasWhatsapp(
  reservaId: string,
  reserva: Record<string, any>,
  configOverride?: WhatsappConfig,
): Promise<ResultadoEnvio> {
  const config = configOverride ?? await obterConfig();
  const telefone = normalizarTelefone(reserva?.telefone ?? reserva?.Telefone);
  if (!telefone) return { enviado: false, motivo: "telefone_invalido" };
  const template = String(config.mensagemBoasVindas || TEMPLATE_BOAS_VINDAS_PADRAO).trim();
  if (!template) return { enviado: false, motivo: "mensagem_vazia", telefone };
  return { enviado: true, telefone, mensagem: montarMensagem(template, { ...reserva, id: reservaId }) };
}

export async function enviarBoasVindasWhatsapp(
  reservaId: string,
  reserva: Record<string, any>,
  configOverride?: WhatsappConfig,
): Promise<ResultadoEnvio> {
  const prepared = await prepararBoasVindasWhatsapp(reservaId, reserva, configOverride);
  if (!prepared.enviado || !prepared.telefone || !prepared.mensagem) return prepared;
  return enviarTransacional(
    prepared.telefone,
    prepared.mensagem,
    `boas-vindas:${reservaId}:${prepared.telefone}`,
    reserva?.nome ?? reserva?.Nome,
  );
}

export async function prepararConfirmacaoWhatsapp(
  reservaId: string,
  reserva: Record<string, any>,
  configOverride?: WhatsappConfig,
): Promise<ResultadoEnvio> {
  const config = configOverride ?? await obterConfig();
  if (config.confirmacaoAutomaticaAtiva === false) return { enviado: false, motivo: "desativado" };
  if (reserva?.whatsappConfirmacaoEnviado === true) return { enviado: false, motivo: "ja_enviado" };
  const telefone = normalizarTelefone(reserva?.telefone ?? reserva?.Telefone);
  if (!telefone) return { enviado: false, motivo: "telefone_invalido" };
  const template = String(config.mensagemConfirmacaoAutomatica || TEMPLATE_CONFIRMACAO_PADRAO).trim();
  if (!template) return { enviado: false, motivo: "mensagem_vazia", telefone };
  const mensagem = incluirLocalizacaoConfirmacao(
    montarMensagem(template, { ...reserva, id: reservaId }),
  );
  return { enviado: true, telefone, mensagem };
}

export async function enviarConfirmacaoWhatsapp(
  reservaId: string,
  reserva: Record<string, any>,
  configOverride?: WhatsappConfig,
): Promise<ResultadoEnvio> {
  const prepared = await prepararConfirmacaoWhatsapp(reservaId, reserva, configOverride);
  if (!prepared.enviado || !prepared.telefone || !prepared.mensagem) return prepared;
  return enviarTransacional(
    prepared.telefone,
    prepared.mensagem,
    `reserva-confirmada:${reservaId}:${prepared.telefone}`,
    reserva?.nome ?? reserva?.Nome,
  );
}
