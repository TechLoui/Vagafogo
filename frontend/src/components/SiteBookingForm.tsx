import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  FaArrowRight, FaCalendarAlt, FaCheck, FaClock, FaCreditCard,
  FaHiking, FaLeaf, FaQrcode, FaRegCheckCircle, FaUser,
  FaUsers, FaUtensils,
} from "react-icons/fa";

const API_BASE = (import.meta.env.VITE_API_BASE || "https://vagafogo-production.up.railway.app").replace(/\/+$/, "");
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

type VisitorType = { id: string; nome: string; descricao?: string };
type Package = {
  id: string; nome: string; descricao?: string; iconeUrl?: string; emoji?: string;
  modoHorario: string; horarios: string[]; diasSemana: number[]; datasBloqueadas: string[];
  aceitaPet: boolean; precosPorTipo: Record<string, number>;
};
type Combo = {
  id: string; nome: string; descricao?: string; iconeUrl?: string; emoji?: string;
  pacoteIds: string[]; precosPorTipo: Record<string, number>; preco: number; desconto: number;
};
type Catalog = { tiposClientes: VisitorType[]; pacotes: Package[]; combos: Combo[] };

export type BookingUi = {
  step: "experiences" | "date" | "participants" | "contact" | "summary" | "payment" | "availability";
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

const quantityOf = (counts: Record<string, number>, id: string) => Math.max(0, Math.min(99, Number(counts[id]) || 0));
const readableDate = (date: string) => date ? date.split("-").reverse().join("/") : "";
const cardColumns = { gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))" };
const choiceColumns = { gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 190px), 1fr))" };
const inputClass = "mt-1.5 w-full rounded-xl border border-[#d4ded1] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#20745a] focus:ring-2 focus:ring-[#20745a]/15";

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
  experiences: { title: "Escolha a experiência", hint: "Você pode escolher um pacote ou o combo.", icon: FaLeaf },
  date: { title: "Escolha a data", hint: "Qual dia fica melhor para sua visita?", icon: FaCalendarAlt },
  time: { title: "Escolha o horário", hint: "A Jatobá confirmará as vagas para você.", icon: FaClock },
  participants: { title: "Quantas pessoas vão?", hint: "Separe por categoria para calcular o valor.", icon: FaUsers },
  contact: { title: "Dados para a reserva", hint: "Preencha apenas o que ainda falta.", icon: FaUser },
  summary: { title: "Tudo certo até aqui?", hint: "Confira o resumo enviado pela Jatobá antes de seguir.", icon: FaRegCheckCircle },
  payment: { title: "Como prefere pagar?", hint: "Sua reserva é confirmada após a aprovação do pagamento.", icon: FaCreditCard },
};

export function SiteBookingForm({ ui, sending, onAnswer }: { ui: BookingUi; sending: boolean; onAnswer: (message: string) => Promise<boolean> }) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [catalogError, setCatalogError] = useState("");
  const [date, setDate] = useState(ui.draft?.data || "");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [preferredComboId, setPreferredComboId] = useState("");
  const [times, setTimes] = useState<Record<string, string>>(ui.draft?.horariosPorPacote || {});
  const [counts, setCounts] = useState<Record<string, number>>(ui.draft?.participantesPorTipo || {});
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [pet, setPet] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    if (!catalog || !ui.draft?.ofertaId) return;
    if (ui.draft.tipoOferta === "combo") {
      setSelectedIds(catalog.combos.find((item) => item.id === ui.draft?.ofertaId)?.pacoteIds || []);
      setPreferredComboId(ui.draft.ofertaId);
    } else {
      setSelectedIds([ui.draft.ofertaId]);
      setPreferredComboId("");
    }
  }, [catalog, ui.draft?.ofertaId, ui.draft?.tipoOferta]);

  const selected = useMemo(() => catalog?.pacotes.filter((item) => selectedIds.includes(item.id)) || [], [catalog, selectedIds]);
  const matchingCombos = catalog?.combos.filter((item) => item.pacoteIds.length === selectedIds.length && item.pacoteIds.every((id) => selectedIds.includes(id))) || [];
  const combo = matchingCombos.find((item) => item.id === preferredComboId) || matchingCombos[0];
  const scheduled = selected.filter((item) => item.modoHorario !== "intervalo" && item.horarios.length > 0);
  const knownTime = (item: Package) => times[item.id] || (scheduled.length === 1 ? ui.draft?.horario || "" : "");
  const missingTime = scheduled.some((item) => !knownTime(item));
  const step = (ui.step === "participants" || ui.step === "availability") && missingTime ? "time" : ui.step;
  if (step === "availability") return null;

  const weekday = date ? new Date(`${date}T12:00:00Z`).getUTCDay() : -1;
  const unavailableIds = new Set((catalog?.pacotes || []).filter((item) => date && ((item.diasSemana?.length > 0 && !item.diasSemana.includes(weekday)) || item.datasBloqueadas?.includes(date))).map((item) => item.id));
  const unavailable = selected.filter((item) => unavailableIds.has(item.id));
  const adultType = catalog?.tiposClientes.find((item) => /adult/i.test(item.nome));
  const adultPrice = (offer: Package | Combo) => adultType ? Number(offer.precosPorTipo?.[adultType.id]) || 0 : 0;
  const quote = catalog?.tiposClientes.map((type) => {
    const quantity = quantityOf(counts, type.id);
    const packageSum = selected.reduce((sum, item) => sum + (Number(item.precosPorTipo?.[type.id]) || 0), 0);
    const hasCategoryPrices = combo && catalog.tiposClientes.some((visitor) => Number(combo.precosPorTipo?.[visitor.id]) > 0);
    const unit = combo
      ? hasCategoryPrices ? Number(combo.precosPorTipo?.[type.id]) || 0
        : combo.preco > 0 ? combo.preco : packageSum * (1 - Math.min(100, Math.max(0, combo.desconto || 0)) / 100)
      : packageSum;
    return { type, quantity, unit, subtotal: Math.round(unit * quantity * 100) / 100 };
  }).filter((item) => item.quantity > 0) || [];
  const fields = ui.fields || [];
  const needsName = fields.length === 0 || fields.includes("nome");
  const needsEmail = fields.length === 0 || fields.includes("e-mail");
  const needsCpf = fields.length === 0 || fields.some((field) => field.toLowerCase().includes("cpf"));
  const needsPet = fields.includes("presenca de pet") && selected.some((item) => item.aceitaPet);
  const petRestricted = selected.some((item) => !item.aceitaPet);
  const stage = stages[step];
  const StageIcon = stage.icon;

  const answer = async (message: string) => {
    setError("");
    const accepted = await onAnswer(message);
    if (!accepted) setError("Não consegui enviar esta resposta. Tente novamente ou escreva no chat.");
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (sending) return;
    if (step === "date") {
      if (!date || date < today()) { setError("Escolha uma data a partir de hoje."); return; }
      await answer(`Gostaria de reservar para ${readableDate(date)}.`);
    } else if (step === "experiences") {
      if (!selected.length || unavailable.length) { setError("Escolha uma experiência disponível para a data informada."); return; }
      await answer(`Quero reservar ${combo?.nome || selected.map((item) => item.nome).join(" e ")}.`);
    } else if (step === "time") {
      if (scheduled.some((item) => !times[item.id] && !knownTime(item))) { setError("Escolha o horário para continuar."); return; }
      await answer(`Para a reserva, prefiro ${scheduled.map((item) => `${item.nome} às ${times[item.id] || knownTime(item)}`).join(" e ")}.`);
    } else if (step === "participants") {
      if (!quote.length) { setError("Informe quantas pessoas vão participar."); return; }
      await answer(`Seremos ${quote.map(({ type, quantity }) => `${quantity} ${type.nome.toLowerCase()}`).join(", ")}. Pode conferir a vaga e o valor?`);
    } else if (step === "contact") {
      if ((needsName && fullName.trim().split(/\s+/).length < 2) || (needsEmail && !email.includes("@")) || (needsCpf && !validCpf(cpf)) || (needsPet && !pet)) {
        setError("Confira os dados solicitados para continuar."); return;
      }
      const parts = [
        needsName ? `Nome completo: ${fullName.trim()}` : "",
        needsEmail ? `E-mail: ${email.trim()}` : "",
        needsCpf ? `CPF: ${cpf.replace(/\D/g, "")}` : "",
        needsPet ? (pet === "yes" ? "Vamos levar pet." : "Não vamos levar pet.") : fields.includes("presenca de pet") ? "Não vamos levar pet." : "",
      ].filter(Boolean);
      await answer(`${parts.join(". ")}. Pode conferir o resumo da reserva?`);
    }
  };

  const togglePackage = (id: string) => {
    setPreferredComboId("");
    setSelectedIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
    setError("");
  };
  const toggleCombo = (item: Combo) => {
    if (combo?.id === item.id) {
      setSelectedIds([]);
      setPreferredComboId("");
    } else {
      setSelectedIds(item.pacoteIds);
      setPreferredComboId(item.id);
    }
    setError("");
  };

  return (
    <form onSubmit={(event) => void submit(event)} className="min-w-0 overflow-hidden rounded-[22px] border border-[#d5e2d2] bg-white text-[#263d31] shadow-[0_12px_30px_rgba(26,59,40,.08)]" aria-label="Responder à Jatobá">
      <div className="border-b border-[#e6ecdf] bg-gradient-to-r from-[#f3f8ee] via-[#fbfcf8] to-white px-3.5 py-3.5 sm:px-4">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#dfeee0] text-[#20745a]"><StageIcon aria-hidden="true" /></span>
          <div className="min-w-0"><p className="text-sm font-bold leading-snug text-[#244b38]">{stage.title}</p><p className="mt-0.5 text-xs leading-relaxed text-[#65766a]">{stage.hint}</p></div>
        </div>
      </div>
      <div className="space-y-3 p-3.5 sm:p-4">
        {step !== "experiences" && selected.length > 0 && (
          <div className="flex min-w-0 items-center gap-2.5 rounded-2xl border border-[#e3ebdf] bg-[#f8faf5] p-2.5">
            <OfferIcon small name={combo?.nome || selected[0].nome} url={combo?.iconeUrl || selected[0].iconeUrl} emoji={combo?.emoji || selected[0].emoji} combo={Boolean(combo)} />
            <div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-[#315b43]">{combo?.nome || selected.map((item) => item.nome).join(" + ")}</p>{date && <p className="mt-0.5 text-[11px] text-[#6e7d70]">{readableDate(date)}</p>}</div>
            <FaCheck className="shrink-0 text-xs text-[#338663]" aria-hidden="true" />
          </div>
        )}

        {step === "date" && <label className="block text-xs font-semibold text-[#425c49]">Data da visita<input type="date" min={today()} value={date} onChange={(event) => setDate(event.target.value)} required className={inputClass} /></label>}

        {step === "experiences" && (catalogError ? <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{catalogError} Você pode responder por mensagem.</p> : !catalog ? <p className="text-sm text-[#667468]">Carregando experiências…</p> : (
          <div className="space-y-3.5">
            <div className="grid gap-2.5" style={cardColumns} role="group" aria-label="Pacotes individuais">
              {catalog.pacotes.map((item) => {
                const checked = selectedIds.includes(item.id);
                const unavailableHere = unavailableIds.has(item.id);
                return <button key={item.id} type="button" onClick={() => togglePackage(item.id)} disabled={sending || unavailableHere} aria-pressed={checked} className={`group flex min-w-0 flex-col gap-2.5 rounded-2xl border p-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#20745a] disabled:cursor-not-allowed disabled:opacity-50 ${checked ? "border-[#318360] bg-[#f0f7ee] shadow-[0_4px_14px_rgba(39,110,76,.12)]" : "border-[#e0e8da] bg-white hover:border-[#96b79d] hover:bg-[#fbfdf9]"}`}>
                  <span className="flex w-full items-start gap-2.5"><OfferIcon name={item.nome} url={item.iconeUrl} emoji={item.emoji} /><span className="min-w-0 flex-1"><span className="block text-[13px] font-bold leading-snug text-[#264732]">{item.nome}</span><span className="mt-1 block text-[11px] font-medium text-[#63806b]">{unavailableHere ? "Indisponível nesta data" : adultPrice(item) > 0 ? `Adulto · ${money.format(adultPrice(item))}` : "Experiência individual"}</span></span><span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${checked ? "border-[#20745a] bg-[#20745a] text-white" : "border-[#b8cdbb] text-transparent"}`}><FaCheck className="text-[10px]" aria-hidden="true" /></span></span>
                  {item.descricao && <span className="line-clamp-2 text-[11px] leading-relaxed text-[#647469]">{item.descricao}</span>}
                  {combo && checked && <span className="text-[10px] font-semibold text-[#24805c]">Incluído no combo</span>}
                </button>;
              })}
            </div>
            {catalog.combos.length > 0 && <div className="border-t border-[#e7ede3] pt-3"><p className="mb-2 text-[10px] font-bold uppercase tracking-[.16em] text-[#688574]">Ou escolha o combo</p><div className="grid gap-2.5" style={cardColumns} role="group" aria-label="Combos">
              {catalog.combos.map((item) => {
                const checked = combo?.id === item.id;
                const unavailableHere = item.pacoteIds.some((id) => unavailableIds.has(id));
                const includedNames = item.pacoteIds.map((id) => catalog.pacotes.find((pack) => pack.id === id)?.nome).filter(Boolean).join(" + ");
                return <button key={item.id} type="button" onClick={() => toggleCombo(item)} disabled={sending || unavailableHere} aria-pressed={checked} className={`flex min-w-0 flex-col gap-2.5 rounded-2xl border p-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#20745a] disabled:cursor-not-allowed disabled:opacity-50 ${checked ? "border-[#ad7948] bg-[#fcf5e9] shadow-[0_4px_14px_rgba(117,74,28,.12)]" : "border-[#e8d9c4] bg-[#fffaf2] hover:border-[#b48a5d]"}`}>
                  <span className="flex w-full items-start gap-2.5"><OfferIcon name={item.nome} url={item.iconeUrl} emoji={item.emoji} combo /><span className="min-w-0 flex-1"><span className="block text-[10px] font-bold uppercase tracking-[.12em] text-[#9d713e]">Combo</span><span className="mt-0.5 block text-[13px] font-bold leading-snug text-[#58432a]">{item.nome}</span><span className="mt-1 block text-[11px] font-medium text-[#80694a]">{unavailableHere ? "Indisponível nesta data" : adultPrice(item) > 0 ? `Adulto · ${money.format(adultPrice(item))}` : "Experiências juntas"}</span></span><span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${checked ? "border-[#a8723e] bg-[#a8723e] text-white" : "border-[#c6ac87] text-transparent"}`}><FaCheck className="text-[10px]" aria-hidden="true" /></span></span>
                  <span className="text-[11px] leading-relaxed text-[#766a58]">{includedNames || item.descricao}</span>
                </button>;
              })}
            </div></div>}
            {combo && <div className="flex gap-2 rounded-xl bg-[#edf6eb] px-3 py-2.5 text-[11px] leading-relaxed text-[#2d684a]"><FaCheck className="mt-0.5 shrink-0" aria-hidden="true" /><span><strong>{combo.nome}</strong> aplicado à sua escolha. Não há cobrança duplicada.</span></div>}
            {unavailable.length > 0 && <p role="alert" className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">Uma das experiências selecionadas não está disponível nessa data.</p>}
          </div>
        ))}

        {step === "time" && (catalogError ? <p role="alert" className="text-sm text-amber-800">{catalogError} Informe o horário por mensagem.</p> : !catalog ? <p className="text-sm text-[#667468]">Carregando horários…</p> : <div className="space-y-2.5">{scheduled.map((item) => <label key={item.id} className="block text-xs font-semibold text-[#425c49]">{item.nome}<select value={times[item.id] || knownTime(item)} onChange={(event) => setTimes((current) => ({ ...current, [item.id]: event.target.value }))} required className={inputClass}><option value="">Selecione um horário</option>{item.horarios.map((hour) => <option key={hour} value={hour}>{hour}</option>)}</select></label>)}</div>)}

        {step === "participants" && (catalogError ? <p role="alert" className="text-sm text-amber-800">{catalogError} Informe as pessoas por mensagem.</p> : !catalog ? <p className="text-sm text-[#667468]">Carregando categorias…</p> : <div className="space-y-2">{catalog.tiposClientes.map((type) => { const count = quantityOf(counts, type.id); return <div key={type.id} className="flex items-center justify-between gap-2 rounded-xl border border-[#e0e8dd] bg-[#fcfdfb] px-2.5 py-2"><span className="min-w-0 text-xs font-medium">{type.nome}</span><div className="flex shrink-0 items-center gap-2"><button type="button" onClick={() => setCounts((current) => ({ ...current, [type.id]: Math.max(0, count - 1) }))} disabled={count === 0} aria-label={`Diminuir ${type.nome}`} className="grid h-9 w-9 place-items-center rounded-full border border-[#d5e1d2] bg-white disabled:opacity-35">−</button><output className="w-5 text-center text-sm font-bold">{count}</output><button type="button" onClick={() => setCounts((current) => ({ ...current, [type.id]: Math.min(99, count + 1) }))} disabled={count >= 99} aria-label={`Aumentar ${type.nome}`} className="grid h-9 w-9 place-items-center rounded-full border border-[#d5e1d2] bg-white disabled:opacity-35">+</button></div></div>; })}{quote.length > 0 && <div className="rounded-xl bg-[#f3f7ef] p-3 text-xs"><div className="space-y-1">{quote.map(({ type, quantity, unit, subtotal }) => <div key={type.id} className="flex justify-between gap-2"><span>{quantity} × {type.nome} · {money.format(unit)}</span><span className="shrink-0">{money.format(subtotal)}</span></div>)}</div><div className="mt-2 flex justify-between border-t border-[#dbe7d7] pt-2 font-bold"><span>Estimativa</span><span>{money.format(quote.reduce((sum, item) => sum + item.subtotal, 0))}</span></div><p className="mt-1 text-[#657368]">A Jatobá confirmará vaga e valor antes de reservar.</p></div>}</div>)}

        {step === "contact" && <div className="space-y-2.5">{needsName && <label className="block text-xs font-semibold">Nome completo<input value={fullName} onChange={(event) => setFullName(event.target.value.slice(0, 120))} autoComplete="name" required className={inputClass} /></label>}{needsEmail && <label className="block text-xs font-semibold">E-mail<input value={email} onChange={(event) => setEmail(event.target.value.slice(0, 160))} type="email" autoComplete="email" required className={inputClass} /></label>}{needsCpf && <label className="block text-xs font-semibold">CPF<input value={cpf} onChange={(event) => setCpf(event.target.value.slice(0, 14))} inputMode="numeric" required className={inputClass} /></label>}{needsPet && <label className="block text-xs font-semibold">Vai levar pet?<select value={pet} onChange={(event) => setPet(event.target.value)} required className={inputClass}><option value="">Selecione</option><option value="no">Não</option><option value="yes">Sim</option></select>{petRestricted && <span className="mt-1 block font-normal text-amber-800">Pets não entram na trilha.</span>}</label>}</div>}

        {step === "summary" && <div className="grid gap-2" style={choiceColumns}><button type="button" disabled={sending} onClick={() => void answer("Sim, confirmo que o resumo desta reserva está correto. Pode prosseguir.")} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#20745a] px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><FaCheck aria-hidden="true" /> Sim, está correto</button><button type="button" disabled={sending} onClick={() => void answer("Não, quero corrigir o resumo antes de pagar.")} className="flex min-h-12 items-center justify-center rounded-xl border border-[#cddfcf] bg-white px-3 py-2.5 text-sm font-semibold text-[#305944] disabled:opacity-50">Não, quero corrigir</button></div>}

        {step === "payment" && <div className="grid gap-2.5" style={choiceColumns}><button type="button" disabled={sending} onClick={() => void answer("Prefiro pagar por PIX. Pode enviar o QR Code e o copia e cola?")} className="flex min-h-[72px] items-center gap-3 rounded-2xl border border-[#acd1bc] bg-[#f0f8f1] p-3 text-left transition hover:border-[#20745a] hover:bg-[#e9f4e8] disabled:opacity-50"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#d8ecdc] text-[#20745a]"><FaQrcode aria-hidden="true" /></span><span><strong className="block text-sm text-[#245139]">PIX</strong><small className="mt-0.5 block text-[11px] text-[#607965]">QR Code e copia e cola</small></span></button><button type="button" disabled={sending} onClick={() => void answer("Prefiro pagar por cartão de crédito. Pode enviar o link seguro?")} className="flex min-h-[72px] items-center gap-3 rounded-2xl border border-[#e4d5c3] bg-[#fffaf3] p-3 text-left transition hover:border-[#b28b64] hover:bg-[#fdf4e8] disabled:opacity-50"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f4e9d6] text-[#8a5a2f]"><FaCreditCard aria-hidden="true" /></span><span><strong className="block text-sm text-[#58412d]">Cartão</strong><small className="mt-0.5 block text-[11px] text-[#806c56]">Página segura</small></span></button></div>}

        {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
        {!["summary", "payment"].includes(step) && <button type="submit" disabled={sending || (step !== "date" && !catalog) || (step === "experiences" && (!selected.length || unavailable.length > 0)) || (step === "participants" && !quote.length)} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#20745a] px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[#185d47] disabled:cursor-not-allowed disabled:opacity-40">{sending ? "Jatobá está respondendo…" : step === "participants" ? "Consultar vaga e valor" : "Continuar"}{!sending && <FaArrowRight className="text-xs" aria-hidden="true" />}</button>}
        <p className="text-center text-[11px] leading-relaxed text-[#718075]">Se preferir, você também pode responder por mensagem.</p>
      </div>
    </form>
  );
}
