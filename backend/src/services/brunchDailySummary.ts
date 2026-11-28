import { reservaEhManual } from "./reservaOrigem";
import { resumirParticipantesReserva, TipoParticipanteResumo } from "./reservaParticipantesResumo";

type Values = Record<string, any>;
export type BrunchDailyCatalog = {
  pacotes?: readonly { id: string; nome: string; tipo?: string }[];
  combos?: readonly { id: string; nome: string; pacoteIds?: readonly string[] }[];
  tiposClientes?: readonly TipoParticipanteResumo[];
};
export type BrunchDailyEntry = {
  reservationId: string;
  name: string;
  time: string;
  categories: { label: string; quantity: number }[];
  total: number;
};
export type BrunchDailyResult = {
  entries: BrunchDailyEntry[];
  reservationIds: string[];
  totalParticipants: number;
};

const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
const normalized = (value: unknown) => text(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const record = (value: unknown): Values => value && typeof value === "object" && !Array.isArray(value) ? value as Values : {};
const unique = (values: string[]) => [...new Set(values.filter(Boolean))];
const ids = (value: unknown) => Array.isArray(value) ? unique(value.map(text)) : [];
const isBrunch = (value: unknown) => /\bbrunch\b/.test(normalized(value));
const count = (value: unknown) => {
  if (typeof value !== "number" && !(typeof value === "string" && /^\d+$/.test(value.trim()))) return 0;
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : 0;
};
const time = (value: unknown) => {
  const match = /^(\d{1,2}):([0-5]\d)$/.exec(text(value));
  return match && Number(match[1]) < 24 ? `${match[1].padStart(2, "0")}:${match[2]}` : "";
};
const historicalNames = (raw: Values, group: boolean) => [
  ...(group ? [raw.nome] : [raw.atividade, raw.Atividade, raw.pacoteNome, raw.pacote, raw.comboNome]),
  ...[raw.pacoteNomes, raw.pacotes].flatMap((values) => Array.isArray(values)
    ? values.map((value) => typeof value === "string" ? value : record(value).nome) : []),
];
const canonical = (value: unknown): string => {
  if (Array.isArray(value)) return JSON.stringify(value.map(canonical));
  if (value && typeof value === "object") return JSON.stringify(Object.entries(value).sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => [key, canonical(item)]));
  return JSON.stringify(value) ?? "";
};

/** Builds Brunch attendance only. The caller owns date/status eligibility and sending. */
export const buildBrunchDailyEntries = (
  reservations: readonly { id?: string; data(): Values }[],
  catalog: BrunchDailyCatalog = {},
): BrunchDailyResult => {
  const packages = new Map((catalog.pacotes ?? []).map((item) => [item.id, item]));
  const combos = new Map((catalog.combos ?? []).map((item) => [item.id, item]));
  const types = catalog.tiposClientes ?? [];
  const offer = (raw: Values, group = false) => {
    const groupType = normalized(raw.tipo);
    const comboId = text(raw.comboId) || (group && groupType === "combo" ? text(raw.refId) : "");
    const combo = combos.get(comboId);
    const packageIds = unique([
      ...ids(raw.pacoteIds), text(raw.pacoteId),
      ...(group && groupType !== "combo" ? [text(raw.refId)] : []),
      ...ids(combo?.pacoteIds),
    ]);
    const known = packageIds.filter((id) => packages.has(id));
    const brunchIds = known.filter((id) => {
      const item = packages.get(id)!;
      return isBrunch(item.tipo) || isBrunch(item.nome);
    });
    const missing = packageIds.filter((id) => !packages.has(id));
    // An identified trail never becomes Brunch because a historical title disagrees.
    if (brunchIds.length) return { included: true, brunchIds };
    if (packageIds.length && !missing.length) return { included: false, brunchIds: [] as string[] };
    const historicalBrunch = [...historicalNames(raw, group), combo?.nome].some(isBrunch);
    return { included: historicalBrunch, brunchIds: historicalBrunch && missing.length === 1 ? missing : [] };
  };
  const categoriesFor = (raw: Values, manual: boolean) => {
    const map = Object.fromEntries(Object.entries(record(raw.participantesPorTipo)).flatMap(([key, value]) => count(value) ? [[key, count(value)]] : []));
    const composition = resumirParticipantesReserva({ participantesPorTipo: map,
      adultos: count(raw.adultos), criancas: count(raw.criancas), bariatrica: count(raw.bariatrica), naoPagante: count(raw.naoPagante),
    }, types, { naoPaganteLegadoAdicional: manual });
    if (composition.length) return composition.map((item) => ({
      label: item.label === "Participante" ? "Participantes sem tipo informado" : item.label,
      quantity: item.quantidade,
    }));
    const declared = count(raw.participantes ?? raw.Participantes);
    return declared ? [{ label: "Participantes sem tipo informado", quantity: declared }] : [];
  };
  const timesFor = (raw: Values, group: Values, brunchIds: string[]) => {
    const groupTimes = record(group.horariosPorPacote), reservationTimes = record(raw.horariosPorPacote);
    const targeted = unique(brunchIds.map((id) => time(groupTimes[id]) || time(reservationTimes[id])));
    if (targeted.length) return targeted;
    if (!brunchIds.length) {
      // Human-readable historical keys are usable; unrelated trail IDs are not.
      const historicalKeys = unique([...Object.keys(groupTimes), ...Object.keys(reservationTimes)]).filter(isBrunch);
      const historicalTimes = unique(historicalKeys.map((id) => time(groupTimes[id]) || time(reservationTimes[id])));
      if (historicalTimes.length) return historicalTimes;
    }
    return [time(group.horario ?? group.Horario) || time(raw.horario ?? raw.Horario) || "Sem horário informado"];
  };
  const results: BrunchDailyEntry[] = [];
  const seenReservations = new Set<string>();
  for (const document of reservations) {
    const raw = record(document.data()), reservationId = text(document.id) || text(raw.id);
    if (reservationId && seenReservations.has(reservationId)) continue;
    if (reservationId) seenReservations.add(reservationId);
    const name = (text(raw.nome ?? raw.Nome) || "Nome não informado").slice(0, 160);
    const manual = reservaEhManual(raw);
    const byTime = new Map<string, Map<string, { label: string; quantity: number }>>();
    const add = (source: Values, brunchIds: string[]) => {
      const categories = categoriesFor(source, manual);
      for (const slot of timesFor(raw, source === raw ? {} : source, brunchIds)) {
        const combined = byTime.get(slot) ?? new Map<string, { label: string; quantity: number }>();
        for (const category of categories) {
          const key = normalized(category.label), previous = combined.get(key);
          combined.set(key, { label: previous?.label ?? category.label, quantity: (previous?.quantity ?? 0) + category.quantity });
        }
        byTime.set(slot, combined);
      }
    };
    const groups = (Array.isArray(raw.gruposParticipacao)
      ? raw.gruposParticipacao.filter((group: unknown) => group && typeof group === "object" && !Array.isArray(group)) as Values[] : [])
      .filter((group) => text(group.refId) || text(group.id) || text(group.nome) || text(group.comboId) || ids(group.pacoteIds).length
        || count(group.participantes ?? group.Participantes) || Object.values(record(group.participantesPorTipo)).some((value) => count(value))
        || ["adultos", "criancas", "bariatrica", "naoPagante"].some((key) => count(group[key])));
    const seenObjects = new Set<Values>(), seenGroups = new Set<string>(), distinctGroups: Values[] = [];
    for (const group of groups) {
      const identity = text(group.refId) || text(group.id);
      const key = identity ? canonical(group) : "";
      if (seenObjects.has(group) || (key && seenGroups.has(key))) continue;
      seenObjects.add(group); if (key) seenGroups.add(key);
      distinctGroups.push(group);
    }
    let brunchGroups = 0;
    for (const group of distinctGroups) {
      const selected = offer(group, true);
      if (!selected.included) continue;
      brunchGroups++;
      // Do not borrow global counts or non-paying fields: they can belong to a trail group.
      add(group, selected.brunchIds);
    }
    if (brunchGroups > 0 && brunchGroups === distinctGroups.length && byTime.size === 1 && count(raw.naoPagante)
      && !distinctGroups.some((group) => Object.prototype.hasOwnProperty.call(group, "naoPagante"))) {
      const values = byTime.values().next().value!;
      const hasNonPaying = [...values.values()].some((item) => /\b(?:nao pagantes?|isent[oa]s?|bebes?)\b/.test(normalized(item.label)));
      if (manual || !hasNonPaying) {
        // Legacy checkout groups can omit the mirrored top-level non-paying field.
        // It is attributable only when every group attends this same Brunch slot.
        const previous = values.get("nao pagante");
        values.set("nao pagante", { label: previous?.label ?? "Não pagante", quantity: (previous?.quantity ?? 0) + count(raw.naoPagante) });
      }
    }
    if (!brunchGroups) {
      const selected = offer(raw);
      if (!selected.included) continue;
      if (groups.length) {
        // Brunch is selected but its group is missing: preserve a visible unknown rather than count trail participants.
        for (const slot of timesFor(raw, {}, selected.brunchIds)) byTime.set(slot, new Map());
      } else add(raw, selected.brunchIds);
    }
    for (const [slot, values] of byTime) {
      const categories = [...values.values()].sort((left, right) => left.label.localeCompare(right.label, "pt-BR"));
      // Empty categories + total 0 explicitly mean "not informed", never an invented adult/zero-person group.
      results.push({ reservationId, name, time: slot, categories, total: categories.reduce((sum, category) => sum + category.quantity, 0) });
    }
  }
  results.sort((left, right) => {
    const minutes = (value: string) => /^\d{2}:\d{2}$/.test(value) ? Number(value.slice(0, 2)) * 60 + Number(value.slice(3)) : 1440;
    return minutes(left.time) - minutes(right.time) || left.name.localeCompare(right.name, "pt-BR") || left.reservationId.localeCompare(right.reservationId);
  });
  return { entries: results, reservationIds: unique(results.map((entry) => entry.reservationId)),
    totalParticipants: results.reduce((sum, entry) => sum + entry.total, 0) };
};
