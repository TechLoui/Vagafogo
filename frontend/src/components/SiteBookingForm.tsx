import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { ptBR } from "date-fns/locale";
import {
  FaArrowRight, FaCalendarAlt, FaCheck, FaClock, FaCreditCard,
  FaHiking, FaLeaf, FaQrcode, FaRegCheckCircle, FaUser,
  FaUsers, FaUtensils, FaWhatsapp,
} from "react-icons/fa";

const API_BASE = (import.meta.env.VITE_API_BASE || "https://vagafogo-production.up.railway.app").replace(/\/+$/, "");
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

type VisitorType = { id: string; nome: string; descricao?: string; idadeMinima?: number; idadeMaxima?: number };
type Package = {
  id: string; nome: string; descricao?: string; iconeUrl?: string; emoji?: string;
  modoHorario: string; horarios: string[]; diasSemana: number[]; datasBloqueadas: string[];
  horarioInicio?: string; horarioFim?: string; aviso?: string;
  aceitaPet: boolean; precosPorTipo: Record<string, number>;
};
type Combo = {
  id: string; nome: string; descricao?: string; iconeUrl?: string; emoji?: string;
  pacoteIds: string[]; precosPorTipo: Record<string, number>; preco: number; desconto: number;
};
type Catalog = { tiposClientes: VisitorType[]; pacotes: Package[]; combos: Combo[] };
type SiteAgenda = {
  mes: string;
  dias: Record<string, Record<string, string[]>>;
  vagas?: Record<string, Record<string, Record<string, number | null>>>;
};

export type BookingProgress = {
  selectedIds: string[];
  preferredComboId: string;
  date: string;
  times: Record<string, string>;
  counts: Record<string, number>;
};

export type BookingUi = {
  step: "identity_phone" | "booking_mode" | "phone" | "experiences" | "date" | "time" | "participants" | "guidance" | "contact" | "summary" | "payment" | "availability";
  reminderOptIn?: boolean;
  fields?: string[];
  draft?: {
    tipoOferta?: string;
    ofertaId?: string;
    data?: string;
    horario?: string;
    horariosPorPacote?: Record<string, string>;
    participantesPorTipo?: Record<string, number>;
  };
};

export type SiteBookingSelection = {
  step: "time";
  tipoOferta: string;
  ofertaId: string;
  data: string;
  horariosPorPacote: Record<string, string>;
} | { step: "guidance"; accepted: boolean };

const validCpf = (input: string) => {
  const cpf = input.replace(/\D/g, "");
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  for (let length = 9; length <= 10; length += 1) {
    const sum = Array.from({ length }, (_, index) => Number(cpf[index]) * (length + 1 - index)).reduce((a, b) => a + b, 0);
    const digit = (sum * 10) % 11;
    if ((digit === 10 ? 0 : digit) !== Number(cpf[length])) return false;
  }
  return true;
};

const normalizePhone = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("55")) return digits.slice(0, 13);
  return digits.length === 10 || digits.length === 11 ? `55${digits}` : "";
};

const formatPhone = (value: string) => {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("55")) digits = digits.slice(2);
  digits = digits.slice(0, 11);
  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  const split = digits.length === 11 ? 7 : 6;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, split)}-${digits.slice(split)}`;
};

const quantityOf = (counts: Record<string, number>, id: string) => Math.max(0, Math.min(99, Number(counts[id]) || 0));
const readableDate = (date: string) => date ? date.split("-").reverse().join("/") : "";
const dateFromKey = (key: string) => /^\d{4}-\d{2}-\d{2}$/.test(key) ? new Date(`${key}T12:00:00`) : undefined;
const keyFromDate = (day: Date) => `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
const displayHour = (value: string) => value.replace(/:00$/, "h");
const cardColumns = { gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 170px), 1fr))" };
const choiceColumns = { gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 190px), 1fr))" };
const inputClass = "mt-1.5 w-full rounded-xl border border-[#d4ded1] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#20745a] focus:ring-2 focus:ring-[#20745a]/15";

const participantOrder = (type: VisitorType) => {
  const name = type.nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (name.includes("adult")) return 0;
  if (name.includes("crianca")) return 1;
  return 2;
};

const participantHint = (type: VisitorType) => {
  const description = type.descricao?.trim() || "";
  const name = type.nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const minimum = typeof type.idadeMinima === "number" && Number.isFinite(type.idadeMinima) ? type.idadeMinima : undefined;
  const maximum = typeof type.idadeMaxima === "number" && Number.isFinite(type.idadeMaxima) ? type.idadeMaxima : undefined;
  const age = minimum !== undefined && maximum !== undefined
    ? `De ${minimum} a ${maximum} anos`
    : minimum !== undefined ? `A partir de ${minimum} anos`
      : maximum !== undefined ? `Até ${maximum} anos` : "";
  if (description) return age && !/\d+\s*(?:a|até|anos?)/i.test(description) ? `${age} · ${description}` : description;
  if (age) return name.includes("nao pagante") || name.includes("isento") ? `${age} · sem cobrança` : age;
  if (name.includes("nao pagante") || name.includes("isento")) return "Crianças de 0 a 4 anos · isentas de pagamento";
  if (name.includes("crianca")) return "Crianças de 5 a 12 anos";
  if (name.includes("idos")) return "Pessoas a partir de 60 anos";
  if (name.includes("adult")) return "Pessoas a partir de 13 anos";
  if (name.includes("bariat")) return "Categoria bariátrica, com valor próprio";
  return "";
};

function OfferIcon({ name, url, emoji, combo = false, small = false }: {
  name: string; url?: string; emoji?: string; combo?: boolean; small?: boolean;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [url]);
  const fallbackIcon = /trilha|mata|natureza/i.test(name) ? FaHiking : /brunch|gastron|almo/i.test(name) ? FaUtensils : FaLeaf;
  const FallbackIcon = fallbackIcon;
  const validUrl = typeof url === "string" && (/^https:\/\//i.test(url) || url.startsWith("/"));
  return (
    <span className={`grid shrink-0 place-items-center overflow-hidden rounded-xl border border-[#e1e9db] bg-[#f1f6ec] text-[#287457] ${small ? "h-9 w-9" : "h-12 w-12"}`} aria-hidden="true">
      {validUrl && !imageFailed ? <img src={url} alt="" loading="lazy" onError={() => setImageFailed(true)} className="h-full w-full object-cover" />
        : emoji ? <span className={small ? "text-lg" : "text-2xl"}>{emoji}</span>
          : combo ? <span className="flex items-center gap-0.5"><FaUtensils className={small ? "text-xs" : "text-sm"} /><FaHiking className={small ? "text-xs" : "text-sm"} /></span>
            : <FallbackIcon className={small ? "text-base" : "text-xl"} />}
    </span>
  );
}

const stages = {
  identity_phone: { title: "Seu WhatsApp", hint: "Para retomarmos este atendimento, se for necessário.", icon: FaWhatsapp },
  booking_mode: { title: "Como prefere reservar?", hint: "Escolha o jeito mais confortável para você.", icon: FaLeaf },
  phone: { title: "Seu WhatsApp", hint: "Para acompanhar os detalhes da sua reserva.", icon: FaUser },
  experiences: { title: "Escolha a experiência", hint: "Marque o brunch, a trilha ou os dois.", icon: FaLeaf },
  date: { title: "Escolha a data", hint: "Qual dia fica melhor para sua visita?", icon: FaCalendarAlt },
  time: { title: "Escolha o horário", hint: "A Jatobá confirmará as vagas para você.", icon: FaClock },
  participants: { title: "Quantas pessoas vão?", hint: "Informe as pessoas por categoria. O total aparece no resumo.", icon: FaUsers },
  guidance: { title: "Antes de continuar", hint: "Confira as orientações da sua visita.", icon: FaRegCheckCircle },
  contact: { title: "Dados para a reserva", hint: "Preencha apenas o que ainda falta.", icon: FaUser },
  summary: { title: "Confira sua reserva", hint: "Leia os dados abaixo antes de confirmar.", icon: FaRegCheckCircle },
  payment: { title: "Como prefere pagar?", hint: "Sua reserva é confirmada após a aprovação do pagamento.", icon: FaCreditCard },
};

export function SiteBookingForm({ ui, sending, onAnswer, progress, onProgress, summaryText }: {
  ui: BookingUi;
  sending: boolean;
  onAnswer: (message: string, phone?: string, selection?: SiteBookingSelection) => Promise<boolean>;
  progress: BookingProgress;
  onProgress: (patch: Partial<BookingProgress>) => void;
  summaryText?: string;
}) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [catalogError, setCatalogError] = useState("");
  const [date, setDate] = useState(ui.draft?.data || progress.date || "");
  const [calendarMonth, setCalendarMonth] = useState((ui.draft?.data || progress.date || today()).slice(0, 7));
  const [agendaState, setAgendaState] = useState<{ key: string; value?: SiteAgenda; error?: boolean }>({ key: "" });
  const [agendaRefresh, setAgendaRefresh] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>(progress.selectedIds);
  const [preferredComboId, setPreferredComboId] = useState(progress.preferredComboId);
  const [times, setTimes] = useState<Record<string, string>>({ ...progress.times, ...ui.draft?.horariosPorPacote });
  const [counts, setCounts] = useState<Record<string, number>>({ ...progress.counts, ...ui.draft?.participantesPorTipo });
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [pet, setPet] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const revealContinue = () => requestAnimationFrame(() => submitButtonRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));

  useEffect(() => {
    if (ui.step === "identity_phone" || ui.step === "booking_mode") return;
    const controller = new AbortController();
    fetch(`${API_BASE}/atendimento/site/catalogo`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Não consegui carregar as opções agora.");
        return response.json() as Promise<Catalog>;
      })
      .then((value) => {
        if (!Array.isArray(value.pacotes) || !Array.isArray(value.combos) || !Array.isArray(value.tiposClientes)) throw new Error("As opções estão indisponíveis.");
        setCatalog(value);
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setCatalogError(cause instanceof Error ? cause.message : "As opções estão indisponíveis.");
      });
    return () => controller.abort();
  }, [ui.step]);

  useEffect(() => {
    if (!catalog || !ui.draft?.ofertaId) return;
    if (ui.draft.tipoOferta === "combo") {
      const ids = catalog.combos.find((item) => item.id === ui.draft?.ofertaId)?.pacoteIds || [];
      setSelectedIds(ids);
      setPreferredComboId(ui.draft.ofertaId);
      onProgress({ selectedIds: ids, preferredComboId: ui.draft.ofertaId });
    } else {
      setSelectedIds([ui.draft.ofertaId]);
      setPreferredComboId("");
      onProgress({ selectedIds: [ui.draft.ofertaId], preferredComboId: "" });
    }
  }, [catalog, ui.draft?.ofertaId, ui.draft?.tipoOferta, onProgress]);

  const selected = useMemo(() => catalog?.pacotes.filter((item) => selectedIds.includes(item.id)) || [], [catalog, selectedIds]);
  const orderedTypes = useMemo(() => [...(catalog?.tiposClientes || [])].sort((a, b) => participantOrder(a) - participantOrder(b)), [catalog]);
  const selectedPackageKey = selected.map((item) => item.id).sort().join(",");
  const matchingCombos = catalog?.combos.filter((item) => item.pacoteIds.length === selectedIds.length && item.pacoteIds.every((id) => selectedIds.includes(id))) || [];
  const combo = matchingCombos.find((item) => item.id === preferredComboId) || matchingCombos[0];
  const scheduled = selected.filter((item) => item.modoHorario !== "intervalo" && item.horarios.length > 0);
  const knownTime = (item: Package) => times[item.id] || (scheduled.length === 1 ? ui.draft?.horario || "" : "");
  const missingTime = scheduled.some((item) => !knownTime(item));
  const step = (ui.step === "participants" || ui.step === "availability") && missingTime ? "time" : ui.step;
  const agendaMonth = (step === "time" || step === "participants") && date ? date.slice(0, 7) : calendarMonth;
  const agendaKey = `${agendaMonth}:${selectedPackageKey}`;
  const agenda = agendaState.key === agendaKey ? agendaState.value : undefined;
  const agendaError = agendaState.key === agendaKey && agendaState.error;

  useEffect(() => {
    if ((step !== "date" && step !== "time" && step !== "participants") || !selectedPackageKey) return;
    const controller = new AbortController();
    setAgendaState((current) => current.key === agendaKey && current.value ? current : { key: agendaKey });
    const params = new URLSearchParams({ mes: agendaMonth, pacotes: selectedPackageKey });
    fetch(`${API_BASE}/atendimento/site/agenda?${params}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("AGENDA_UNAVAILABLE");
        return response.json() as Promise<SiteAgenda>;
      })
      .then((value) => {
        if (!controller.signal.aborted) setAgendaState({ key: agendaKey, value });
      })
      .catch(() => {
        if (!controller.signal.aborted) setAgendaState({ key: agendaKey, error: true });
      });
    return () => controller.abort();
  }, [step, agendaKey, agendaMonth, selectedPackageKey, agendaRefresh]);

  useEffect(() => {
    if (step !== "date" && step !== "time" && step !== "participants") return;
    const interval = window.setInterval(() => setAgendaRefresh((current) => current + 1), 60_000);
    const refreshOnFocus = () => setAgendaRefresh((current) => current + 1);
    window.addEventListener("focus", refreshOnFocus);
    return () => { window.clearInterval(interval); window.removeEventListener("focus", refreshOnFocus); };
  }, [step]);

  useEffect(() => {
    if (step !== "date" || !date || !agenda) return;
    if (!selected.length || !selected.every((item) => (agenda.dias[date]?.[item.id] ?? []).length > 0)) {
      setDate("");
      onProgress({ date: "", times: {} });
    }
  }, [step, date, agenda, selected, onProgress]);
  if (step === "availability") return null;

  const weekday = date ? new Date(`${date}T12:00:00Z`).getUTCDay() : -1;
  const packageUnavailableOn = (item: Package, day: string, dayOfWeek: number) =>
    (item.diasSemana?.length > 0 && !item.diasSemana.includes(dayOfWeek)) || item.datasBloqueadas?.includes(day);
  const unavailableIds = new Set((catalog?.pacotes || []).filter((item) => date && packageUnavailableOn(item, date, weekday)).map((item) => item.id));
  const unavailable = selected.filter((item) => unavailableIds.has(item.id));
  const dateHasTimes = (key: string) => Boolean(agenda?.dias[key] && selected.length > 0
    && selected.every((item) => (agenda?.dias[key]?.[item.id] ?? []).length > 0));
  const hourAvailable = (item: Package, hour: string) => Boolean(agenda?.dias[date]?.[item.id]?.includes(hour));
  const remainingFor = (item: Package, hour: string) => agenda?.vagas?.[date]?.[item.id]?.[hour];
  const remainingByPackage = selected.map((item) => remainingFor(item, item.modoHorario === "intervalo" ? "" : knownTime(item)));
  const availabilityReady = selected.length > 0 && remainingByPackage.every((value) => value !== undefined);
  const finiteRemaining = remainingByPackage.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const remainingPlaces = finiteRemaining.length ? Math.min(...finiteRemaining) : null;
  const participantCount = orderedTypes.reduce((total, type) => total + quantityOf(counts, type.id), 0);
  const participantsExceedCapacity = remainingPlaces !== null && participantCount > remainingPlaces;
  const trailPackages = selected.filter((item) => item.modoHorario === "intervalo");
  const adultType = catalog?.tiposClientes.find((item) => /adult/i.test(item.nome));
  const adultPrice = (offer: Package | Combo) => adultType ? Number(offer.precosPorTipo?.[adultType.id]) || 0 : 0;
  const featuredCombo = catalog?.combos.find((item) => item.pacoteIds.length === 2
    && /brunch/i.test(item.nome) && /trilha/i.test(item.nome)
    && item.pacoteIds.every((id) => catalog.pacotes.some((pack) => pack.id === id)));
  const featuredPackages = featuredCombo?.pacoteIds.map((id) => catalog?.pacotes.find((pack) => pack.id === id)).filter((item): item is Package => Boolean(item)) || [];
  const featuredRegularPrice = featuredPackages.reduce((sum, item) => sum + adultPrice(item), 0);
  const featuredComboPrice = featuredCombo ? adultPrice(featuredCombo) : 0;
  const featuredSavings = Math.max(0, Math.round((featuredRegularPrice - featuredComboPrice) * 100) / 100);
  const quote = orderedTypes.map((type) => {
    const quantity = quantityOf(counts, type.id);
    const packageSum = selected.reduce((sum, item) => sum + (Number(item.precosPorTipo?.[type.id]) || 0), 0);
    const hasCategoryPrices = combo && catalog.tiposClientes.some((visitor) => Number(combo.precosPorTipo?.[visitor.id]) > 0);
    const unit = combo
      ? hasCategoryPrices ? Number(combo.precosPorTipo?.[type.id]) || 0
        : combo.preco > 0 ? combo.preco : packageSum * (1 - Math.min(100, Math.max(0, combo.desconto || 0)) / 100)
      : packageSum;
    return { type, quantity, unit, subtotal: Math.round(unit * quantity * 100) / 100 };
  }).filter((item) => item.quantity > 0);
  const fields = ui.fields || [];
  const needsName = fields.length === 0 || fields.includes("nome");
  const needsEmail = fields.length === 0 || fields.includes("e-mail");
  const needsCpf = fields.length === 0 || fields.some((field) => field.toLowerCase().includes("cpf"));
  const needsPet = fields.includes("presenca de pet") && selected.some((item) => item.aceitaPet);
  const petRestricted = selected.some((item) => !item.aceitaPet);
  const brunchHasScheduledTime = scheduled.some((item) => /brunch|gastron/i.test(item.nome));
  const stage = step === "date" && selected.length
    ? { ...stages.date, hint: combo?.nome || selected.map((item) => item.nome).join(" + ") }
    : step === "time" && brunchHasScheduledTime
    ? { title: "Escolha o horário do brunch", hint: "Esse é o horário de sentar à mesa. A trilha, se incluída, não tem horário marcado.", icon: FaClock }
    : stages[step];
  const estimate = quote.reduce((sum, item) => sum + item.subtotal, 0);
  const summaryBody = summaryText?.replace(/\*/g, "").replace(/\n\s*\n/g, "\n").trim()
    .replace(/\nEstá tudo correto para seguirmos para o pagamento\?\s*$/i, "");
  const liveSummary = selected.length > 0 ? (
    <details className="group overflow-hidden rounded-xl border border-[#d8e7d7] bg-[#f6faf3] text-[#31513c]">
      <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#20745a] [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-2"><FaRegCheckCircle className="shrink-0 text-[#20745a]" aria-hidden="true" /><span className="truncate">Ver resumo da visita</span></span>
        <span className="flex shrink-0 items-center gap-2 text-[#20745a]">{quote.length ? money.format(estimate) : "Em andamento"}<span aria-hidden="true" className="text-base leading-none transition-transform group-open:rotate-180">⌄</span></span>
      </summary>
      <div className="space-y-1.5 border-t border-[#dce9d8] px-3 py-2.5 text-[11px] leading-relaxed">
        <p><strong>Experiência:</strong> {combo?.nome || selected.map((item) => item.nome).join(" + ")}</p>
        <p><strong>Data:</strong> {date ? readableDate(date) : "a escolher"}</p>
        {scheduled.map((item) => <p key={item.id}><strong>{/brunch|gastron/i.test(item.nome) ? "Brunch" : item.nome}:</strong> {knownTime(item) ? `${displayHour(knownTime(item))} (horário marcado)` : "horário a escolher"}</p>)}
        {trailPackages.length > 0 && <p><strong>Trilha:</strong> dentro da faixa de funcionamento, com entrada até 15h</p>}
        <p><strong>Participantes:</strong> {quote.length ? quote.map(({ type, quantity }) => `${quantity} ${type.nome.toLowerCase()}`).join(", ") : "a informar"}</p>
        {quote.length > 0 && <div className="space-y-0.5 border-t border-[#dce9d8] pt-1.5">{quote.map(({ type, quantity, subtotal }) => <p key={type.id} className="flex justify-between gap-2"><span>{quantity} × {type.nome}</span><span>{money.format(subtotal)}</span></p>)}<p className="flex justify-between gap-2 pt-1 font-bold"><span>Total</span><span>{money.format(estimate)}</span></p></div>}
        <p className="text-[#718075]">As vagas serão confirmadas antes do pagamento.</p>
      </div>
    </details>
  ) : null;

  const answer = async (message: string, contactPhone?: string, selection?: SiteBookingSelection) => {
    setError("");
    const accepted = await onAnswer(message, contactPhone, selection);
    if (!accepted) setError("Não consegui enviar esta resposta. Tente novamente ou escreva no chat.");
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (sending) return;
    if (step === "identity_phone" || step === "phone") {
      const normalized = normalizePhone(phone);
      if (normalized.length < 12 || normalized.length > 13) { setError("Informe um WhatsApp válido com DDD."); return; }
      await answer(`Meu WhatsApp para este atendimento é ${formatPhone(normalized)}.`, normalized);
    } else if (step === "date") {
      if (!date || date < today() || unavailable.length || !dateHasTimes(date)) { setError("Escolha uma data com horários disponíveis para a experiência."); return; }
      await answer(`Gostaria de reservar para ${readableDate(date)}.`);
    } else if (step === "experiences") {
      if (!selected.length || unavailable.length) { setError("Escolha uma experiência disponível para a data informada."); return; }
      await answer(`Quero reservar ${combo?.nome || selected.map((item) => item.nome).join(" e ")}.`);
    } else if (step === "time") {
      if (scheduled.some((item) => !hourAvailable(item, times[item.id] || knownTime(item)))) { setError("Escolha um horário disponível para continuar."); return; }
      const selectedTimes = Object.fromEntries(scheduled.map((item) => [item.id, times[item.id] || knownTime(item)]));
      await answer(
        `Para a reserva, prefiro ${scheduled.map((item) => `${item.nome} às ${selectedTimes[item.id]}`).join(" e ")}.`,
        undefined,
        {
          step: "time",
          tipoOferta: ui.draft?.tipoOferta || "",
          ofertaId: ui.draft?.ofertaId || "",
          data: ui.draft?.data || "",
          horariosPorPacote: selectedTimes,
        },
      );
    } else if (step === "participants") {
      if (!quote.length) { setError("Informe quantas pessoas vão participar."); return; }
      if (!availabilityReady) { setError("Aguarde a atualização das vagas ou informe as pessoas por mensagem."); return; }
      if (participantsExceedCapacity) { setError(`Há ${remainingPlaces} ${remainingPlaces === 1 ? "vaga disponível" : "vagas disponíveis"} para esta opção. Ajuste a quantidade para continuar.`); return; }
      const timeReminder = scheduled.length && !missingTime
        ? ` Horário escolhido: ${scheduled.map((item) => `${item.nome} às ${knownTime(item)}`).join(" e ")}.`
        : "";
      await answer(`Seremos ${quote.map(({ type, quantity }) => `${quantity} ${type.nome.toLowerCase()}`).join(", ")}.${timeReminder} Pode confirmar se há vaga para o grupo?`);
    } else if (step === "contact") {
      if ((needsName && fullName.trim().split(/\s+/).length < 2) || (needsEmail && !email.includes("@")) || (needsCpf && !validCpf(cpf)) || (needsPet && !pet)) {
        setError("Confira os dados solicitados para continuar."); return;
      }
      const parts = [
        needsName ? `Nome completo: ${fullName.trim()}` : "",
        needsEmail ? `E-mail: ${email.trim()}` : "",
        needsCpf ? `CPF: ${cpf.replace(/\D/g, "")}` : "",
        needsPet ? (pet === "yes" ? "Vamos levar pet" : "Não vamos levar pet") : fields.includes("presenca de pet") ? "Não vamos levar pet" : "",
      ].filter(Boolean);
      await answer(`${parts.join(". ")}.`);
    }
  };

  const togglePackage = (id: string) => {
    const next = selectedIds.includes(id) ? selectedIds.filter((value) => value !== id) : [...selectedIds, id];
    setPreferredComboId("");
    setSelectedIds(next);
    setTimes({});
    setCounts({});
    onProgress({ selectedIds: next, preferredComboId: "", times: {}, counts: {} });
    setError("");
  };
  // Uma sessão antiga pode conter uma etapa de outra versão do site. Nesse
  // caso o campo interativo some, mas a conversa por texto continua disponível.
  if (!stage) return null;
  const StageIcon = stage.icon;

  if (step === "booking_mode") return (
    <div className="min-w-0 bg-[#f8fbf6] p-3.5 text-[#263d31]" aria-label="Escolha como reservar">
      <p className="text-sm font-bold text-[#244b38]">Como prefere reservar?</p>
      <div className="mt-3 grid gap-2" style={choiceColumns}>
        <button type="button" disabled={sending} onClick={() => void answer("Quero fazer a reserva guiada pela Jatobá, passo a passo.")} className="flex min-h-16 items-center gap-3 rounded-xl border border-[#bcdcc7] bg-white px-3 py-2.5 text-left text-sm font-semibold text-[#245139] transition hover:border-[#20745a] hover:bg-[#f0f8f1] disabled:opacity-50"><FaUser className="shrink-0 text-[#20745a]" aria-hidden="true" /><span>Reservar com a Jatobá<small className="mt-0.5 block text-[11px] font-normal text-[#617267]">Acompanhamento pelo chat, passo a passo</small></span></button>
        <button type="button" disabled={sending} onClick={() => void answer("Prefiro preencher o formulário da reserva por conta própria.")} className="flex min-h-16 items-center gap-3 rounded-xl border border-[#e4d5c3] bg-white px-3 py-2.5 text-left text-sm font-semibold text-[#58412d] transition hover:border-[#a97a4b] hover:bg-[#fffaf3] disabled:opacity-50"><FaArrowRight className="shrink-0 text-[#8b4f23]" aria-hidden="true" /><span>Preencher por conta própria<small className="mt-0.5 block text-[11px] font-normal text-[#806c56]">Abrir o formulário oficial de reservas</small></span></button>
      </div>
    </div>
  );

  if (step === "guidance") return (
    <div className="min-w-0 bg-[#f8fbf6] p-3.5 text-[#263d31]" aria-label="Orientações da reserva">
      <div className="flex items-center gap-2.5 text-sm font-bold text-[#244b38]"><FaRegCheckCircle className="text-[#20745a]" aria-hidden="true" />Antes de continuar</div>
      {liveSummary && <div className="mt-3">{liveSummary}</div>}
      <div className="mt-3 space-y-2 text-xs leading-relaxed text-[#445a49]">
        <p>• Brunch e combo exigem reserva e pagamento antecipados; não são vendidos no balcão.</p>
        <p>• A trilha individual pode ser paga no local, conforme a disponibilidade.</p>
        <p>• A reserva só está confirmada após o pagamento aprovado.</p>
        <p>• Se você parar antes de concluir, podemos enviar um único aviso para o WhatsApp informado.</p>
      </div>
      <div className="mt-4 grid gap-2" style={choiceColumns}>
        <button type="button" disabled={sending} onClick={() => void answer("Li as orientações e concordo em continuar a reserva.", undefined, { step: "guidance", accepted: true })} className="min-h-11 rounded-xl bg-[#20745a] px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Concordo</button>
        <button type="button" disabled={sending} onClick={() => void answer("Não concordo com as orientações da reserva.", undefined, { step: "guidance", accepted: false })} className="min-h-11 rounded-xl border border-[#cddfcf] bg-white px-3 py-2.5 text-sm font-semibold text-[#305944] disabled:opacity-50">Não concordo</button>
      </div>
    </div>
  );

  return (
    <form onSubmit={(event) => void submit(event)} className="min-w-0 bg-white text-[#263d31]" aria-label="Responder à Jatobá">
      <div className="border-b border-[#e6ecdf] bg-gradient-to-r from-[#f3f8ee] via-[#fbfcf8] to-white px-3.5 py-3 sm:px-4">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#dfeee0] text-[#20745a]"><StageIcon aria-hidden="true" /></span>
          <div className="min-w-0"><p className="text-sm font-bold leading-snug text-[#244b38]">{stage.title}</p><p className="mt-0.5 text-xs leading-relaxed text-[#65766a]">{stage.hint}</p></div>
        </div>
      </div>
      {step === "summary" && summaryBody
        ? <div className="px-3 pt-3 sm:px-3.5"><div role="region" aria-label="Resumo completo da reserva" tabIndex={0} className="max-h-[min(38dvh,260px)] overflow-y-auto overscroll-contain rounded-xl border border-[#d8e7d7] bg-[#f6faf3] px-3 py-2.5 text-xs leading-[1.5] whitespace-pre-line text-[#31513c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#20745a]">{summaryBody}</div></div>
        : liveSummary && <div className="px-3 pt-3 sm:px-3.5">{liveSummary}</div>}
      <div className="space-y-2.5 p-3 sm:p-3.5">
        {(step === "identity_phone" || step === "phone") && <label className="block text-xs font-semibold text-[#425c49]">WhatsApp com DDD<input type="tel" inputMode="tel" autoComplete="tel" value={formatPhone(phone)} onChange={(event) => setPhone(event.target.value)} placeholder="(62) 99999-9999" required className={inputClass} /></label>}
        {(step === "date" || step === "time" || step === "participants") && trailPackages.map((item) => (
          <div key={`trail-${item.id}`} className="rounded-xl border border-[#dbe9d8] bg-[#f3f8ef] px-3 py-2 text-[11px] leading-[1.45] text-[#3d6147]">
            <strong className="block text-xs">{item.nome} · {item.horarioInicio && item.horarioFim ? `${displayHour(item.horarioInicio)}–${displayHour(item.horarioFim)}` : "faixa de funcionamento"}</strong>
            <span>Sem hora marcada{scheduled.length ? ": faça antes ou depois do brunch" : ""}. Entrada até 15h; saída até 16h. Sem pets ou alimentos; água permitida.</span>
            {item.aviso && <span className="mt-0.5 block">{item.aviso}</span>}
          </div>
        ))}

        {step === "date" && (
          <div className="min-w-0">
            <p className="mb-2 text-xs font-semibold text-[#425c49]">Data da visita</p>
            <div className="overflow-hidden rounded-2xl border border-[#dce6d8] bg-white p-1.5 sm:p-2">
              <DayPicker
                mode="single"
                selected={dateFromKey(date)}
                month={dateFromKey(`${calendarMonth}-01`)}
                onMonthChange={(month) => { setCalendarMonth(keyFromDate(month).slice(0, 7)); setDate(""); onProgress({ date: "", times: {} }); setError(""); }}
                onSelect={(day) => { const next = day ? keyFromDate(day) : ""; setDate(next); setTimes({}); onProgress({ date: next, times: {} }); setError(""); if (day) revealContinue(); }}
                disabled={(day) => { const key = keyFromDate(day); return key < today() || selected.some((item) => packageUnavailableOn(item, key, day.getDay())) || !dateHasTimes(key); }}
                today={dateFromKey(today())}
                locale={ptBR}
                className="rdp-vagafogo site-chat-calendar"
              />
            </div>
            <p className="mt-1.5 text-center text-[11px] text-[#718075]">{agendaError ? "Não consegui consultar os horários agora. Você pode informar a data por mensagem." : !agenda ? "Consultando os horários disponíveis…" : "Dias cinzas: sem horários disponíveis. Vagas a confirmar."}</p>
          </div>
        )}

        {step === "experiences" && (catalogError ? <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{catalogError} Você pode responder por mensagem.</p> : !catalog ? <p className="text-sm text-[#667468]">Carregando experiências…</p> : (
          <div className="space-y-2.5">
            <div className="grid gap-2" style={cardColumns} role="group" aria-label="Escolha uma ou duas experiências">
              {catalog.pacotes.map((item) => {
                const checked = selectedIds.includes(item.id);
                const unavailableHere = unavailableIds.has(item.id);
                return <button key={item.id} type="button" onClick={() => togglePackage(item.id)} disabled={sending || unavailableHere} aria-pressed={checked} className={`group flex min-w-0 items-center gap-2 rounded-xl border px-2.5 py-2.5 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#20745a] disabled:cursor-not-allowed disabled:opacity-50 ${checked ? "border-[#318360] bg-[#f0f7ee] shadow-[0_4px_14px_rgba(39,110,76,.12)]" : "border-[#e0e8da] bg-white hover:border-[#96b79d] hover:bg-[#fbfdf9]"}`}>
                  <OfferIcon small name={item.nome} url={item.iconeUrl} emoji={item.emoji} />
                  <span className="min-w-0 flex-1"><span className="block text-xs font-bold leading-snug text-[#264732]">{item.nome}</span><span className="mt-0.5 block text-[11px] font-medium text-[#63806b]">{unavailableHere ? "Indisponível nesta data" : adultPrice(item) > 0 ? `Adulto · ${money.format(adultPrice(item))}` : "Experiência individual"}</span></span>
                  <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${checked ? "border-[#20745a] bg-[#20745a] text-white" : "border-[#b8cdbb] text-transparent"}`}><FaCheck className="text-[9px]" aria-hidden="true" /></span>
                </button>;
              })}
            </div>
            {featuredCombo && featuredRegularPrice > 0 && featuredComboPrice > 0 && (
              <div className={`min-w-0 rounded-xl border px-3 py-2 text-xs leading-snug ${combo?.id === featuredCombo.id ? "border-[#bcdcc7] bg-[#edf6eb] text-[#245b3f]" : "border-[#e6dbc6] bg-[#fffaf0] text-[#6c5638]"}`}>
                <p className="font-semibold">{combo?.id === featuredCombo.id ? "Brunch + Trilha: combo aplicado" : "Selecione Brunch + Trilha para aproveitar o combo"}</p>
                {featuredSavings > 0 && (combo?.id === featuredCombo.id
                  ? <p className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5"><span className="line-through opacity-65">{money.format(featuredRegularPrice)}</span><strong>{money.format(featuredComboPrice)}</strong><span>por adulto · economia de {money.format(featuredSavings)}</span></p>
                  : <p className="mt-0.5">Economize {money.format(featuredSavings)} por adulto ao selecionar os dois.</p>)}
                {featuredSavings === 0 && combo?.id === featuredCombo.id && <p className="mt-0.5">{money.format(featuredComboPrice)} por adulto.</p>}
              </div>
            )}
            {unavailable.length > 0 && <p role="alert" className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">Uma das experiências selecionadas não está disponível nessa data.</p>}
          </div>
        ))}

        {step === "time" && (catalogError ? <p role="alert" className="text-sm text-amber-800">{catalogError} Informe o horário por mensagem.</p> : !catalog ? <p className="text-sm text-[#667468]">Carregando horários…</p> : <div className="space-y-3">{scheduled.map((item) => (
          <div key={item.id} role="group" aria-label={/brunch|gastron/i.test(item.nome) ? "Horário do brunch" : `Horário de ${item.nome}`}>
            <p className="mb-2 text-xs font-semibold text-[#425c49]">{/brunch|gastron/i.test(item.nome) ? "Escolha o horário do brunch" : `Escolha o horário de ${item.nome}`}</p>
            <div className="grid grid-cols-3 gap-2">
              {item.horarios.map((hour) => {
                const isSelected = (times[item.id] || knownTime(item)) === hour;
                const available = hourAvailable(item, hour);
                const places = [remainingFor(item, hour), ...selected.filter((other) => other.id !== item.id && (other.modoHorario === "intervalo" || knownTime(other))).map((other) => remainingFor(other, other.modoHorario === "intervalo" ? "" : knownTime(other)))];
                const finitePlaces = places.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
                const remaining = places.some((value) => value === undefined) ? undefined : finitePlaces.length ? Math.min(...finitePlaces) : null;
                return <button key={hour} type="button" disabled={sending || !available} aria-pressed={isSelected && available} onClick={() => { const next = { ...times, [item.id]: hour }; setTimes(next); onProgress({ times: next }); setError(""); if (scheduled.length === 1) revealContinue(); }} className={`min-h-16 min-w-0 rounded-xl border px-2 py-2 text-center transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#20745a] disabled:cursor-not-allowed disabled:opacity-40 ${isSelected && available ? "border-[#20745a] bg-[#20745a] text-white shadow-md" : "border-[#d4e2d2] bg-white text-[#294c39] hover:border-[#76a98c] hover:bg-[#f3f8ef]"}`}>
                  <span className="block text-base font-bold">{displayHour(hour)}</span>
                  <span className={`mt-0.5 block text-[10px] ${isSelected && available ? "text-white/85" : "text-[#718075]"}`}>{!available && agenda ? "Indisponível" : typeof remaining === "number" ? `${remaining} vaga${remaining === 1 ? "" : "s"} restante${remaining === 1 ? "" : "s"}` : remaining === null ? "Vagas disponíveis" : "Vagas a confirmar"}</span>
                </button>;
              })}
            </div>
          </div>
        ))}{agendaError && <p role="alert" className="text-xs text-amber-800">Não consegui consultar os horários agora. Você pode escolher por mensagem.</p>}{agenda && date && !dateHasTimes(date) && <p role="alert" className="text-xs text-amber-800">Não há mais horários nessa data. Diga outra data no chat para eu verificar.</p>}<p className="text-xs leading-relaxed text-[#617267]">O horário escolhido é para estar à mesa no brunch. A Jatobá ainda confirmará a disponibilidade; há 15 minutos de tolerância.</p></div>)}

        {step === "participants" && (catalogError ? <p role="alert" className="text-sm text-amber-800">{catalogError} Informe as pessoas por mensagem.</p> : !catalog ? <p className="text-sm text-[#667468]">Carregando categorias…</p> : <div className="space-y-2">{!availabilityReady && <p className="text-xs text-[#718075]">{agendaError ? "Não consegui atualizar as vagas. Você pode informar as pessoas por mensagem." : "Atualizando as vagas disponíveis…"}</p>}{availabilityReady && remainingPlaces !== null && <p className="text-xs font-medium text-[#46664d]">{remainingPlaces} {remainingPlaces === 1 ? "vaga disponível" : "vagas disponíveis"} para esta visita.</p>}{orderedTypes.map((type) => {
          const count = quantityOf(counts, type.id);
          const hint = participantHint(type);
          return <div key={type.id} className="flex min-w-0 items-center justify-between gap-2 rounded-xl border border-[#e0e8dd] bg-[#fcfdfb] px-2.5 py-2.5">
            <div className="min-w-0 flex-1">
              <span className="block text-xs font-semibold text-[#33483a]">{type.nome}</span>
              {hint && <span className="mt-0.5 block text-[11px] leading-snug text-[#6b7b6e]">{hint}</span>}
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button type="button" onClick={() => { const next = { ...counts, [type.id]: Math.max(0, count - 1) }; setCounts(next); onProgress({ counts: next }); }} disabled={count === 0} aria-label={`Diminuir ${type.nome}`} className="grid h-9 w-9 place-items-center rounded-full border border-[#d5e1d2] bg-white disabled:opacity-35">−</button>
              <output className="w-5 text-center text-sm font-bold">{count}</output>
              <button type="button" onClick={() => { if (!availabilityReady || (remainingPlaces !== null && participantCount >= remainingPlaces)) return; const next = { ...counts, [type.id]: Math.min(99, count + 1) }; setCounts(next); onProgress({ counts: next }); }} disabled={!availabilityReady || count >= 99 || (remainingPlaces !== null && participantCount >= remainingPlaces)} aria-label={`Aumentar ${type.nome}`} className="grid h-9 w-9 place-items-center rounded-full border border-[#d5e1d2] bg-white disabled:opacity-35">+</button>
            </div>
          </div>;
        })}{participantsExceedCapacity && <p role="alert" className="text-xs text-amber-800">As vagas disponíveis mudaram. Reduza a quantidade de pessoas para continuar.</p>}</div>)}

        {step === "contact" && <div className="space-y-2.5">{needsName && <label className="block text-xs font-semibold">Nome completo<input value={fullName} onChange={(event) => setFullName(event.target.value.slice(0, 120))} autoComplete="name" required className={inputClass} /></label>}{needsEmail && <label className="block text-xs font-semibold">E-mail<input value={email} onChange={(event) => setEmail(event.target.value.slice(0, 160))} type="email" autoComplete="email" required className={inputClass} /></label>}{needsCpf && <label className="block text-xs font-semibold">CPF<input value={cpf} onChange={(event) => setCpf(event.target.value.slice(0, 14))} inputMode="numeric" required className={inputClass} /></label>}{needsPet && <div role="group" aria-label="Vai levar pet?" className="text-xs font-semibold"><span className="block">Vai levar pet?</span><div className="mt-1.5 grid grid-cols-2 gap-2">{([ ["yes", "Sim"], ["no", "Não"] ] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={pet === value} onClick={() => setPet(value)} className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#20745a] ${pet === value ? "border-[#20745a] bg-[#e7f3e9] text-[#184f3c]" : "border-[#cddfcf] bg-white text-[#305944] hover:border-[#20745a]"}`}>{label}</button>)}</div>{petRestricted && <span className="mt-1 block font-normal text-amber-800">Pets não entram na trilha.</span>}</div>}</div>}

        {step === "summary" && <div className="grid grid-cols-2 gap-2"><button type="button" disabled={sending} onClick={() => void answer("Sim, confirmo que o resumo desta reserva está correto. Pode prosseguir.")} className="flex min-h-12 min-w-0 items-center justify-center gap-1.5 rounded-xl bg-[#20745a] px-2 py-2.5 text-center text-xs font-semibold text-white disabled:opacity-50 sm:text-sm"><FaCheck className="shrink-0" aria-hidden="true" /> Está correto</button><button type="button" disabled={sending} onClick={() => void answer("Não, quero corrigir o resumo antes de pagar.")} className="flex min-h-12 min-w-0 items-center justify-center rounded-xl border border-[#cddfcf] bg-white px-2 py-2.5 text-center text-xs font-semibold text-[#305944] disabled:opacity-50 sm:text-sm">Quero corrigir</button></div>}

        {step === "payment" && <div role="group" aria-label="Escolha a forma de pagamento" className="grid grid-cols-2 gap-2">
          <button type="button" disabled={sending} onClick={() => void answer("Quero pagar por PIX.")} className="flex min-h-24 min-w-0 flex-col items-center justify-center gap-1.5 rounded-2xl border border-[#acd1bc] bg-[#f0f8f1] px-2 py-3 text-center transition hover:border-[#20745a] hover:bg-[#e9f4e8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#20745a] disabled:opacity-50"><FaQrcode className="text-xl text-[#20745a]" aria-hidden="true" /><strong className="text-sm text-[#245139]">PIX</strong><span className="text-[11px] leading-tight text-[#607965]">QR Code e copia e cola</span></button>
          <button type="button" disabled={sending} onClick={() => void answer("Quero pagar com cartão de crédito.")} className="flex min-h-24 min-w-0 flex-col items-center justify-center gap-1.5 rounded-2xl border border-[#e4d5c3] bg-[#fffaf3] px-2 py-3 text-center transition hover:border-[#b28b64] hover:bg-[#fdf4e8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b28b64] disabled:opacity-50"><FaCreditCard className="text-xl text-[#8a5a2f]" aria-hidden="true" /><strong className="text-sm text-[#58412d]">Cartão</strong><span className="text-[11px] leading-tight text-[#806c56]">Pagamento seguro no site</span></button>
        </div>}

        {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
        {!["summary", "payment"].includes(step) && <button ref={submitButtonRef} type="submit" disabled={sending || (["experiences", "time", "participants"].includes(step) && !catalog) || (step === "experiences" && (!selected.length || unavailable.length > 0)) || (step === "date" && !dateHasTimes(date)) || (step === "time" && scheduled.some((item) => !hourAvailable(item, times[item.id] || knownTime(item)))) || (step === "participants" && (!availabilityReady || !quote.length || participantsExceedCapacity))} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#20745a] px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#185d47] disabled:cursor-not-allowed disabled:opacity-40">{sending ? "Jatobá está respondendo…" : step === "participants" ? "Conferir vagas" : step === "date" && date ? `Continuar com ${readableDate(date)}` : "Continuar"}{!sending && <FaArrowRight className="text-xs" aria-hidden="true" />}</button>}
        {step !== "date" && step !== "summary" && <p className="text-center text-[11px] leading-relaxed text-[#718075]">Se preferir, você também pode responder por mensagem.</p>}
      </div>
    </form>
  );
}
