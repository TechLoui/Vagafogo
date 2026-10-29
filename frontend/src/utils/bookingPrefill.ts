export type BookingPrefill = {
  participants?: Record<string, number>;
  ages?: Record<string, number[]>;
  times?: Record<string, string>;
};

const validId = (value: string) => /^[A-Za-z0-9_-]{1,100}$/.test(value)
  && !["__proto__", "prototype", "constructor"].includes(value);
const validTime = (value: unknown): value is string => typeof value === "string"
  && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);

const parseMap = <T>(value: string | null, valid: (item: unknown) => item is T): Record<string, T> | undefined => {
  if (!value || value.length > 8_000) return undefined;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return undefined;
    const entries = Object.entries(parsed);
    if (!entries.length || entries.length > 30 || entries.some(([key, item]) => !validId(key) || !valid(item))) return undefined;
    return Object.fromEntries(entries) as Record<string, T>;
  } catch {
    return undefined;
  }
};

export const parseBookingPrefill = (params: Pick<URLSearchParams, "get">): BookingPrefill => ({
  participants: parseMap(params.get("participantes"), (value): value is number =>
    typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 99),
  ages: parseMap(params.get("idades"), (value): value is number[] => Array.isArray(value) && value.length <= 99
    && value.every((age) => typeof age === "number" && Number.isInteger(age) && age >= 0 && age <= 120)),
  times: parseMap(params.get("horarios"), validTime),
});

export const knownBookingParticipants = (
  participants: BookingPrefill["participants"],
  ages: BookingPrefill["ages"],
  types: Array<{ id?: string; perguntarIdade?: boolean }>,
) => {
  const quantities: Record<string, number> = {};
  const knownAges: Record<string, string[]> = {};
  for (const type of types) {
    if (!type.id || !participants || !Object.hasOwn(participants, type.id)) continue;
    const quantity = participants[type.id];
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > 99) continue;
    quantities[type.id] = quantity;
    const sourceAges = ages && Object.hasOwn(ages, type.id) ? ages[type.id] : undefined;
    if (type.perguntarIdade && Array.isArray(sourceAges) && sourceAges.length <= quantity
      && sourceAges.every((age) => Number.isInteger(age) && age >= 0 && age <= 120)) {
      knownAges[type.id] = sourceAges.map(String);
    }
  }
  return { quantities, ages: knownAges };
};

export const knownBookingTimes = (
  times: BookingPrefill["times"],
  packages: Array<{ id?: string; modoHorario?: string; horarios?: string[] }>,
  selectedIds: string[],
  fallbackTime?: string,
): Record<string, string> => Object.fromEntries(packages.flatMap((item) => {
  if (!item.id || !selectedIds.includes(item.id) || item.modoHorario === "intervalo") return [];
  const requested = times && Object.hasOwn(times, item.id) ? times[item.id] : fallbackTime;
  return validTime(requested) && item.horarios?.includes(requested) ? [[item.id, requested]] : [];
}));
