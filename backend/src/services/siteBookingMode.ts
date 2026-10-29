import { obterRascunhoReservaAgente, salvarRascunhoReservaAgente } from "./agentReservationTools";
import { salvarModoReservaConversaSite } from "./siteChatConversations";

export type SiteBookingMode = "site" | "site_chat";
type Draft = Record<string, unknown>;
const plain = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const object = (value: unknown): Draft => value && typeof value === "object" && !Array.isArray(value) ? value as Draft : {};

export const escolhaModoReservaSite = (message: string, selection?: unknown): SiteBookingMode | null => {
  const selected = object(selection);
  if (selected.step === "booking_mode") {
    if (selected.mode === "self_service") return "site";
    if (selected.mode === "guided") return "site_chat";
  }
  const value = plain(message);
  if (message.includes("?") || /^(?:como|qual|quais|onde|quando|sera|e possivel|tem como)\b/.test(value)
    || /\b(?:nao quero|nao prefiro|nao vou|nao desejo|nao gostaria)\b/.test(value)) return null;
  const form = /\b(?:formulario|por conta propria|sozinh[ao]|eu mesm[ao]|sem ajuda)\b/.test(value);
  const guided = /\b(?:guiad[ao]|assistid[ao]|com a jatoba|com voce|passo a passo|pelo chat|no chat|me ajude|me ajuda)\b/.test(value);
  const choosing = /\b(?:prefiro|quero|gostaria|desejo|vou|vamos|escolho|pode ser)\b/.test(value)
    || /^(?:formulario|por conta propria|sozinh[ao]|guiad[ao]|com a jatoba|passo a passo)(?: por favor)?$/.test(value);
  if (!choosing || form === guided) return null;
  return form ? "site" : "site_chat";
};

const text = (value: unknown, maximum = 100) => typeof value === "string" ? value.trim().slice(0, maximum) : "";
const safeKey = (key: string) => /^[A-Za-z0-9_-]{1,100}$/.test(key) && !["__proto__", "constructor", "prototype"].includes(key);
const quantities = (value: unknown) => Object.fromEntries(Object.entries(object(value))
  .filter(([key, count]) => safeKey(key) && Number.isInteger(count) && Number(count) >= 0 && Number(count) <= 99).slice(0, 30));
const ages = (value: unknown) => Object.fromEntries(Object.entries(object(value))
  .filter(([key, items]) => safeKey(key) && Array.isArray(items)
    && items.length <= 99 && items.every((age) => Number.isInteger(age) && age >= 0 && age <= 120)).slice(0, 30));
const times = (value: unknown) => Object.fromEntries(Object.entries(object(value))
  .filter(([key, hour]) => safeKey(key) && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(String(hour))).slice(0, 30));

export const urlFormularioReservaSite = (draft: Draft) => {
  const url = new URL("https://vagafogo.com.br/reservar");
  const offerId = text(draft.ofertaId);
  if (offerId && (draft.tipoOferta === "combo" || draft.tipoOferta === "pacote")) {
    url.searchParams.set(draft.tipoOferta === "combo" ? "combo" : "pacote", offerId);
  }
  const date = text(draft.data, 20);
  const parsedDate = new Date(`${date}T12:00:00Z`);
  if (/^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(parsedDate.getTime())
    && parsedDate.toISOString().slice(0, 10) === date) url.searchParams.set("data", date);
  const hour = text(draft.horario, 20);
  if (/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(hour)) url.searchParams.set("horario", hour);
  const maps = {
    participantes: quantities(draft.participantesPorTipo),
    idades: ages(draft.idadesPorTipo),
    horarios: times(draft.horariosPorPacote),
  };
  for (const [key, value] of Object.entries(maps)) {
    const serialized = JSON.stringify(value);
    if (Object.keys(value).length && serialized.length <= 8000) url.searchParams.set(key, serialized);
  }
  return url.toString();
};

export const respostaFormularioReservaSite = (url: string, saved: boolean) => saved
  ? `Claro! Você escolheu preencher a reserva por conta própria. Abra o formulário oficial para conferir os dados já informados e continuar:\n\n${url}\n\nOs campos que ainda faltam podem ser preenchidos por lá. 🌿`
  : `Você escolheu preencher a reserva por conta própria. Não consegui confirmar o salvamento dos dados do atendimento agora. Abra o formulário oficial e confira as informações antes de continuar:\n\n${url}`;

type Dependencies = {
  getDraft?: typeof obterRascunhoReservaAgente;
  saveDraft?: typeof salvarRascunhoReservaAgente;
  saveChoice?: typeof salvarModoReservaConversaSite;
};

export const carregarContextoModoReservaSite = async (input: {
  sessionId: string;
  phone: string;
  mode: SiteBookingMode | null;
  draft?: unknown;
}, dependencies: Pick<Dependencies, "getDraft"> = {}) => {
  let mode = input.mode;
  let draft = { ...object(input.draft) };
  if (input.phone) {
    try {
      const stored = await (dependencies.getDraft || obterRascunhoReservaAgente)({ sessionId: input.sessionId, telefone: input.phone });
      const canonical = object(stored.dados);
      draft = { ...draft, ...canonical };
      if (!mode && (canonical.canalConclusao === "site" || canonical.canalConclusao === "site_chat")) mode = canonical.canalConclusao;
    } catch {
      // A escolha já persistida continua válida quando o rascunho não puder ser lido.
    }
  }
  return { mode, draft };
};

export const selecionarModoReservaSite = async (input: {
  sessionId: string;
  phone: string;
  mode: SiteBookingMode;
  bookingUi?: unknown;
}, dependencies: Dependencies = {}) => {
  let draft = { ...object(object(input.bookingUi).draft) };
  let saved = true;
  if (input.phone) {
    try {
      const stored = await (dependencies.getDraft || obterRascunhoReservaAgente)({ sessionId: input.sessionId, telefone: input.phone });
      draft = { ...draft, ...object(stored.dados) };
      const persisted = await (dependencies.saveDraft || salvarRascunhoReservaAgente)({
        ...draft, sessionId: input.sessionId, telefone: input.phone,
        canalConclusao: input.mode, siteBookingStarted: true,
      });
      draft = { ...draft, ...object(persisted.dados) };
    } catch {
      saved = false;
    }
  }
  draft = { ...draft, canalConclusao: input.mode, siteBookingStarted: true };
  const formUrl = input.mode === "site" ? urlFormularioReservaSite(draft) : null;
  await (dependencies.saveChoice || salvarModoReservaConversaSite)(input.sessionId, input.mode, formUrl);
  return {
    mode: input.mode, draft, saved, booking_form_url: formUrl,
    reply: input.mode === "site" ? respostaFormularioReservaSite(formUrl!, saved) : "",
    selection: { step: "booking_mode", mode: input.mode === "site" ? "self_service" : "guided" },
  };
};

export const uiReservaGuiadaSemRepetirEscolha = (draft: Draft) => {
  const hasParticipants = Object.values(quantities(draft.participantesPorTipo)).some((count) => Number(count) > 0);
  const step = !draft.ofertaId ? "experiences" : !draft.data ? "date" : hasParticipants ? "availability" : "participants";
  const reply = step === "experiences" ? "Seguimos com a reserva guiada. Escolha a experiência para continuarmos. 🌿"
    : step === "date" ? "Seguimos com a reserva guiada. Escolha a data da visita para continuarmos. 🌿"
      : step === "availability" ? "Já tenho os participantes informados. Posso conferir as vagas para a data e o horário escolhidos? 🌿"
      : "Seguimos com os dados já informados. Confira os participantes para continuarmos com a reserva. 🌿";
  return { step, draft, reply };
};

export const corrigirRepeticaoModoReservaSite = (body: Record<string, any>, mode: SiteBookingMode | null, draft: Draft, storedUrl?: string | null) => {
  if (body.booking_ui?.step !== "booking_mode" || !mode) return false;
  // Um encaminhamento operacional já aprovado tem prioridade sobre um cartão
  // de escolha antigo enviado junto pela IA.
  if (body.handoff && typeof body.handoff === "object") return false;
  const reply = plain(String(body.resposta || ""));
  const repeatsChoice = !reply || /\bcomo prefere(?: seguir| reservar)?\b|\bqual (?:opcao|forma) (?:voce )?prefere\b/.test(reply)
    || (/\b(?:chat|guiad[ao]|jatoba|passo a passo)\b/.test(reply)
      && /\b(?:formulario|por conta propria)\b/.test(reply)
      && /\b(?:prefere|escolha|escolhe|quer|deseja)\b/.test(reply));
  if (!repeatsChoice) {
    // Um cartão antigo não deve esconder uma resposta válida à dúvida atual.
    body.booking_ui = null;
    return true;
  }
  if (mode === "site") {
    const freshUrl = urlFormularioReservaSite(draft);
    const url = new URL(freshUrl).search ? freshUrl : storedUrl || freshUrl;
    body.resposta = respostaFormularioReservaSite(url, true);
    body.booking_form_url = url;
    body.booking_ui = null;
  } else {
    const corrected = uiReservaGuiadaSemRepetirEscolha(draft);
    body.resposta = corrected.reply;
    body.booking_ui = { step: corrected.step, draft: corrected.draft };
  }
  body.handoff = null;
  body.mensagens_adicionais = [];
  return true;
};
