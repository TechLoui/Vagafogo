import { createHash } from "crypto";
import { requestAgentService } from "./agentGateway";
import { enviarMensagemTransacionalPeloAgente } from "./agentTransactionalWhatsapp";
import { enfileirarAlertaAtendimentoHumano } from "./whatsappHumanHandoffAlerts";
import {
  alterarModoConversaSite,
  obterConversaSite,
  salvarContinuacaoWhatsappSite,
  type SiteWhatsAppContinuation,
} from "./siteChatConversations";
import { isSiteNamePrompt, isSitePhonePrompt } from "./siteChatIdentity";
import { contatoUiraParaLigacaoNaoAtendida, telefoneDoUira } from "./siteOwnerEscalation";

const locks = new Map<string, Promise<unknown>>();
const plain = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const validPhone = (value: string) => /^55[1-9]\d{9,10}$/.test(value);
const ORIENTACAO_LIGACAO_SITE = "Para tratar seu pedido com a equipe, abra https://wa.me/5562992225471 e toque no botão de chamada. O atendimento por chamada é das 08h às 17h.";

export const solicitouContinuacaoWhatsapp = (text: string): boolean => {
  const value = plain(text);
  if (!/\b(?:whatsapp|whats|wpp|zap)\b/.test(value)) return false;
  if (recusouContinuacaoWhatsapp(text) || /\bnao (?:tenho|uso|precis[ao]|e para)\b/.test(value)) return false;
  if (/\b(?:nao|nunca)\s+(?:me\s+)?(?:cham\w*|mand\w*|envi\w*|contat\w*|continu\w*|quero\b|vou\b|prefiro\b)/.test(value)) return false;
  return /\b(?:cham\w*|mand\w*|envi\w*|contate|contata|falar|conversar|continuar|prefiro|pode\w*|quero|preciso|gostaria)\b/.test(value)
    || /^(?:pelo |no |por |via )?(?:whatsapp|whats|wpp|zap)(?:\s+por favor)?[.!?\s]*$/.test(value);
};

export const recusouContinuacaoWhatsapp = (text: string): boolean =>
  /\b(?:prefiro nao informar|nao (?:quero|vou) informar|nao (?:me )?(?:mande|envie|chame)|nao quero (?:mais )?(?:receber|continuar|contato|falar|atendimento)|nao precisa (?:me )?(?:mandar|enviar|chamar)|(?:prefiro|quero|vamos|podemos) (?:continuar|seguir) (?:por )?aqui|seguimos por aqui)\b/.test(plain(text));

export const telefoneContinuacaoWhatsapp = (text: string): string => {
  const match = text.match(/(?<!\d)(?:\+?55[\s-]*)?\(?[1-9]\d\)?[\s-]*\d{4,5}[\s-]?\d{4}(?!\d)/);
  if (!match) return "";
  const digits = match[0].replace(/\D/g, "");
  const phone = digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
  return validPhone(phone) ? phone : "";
};

export const solicitouNovaTentativaWhatsapp = (text: string): boolean =>
  /^(?:por favor\s+)?(?:tenta|tente|tentar|pode tentar|pode enviar|manda|mande|envia|envie|reenviar|reenvia|reenvie)(?:\s+(?:enviar|mandar))?\s+(?:de novo|novamente|outra vez)(?:\s+por favor)?[.!?\s]*$/.test(plain(text).trim());

export const dadosContinuacaoWhatsapp = (continuation?: SiteWhatsAppContinuation | null) => ({
  whatsapp_continuation_available: Boolean(continuation && continuation.status !== "awaiting_phone"),
  whatsapp_continuation: continuation ? {
    status: continuation.status,
    sent_at: continuation.sentAt,
    requested_human: continuation.requestedHuman,
  } : null,
});

// Kept only for old delivery receipts and attempts whose payload is already fixed.
export const mensagemContinuacaoWhatsappLegada = (name: string, context: string, human: boolean, reason = "") => {
  const greeting = name ? `Olá, ${name.split(" ")[0]}!` : "Olá!";
  return `${greeting} 🌿 Sou a Jatobá, da Fazenda Vagafogo. Estou entrando em contato para dar continuidade ao seu atendimento iniciado no site.\n\n${context ? `Resumo da conversa no site:\n${context}\n\n` : ""}${reason === "ligacao_nao_atendida" ? contatoUiraParaLigacaoNaoAtendida() : human
    ? "Seu pedido precisa da nossa equipe. Trouxe o resumo da conversa do site para facilitar a continuidade por aqui.\n\nPara tratar seu pedido com a equipe, ligue pelo botão de chamada deste WhatsApp, das 08h às 17h."
    : "Podemos continuar por aqui. É só responder esta mensagem para seguir com o atendimento."}`;
};

type ContinuationMessage = { from: string; text: string };
const assuntoContinuacao = (context: string, messages?: ReadonlyArray<ContinuationMessage>): string => {
  const clients = messages ? messages.filter((message) => message.from === "client").map((message) => message.text)
    : context.includes("Cliente:") ? [...context.matchAll(/(?:^|\n)Cliente:\s*([^]*?)(?=\n(?:Cliente|Fazenda|Pedido encaminhado):|$)/g)].map((match) => match[1]) : [context];
  for (const message of [...clients].reverse()) {
    const value = plain(message);
    if (/^(?:meu (?:nome|cpf|whatsapp|telefone|numero|email|e-mail)|me chamo|nome\s*:|cpf\s*:|telefone\s*:|whatsapp\s*:|e-?mail\s*:)/.test(value.trim())) continue;
    if (/\b(?:remarc\w*|reagend\w*|(?:alterar|mudar|trocar)\b.{0,40}\b(?:data|dia|horario))\b/.test(value)
      || /\b(?:alterar|mudar|trocar)\b.{0,40}\b(?:\d{1,2}[/.]\d{1,2}|\d{4}-\d{2}-\d{2})\b/.test(value)) return "remarcacao";
    if (/\b(?:cancel\w*|reembolso|estorno)\b/.test(value)) return "cancelamento";
    if (/\b(?:pix|cartao|pagamento|pagar|cobranca|checkout)\b/.test(value)) return "pagamento";
    if (/\b(?:perdi|esqueci|objeto perdido)\b/.test(value)) return "objeto_perdido";
    if (/\b(?:aniversariante|aniversario)\b/.test(value)) return "aniversario";
    if (/\b(?:pet|pets|cachorro|cachorros|cao|caes)\b/.test(value)) return "pets";
    if (/\b(?:crianca|criancas|bebe|bebes)\b/.test(value)) return "criancas";
    if (/\b(?:cardapio|alimentacao|vegano|vegetariano|gluten|lactose)\b/.test(value)) return "alimentacao";
    if (/\b(?:localizacao|endereco|como chegar|onde fica|estrada)\b/.test(value)) return "localizacao";
    if (/\b(?:funcionamento|abre|fecha|horarios)\b/.test(value)) return "horarios";
    if (/\b(?:valor|valores|preco|precos|desconto|descontos)\b/.test(value)) return "valores";
    if (/\b(?:formulario|preencher|por conta propria)\b/.test(value)) return "formulario";
    if (/\b(?:reserva|reservar|agendamento)\b/.test(value)) return "reserva";
    if (/\bbrunch\b/.test(value) && /\btrilha\b/.test(value)) return "brunch_trilha";
    if (/\bbrunch\b/.test(value)) return "brunch";
    if (/\btrilha\b/.test(value)) return "trilha";
  }
  return "";
};

export const mensagemContinuacaoWhatsapp = (name: string, context: string, human: boolean, reason = "",
  messages?: ReadonlyArray<ContinuationMessage>) => {
  const first = String(name || "").trim().split(/\s+/)[0];
  const safeName = /^[\p{L}][\p{L}'’-]{0,39}$/u.test(first) ? first : "";
  const greeting = `Olá${safeName ? `, ${safeName}` : ""}! 🌿 Sou a Jatobá, da Fazenda Vagafogo. Estou entrando em contato para dar continuidade ao seu atendimento iniciado no site.`;
  const topic = assuntoContinuacao(context, messages) || ({ alteracao_reserva: "alteracao", cancelamento_reserva: "cancelamento",
    problema_pagamento: "pagamento", objeto_perdido: "objeto_perdido" } as Record<string, string>)[reason] || "";
  const cues: Record<string, string> = {
    remarcacao: "Vamos continuar sobre a remarcação da sua reserva.",
    alteracao: "Vamos continuar sobre a alteração da sua reserva.",
    cancelamento: "Vamos continuar sobre o cancelamento da sua reserva.",
    pagamento: "Vamos continuar sobre o pagamento da sua reserva.",
    objeto_perdido: "Vamos continuar sobre o objeto que você perdeu na Fazenda.",
    aniversario: "Vamos continuar sua dúvida sobre as condições para aniversariantes.",
    pets: "Vamos continuar sua dúvida sobre levar seu pet à Fazenda.",
    criancas: "Vamos continuar sobre a visita com crianças.",
    alimentacao: "Vamos continuar sua dúvida sobre a alimentação na visita.",
    localizacao: "Vamos continuar sua dúvida sobre como chegar à Fazenda.",
    horarios: "Vamos continuar sobre os horários da visita.",
    valores: "Vamos continuar sua dúvida sobre os valores da visita.",
    formulario: "Vamos continuar com o preenchimento da sua reserva.",
    reserva: "Vamos continuar com os detalhes da sua reserva.",
    brunch_trilha: "Vamos continuar sobre sua visita de brunch e trilha.",
    brunch: "Vamos continuar sobre sua visita para o brunch.",
    trilha: "Vamos continuar sobre sua visita à trilha.",
  };
  const cue = cues[topic] || "Podemos continuar seu atendimento por aqui.";
  const next = reason === "ligacao_nao_atendida" ? contatoUiraParaLigacaoNaoAtendida() : human
    ? "Para falar com a equipe, ligue pelo botão de chamada deste WhatsApp, das 08h às 17h."
    : "O que você precisa esclarecer para seguirmos?";
  return `${greeting}\n\n${cue} ${next}`;
};

const phoneKey = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  return /^55\d{11}$/.test(digits) && digits[4] === "9" ? `${digits.slice(0, 4)}${digits.slice(5)}` : digits;
};

const encaminharWhatsappParaEquipe = async (phone: string, jid: string, name: string, reason: string) => {
  // A leitura evita que a mudança de modo remova um bloqueio existente. O envio
  // transacional também verifica os controles antes de entregar a mensagem.
  const response = await requestAgentService("gateway", "/api/contacts", { timeoutMs: 15_000 });
  const body = response.body as { contacts?: Array<{ jid?: string; phone?: string; mode?: string; status?: string }> } | null;
  if (response.status >= 300 || !Array.isArray(body?.contacts)) return "CONTACT_CONTROLS_UNAVAILABLE";
  const contacts = body.contacts.filter((contact) => contact.jid === jid
    || phoneKey(String(contact.phone || contact.jid?.split("@")[0] || "")) === phoneKey(phone));
  if (contacts.some((contact) => (contact.mode || contact.status) === "blocked")) return "CONTACT_BLOCKED";
  if (contacts.some((contact) => (contact.mode || contact.status) === "human")) return "";
  if (!jid) return "WHATSAPP_CONTACT_NOT_CONFIRMED";
  const changed = await requestAgentService("gateway", `/api/contacts/${encodeURIComponent(jid)}/mode`, {
    method: "POST",
    body: { mode: "human", phone, name, reason, updatedBy: "site_whatsapp_handoff" },
    timeoutMs: 15_000,
  });
  const changedBody = changed.body as { ok?: boolean; error?: string } | null;
  return changed.status < 300 && changedBody?.ok === true ? "" : String(changedBody?.error || "WHATSAPP_HANDOFF_NOT_CONFIRMED");
};

type Dependencies = {
  send?: typeof enviarMensagemTransacionalPeloAgente;
  setHuman?: typeof encaminharWhatsappParaEquipe;
  notifyTeam?: (payload: Record<string, unknown>) => Promise<unknown>;
};

export const processarContinuacaoWhatsappSite = async (input: {
  sessionId: string;
  sourceId: string;
  human?: boolean;
  reason?: string;
  handoffText?: string;
  cancelled?: boolean;
  ownerEscalation?: boolean;
}, dependencies: Dependencies = {}) => {
  const prior = locks.get(input.sessionId) || Promise.resolve();
  const task = prior.catch(() => undefined).then(async () => {
    const conversation = await obterConversaSite(input.sessionId);
    if (!conversation) throw new Error("SITE_CHAT_SESSION_NOT_FOUND");
    if (conversation.mode === "blocked") throw new Error("SITE_CHAT_SESSION_BLOCKED");
    let continuation = conversation.whatsappContinuation;
    const requestedOwner = input.ownerEscalation === true || input.reason === "ligacao_nao_atendida";
    const continuingOwner = continuation?.reason === "ligacao_nao_atendida"
      && (conversation.mode === "human" || continuation.status === "awaiting_phone" || !input.human);
    const ownerEscalation = requestedOwner || continuingOwner;
    if (ownerEscalation && conversation.mode === "human"
      && (!conversation.handoffPending || conversation.updatedBy !== "jatoba")) throw new Error("SITE_CHAT_OPERATOR_ACTIVE");
    if (ownerEscalation && telefoneDoUira(conversation.phone)) {
      const requestId = continuation?.reason === "ligacao_nao_atendida" ? continuation.requestId
        : `site-whatsapp-continuation:${createHash("sha256").update(`${input.sessionId}\0${input.sourceId}`).digest("hex")}:owner`;
      const cancelled: SiteWhatsAppContinuation = {
        requestId, status: "cancelled", requestedAt: continuation?.requestedAt || Date.now(), requestedHuman: false,
        reason: "ligacao_nao_atendida", context: continuation?.context || "", phone: conversation.phone,
        sentAt: null, lastAttemptAt: null, lastError: null, gatewayJid: "",
      };
      await salvarContinuacaoWhatsappSite(input.sessionId, cancelled);
      return {
        reply: "Este número já é o contato do Uirá. Não vou enviar um aviso para o mesmo número. Podemos continuar por aqui.",
        human: conversation.mode === "human", bookingUi: null, continuation: cancelled,
        ...dadosContinuacaoWhatsapp(cancelled),
      };
    }
    const human = ownerEscalation || input.human === true || conversation.mode === "human" || continuation?.requestedHuman === true;
    const baseRequestId = `site-whatsapp-continuation:${createHash("sha256").update(`${input.sessionId}\0${input.sourceId}`).digest("hex")}`;
    const newOwnerEpisode = requestedOwner && continuation?.reason === "ligacao_nao_atendida"
      && conversation.mode === "bot" && continuation.status === "sent";
    const ownerBase = newOwnerEpisode ? baseRequestId : continuation?.requestId
      || (conversation.handoffRequestedAt ? `site-handoff:${input.sessionId}:${conversation.handoffRequestedAt}` : baseRequestId);
    const requestId = ownerEscalation ? `${ownerBase.replace(/:owner$/, "")}:owner` : baseRequestId;
    const newOwnerEvent = requestedOwner && (continuation?.reason !== "ligacao_nao_atendida" || newOwnerEpisode);
    const newHumanEvent = input.human === true && continuation?.requestId !== requestId
      && (!continuation?.requestedHuman || (conversation.mode === "bot" && continuation.status === "sent"));
    if (!continuation || continuation.status === "cancelled" || newHumanEvent || newOwnerEvent) {
      const context = conversation.messages
        .filter((message) => !isSiteNamePrompt(message.text) && !isSitePhonePrompt(message.text))
        .slice(-8)
        .map((message) => `${message.from === "client" ? "Cliente" : "Fazenda"}: ${message.text.slice(0, 600)}`)
        .join("\n");
      continuation = {
        requestId,
        status: validPhone(conversation.phone) ? "pending" : "awaiting_phone",
        requestedAt: Date.now(), requestedHuman: human,
        reason: String(ownerEscalation ? "ligacao_nao_atendida" : input.reason || "solicitacao_cliente").slice(0, 250),
        context: `${context}${input.handoffText ? `\nPedido encaminhado: ${input.handoffText.slice(0, 1200)}` : ""}`.slice(-2600),
        phone: conversation.phone, sentAt: null, lastAttemptAt: null, lastError: null, gatewayJid: "",
      };
    } else {
      continuation = { ...continuation, requestedHuman: human, phone: conversation.phone };
    }
    if (input.cancelled) {
      continuation.status = "cancelled";
      continuation.lastError = null;
    } else if (!validPhone(conversation.phone)) {
      continuation.status = "awaiting_phone";
    } else {
      continuation.status = "pending";
    }
    await salvarContinuacaoWhatsappSite(input.sessionId, continuation);

    if (continuation.status !== "awaiting_phone" && continuation.status !== "cancelled") {
      // Fix the customer payload before the first attempt; retries must retain
      // the same text even when the conversation or the templates have changed.
      if (!continuation.outboundText && !continuation.sentAt) {
        continuation.outboundText = continuation.lastAttemptAt
          ? mensagemContinuacaoWhatsappLegada(conversation.name, continuation.context, continuation.requestedHuman, continuation.reason)
          : mensagemContinuacaoWhatsapp(conversation.name, continuation.context, continuation.requestedHuman, continuation.reason, conversation.messages);
      }
      continuation.lastAttemptAt = Date.now();
      continuation.lastError = null;
      await salvarContinuacaoWhatsappSite(input.sessionId, continuation);
      if (!continuation.sentAt) {
        try {
          const outboundText = continuation.outboundText!;
          const result = await (dependencies.send || enviarMensagemTransacionalPeloAgente)(
            conversation.phone,
            outboundText,
            continuation.requestId, conversation.name, { tipoDisparo: "continuacao_site", siteSessionIds: [input.sessionId] },
          );
          if (result.enviado) {
            continuation.sentAt = Date.now();
            continuation.gatewayJid = result.jid || "";
            continuation.sentText = outboundText;
            continuation.sentRequestedHuman = continuation.requestedHuman;
          } else {
            continuation.lastError = result.motivo || "envio_nao_confirmado";
          }
        } catch {
          continuation.lastError = "WHATSAPP_SEND_UNAVAILABLE";
        }
        // Persistir a entrega antes de encaminhar permite repetir apenas a
        // mudança de modo se essa segunda etapa falhar.
        await salvarContinuacaoWhatsappSite(input.sessionId, continuation);
      }
      if (continuation.sentAt && continuation.requestedHuman) {
        try {
          continuation.lastError = await (dependencies.setHuman || encaminharWhatsappParaEquipe)(
            conversation.phone, continuation.gatewayJid, conversation.name, continuation.reason,
          ) || null;
        } catch {
          continuation.lastError = "WHATSAPP_HANDOFF_UNAVAILABLE";
        }
      }
      continuation.status = continuation.sentAt && !continuation.lastError ? "sent" : "failed";
      await salvarContinuacaoWhatsappSite(input.sessionId, continuation);
    }

    const awaitingPhone = continuation.status === "awaiting_phone";
    const cancelledContactRequest = continuation.status === "cancelled" && ["solicitacao_cliente", "ligacao_nao_atendida"].includes(continuation.reason);
    if (continuation.requestedHuman && !awaitingPhone && !cancelledContactRequest && conversation.mode !== "human") {
      await alterarModoConversaSite(input.sessionId, { mode: "human", updatedBy: "jatoba", reason: continuation.reason });
    }
    let teamAlertQueued = false;
    if (continuation.requestedHuman && !awaitingPhone && continuation.status !== "cancelled" && validPhone(conversation.phone)) {
      try {
        await (dependencies.notifyTeam || enfileirarAlertaAtendimentoHumano)({
          telefone: conversation.phone,
          nome: conversation.name,
          motivo: continuation.reason,
          resumo: continuation.context,
          ultimaMensagem: [...conversation.messages].reverse().find((message) => message.from === "client")?.text || "",
          sourceMessageId: continuation.requestId,
          sessionId: input.sessionId,
          canal: "site",
        });
        teamAlertQueued = true;
      } catch {
        continuation.lastError ||= "TEAM_ALERT_UNAVAILABLE";
        continuation.status = "failed";
        await salvarContinuacaoWhatsappSite(input.sessionId, continuation);
      }
    }
    const ownerContact = continuation.reason === "ligacao_nao_atendida" ? contatoUiraParaLigacaoNaoAtendida() : "";
    let reply = ownerContact ? awaitingPhone
      ? `${ownerContact}\n\nPara eu encaminhar seu relato ao Uirá, informe seu WhatsApp com DDD.`
      : continuation.status === "cancelled"
        ? `${ownerContact}\n\nTudo bem, seguimos por aqui. Não enviei um aviso sem o seu telefone.`
        : !teamAlertQueued
          ? `${ownerContact}\n\nNão consegui confirmar o envio do aviso ao Uirá agora. Você pode abrir o contato direto acima ou me pedir para tentar novamente.`
          : `${ownerContact}\n\nRegistrei o aviso ao Uirá com seu telefone e o resumo da conversa. 🌿`
      : awaitingPhone
      ? "Para continuar pelo WhatsApp, informe seu WhatsApp com DDD."
      : continuation.status === "cancelled"
        ? "Tudo bem, seguimos por aqui. Se preferir, você também pode abrir o WhatsApp pelo botão abaixo."
        : continuation.status === "sent"
          ? continuation.requestedHuman
            ? "Enviei uma mensagem para o seu WhatsApp para continuarmos o atendimento. 🌿"
            : "Enviei uma mensagem para o seu WhatsApp. Responda por lá para continuarmos ou abra a conversa pelo botão abaixo. 🌿"
          : continuation.sentAt
            ? "Enviei a mensagem para o seu WhatsApp, mas não consegui confirmar o encaminhamento para a equipe. Seu pedido continua disponível neste chat. Você pode abrir o WhatsApp pelo botão abaixo ou me pedir para tentar novamente."
            : "Não consegui confirmar o envio da mensagem para o seu WhatsApp agora. Você pode abrir a conversa pelo botão abaixo ou me pedir para enviar no WhatsApp novamente.";
    if (!ownerContact && continuation.requestedHuman && !awaitingPhone && continuation.status !== "cancelled") {
      reply += `\n\n${ORIENTACAO_LIGACAO_SITE}`;
    }
    return {
      reply,
      human: !awaitingPhone && (conversation.mode === "human" || (continuation.requestedHuman && !cancelledContactRequest)),
      bookingUi: awaitingPhone ? { step: "identity_phone", whatsappContinuation: true } : null,
      continuation,
      ...dadosContinuacaoWhatsapp(continuation),
    };
  });
  locks.set(input.sessionId, task);
  try { return await task; } finally { if (locks.get(input.sessionId) === task) locks.delete(input.sessionId); }
};
