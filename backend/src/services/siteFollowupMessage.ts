export type SiteFollowupMessageInput = {
  sessionId: string;
  phone: string;
  name?: string;
  lastFrom?: string;
  bookingMode?: "site" | "site_chat" | "self_service" | "guided" | null;
  bookingFollowup?: {
    step?: string;
    date?: string;
    hour?: string;
    offerName?: string;
    offerId?: string;
  } | null;
  messages?: ReadonlyArray<{ from: "client" | "bot" | "agent"; text: string }>;
};

type Topic = "pets" | "children" | "birthday" | "food" | "accessibility" | "location" | "hours"
  | "prices" | "terms" | "availability" | "payment" | "self_service" | "participants" | "experience";

const plain = (value: string) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const safeMessage = (value: string) => {
  const normalized = plain(value);
  if (/^(?:meu (?:nome|cpf|whatsapp|telefone|numero)|me chamo|nome\s*:|cpf\s*:|telefone\s*:|whatsapp\s*:)/.test(normalized)) return "";
  return normalized
    .replace(/https?:\/\/\S+|www\.\S+|\b\S+@\S+\b/g, " ")
    .replace(/\b\d[\d\s()./-]{7,}\d\b/g, " ")
    .replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
};

const topicOf = (text: string): Topic | null => {
  if (/\b(?:pet|pets|cachorro|cachorros|cachorra|cao|caes|animal de estimacao|animais de estimacao)\b/.test(text)) return "pets";
  if (/\b(?:aniversariante|aniversario)\b/.test(text)) return "birthday";
  if (/\b(?:crianca|criancas|bebe|bebes|infantil)\b/.test(text)
    && /\b(?:paga|pagam|gratuidade|cortesia|valor|preco|idade|idades|anos|ano)\b/.test(text)) return "children";
  if (/\b(?:cardapio|menu|comida|alimentacao|vegano|vegana|vegetariano|vegetariana|gluten|lactose|alergia|restricao alimentar)\b/.test(text)) return "food";
  if (/\b(?:acessibilidade|cadeirante|mobilidade|acessivel|carrinho de bebe)\b/.test(text)) return "accessibility";
  if (/\b(?:como chegar|endereco|localizacao|onde fica|caminho|estrada)\b/.test(text)) return "location";
  if (/\b(?:funcionamento|abre|abrem|fecha|fecham|aberto|aberta|dias de visita)\b/.test(text)) return "hours";
  if (/\b(?:cancelamento|cancelar|reembolso|estorno|politica|politicas|multa|termos|orientacoes|regras)\b/.test(text)) return "terms";
  if (/\b(?:desconto|descontos|valor|valores|preco|precos|quanto custa)\b/.test(text)) return "prices";
  if (/\b(?:pix|cartao|pagamento|pagar|checkout|cobranca|finalizar pagamento)\b/.test(text)) return "payment";
  if (/\b(?:formulario|por conta propria|preencher sozinha|preencher sozinho)\b/.test(text)) return "self_service";
  if (/\b(?:disponibilidade|vaga|vagas|tem horario|qual data|qual dia|reservar para|reserva para)\b/.test(text)) return "availability";
  if (/\b(?:participante|participantes|adulto|adultos|grupo|idoso|idosos|bariatrico|bariatrica)\b/.test(text)) return "participants";
  if (/\b(?:brunch|trilha|combo|cachoeira|educacao ambiental|visita escolar)\b/.test(text)) return "experience";
  return null;
};

const firstName = (value: string) => {
  const first = String(value || "").trim().split(/\s+/)[0];
  return /^[\p{L}][\p{L}'’-]{0,39}$/u.test(first) ? first : "";
};

const offerLabel = (input: SiteFollowupMessageInput) => {
  const name = String(input.bookingFollowup?.offerName || "").replace(/\s+/g, " ").trim();
  if (name && name.length <= 100 && !/[\d@?:]|https?|www\.|\b(?:cpf|telefone|whatsapp)\b/i.test(name)) return name;
  const id = plain(input.bookingFollowup?.offerId || "");
  if (id.includes("brunch") && id.includes("trilha")) return "brunch e trilha";
  if (id.includes("brunch")) return "brunch";
  if (id.includes("trilha")) return "trilha";
  return "";
};

const visitDetails = (input: SiteFollowupMessageInput) => {
  const date = String(input.bookingFollowup?.date || "");
  const parsed = new Date(`${date}T12:00:00Z`);
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(parsed.getTime())
    && parsed.toISOString().slice(0, 10) === date;
  const hour = String(input.bookingFollowup?.hour || "");
  const validHour = /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(hour);
  const formatted = validDate ? `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}` : "";
  return `${formatted ? ` para ${formatted}` : ""}${validHour ? `, às ${hour}` : ""}`;
};

const faqMessage = (topic: Topic): string | null => {
  const messages: Partial<Record<Topic, string>> = {
    pets: "A gente conversou sobre levar um pet na visita. Ficou alguma dúvida sobre isso ou encontrou alguma dificuldade para reservar pelo site?",
    children: "A gente conversou sobre a visita com crianças. Ficou alguma dúvida sobre as condições para as crianças ou precisa de ajuda para reservar?",
    birthday: "A gente conversou sobre as condições para aniversariantes. Ficou alguma dúvida sobre esse assunto ou precisa de ajuda para seguir com a reserva?",
    food: "Nossa conversa passou pela alimentação na visita. Ficou alguma dúvida sobre o cardápio ou precisa de ajuda para reservar?",
    accessibility: "A gente conversou sobre acessibilidade na visita. Ficou alguma dúvida para planejar a experiência ou precisa de ajuda com a reserva?",
    location: "A gente conversou sobre como chegar à Fazenda. Ficou alguma dúvida para planejar a visita ou encontrou dificuldade para reservar pelo site?",
    hours: "A gente conversou sobre os horários de funcionamento. Ficou alguma dúvida sobre a visita ou precisa de ajuda para escolher como reservar?",
    prices: "A gente conversou sobre valores e condições da visita. Ficou alguma dúvida sobre esse assunto ou encontrou alguma dificuldade para reservar pelo site?",
    terms: "Nossa conversa passou pelas orientações e condições da visita. Ficou alguma dúvida sobre elas antes de continuar a reserva?",
  };
  return messages[topic] || null;
};

const contextMessage = (input: SiteFollowupMessageInput) => {
  const clients = (input.messages || []).filter((message) => message.from === "client");
  const latestRaw = clients[clients.length - 1]?.text || "";
  const latest = safeMessage(latestRaw);
  if (/\b(?:ja (?:paguei|conclui|finalizei|reservei|resolvi)|reserva (?:paga|confirmada))\b/.test(latest)) {
    return "Se ainda precisar de ajuda com sua visita, estou por aqui. Ficou alguma dúvida que você gostaria de esclarecer pelo site?";
  }
  const latestTopic = topicOf(latest);
  const directQuestion = latestRaw.includes("?") || /^(?:qual|quais|como|quanto|quando|onde|pode|podemos|posso|tem|aceita|aceitam)\b/.test(latest);
  const difficulty = /\b(?:nao consigo|nao consegui|dificuldade|erro|problema|travou|nao abre|nao aparece)\b/.test(latest);
  if (latestTopic && (directQuestion || difficulty)) {
    const faq = faqMessage(latestTopic);
    if (faq) return faq;
    if (latestTopic === "availability") return `A gente conversou sobre as opções para sua visita${visitDetails(input)}. Ficou alguma dúvida sobre datas ou precisa de ajuda para consultar as vagas pelo site?`;
    if (latestTopic === "payment") return "Se ainda quiser concluir sua visita, posso ajudar pelo site. Você encontrou alguma dúvida ou dificuldade na etapa de pagamento?";
    if (latestTopic === "self_service") return "A gente estava conversando sobre o formulário de reserva. Ficou alguma dúvida ou encontrou dificuldade para preencher a reserva pelo site?";
    if (latestTopic === "participants") return "A gente estava conversando sobre os participantes da visita. Ficou alguma dúvida sobre como informar o grupo para reservar pelo site?";
    if (latestTopic === "experience") {
      const experience = latest.includes("brunch") && latest.includes("trilha") ? "brunch e trilha"
        : latest.includes("brunch") ? "brunch" : latest.includes("trilha") ? "trilha"
          : latest.includes("educacao ambiental") || latest.includes("visita escolar") ? "visitas de Educação Ambiental" : "as experiências da Fazenda";
      return `A gente estava conversando sobre ${experience}. Ficou alguma dúvida sobre a experiência ou encontrou alguma dificuldade para reservar pelo site?`;
    }
  }

  const step = input.bookingFollowup?.step || "";
  const details = visitDetails(input);
  const offer = offerLabel(input);
  const explicitFormChoice = latestTopic === "self_service" && /\b(?:prefiro|quero|vou|escolho)\b/.test(latest)
    && !/\bnao (?:quero|vou|prefiro)\b/.test(latest);
  if (input.bookingMode === "site" || input.bookingMode === "self_service" || explicitFormChoice) {
    return "Você tinha escolhido preencher o formulário por conta própria. Encontrou alguma dificuldade no formulário ou ficou alguma dúvida para reservar?";
  }
  if (step === "identity_name" || step === "identity_phone" || step === "phone") {
    return "Quero ajudar você a continuar o atendimento pelo site. Ficou alguma dúvida ou encontrou alguma dificuldade para seguir com sua visita ou reserva?";
  }
  if (step === "payment" || step === "checkout") {
    return "Se ainda quiser concluir a visita, posso ajudar com a etapa de pagamento no site. Você encontrou alguma dificuldade para seguir com o pagamento?";
  }
  if (step === "summary") {
    return `Estávamos conferindo os detalhes da visita${details}${offer ? `, sobre ${offer}` : ""}. Ficou alguma dúvida sobre os detalhes ou precisa de ajuda para seguir no site?`;
  }
  if (step === "contact") {
    return "Estávamos na etapa de completar os dados no formulário. Você encontrou alguma dificuldade com o preenchimento para continuar a reserva?";
  }
  if (step === "participants") {
    return `Estávamos vendo os participantes da visita${details}. Ficou alguma dúvida sobre como informar o grupo ou as idades no formulário?`;
  }
  if (step === "guidance" || step === "terms") {
    return "Estávamos conferindo as orientações da visita. Ficou alguma dúvida sobre elas antes de seguir com a reserva?";
  }
  if (step === "time") {
    return `Estávamos escolhendo o horário da visita${details && !input.bookingFollowup?.hour ? details : ""}. Você encontrou alguma dificuldade para escolher o horário pelo site?`;
  }
  if (step === "date" || step === "availability") {
    return `Estávamos vendo as opções para sua visita${details}${offer ? `, com ${offer}` : ""}. Ficou alguma dúvida sobre a data ou encontrou dificuldade para consultar as vagas no site?`;
  }
  if (step === "booking_mode") {
    return input.bookingMode === "site_chat" || input.bookingMode === "guided"
      ? "Você tinha escolhido fazer a reserva guiada comigo. Ficou alguma dúvida ou dificuldade para continuar as etapas pelo site?"
      : "Estávamos escolhendo entre a reserva guiada comigo e o formulário para preencher no seu ritmo. Ficou alguma dúvida sobre qual opção usar para continuar?";
  }

  const recentTopic = [...clients].reverse().map((message) => topicOf(safeMessage(message.text))).find(Boolean);
  if (recentTopic) {
    const faq = faqMessage(recentTopic);
    if (faq) return faq;
    if (recentTopic === "payment") return "Se ainda quiser concluir sua visita, posso ajudar pelo site. Você encontrou alguma dúvida ou dificuldade na etapa de pagamento?";
    if (recentTopic === "self_service") return "A gente estava conversando sobre o formulário de reserva. Ficou alguma dúvida ou encontrou dificuldade para preencher a reserva pelo site?";
    if (recentTopic === "availability") return `Estávamos vendo as opções para sua visita${details}. Ficou alguma dúvida sobre datas ou precisa de ajuda para consultar as vagas pelo site?`;
    if (recentTopic === "participants") return "A gente estava conversando sobre os participantes da visita. Ficou alguma dúvida sobre como informar o grupo para reservar pelo site?";
  }
  if (offer || step === "experiences" || recentTopic === "experience") {
    return `A gente estava conversando sobre ${offer || "as experiências da Fazenda"}. Ficou alguma dúvida sobre a experiência ou encontrou alguma dificuldade para reservar pelo site?`;
  }
  return "Ficou alguma dúvida ou encontrou alguma dificuldade para planejar sua visita ou reservar pelo site?";
};

export const montarMensagemRetomadaSiteContextual = (input: SiteFollowupMessageInput): string => {
  const name = firstName(input.name || "");
  const greeting = `Oi${name ? `, ${name}` : ""}! 🌿 Sou a Jatobá, da Fazenda Vagafogo.`;
  const interrupted = input.lastFrom === "client" && input.bookingFollowup?.step === "identity_phone";
  const introduction = interrupted ? "Nossa conversa no site foi interrompida antes de eu responder." : "Nossa conversa no site ficou em pausa.";
  const params = new URLSearchParams({ atendimento: "1", origem: "retomada", sessao: input.sessionId, telefone: input.phone });
  const link = `https://vagafogo.com.br/?${params.toString()}`;
  return `${greeting}\n\n${introduction} ${contextMessage(input)}\n\nSe quiser continuar de onde paramos, toque aqui:\n${link}\n\nSe já resolveu tudo, pode desconsiderar esta mensagem. 💚`;
};
