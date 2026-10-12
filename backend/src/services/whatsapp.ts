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
  provider?: "baileys" | "meta_cloud";
  providerLabel?: string;
  qr?: string | null;
  lastError?: string | null;
  lastQrAt?: string | null;
  authStrategy?: "remote" | "local";
  info?: {
    wid?: string;
    pushname?: string;
  };
  lastWebhookAt?: string | null;
  lastWebhookStatus?: string | null;
  meta?: {
    configured?: boolean;
    missing?: string[];
    phoneNumberId?: string | null;
    businessAccountId?: string | null;
    webhookPath?: string | null;
    verifiedName?: string | null;
    qualityRating?: string | null;
    verificationStatus?: string | null;
    throughput?: unknown;
  } | null;
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
  template?: WhatsappTemplatePayload;
};

export type WhatsappMediaPayload = {
  storagePath: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  filename: string;
  sizeBytes: number;
};

export type WhatsappTemplateParameter =
  | { type: "text"; text: string }
  | { type: "currency"; currency: { fallback_value: string; code: string; amount_1000: number } }
  | { type: "date_time"; date_time: { fallback_value: string } };

export type WhatsappTemplatePayload = {
  name: string;
  languageCode?: string;
  category?: "marketing" | "utility" | "authentication";
  mediaHeader?: boolean;
  components?: Array<{
    type: "header" | "body" | "button";
    subType?: "url" | "quick_reply";
    index?: number;
    parameters: WhatsappTemplateParameter[];
  }>;
};

export type WhatsappAckEvent = {
  messageId: string;
  ack: number;
  status?: string;
  telefone?: string;
  eventoEm?: Date;
  billable?: boolean | null;
  category?: string | null;
  pricingModel?: string | null;
  conversationId?: string | null;
  errors?: Array<{ code?: number; title?: string; message?: string }>;
  provider?: string;
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
  "Olá {nome}! ✅ Seu pagamento foi confirmado automaticamente e sua reserva na Fazenda Vagafogo está garantida. Não é necessário enviar comprovante.\n\n📅 Data: {data}\n⏰ Horário: {horario}\n🎫 Atividade: {atividade}\n👥 Participantes: {participantes}\n💰 Valor: {valor}\n\n🚗 Durante o trajeto, fique atento às placas indicando a estrada de acesso à Fazenda Vagafogo.\n📍 https://maps.app.goo.gl/47wbDVWwAHQuKho86\n\nNos vemos em breve! 🌿";

const BLOCO_LOCALIZACAO_CONFIRMACAO =
  "🚗 Durante o trajeto, fique atento às placas indicando a estrada de acesso à Fazenda Vagafogo.\n📍 https://maps.app.goo.gl/47wbDVWwAHQuKho86";

const URL_LOCALIZACAO_OFICIAL = "https://maps.app.goo.gl/47wbDVWwAHQuKho86";
const URL_LOCALIZACAO_ANTIGA = /https:\/\/maps\.google\.com\/\?q=-15\.824453,-48\.995220/gi;

const incluirLocalizacaoConfirmacao = (mensagem: string) => {
  const texto = String(mensagem ?? "").trim().replace(URL_LOCALIZACAO_ANTIGA, URL_LOCALIZACAO_OFICIAL);
  if (!texto || texto.includes(URL_LOCALIZACAO_OFICIAL)) return texto;
  return `${texto}\n\n${BLOCO_LOCALIZACAO_CONFIRMACAO}`;
};

export const criarTemplateUtilitarioWhatsapp = (envName: string, parametros: unknown[]): WhatsappTemplatePayload | undefined => {
  const name = String(process.env[envName] ?? "").trim();
  if (!name) return undefined;
  return {
    name,
    languageCode: String(process.env.META_WHATSAPP_TEMPLATE_LANGUAGE ?? "pt_BR").trim() || "pt_BR",
    category: "utility",
    components: [{
      type: "body",
      parameters: parametros.map((value) => ({ type: "text" as const, text: String(value ?? "-").slice(0, 1024) })),
    }],
  };
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
  template?: WhatsappTemplatePayload,
) => resultadoGateway(await requestAgentService("gateway", "/api/whatsapp/transactional-send", {
  method: "POST",
  body: {
    phone: telefone,
    text: mensagem,
    requestId: requestId.slice(0, 160),
    contactName: String(nomeContato ?? "").trim().slice(0, 120),
    ...(template ? { template } : {}),
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
    provider: body.provider === "meta_cloud" ? "meta_cloud" : "baileys",
    providerLabel: body.providerLabel ? String(body.providerLabel) : undefined,
    qr: null,
    lastError: body.lastError ? String(body.lastError) : null,
    authStrategy: "remote",
    info: {
      wid: String(body.connectedWid ?? body.connectedNumber ?? "") || undefined,
      pushname: "Jatobá — Fazenda Vagafogo",
    },
    lastWebhookAt: body.lastWebhookAt ? String(body.lastWebhookAt) : null,
    lastWebhookStatus: body.lastWebhookStatus ? String(body.lastWebhookStatus) : null,
    meta: body.meta && typeof body.meta === "object" ? body.meta as WhatsappStatusPayload["meta"] : null,
  };
}

// Compatibilidade com integrações antigas. A conexão pertence ao gateway do
// Agente (Cloud API oficial ou fallback Baileys); este serviço não abre navegador.
export function iniciarWhatsApp(): void {
  console.info("[whatsapp] Conexão centralizada no gateway do Agente; nenhum navegador local será iniciado.");
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
  console.log("[whatsapp][config] Provedor centralizado no gateway do Agente.", {
    provider: process.env.WHATSAPP_PROVIDER ?? "baileys",
    gatewayConfigurado: Boolean((process.env.AGENT_GATEWAY_URL ?? "").trim()),
    campanhasHabilitadas: (process.env.WHATSAPP_CAMPAIGNS_ENABLED ?? "false").trim().toLowerCase() === "true",
  });
}

export async function enviarMensagemWhatsappGerenciada(
  telefoneInformado: string,
  mensagemInformada: string,
  midia?: WhatsappMediaPayload,
  template?: WhatsappTemplatePayload,
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
    body: {
      phone: telefone,
      text: mensagem,
      ...(mediaBody ? { media: mediaBody } : {}),
      ...(template ? { template } : {}),
    },
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
  return {
    enviado: true,
    telefone,
    mensagem: montarMensagem(template, { ...reserva, id: reservaId }),
    template: criarTemplateUtilitarioWhatsapp("META_TEMPLATE_BOAS_VINDAS", [
      reserva?.nome ?? reserva?.Nome ?? "Visitante",
      formatarDataReserva(reserva?.data ?? reserva?.Data),
      reserva?.horario ?? reserva?.Horario ?? "Sem horário específico",
      reserva?.atividade ?? reserva?.Atividade ?? "Experiência Vagafogo",
    ]),
  };
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
    prepared.template,
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
  return {
    enviado: true,
    telefone,
    mensagem,
    template: criarTemplateUtilitarioWhatsapp("META_TEMPLATE_RESERVA_CONFIRMADA", [
      reserva?.nome ?? reserva?.Nome ?? "Visitante",
      reserva?.atividade ?? reserva?.Atividade ?? "Experiência Vagafogo",
      formatarDataReserva(reserva?.data ?? reserva?.Data),
      reserva?.horario ?? reserva?.Horario ?? "Sem horário específico",
      reserva?.participantes ?? reserva?.Participantes ?? "-",
      currencyFormatter.format(Number(reserva?.valor ?? reserva?.Valor ?? 0) || 0),
      URL_LOCALIZACAO_OFICIAL,
    ]),
  };
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
    prepared.template,
  );
}
