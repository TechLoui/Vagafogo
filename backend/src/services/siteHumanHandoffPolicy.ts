type ConversationMessage = { from: string; text: string; ts?: number };

const plain = (text: string) => String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export const pediuAcaoHumanaSite = (text: string): boolean => {
  const value = plain(text);
  if (/\bnao (?:quero|preciso|desejo|gostaria|cancele|cancela|altere|altera|encaminhe|transfira)\b/.test(value)) return false;
  const action = "(?:cancelar|cancelem|alterar|alterem|remarcar|remarquem|reagendar|reagendem|mudar|mudem|trocar|troquem|estornar|estornem|corrigir|corrijam)";
  if (new RegExp(`\\b(?:quero|preciso|desejo|gostaria)(?: de| que)? (?:voces )?${action}\\b`).test(value)
    || /\b(?:quero|preciso|desejo|gostaria)(?: de| do| o)? (?:meu )?(?:reembolso|estorno)\b/.test(value)) return true;
  if (/\b(?:politica|politicas|prazo|prazos|regra|regras|multa|multas|quantos dias|quantas horas|ate quando|antecedencia)\b/.test(value)
    || /\b(?:saber|entender|consultar)\b/.test(value)) return false;
  return new RegExp(`\\b(?:pode|podem)(?: por favor)? (?:voces )?${action}\\b`).test(value)
    || /\b(?:cancele|cancela|altere|altera|remarque|remarca|reagende|corrija|estorne) (?:a |o |minha |meu )?(?:reserva|agendamento|ingresso|pagamento|data|horario)\b/.test(value);
};

export const pediuAtendenteHumanoSite = (text: string): boolean => {
  const value = plain(text);
  if (/\bnao (?:quero|preciso|desejo|gostaria|me encaminhe|me transfira)\b/.test(value)) return false;
  return /\b(?:quero|preciso|gostaria|desejo)(?: de)? (?:falar|conversar|contato|atendimento)\b.{0,50}\b(?:atendente|equipe|pessoa|humano|responsavel|alguem)\b/.test(value)
    || /\b(?:pode|podem) (?:me )?(?:encaminhar|transferir|passar|colocar)\b.{0,50}\b(?:atendente|equipe|pessoa|humano|responsavel|alguem)\b/.test(value)
    || /\b(?:me encaminhe|me transfira|chame um atendente|chama um atendente|quero um atendente|preciso de um atendente)\b/.test(value);
};

export const ofereceuAtendimentoHumanoSite = (text: string): boolean => {
  const value = plain(text);
  if (!/\b(?:equipe|atendente|humano|responsavel|pessoa)\b/.test(value)) return false;
  const transfer = /\b(?:encaminh\w*|transfer\w*|conect\w*|colocar|passar|chamar|falar|conversar)\b/.test(value)
    || (/\b(?:pedir|solicitar)\b/.test(value) && /\b(?:continu\w*|atendimento|atender)\b/.test(value));
  return transfer && /\b(?:posso|podemos|poderia|quer que|quer falar|quer conversar|gostaria que|gostaria de falar|se quiser|caso queira|deseja que|deseja falar)\b/.test(value);
};

export const confirmouOfertaHumanaSite = (text: string, messages: ConversationMessage[]): boolean => {
  const value = plain(text);
  if (!/^(?:(?:sim|claro)(?: por favor)?(?: pode(?: sim)?(?: me)?(?: encaminhar| transferir| chamar| pedir| solicitar)?(?: por favor)?)?|pode(?: sim)?(?: me)?(?: encaminhar| transferir| chamar| pedir| solicitar)?(?: por favor)?|quero sim|por favor|isso(?: mesmo)?)$/.test(value)) return false;
  const previousBot = [...messages].reverse().find((message) => message.from === "bot");
  return Boolean(previousBot && ofereceuAtendimentoHumanoSite(previousBot.text));
};

export const perguntaInformativaSobreAtendimentoSite = (text: string): boolean => {
  const value = plain(text);
  if (pediuAcaoHumanaSite(text) || pediuAtendenteHumanoSite(text)) return false;
  return /\b(?:politica|politicas|prazo|prazos|regra|regras|multa|multas|desconto|descontos|cortesia|cortesias|aniversariante|aniversario|gratuidade|beneficio)\b/.test(value)
    || /\b(?:se eu|se a gente|caso eu|caso a gente|posso|podemos) (?:precisar )?(?:cancelar|alterar|remarcar|reagendar|mudar|trocar|estornar)\b/.test(value)
    || /\b(?:como|quando|quanto|qual|quais|quantos dias|quantas horas|e possivel|tem como|da para|pode|podem|posso|existe|tem)\b.{0,90}\b(?:cancelar|cancelamento|reembolso|estorno|alterar|alteracao|remarcar|remarcacao)\b/.test(value)
    || /\b(?:cancelar|cancelamento|reembolso|estorno|alterar|alteracao|remarcar|remarcacao)\b.{0,90}\b(?:quantos dias|quantas horas|ate quando|antecedencia)\b/.test(value);
};

export const deveEfetivarHandoffSite = (input: {
  message: string;
  reply: string;
  messages: ConversationMessage[];
}): boolean => {
  const value = plain(input.message);
  if (/^nao(?: obrigad[oa])?$/.test(value)
    || /\bnao (?:quero|preciso|desejo)(?: de)?\b.{0,45}\b(?:atendente|humano|equipe|encaminhamento|transferencia)\b/.test(value)
    || /\b(?:prefiro|quero) (?:seguir|continuar) (?:por )?aqui\b/.test(value)) return false;
  if (pediuAcaoHumanaSite(input.message) || pediuAtendenteHumanoSite(input.message)
    || confirmouOfertaHumanaSite(input.message, input.messages)) return true;
  if (perguntaInformativaSobreAtendimentoSite(input.message) || ofereceuAtendimentoHumanoSite(input.reply)) return false;
  // Outros motivos estruturados, como objeto perdido e falha de pagamento,
  // continuam sob a decisão operacional do agente.
  return true;
};

export const ofertaHumanaAutomaticaSemConfirmacao = (conversation: {
  mode: string;
  updatedBy: string | null;
  handoffPending: boolean;
  controlUpdatedAt: number | null;
  messages: ConversationMessage[];
  whatsappContinuation?: { sentAt: number | null; status: string } | null;
}): boolean => {
  if (conversation.mode !== "human" || conversation.updatedBy !== "jatoba" || !conversation.handoffPending) return false;
  if (conversation.whatsappContinuation?.sentAt) return false;
  const botIndex = conversation.messages.map((message) => message.from).lastIndexOf("bot");
  if (botIndex < 0 || !ofereceuAtendimentoHumanoSite(conversation.messages[botIndex].text)) return false;
  if (conversation.messages.some((message) => message.from === "agent"
    && Number(message.ts || 0) >= Number(conversation.controlUpdatedAt || 0))) return false;
  const previousMessages = conversation.messages.slice(0, botIndex);
  const recentClients = previousMessages.filter((message) => message.from === "client").slice(-4);
  if (recentClients.some((message) => pediuAcaoHumanaSite(message.text) || pediuAtendenteHumanoSite(message.text))) return false;
  // Uma aceitação anterior à própria oferta atual pertence a um pedido real.
  if (recentClients.some((message) => confirmouOfertaHumanaSite(message.text,
    previousMessages.slice(0, previousMessages.indexOf(message))))) return false;
  return true;
};
