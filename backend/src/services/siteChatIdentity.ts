import { shouldOfferEnvironmentalEducationContact } from "./siteEnvironmentalEducation";

type ClientMessage = { from: string; text: string };
const NAME_INTRO = /^(?:(?:(?:eu\s+)?sou|me chamo|meu nome [ée]|pode me chamar de)\s+(?:(?:o|a)\s+)?|nome(?: completo)?\s*:\s*)/i;
const plain = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[.!?]+$/, "");
const isIdentityDecline = (value: string) => /^(?:prefiro|nao quero|nao vou)\s+(?:nao\s+)?informar(?:\s+(?:(?:o|meu)\s+)?(?:nome|whatsapp|telefone))?$/.test(plain(value));

export const siteIdentityDeclines = (messages: ClientMessage[]) => {
  let lastPrompt: "name" | "phone" | null = null;
  let name = false;
  let phone = false;
  for (const message of messages) {
    if (message.from === "bot") {
      lastPrompt = isSiteNamePrompt(message.text) ? "name" : isSitePhonePrompt(message.text) ? "phone" : null;
    } else if (message.from === "client" && isIdentityDecline(message.text)) {
      const declined = plain(message.text);
      if (/\bnome$/.test(declined) || (!/\b(?:whatsapp|telefone)$/.test(declined) && lastPrompt === "name")) name = true;
      if (/\b(?:whatsapp|telefone)$/.test(declined) || (!/\bnome$/.test(declined) && lastPrompt === "phone")) phone = true;
    }
  }
  return { name, phone };
};

export const isSiteNamePrompt = (text: string): boolean => {
  const normalized = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return /como posso chamar voce|me (?:diga|diz) (?:o )?seu (?:primeiro )?nome/.test(normalized);
};

export const isSitePhonePrompt = (text: string): boolean => {
  const normalized = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return /qual e o seu whatsapp com ddd|informe (?:o )?(?:seu )?whatsapp com ddd/.test(normalized);
};

export const normalizeSiteVisitorName = (value: unknown): string => {
  const name = String(value ?? "").replace(/\s+/g, " ").trim().replace(NAME_INTRO, "").replace(/[.!?]+$/, "").trim().slice(0, 120);
  if (isIdentityDecline(name)) return "";
  if (name.length < 2 || /[\d@?]/.test(name)) return "";
  if (/^(?:sou\s+(?:do|da|de)\b|(?:do|da|de)\s)/i.test(name)) return "";
  if (/^(?:oi|ol[aá]|bom dia|boa tarde|boa noite|cliente|visitante|contato|usu[aá]rio|sim|n[aã]o|ok|certo|hoje|amanh[aã]|obrigad[oa]|tudo bem|eu|sou)$/i.test(name)) return "";
  if (/\b(?:quero|gostaria|preciso|reservar|reserva|consulta|consultar|valor(?:es)?|pre[cç]o(?:s)?|hor[aá]rio(?:s)?|brunch|trilha|combo|ajuda|d[uú]vida(?:s)?|foto(?:s)?|endere[cç]o|localiza[cç][aã]o|atendente|pagamento|pix|cart[aã]o|quanto|como|tem|voc[eê]s|podem|pode|aberto(?:s)?)\b/i.test(name)) return "";
  return name;
};

export const nameFromSiteMessage = (message: string, allowPlain = false): string => {
  const text = message.trim();
  if (!NAME_INTRO.test(text) && !allowPlain) return "";
  const candidate = NAME_INTRO.test(text) ? text.replace(NAME_INTRO, "").split(/[,.!?\n]/)[0] : text;
  return normalizeSiteVisitorName(candidate);
};

export const pendingSiteVisitorRequest = (messages: ClientMessage[]): string => {
  for (const message of messages) {
    if (message.from !== "client") continue;
    const text = String(message.text ?? "").trim();
    if (!text || /^(?:oi|ol[aá]|bom dia|boa tarde|boa noite)[!.,\s]*$/i.test(text)) continue;
    if (isIdentityDecline(text)) continue;
    if (NAME_INTRO.test(text)) continue;
    if (/^(?:meu (?:n[uú]mero de )?whatsapp|whatsapp|telefone|celular)\b/i.test(text)) continue;
    if (/^(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?\d{4,5}[\s-]?\d{4}$/.test(text)) continue;
    if (normalizeSiteVisitorName(text) === text && text.split(" ").length <= 4 && !shouldOfferEnvironmentalEducationContact(text)) continue;
    return text.slice(0, 4096);
  }
  return "";
};

export const siteVisitorIdentityDecision = (input: {
  name: string;
  phone: string;
  hadName: boolean;
  hadPhone: boolean;
  messages: ClientMessage[];
}) => {
  const declines = siteIdentityDeclines(input.messages);
  const firstName = input.name.split(" ")[0];
  if (!input.name && !declines.name) {
    const priorNamePrompts = input.messages.filter((message) => message.from === "bot" && isSiteNamePrompt(message.text)).length;
    const lastClientMessage = [...input.messages].reverse().find((message) => message.from === "client")?.text.trim() ?? "";
    const isGreeting = /^(?:oi|ol[aá]|bom dia|boa tarde|boa noite)[!.,\s]*$/i.test(lastClientMessage);
    const reply = priorNamePrompts === 0
      ? isGreeting
        ? "Oi! Que bom falar com você. 🌿 Como posso chamar você?"
        : "Vou ajudar você com isso. 🌿 Como posso chamar você?"
      : priorNamePrompts === 1
        ? isGreeting
          ? "Oi, estou por aqui! 😊 Me diga seu primeiro nome para continuarmos."
          : "Entendi. Para continuar, me diga seu primeiro nome, por favor. 🌿"
        : "Estou por aqui para ajudar. 🌿 Quando puder, me diga seu nome e seguimos.";
    return {
      reply,
      step: "identity_name" as const,
      pendingRequest: "",
    };
  }
  if (!input.phone && !declines.phone) {
    return {
      reply: `${firstName ? `Obrigada, ${firstName}! ` : "Tudo bem! "}Se quiser, me informe seu WhatsApp com DDD. Assim, se a conversa parar, posso enviar um único lembrete para você retomar. Se preferir não informar, seguimos por aqui. 🌿`,
      step: "identity_phone" as const,
      pendingRequest: "",
    };
  }
  const lastClientMessage = [...input.messages].reverse().find((message) => message.from === "client")?.text ?? "";
  const justFinishedIdentity = (!input.hadName && Boolean(input.name)) || (!input.hadPhone && Boolean(input.phone)) || isIdentityDecline(lastClientMessage);
  if (justFinishedIdentity) {
    const pendingRequest = pendingSiteVisitorRequest(input.messages);
    if (!pendingRequest) {
      return {
        reply: `${firstName ? `Obrigada, ${firstName}!` : "Tudo bem!"} 🌿 Me conta como posso te ajudar hoje.`,
        step: null,
        pendingRequest: "",
      };
    }
    return { reply: "", step: null, pendingRequest };
  }
  return { reply: "", step: null, pendingRequest: "" };
};
