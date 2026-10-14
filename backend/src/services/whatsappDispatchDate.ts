export const WHATSAPP_TIMEZONE = "America/Sao_Paulo";

const validDateKey = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
};

export const dataAtualWhatsapp = (date = new Date(), timeZone = WHATSAPP_TIMEZONE) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
};

export const normalizarDataDisparo = (value: unknown) => {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? dataAtualWhatsapp(value) : "";
  if (typeof (value as any)?.toDate === "function") {
    const date = (value as any).toDate();
    return date instanceof Date && Number.isFinite(date.getTime()) ? dataAtualWhatsapp(date) : "";
  }
  const raw = String(value ?? "").trim();
  const iso = /^(\d{4}-\d{2}-\d{2})/.exec(raw)?.[1] ?? "";
  if (iso) return validDateKey(iso) ? iso : "";
  const br = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(raw);
  if (!br) return "";
  const normalized = `${br[3]}-${br[2]}-${br[1]}`;
  return validDateKey(normalized) ? normalized : "";
};

export type ValidadeDataDisparo = "valido" | "expirado" | "data_invalida";

export const classificarDataDisparo = (
  value: unknown,
  today = dataAtualWhatsapp(),
): ValidadeDataDisparo => {
  const date = normalizarDataDisparo(value);
  if (!date) return "data_invalida";
  return date < today ? "expirado" : "valido";
};
