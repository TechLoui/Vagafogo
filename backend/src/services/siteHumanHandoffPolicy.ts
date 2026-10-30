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

/** Recover only the old automatic handoff for a date/time change. An operator
 * claim, explicit request for a person, cancellation or block stays in place. */
export const intencaoRemarcacaoLegadaSite = (conversation: {
  mode: string; updatedBy: string | null; handoffPending: boolean; controlUpdatedAt: number | null;
  messages: ConversationMessage[];
  whatsappContinuation?: { reason?: string; context?: string } | null;
}, currentMessage: string): string | null => {
  if (conversation.mode !== "human" || conversation.updatedBy !== "jatoba" || !conversation.handoffPending) return null;
  const excludes = (text: string) => pediuAtendenteHumanoSite(text)
    || /\b(?:cancelar|cancelamento|reembolso|estorno|objeto perdido|nao atende|nao atendem|nao consigo ligar)\b/.test(plain(text))
    || /\b(?:alterar|mudar|trocar|corrigir)\s+(?:(?:o|a|os|as|meu|minha|meus|minhas|de|do|da)\s+)*(?:nome|titular|cpf|participantes|quantidade|experiencia|pacote|combo)\b/.test(plain(text))
    || /\b(?:alterar|mudar|trocar)\b.{0,35}\breserva\b.{0,30}\b(?:para|por) (?:outro |outra |o |a |um |uma )?(?:pacote|combo|experiencia)\b/.test(plain(text));
  if (excludes(currentMessage)) return null;
  if (conversation.messages.some((message) => message.from === "agent"
    && Number(message.ts || 0) >= Number(conversation.controlUpdatedAt || 0))) return null;
  const history = conversation.messages.slice(-30);
  const clients = history.filter((message) => message.from === "client");
  const concrete = (text: string) => {
    const value = plain(text);
    if (excludes(text) || /\b(?:politica|prazo|multa|regra|se eu|caso eu|se precisar|saber se|entender se)\b/.test(value)
      || /\bnao (?:quero|preciso|desejo|gostaria|queria)\b/.test(value)) return false;
    return /\b(?:quero|preciso|gostaria|queria|desejo|pode|podem|poderia|poderiam)\b.{0,35}\b(?:remarcar|reagendar)\b.{0,60}\b(?:reserva|data|dia|horario)\b/.test(value)
      || /^(?:remarcar|remarca|remarque|reagendar|reagende)\b.{0,65}\b(?:reserva|data|dia|horario)\b/.test(value)
      || /\b(?:quero|preciso|gostaria|queria|desejo|pode|podem|poderia|poderiam)\b.{0,35}\b(?:alterar|mudar|trocar)\b.{0,60}\b(?:data|dia|horario|hora)\b/.test(value)
      || /^(?:alterar|altere|mudar|mude|trocar|troque)\b.{0,65}\b(?:data|dia|horario|hora)\b/.test(value)
      || /\b(?:alterar|mudar|trocar)\b.{0,60}\breserva\b.{0,30}\bpara (?:o dia )?\d{1,2} \d{1,2}\b/.test(value)
      || /\b(?:andamento|status|retorno|novidade|autorizacao|liberada|aprovada)\b.{0,70}\b(?:remarcacao|reagendamento|alteracao|troca|mudanca)\b/.test(value)
      || /\b(?:remarcacao|reagendamento|alteracao de data|alteracao de horario)\b.{0,70}\b(?:andamento|status|retorno|novidade|autorizacao|liberada|aprovada)\b/.test(value);
  };
  const candidates = [...clients].reverse().filter((message) => concrete(message.text));
  const candidate = candidates.find((message) => /\b(?:alterar|altere|mudar|mude|trocar|troque|remarcar|remarca|remarque|reagendar|reagende)\b/.test(plain(message.text))) || candidates[0];
  if (!candidate) return null;
  const candidateIndex = history.indexOf(candidate);
  if (history.slice(candidateIndex + 1).some((message, index) => message.from === "client"
    && (excludes(message.text) || confirmouOfertaHumanaSite(message.text, history.slice(0, candidateIndex + 1 + index))))) return null;
  const target = alvoRemarcacaoLegadaSite(candidate.text);
  let suppliedAfterRequest = false;
  for (let index = candidateIndex + 1; index < history.length; index++) {
    const item = history[index];
    if (item.from !== "client") continue;
    const raw = item.text.trim();
    if (!/^(?:(?:para|pra|pro|dia|as|às)\s+)?(?:\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}(?:\/\d{4})?|\d{1,2}(?::[0-5]\d|h(?:[0-5]\d)?))(?:\s*(?:as|às)?\s*\d{1,2}(?::[0-5]\d|h(?:[0-5]\d)?))?[.!]?$/i.test(raw)) continue;
    const previousBot = [...history.slice(0, index)].reverse().find((message) => message.from === "bot");
    if (!previousBot || !/\b(?:qual|que)\b.{0,30}\b(?:data|dia|horario|hora)\b/.test(plain(previousBot.text))) continue;
    const collected = alvoRemarcacaoLegadaSite(`Quero remarcar para ${raw}`);
    if (collected.novaData || collected.novoHorario) { Object.assign(target, collected); suppliedAfterRequest = true; }
  }
  return suppliedAfterRequest ? `${candidate.text}\nAlvo informado pelo cliente: para ${target.novaData || ""}${target.novoHorario ? ` às ${target.novoHorario}` : ""}` : candidate.text;
};

/** Preserve explicit requested dates/hours from the customer's legacy request.
 * A status question never supplies a new target; ambiguous values are recollected. */
export const alvoRemarcacaoLegadaSite = (message: string, now = Date.now()): { novaData?: string; novoHorario?: string } => {
  const value = String(message).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (!/\b(?:alterar|altere|mudar|mude|trocar|troque|remarcar|remarque|reagendar|reagende)\b/.test(value)
    || /\b(?:andamento|status|retorno|novidade|saber se|entender se)\b/.test(value)) return {};
  const parts = value.split(/\b(?:para|pra|pro)\b/);
  const targetText = parts.length > 1 ? parts[parts.length - 1] : value;
  const dates = [...targetText.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b|\b(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\b/g)];
  const result: { novaData?: string; novoHorario?: string } = {};
  if (dates.length === 1) {
    const match = dates[0];
    const year = match[1] || match[6] || new Intl.DateTimeFormat("en", { timeZone: "America/Sao_Paulo", year: "numeric" }).format(now);
    const date = `${year}-${(match[2] || match[5]).padStart(2, "0")}-${(match[3] || match[4]).padStart(2, "0")}`;
    if (Number.isFinite(Date.parse(`${date}T12:00:00Z`)) && new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) === date) result.novaData = date;
  }
  const times = [...targetText.matchAll(/\b(\d{1,2})(?::([0-5]\d)|h([0-5]\d)?)(?!\d)/g)];
  if (times.length === 1 && Number(times[0][1]) < 24) {
    result.novoHorario = `${times[0][1].padStart(2, "0")}:${times[0][2] || times[0][3] || "00"}`;
  }
  return result;
};
