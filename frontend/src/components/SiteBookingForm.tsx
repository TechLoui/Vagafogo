import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

const API_BASE = (import.meta.env.VITE_API_BASE || "https://vagafogo-production.up.railway.app").replace(/\/+$/, "");
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const DRAFT_PREFIX = "vagafogo_site_booking_";

type VisitorType = { id: string; nome: string; descricao?: string };
type Package = { id: string; nome: string; descricao?: string; modoHorario: string; horarios: string[]; diasSemana: number[]; datasBloqueadas: string[]; aceitaPet: boolean; precosPorTipo: Record<string, number> };
type Combo = { id: string; nome: string; pacoteIds: string[]; precosPorTipo: Record<string, number>; preco: number; desconto: number };
type Catalog = { tiposClientes: VisitorType[]; pacotes: Package[]; combos: Combo[] };
type Step = "date" | "experiences" | "time" | "participants" | "summary" | "contact" | "payment";
type BookingDraft = { step: Step; date: string; selectedIds: string[]; times: Record<string, string>; counts: Record<string, number>; paymentSent?: boolean; expiresAt: number };

const quantityOf = (counts: Record<string, number>, id: string) => Math.max(0, Math.min(99, Number(counts[id]) || 0));
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

export function SiteBookingForm({ sessionId, onStep, onClose, onStepChange, sending }: { sessionId: string; onStep: (message: string) => Promise<boolean>; onClose: () => void; onStepChange: () => void; sending: boolean }) {
  const initial = useMemo((): BookingDraft | null => {
    try {
      const value = JSON.parse(localStorage.getItem(`${DRAFT_PREFIX}${sessionId}`) || "null") as BookingDraft | null;
      return value && value.expiresAt > Date.now() && value.date >= today() && ["date", "experiences", "time", "participants", "summary", "contact", "payment"].includes(value.step)
        ? { ...value, step: value.step === "payment" && !value.paymentSent ? "contact" : value.step } : null;
    } catch { return null; }
  }, [sessionId]);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [catalogError, setCatalogError] = useState("");
  const [step, setStep] = useState<Step>(initial?.step || "date");
  const [date, setDate] = useState(initial?.date || "");
  const [selectedIds, setSelectedIds] = useState<string[]>(initial?.selectedIds || []);
  const [times, setTimes] = useState<Record<string, string>>(initial?.times || {});
  const [counts, setCounts] = useState<Record<string, number>>(initial?.counts || {});
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [pet, setPet] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [paymentSent, setPaymentSent] = useState(Boolean(initial?.paymentSent));
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_BASE}/atendimento/site/catalogo`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Não consegui carregar as experiências agora.");
        return response.json() as Promise<Catalog>;
      })
      .then((value) => {
        if (!Array.isArray(value.pacotes) || !Array.isArray(value.combos) || !Array.isArray(value.tiposClientes)) throw new Error("O catálogo está indisponível.");
        setCatalog(value);
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setCatalogError(cause instanceof Error ? cause.message : "O catálogo está indisponível.");
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    localStorage.setItem(`${DRAFT_PREFIX}${sessionId}`, JSON.stringify({ step, date, selectedIds, times, counts, paymentSent, expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 } satisfies BookingDraft));
  }, [sessionId, step, date, selectedIds, times, counts, paymentSent]);

  useEffect(() => {
    const frame = requestAnimationFrame(onStepChange);
    return () => cancelAnimationFrame(frame);
  }, [step, onStepChange]);

  const selected = useMemo(() => catalog?.pacotes.filter((item) => selectedIds.includes(item.id)) || [], [catalog, selectedIds]);
  const combo = useMemo(() => catalog?.combos.find((item) => item.pacoteIds.length === selectedIds.length && item.pacoteIds.every((id) => selectedIds.includes(id))), [catalog, selectedIds]);
  const scheduled = selected.filter((item) => item.modoHorario !== "intervalo" && item.horarios.length > 0);
  const steps: Array<{ id: Step; label: string }> = [
    { id: "date", label: "Data" }, { id: "experiences", label: "Experiências" },
    ...(scheduled.length ? [{ id: "time" as Step, label: "Horário" }] : []),
    { id: "participants", label: "Pessoas" }, { id: "summary", label: "Vagas e valor" },
    { id: "contact", label: "Dados" }, { id: "payment", label: "Pagamento" },
  ];
  const currentIndex = steps.findIndex((item) => item.id === step);
  const weekday = date ? new Date(`${date}T12:00:00Z`).getUTCDay() : -1;
  const unavailable = selected.filter((item) => date && ((item.diasSemana?.length > 0 && !item.diasSemana.includes(weekday)) || item.datasBloqueadas?.includes(date)));

  const quote = useMemo(() => {
    if (!catalog || selected.length === 0) return [];
    const customComboPrice = combo && catalog.tiposClientes.some((type) => Number(combo.precosPorTipo?.[type.id]) > 0);
    return catalog.tiposClientes.map((type) => {
      const quantity = quantityOf(counts, type.id);
      const packageSum = selected.reduce((sum, item) => sum + (Number(item.precosPorTipo?.[type.id]) || 0), 0);
      const unit = combo
        ? customComboPrice ? Number(combo.precosPorTipo?.[type.id]) || 0
          : combo.preco > 0 ? combo.preco : packageSum * (1 - Math.min(100, Math.max(0, combo.desconto || 0)) / 100)
        : packageSum;
      return { type, quantity, unit: Math.round(unit * 100) / 100, subtotal: Math.round(unit * quantity * 100) / 100 };
    }).filter((item) => item.quantity > 0);
  }, [catalog, counts, combo, selected]);
  const total = quote.reduce((sum, item) => sum + item.subtotal, 0);
  const readableDate = date ? date.split("-").reverse().join("/") : "";
  const asksPet = selected.some((item) => item.aceitaPet);
  const petRestricted = selected.some((item) => !item.aceitaPet);
  const restart = () => {
    setStep("date"); setDate(""); setSelectedIds([]); setTimes({}); setCounts({});
    setFullName(""); setEmail(""); setCpf(""); setPet("");
    setPaymentMethod(""); setConfirmed(false); setPaymentSent(false); setError("");
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (sending) return;
    setError("");
    if (step === "date") {
      if (!date || date < today()) { setError("Escolha uma data válida para a visita."); return; }
      if (await onStep(`Gostaria de fazer a reserva para ${readableDate}.`)) setStep("experiences");
    } else if (step === "experiences") {
      if (!selected.length || unavailable.length) { setError("Escolha experiências disponíveis para a data selecionada."); return; }
      const description = selected.map((item) => item.nome).join(" + ");
      if (await onStep(`Para ${readableDate}, escolhi ${description}${combo ? ` no ${combo.nome}` : ""}.`)) setStep(scheduled.length ? "time" : "participants");
    } else if (step === "time") {
      if (scheduled.some((item) => !times[item.id])) { setError("Escolha o horário de cada experiência com hora marcada."); return; }
      if (await onStep(`Para ${readableDate}, prefiro ${scheduled.map((item) => `${item.nome} às ${times[item.id]}`).join(" e ")}.`)) setStep("participants");
    } else if (step === "participants") {
      if (!quote.length) { setError("Informe quantas pessoas vão participar."); return; }
      const people = quote.map(({ type, quantity }) => `${quantity} ${type.nome.toLowerCase()}`).join(", ");
      const hour = scheduled.length ? `, ${scheduled.map((item) => `${item.nome} às ${times[item.id]}`).join(" e ")}` : "";
      if (await onStep(`Seremos ${people} em ${readableDate}${combo ? ` no ${combo.nome}` : ""}${hour}. Pode conferir a disponibilidade e o valor para seguirmos?`)) setStep("summary");
    } else if (step === "contact") {
      if (asksPet && petRestricted && pet === "yes") { setError("Pets não entram na trilha. Converse com a Jatobá para ajustar a experiência antes de continuar."); return; }
      if (fullName.trim().split(/\s+/).length < 2 || !email.includes("@") || !validCpf(cpf) || (asksPet && !pet)) {
        setError("Confira nome completo, e-mail, CPF e a informação sobre pet, quando aparecer.");
        return;
      }
      const petAnswer = asksPet ? ` ${pet === "yes" ? "Vamos levar pet." : "Não vamos levar pet."}` : "";
      if (await onStep(`Para esta reserva, meus dados são: nome completo ${fullName.trim()}, e-mail ${email.trim()}, CPF ${cpf.replace(/\D/g, "")}.${petAnswer} Pode conferir o resumo antes do pagamento?`)) setStep("payment");
    } else if (step === "payment") {
      if (!confirmed || !paymentMethod || paymentSent) return;
      if (await onStep(`Confirmo que os dados e o resumo desta reserva estão corretos. Prefiro pagar por ${paymentMethod === "pix" ? "PIX" : "cartão de crédito"}. Pode me enviar a forma segura para concluir?`)) setPaymentSent(true);
    }
  };

  return <form onSubmit={(event) => void submit(event)} className="rounded-2xl border border-[#cddfcf] bg-white p-3.5 text-[#263d31] shadow-sm sm:p-4" aria-label="Planejar reserva">
    <div className="flex items-start justify-between gap-2"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#20745a]">Reserva guiada</p><h3 className="mt-1 font-display text-lg">Vamos por partes</h3></div><button type="button" onClick={onClose} aria-label="Fechar formulário" className="rounded-full p-1.5 text-[#6b776d] hover:bg-[#edf4ec]">✕</button></div>
    <nav aria-label="Etapas da reserva" className="mt-3 flex flex-wrap gap-1.5">{steps.map((item, index) => <button key={item.id} type="button" disabled={index > currentIndex || sending || paymentSent} onClick={() => { setStep(item.id); setError(""); }} aria-current={item.id === step ? "step" : undefined} className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${item.id === step ? "bg-[#20745a] text-white" : index < currentIndex ? "bg-[#e5f1e7] text-[#20745a]" : "bg-[#f2f4ef] text-[#8a948b]"}`}>{index < currentIndex ? "✓ " : ""}{item.label}</button>)}</nav>
    {step === "date" && <div className="mt-4"><label className="block text-sm font-semibold" htmlFor="site-booking-date">Quando você quer visitar?</label><p className="mt-1 text-xs text-[#667468]">Escolha a data e a Jatobá segue com você.</p><input id="site-booking-date" type="date" min={today()} value={date} onChange={(event) => { setDate(event.target.value); setSelectedIds([]); setTimes({}); setError(""); }} required className="mt-3 w-full rounded-xl border border-[#d4ded1] bg-[#fbfcfa] px-3 py-3 text-sm focus:border-[#20745a] focus:outline-none" /></div>}
    {step !== "date" && <p className="mt-3 text-xs text-[#657368]">📅 {readableDate}{selected.length ? ` · ${combo?.nome || selected.map((item) => item.nome).join(" + ")}` : ""}</p>}
    {step === "experiences" && (catalogError ? <p role="alert" className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">{catalogError} Você pode continuar pelo chat.</p> : !catalog ? <p className="mt-3 text-sm text-[#667468]">Carregando experiências…</p> : <fieldset className="mt-3"><legend className="text-sm font-semibold">Quais experiências você quer fazer?</legend><p className="mt-1 text-xs text-[#667468]">Selecione uma ou mais. O combo entra automaticamente quando aplicável.</p><div className="mt-3 grid gap-2 md:grid-cols-2">{catalog.pacotes.map((item) => { const checked = selectedIds.includes(item.id); return <label key={item.id} className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-xs transition ${checked ? "border-[#20745a] bg-[#edf6ee]" : "border-[#dce5da] bg-[#fbfcfa] hover:border-[#9fbea9]"}`}><input type="checkbox" checked={checked} onChange={() => { setSelectedIds((current) => checked ? current.filter((id) => id !== item.id) : [...current, item.id]); setTimes({}); setError(""); }} className="mt-0.5 accent-[#20745a]" /><span><strong className="block text-[#263d31]">{item.nome}</strong>{item.descricao && <span className="mt-0.5 block line-clamp-2 text-[#69776c]">{item.descricao}</span>}</span></label>; })}</div>{combo && <p className="mt-2 rounded-lg bg-[#edf6ee] px-2.5 py-2 text-xs font-semibold text-[#20745a]">✨ Combo aplicado: {combo.nome}</p>}{unavailable.length > 0 && <p role="alert" className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">{unavailable.map((item) => item.nome).join(" e ")} não consta no calendário desta data. Volte à data ou escolha outra experiência.</p>}</fieldset>)}
    {step === "time" && <div className="mt-4"><h4 className="text-sm font-semibold">Qual horário você prefere?</h4><p className="mt-1 text-xs text-[#667468]">A Jatobá confirmará as vagas antes de reservar.</p>{scheduled.map((item) => <label key={item.id} className="mt-3 block text-xs font-semibold">{item.nome}<select value={times[item.id] || ""} onChange={(event) => setTimes((current) => ({ ...current, [item.id]: event.target.value }))} required className="mt-1.5 w-full rounded-xl border border-[#d4ded1] bg-white px-3 py-3 text-sm font-normal focus:border-[#20745a] focus:outline-none"><option value="">Escolha o horário</option>{item.horarios.map((hour) => <option key={hour} value={hour}>{hour}</option>)}</select></label>)}</div>}
    {step === "participants" && (catalogError ? <p role="alert" className="mt-3 text-xs text-amber-900">{catalogError}</p> : !catalog ? <p className="mt-3 text-sm text-[#667468]">Carregando categorias…</p> : <fieldset className="mt-4"><legend className="text-sm font-semibold">Quantas pessoas vão?</legend><p className="mt-1 text-xs text-[#667468]">Separe por categoria para calcular a estimativa.</p><div className="mt-3 space-y-2">{catalog.tiposClientes.map((type) => { const count = quantityOf(counts, type.id); return <div key={type.id} className="flex items-center justify-between gap-2 rounded-xl border border-[#e0e8dd] px-3 py-2.5"><div><span className="block text-xs font-semibold">{type.nome}</span>{type.descricao && <span className="block text-[11px] text-[#728074]">{type.descricao}</span>}</div><div className="flex shrink-0 items-center gap-2"><button type="button" onClick={() => setCounts((current) => ({ ...current, [type.id]: Math.max(0, count - 1) }))} aria-label={`Diminuir ${type.nome}`} disabled={count === 0} className="grid h-8 w-8 place-items-center rounded-full border border-[#cbdccd] text-lg disabled:opacity-35">−</button><output className="w-6 text-center text-sm font-bold">{count}</output><button type="button" onClick={() => setCounts((current) => ({ ...current, [type.id]: Math.min(99, count + 1) }))} aria-label={`Aumentar ${type.nome}`} disabled={count >= 99} className="grid h-8 w-8 place-items-center rounded-full border border-[#cbdccd] text-lg disabled:opacity-35">+</button></div></div>; })}</div></fieldset>)}
    {(step === "participants" || step === "summary" || step === "payment") && quote.length > 0 && <div className="mt-4 rounded-xl bg-[#f3f7ef] p-3" aria-live="polite"><p className="text-xs font-bold">Resumo da estimativa</p><div className="mt-2 space-y-1 text-xs">{quote.map(({ type, quantity, unit, subtotal }) => <div key={type.id} className="flex justify-between gap-2"><span>{quantity} × {type.nome} · {money.format(unit)}</span><strong>{money.format(subtotal)}</strong></div>)}</div><div className="mt-2 flex justify-between border-t border-[#dbe7d7] pt-2 text-sm font-bold"><span>Total estimado</span><span>{money.format(total)}</span></div><p className="mt-1 text-[11px] text-[#657368]">A Jatobá confere as vagas e confirma o valor antes do pagamento.</p></div>}
    {step === "summary" && <div className="mt-3 rounded-xl border border-[#dbe7d7] p-3 text-xs leading-relaxed text-[#4e6253]"><p>Confira a resposta da Jatobá no chat. Se ela confirmou a vaga e o valor, você pode seguir com seus dados. Se não, volte para ajustar a escolha.</p><div className="mt-3 flex flex-wrap gap-3"><button type="button" onClick={() => setStep("contact")} className="rounded-lg bg-[#20745a] px-3 py-2 font-semibold text-white">Continuar com meus dados</button><button type="button" onClick={() => setStep("participants")} className="font-semibold text-[#20745a] underline">Alterar participantes</button></div></div>}
    {step === "contact" && <div className="mt-4 space-y-3"><p className="text-sm font-semibold">Seus dados para a reserva</p><p className="text-xs text-[#667468]">Preencha só agora, depois de conferir a vaga com a Jatobá.</p><label className="block text-xs font-semibold">Nome completo<input value={fullName} onChange={(event) => setFullName(event.target.value.slice(0, 120))} autoComplete="name" required placeholder="Como no documento" className="mt-1 w-full rounded-xl border border-[#d4ded1] bg-[#fbfcfa] px-3 py-3 text-sm font-normal focus:border-[#20745a] focus:outline-none" /></label><label className="block text-xs font-semibold">E-mail<input value={email} onChange={(event) => setEmail(event.target.value.slice(0, 160))} type="email" autoComplete="email" required placeholder="seu@email.com" className="mt-1 w-full rounded-xl border border-[#d4ded1] bg-[#fbfcfa] px-3 py-3 text-sm font-normal focus:border-[#20745a] focus:outline-none" /></label><label className="block text-xs font-semibold">CPF<input value={cpf} onChange={(event) => setCpf(event.target.value.slice(0, 14))} inputMode="numeric" autoComplete="off" required placeholder="000.000.000-00" className="mt-1 w-full rounded-xl border border-[#d4ded1] bg-[#fbfcfa] px-3 py-3 text-sm font-normal focus:border-[#20745a] focus:outline-none" /></label>{asksPet && <label className="block text-xs font-semibold">Vai levar pet?<select value={pet} onChange={(event) => setPet(event.target.value)} required className="mt-1 w-full rounded-xl border border-[#d4ded1] bg-white px-3 py-3 text-sm font-normal focus:border-[#20745a] focus:outline-none"><option value="">Selecione</option><option value="no">Não</option><option value="yes">Sim</option></select>{petRestricted && <span className="mt-1 block font-normal text-amber-800">Pets não entram na trilha. Se quiser levar um, ajuste o passeio com a Jatobá antes do pagamento.</span>}</label>}<p className="text-[11px] leading-relaxed text-[#667468]">Esses dados serão enviados à Jatobá nesta conversa; não ficam salvos neste formulário.</p></div>}
    {step === "payment" && <div className="mt-4 space-y-3"><p className="text-sm font-semibold">Revise antes de pagar</p><p className="text-xs leading-relaxed text-[#667468]">Leia o resumo final que a Jatobá enviou no chat. A reserva só fica garantida após a confirmação do pagamento.</p>{paymentSent ? <div className="rounded-xl bg-[#edf6ee] p-3 text-xs text-[#20745a]"><p>Sua escolha foi enviada. Acompanhe a resposta da Jatobá no chat para receber o PIX ou o link seguro de cartão. Não é necessário solicitar novamente.</p><button type="button" onClick={restart} className="mt-3 font-semibold underline">Planejar outra visita</button></div> : <><fieldset><legend className="text-xs font-semibold">Como prefere pagar?</legend><div className="mt-2 grid grid-cols-2 gap-2">{[["pix", "PIX"], ["card", "Cartão de crédito"]].map(([value, label]) => <label key={value} className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-xs ${paymentMethod === value ? "border-[#20745a] bg-[#edf6ee]" : "border-[#dce5da]"}`}><input type="radio" name="site-payment-method" value={value} checked={paymentMethod === value} onChange={() => setPaymentMethod(value)} className="accent-[#20745a]" />{label}</label>)}</div></fieldset><label className="flex items-start gap-2 text-xs leading-relaxed"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-0.5 accent-[#20745a]" /><span>Conferi os dados e o resumo da reserva enviados pela Jatobá e estão corretos.</span></label></>}</div>}
    {error && <p role="alert" className="mt-3 text-xs text-red-700">{error}</p>}
    {step !== "summary" && !(step === "payment" && paymentSent) && <button type="submit" disabled={sending || (step !== "date" && !catalog) || (step === "experiences" && (!selected.length || unavailable.length > 0)) || (step === "participants" && !quote.length) || (step === "payment" && (!paymentMethod || !confirmed))} className="mt-4 w-full rounded-xl bg-[#20745a] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">{sending ? "Jatobá está respondendo…" : step === "participants" ? "Consultar vaga e valor" : step === "contact" ? "Enviar meus dados" : step === "payment" ? "Solicitar pagamento" : "Continuar com a Jatobá"}</button>}
  </form>;
}
