export const CONTATO_DIRETO_UIRA = "https://wa.me/5562991150376";

export const telefoneDoUira = (value: unknown) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  const phone = digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
  return phone === "5562991150376" || phone === "556291150376";
};

export const relatouLigacaoNaoAtendida = (message: string) => {
  const text = String(message || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, " ").trim();
  if (!text || /^(?:oi|ola|obrigad[oa]|valeu|tchau|ate mais)$/.test(text)) return false;
  if (/\b(?:se|caso) (?:eu |a gente )?(?:(?:tentar|tentasse|precisar|conseguir) )?(?:ligar|telefonar)\b/.test(text)
    || /\b(?:agora|ja|depois) (?:consegui|conseguimos) (?:falar|contato)|\b(?:agora|ja|depois) (?:me )?(?:atendeu|atenderam)|\bja falei\b/.test(text)) return false;
  if (/\b(?:nao (?:vou|quero|preciso|tentei|liguei)|nem tentei)\b/.test(text)) return false;
  const call = /\b(?:ligar|liguei|ligamos|ligando|ligacao|ligacoes|telefone|telefonar|telefonei|chamada|chamadas)\b/.test(text);
  const failed = /\b(?:nao (?:me )?(?:atende|atendem|atendeu|atenderam)|nao (?:estao|esta) (?:me )?atendendo|ninguem (?:me )?(?:atende|atendeu|responde|respondeu)|nao fui atendid[oa]|sem (?:atendimento|resposta)|so chama|so chamando|ocupado|ocupada|caixa postal|nao consigo (?:falar|contato)|nao consegui (?:falar|contato))\b/.test(text);
  return call && failed;
};

type SiteControl = {
  mode: string;
  updatedBy: string | null;
  handoffPending: boolean;
  phone?: string | null;
};

export const podeResponderContinuacaoAutomaticaSite = (conversation?: SiteControl | null) => !conversation || conversation.mode === "bot"
  || (conversation.mode === "human" && conversation.handoffPending && conversation.updatedBy === "jatoba");

export const podeEscalonarLigacaoSite = (message: string, conversation?: SiteControl | null) =>
  !telefoneDoUira(conversation?.phone) && relatouLigacaoNaoAtendida(message) && podeResponderContinuacaoAutomaticaSite(conversation);

export const contatoUiraParaLigacaoNaoAtendida = () =>
  `Como você está tentando ligar e não conseguiu atendimento, pode falar diretamente com o Uirá, responsável pela Fazenda: ${CONTATO_DIRETO_UIRA}`;
