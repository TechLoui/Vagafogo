type ClientMessage = { from: string; text: string };

export const normalizeSiteVisitorName = (value: unknown): string => {
  const name = String(value ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
  if (name.length < 2 || /[\d@?]/.test(name)) return "";
  if (/^(?:sou\s+(?:do|da|de)\b|(?:do|da|de)\s)/i.test(name)) return "";
  if (/^(?:oi|ol[aá]|bom dia|boa tarde|boa noite|cliente|visitante|contato|usu[aá]rio)$/i.test(name)) return "";
  if (/\b(?:quero|gostaria|preciso|reservar|reserva|consulta|consultar|valor(?:es)?|pre[cç]o(?:s)?|hor[aá]rio(?:s)?|brunch|trilha|combo|ajuda|d[uú]vida(?:s)?|foto(?:s)?|endere[cç]o|localiza[cç][aã]o|atendente|pagamento|pix|cart[aã]o|quanto|como|tem|voc[eê]s|podem|pode|aberto(?:s)?)\b/i.test(name)) return "";
  return name;
};

export const nameFromSiteMessage = (message: string, allowPlain = false): string => {
  const match = message.trim().match(/^(?:(?:meu nome [ée]|pode me chamar de|sou|nome(?: completo)?\s*:)\s*)([^.!?\n]+)[.!]?$/i);
  return normalizeSiteVisitorName(match?.[1] ?? (allowPlain ? message : ""));
};

export const pendingSiteVisitorRequest = (messages: ClientMessage[]): string => {
  for (const message of messages) {
    if (message.from !== "client") continue;
    const text = String(message.text ?? "").trim();
    if (!text || /^(?:oi|ol[aá]|bom dia|boa tarde|boa noite)[!.,\s]*$/i.test(text)) continue;
    if (/^(?:meu nome [ée]|pode me chamar de|sou|nome(?: completo)?\s*:)/i.test(text)) continue;
    if (/^(?:meu (?:n[uú]mero de )?whatsapp|whatsapp|telefone|celular)\b/i.test(text)) continue;
    if (/^(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?\d{4,5}[\s-]?\d{4}$/.test(text)) continue;
    if (normalizeSiteVisitorName(text) === text && text.split(" ").length <= 4) continue;
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
  const firstName = input.name.split(" ")[0];
  if (!input.name) {
    return {
      reply: "🌿 Antes de seguirmos, como posso chamar você? Assim consigo identificar este atendimento para a nossa equipe.",
      step: "identity_name" as const,
      pendingRequest: "",
    };
  }
  if (!input.phone) {
    return {
      reply: `Obrigada, ${firstName}! Qual é o seu WhatsApp com DDD? Usaremos o número apenas para acompanhar este atendimento ou falar com você se for necessário; isso não autoriza campanhas. 🌿`,
      step: "identity_phone" as const,
      pendingRequest: "",
    };
  }
  if (!input.hadName || !input.hadPhone) {
    const pendingRequest = pendingSiteVisitorRequest(input.messages);
    if (!pendingRequest) {
      return {
        reply: `Obrigada, ${firstName}! Seus dados já estão vinculados a este atendimento. Como posso ajudar você? 🌿`,
        step: null,
        pendingRequest: "",
      };
    }
    return { reply: "", step: null, pendingRequest };
  }
  return { reply: "", step: null, pendingRequest: "" };
};
