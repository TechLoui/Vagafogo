type FollowupPolicyMessage = { from: string; text: string };
const normalize = (value: string) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().replace(/https?:\/\/\S+/g, " ").replace(/[^a-z0-9]+/g, " ").trim();

export const recusouRetomadaSite = (text: string): boolean =>
  /\b(?:nao concordo|nao (?:me )?(?:envie|mande|chame)|nao quero (?:mais )?receber|pare de (?:me )?(?:enviar|mandar)|sem (?:mensagens|lembretes)|nao (?:quero|preciso de) (?:um )?lembrete)\b/.test(normalize(text));

export const aceitouRetomadaSite = (text: string): boolean => {
  const value = normalize(text);
  if (recusouRetomadaSite(text)) return false;
  return /\b(?:pode|podem|quero|aceito|autorizo|gostaria de)\b.{0,60}\b(?:lembrete|retomada|me lembrar)\b/.test(value)
    || /\b(?:pode|podem) (?:me )?(?:chamar|enviar|mandar)\b.{0,60}\bwhatsapp\b/.test(value);
};

export const encerrouOuAdiouRetomadaSite = (text: string): boolean => {
  const raw = String(text || "");
  const value = normalize(raw);
  if (!value || raw.includes("?")) return false;
  if (/^(?:(?:muito )?obrigad[oa](?: por tudo| pela ajuda)?|valeu|tudo certo(?: obrigad[oa])?|perfeito obrigad[oa]|ja resolvi|resolvido|nao preciso mais|pode encerrar|por enquanto e so)$/.test(value)) return true;
  if (/\b(?:vou|vamos) (?:decidir|pensar|avaliar|ver|conversar|alinhar)(?: depois| primeiro| com\b| e\b|$)/.test(value)
      || /\bdepois (?:eu )?(?:volto|retorno|decido|vejo|confirmo|chamo|falo)\b/.test(value)
      || /\b(?:se|caso) (?:eu |a gente )?for\b/.test(value)
      || /\bqualquer coisa (?:eu )?(?:chamo|aviso|retorno|falo)\b/.test(value)
      || /\b(?:entro|entrarei) em contato\b/.test(value)
      || /\bnao (?:vou|quero|consigo) (?:reservar|fechar|decidir) (?:agora|hoje)\b/.test(value)
      || /\b(?:deixa|deixamos|vou deixar) para (?:depois|outro dia)\b/.test(value)) return true;
  if (/(?<!nao )\b(?:ja (?:reservei|reservamos|comprei|compramos|paguei|finalizei|conclui)|consegui (?:reservar|finalizar|concluir|pagar)|conseguimos (?:reservar|finalizar|concluir|pagar))\b/.test(value)) return true;
  if (/\bja fui (?:ao|no) site\b/.test(value)) return false;
  return /\b(?:mas )?ja fui(?: la| nessa (?:visita|experiencia)| na fazenda)?\b/.test(value)
    || /\b(?:essa|a) reserva (?:ja )?(?:passou|e antiga|foi realizada)\b/.test(value)
    || /\b(?:visita|reserva) ja (?:aconteceu|foi realizada|foi utilizada)\b/.test(value);
};

export const politicaContatoRetomadaSite = (messages: FollowupPolicyMessage[], previousOptedOut = false) => {
  let optedOut = previousOptedOut;
  let latestClientText = "";
  for (const message of messages) {
    if (message.from !== "client") continue;
    latestClientText = String(message.text || "");
    if (recusouRetomadaSite(latestClientText)) optedOut = true;
    else if (aceitouRetomadaSite(latestClientText)) optedOut = false;
  }
  return { optedOut, finished: encerrouOuAdiouRetomadaSite(latestClientText) };
};
