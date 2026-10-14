import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

const API_BASE = (import.meta.env.VITE_API_BASE || "https://vagafogo-production.up.railway.app").replace(/\/+$/, "");
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

type VisitorType = { id: string; nome: string; descricao?: string };
type Package = { id: string; nome: string; descricao?: string; modoHorario: string; horarios: string[]; diasSemana: number[]; datasBloqueadas: string[]; aceitaPet: boolean; precosPorTipo: Record<string, number> };
type Combo = { id: string; nome: string; pacoteIds: string[]; precosPorTipo: Record<string, number>; preco: number; desconto: number };
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

export function SiteBookingForm({ ui, sending, onAnswer }: { ui: BookingUi; sending: boolean; onAnswer: (message: string) => Promise<boolean> }) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [catalogError, setCatalogError] = useState("");
  const [date, setDate] = useState(ui.draft?.data || "");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
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
    const selected = ui.draft.tipoOferta === "combo"
      ? catalog.combos.find((item) => item.id === ui.draft?.ofertaId)?.pacoteIds || []
      : [ui.draft.ofertaId];
    setSelectedIds(selected);
  }, [catalog, ui.draft?.ofertaId, ui.draft?.tipoOferta]);

  const selected = useMemo(() => catalog?.pacotes.filter((item) => selectedIds.includes(item.id)) || [], [catalog, selectedIds]);
  const combo = useMemo(() => catalog?.combos.find((item) => item.pacoteIds.length === selectedIds.length && item.pacoteIds.every((id) => selectedIds.includes(id))), [catalog, selectedIds]);
  const scheduled = selected.filter((item) => item.modoHorario !== "intervalo" && item.horarios.length > 0);
  const knownTime = (item: Package) => times[item.id] || (scheduled.length === 1 ? ui.draft?.horario || "" : "");
  const missingTime = scheduled.some((item) => !knownTime(item));
  const step = (ui.step === "participants" || ui.step === "availability") && missingTime ? "time" : ui.step;
  if (step === "availability") return null;

  const weekday = date ? new Date(`${date}T12:00:00Z`).getUTCDay() : -1;
  const unavailable = selected.filter((item) => date && ((item.diasSemana?.length > 0 && !item.diasSemana.includes(weekday)) || item.datasBloqueadas?.includes(date)));
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

  const inputClass = "mt-1.5 w-full rounded-xl border border-[#d4ded1] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#20745a] focus:ring-2 focus:ring-[#20745a]/15";
  return (
    <form onSubmit={(event) => void submit(event)} className="rounded-2xl border border-[#cddfcf] bg-white p-3 text-[#263d31] shadow-sm sm:p-4" aria-label="Responder à Jatobá">
      {step === "date" && <label className="block text-sm font-semibold">Escolha a data<input type="date" min={today()} value={date} onChange={(event) => setDate(event.target.value)} required className={inputClass} /></label>}
      {step === "experiences" && (catalogError ? <p role="alert" className="text-sm text-amber-800">{catalogError} Você pode responder por mensagem.</p> : !catalog ? <p className="text-sm text-[#667468]">Carregando experiências…</p> : <fieldset><legend className="text-sm font-semibold">Escolha a experiência</legend><p className="mt-1 text-xs text-[#667468]">Pode marcar mais de uma; o combo é aplicado quando existir.</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{catalog.pacotes.map((item) => { const checked = selectedIds.includes(item.id); return <label key={item.id} className={`flex cursor-pointer items-start gap-2 rounded-xl border p-2.5 text-xs ${checked ? "border-[#20745a] bg-[#edf6ee]" : "border-[#dce5da]"}`}><input type="checkbox" checked={checked} onChange={() => setSelectedIds((current) => checked ? current.filter((id) => id !== item.id) : [...current, item.id])} className="mt-0.5 accent-[#20745a]" /><span>{item.nome}</span></label>; })}</div>{combo && <p className="mt-2 text-xs font-semibold text-[#20745a]">✨ {combo.nome}</p>}{unavailable.length > 0 && <p className="mt-2 text-xs text-amber-800">Esta opção não consta no calendário da data escolhida.</p>}</fieldset>)}
      {step === "time" && (catalogError ? <p role="alert" className="text-sm text-amber-800">{catalogError} Informe o horário por mensagem.</p> : !catalog ? <p className="text-sm text-[#667468]">Carregando horários…</p> : <fieldset><legend className="text-sm font-semibold">Escolha o horário</legend>{scheduled.map((item) => <label key={item.id} className="mt-3 block text-xs font-semibold">{item.nome}<select value={times[item.id] || knownTime(item)} onChange={(event) => setTimes((current) => ({ ...current, [item.id]: event.target.value }))} required className={inputClass}><option value="">Selecione</option>{item.horarios.map((hour) => <option key={hour} value={hour}>{hour}</option>)}</select></label>)}</fieldset>)}
      {step === "participants" && (catalogError ? <p role="alert" className="text-sm text-amber-800">{catalogError} Informe as pessoas por mensagem.</p> : !catalog ? <p className="text-sm text-[#667468]">Carregando categorias…</p> : <fieldset><legend className="text-sm font-semibold">Quantas pessoas vão?</legend><div className="mt-2 space-y-2">{catalog.tiposClientes.map((type) => { const count = quantityOf(counts, type.id); return <div key={type.id} className="flex items-center justify-between gap-2 rounded-xl border border-[#e0e8dd] px-2.5 py-2"><span className="min-w-0 text-xs font-medium">{type.nome}</span><div className="flex shrink-0 items-center gap-2"><button type="button" onClick={() => setCounts((current) => ({ ...current, [type.id]: Math.max(0, count - 1) }))} disabled={count === 0} aria-label={`Diminuir ${type.nome}`} className="grid h-8 w-8 place-items-center rounded-full border disabled:opacity-35">−</button><output className="w-5 text-center text-sm font-bold">{count}</output><button type="button" onClick={() => setCounts((current) => ({ ...current, [type.id]: Math.min(99, count + 1) }))} disabled={count >= 99} aria-label={`Aumentar ${type.nome}`} className="grid h-8 w-8 place-items-center rounded-full border disabled:opacity-35">+</button></div></div>; })}</div>{quote.length > 0 && <div className="mt-3 rounded-xl bg-[#f3f7ef] p-2.5 text-xs"><div className="space-y-1">{quote.map(({ type, quantity, unit, subtotal }) => <div key={type.id} className="flex justify-between gap-2"><span>{quantity} × {type.nome} · {money.format(unit)}</span><span>{money.format(subtotal)}</span></div>)}</div><div className="mt-2 flex justify-between border-t border-[#dbe7d7] pt-2 font-bold"><span>Estimativa</span><span>{money.format(quote.reduce((sum, item) => sum + item.subtotal, 0))}</span></div><p className="mt-1 text-[#657368]">A Jatobá ainda vai confirmar vaga e valor.</p></div>}</fieldset>)}
      {step === "contact" && <div className="space-y-2.5"><p className="text-sm font-semibold">Só faltam estes dados</p>{needsName && <label className="block text-xs font-semibold">Nome completo<input value={fullName} onChange={(event) => setFullName(event.target.value.slice(0, 120))} autoComplete="name" required className={inputClass} /></label>}{needsEmail && <label className="block text-xs font-semibold">E-mail<input value={email} onChange={(event) => setEmail(event.target.value.slice(0, 160))} type="email" autoComplete="email" required className={inputClass} /></label>}{needsCpf && <label className="block text-xs font-semibold">CPF<input value={cpf} onChange={(event) => setCpf(event.target.value.slice(0, 14))} inputMode="numeric" required className={inputClass} /></label>}{needsPet && <label className="block text-xs font-semibold">Vai levar pet?<select value={pet} onChange={(event) => setPet(event.target.value)} required className={inputClass}><option value="">Selecione</option><option value="no">Não</option><option value="yes">Sim</option></select>{petRestricted && <span className="mt-1 block font-normal text-amber-800">Pets não entram na trilha.</span>}</label>}</div>}
      {step === "summary" && <div><p className="text-sm font-semibold">O resumo que a Jatobá enviou está correto?</p><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" disabled={sending} onClick={() => void answer("Sim, confirmo que o resumo desta reserva está correto. Pode prosseguir.")} className="rounded-xl bg-[#20745a] px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Sim, está correto</button><button type="button" disabled={sending} onClick={() => void answer("Não, quero corrigir o resumo antes de pagar.")} className="rounded-xl border border-[#cddfcf] px-3 py-2.5 text-sm font-semibold text-[#305944] disabled:opacity-50">Quero corrigir</button></div></div>}
      {step === "payment" && <div><p className="text-sm font-semibold">Como prefere pagar?</p><p className="mt-1 text-xs text-[#667468]">A reserva será confirmada após a aprovação do pagamento.</p><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" disabled={sending} onClick={() => void answer("Prefiro pagar por PIX. Pode enviar o QR Code e o copia e cola?")} className="rounded-xl bg-[#20745a] px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-50">PIX</button><button type="button" disabled={sending} onClick={() => void answer("Prefiro pagar por cartão de crédito. Pode enviar o link seguro?")} className="rounded-xl border border-[#20745a] px-3 py-2.5 text-sm font-semibold text-[#20745a] disabled:opacity-50">Cartão</button></div></div>}
      {error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
      {!["summary", "payment"].includes(step) && <button type="submit" disabled={sending || (step !== "date" && !catalog) || (step === "experiences" && (!selected.length || unavailable.length > 0)) || (step === "participants" && !quote.length)} className="mt-3 w-full rounded-xl bg-[#20745a] px-3 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">{sending ? "Jatobá está respondendo…" : step === "participants" ? "Consultar vaga e valor" : "Enviar resposta"}</button>}
      <p className="mt-2 text-center text-[11px] text-[#718075]">Se preferir, você também pode responder por mensagem.</p>
    </form>
  );
}
