import { FieldPath } from "firebase-admin/firestore";
import { obterFirestoreAdmin } from "./firebaseAdmin";
import { reservaContaParaOcupacao } from "./reservaStatus";

type PackageSchedule = {
  id: string;
  nome: string;
  modoHorario?: string;
  horarios?: string[];
  horarioInicio?: string;
  horarioFim?: string;
  dias?: number[];
  datasBloqueadas?: string[];
  limite?: number;
  ativo?: boolean;
};

type Reservation = Record<string, any>;
type DayAvailability = {
  fechado?: boolean;
  horarios?: Record<string, boolean>;
  vagasExtras?: Record<string, number>;
};

const saoPauloDate = (now: Date) => new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
}).format(now);

const saoPauloMinutes = (now: Date) => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(now);
  return Number(parts.find((part) => part.type === "hour")?.value ?? 0) * 60
    + Number(parts.find((part) => part.type === "minute")?.value ?? 0);
};

const minutes = (value: string) => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour <= 23 && minute <= 59 ? hour * 60 + minute : null;
};

const quantity = (value: unknown) => Math.max(0, Math.trunc(Number(value) || 0));
const normalize = (value: unknown) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const reservationPackageIds = (reservation: Reservation) => new Set<string>([
  ...(Array.isArray(reservation.pacoteIds) ? reservation.pacoteIds.map(String) : []),
  ...(Array.isArray(reservation.gruposParticipacao)
    ? reservation.gruposParticipacao.flatMap((group: Reservation) => Array.isArray(group.pacoteIds) ? group.pacoteIds.map(String) : [])
    : []),
]);

const reservedParticipants = (reservation: Reservation, packageId: string) => {
  if (Array.isArray(reservation.gruposParticipacao)) {
    const grouped = reservation.gruposParticipacao.reduce((total: number, group: Reservation) =>
      Array.isArray(group.pacoteIds) && group.pacoteIds.map(String).includes(packageId)
        ? total + quantity(group.participantes)
        : total, 0);
    if (grouped > 0) return grouped;
  }
  return Math.max(quantity(reservation.participantes),
    quantity(reservation.adultos) + quantity(reservation.bariatrica)
    + quantity(reservation.criancas) + quantity(reservation.naoPagante));
};

const extraCapacity = (day: DayAvailability, date: string, packageId: string, time?: string) => {
  const extras = day.vagasExtras ?? {};
  return quantity(extras[`geral::${date}`]) + quantity(extras[`${date}-${packageId}`])
    + (time ? quantity(extras[`geral::${date}::${time}`]) + quantity(extras[`${date}-${packageId}-${time}`]) : 0);
};

// Uma data aparece no calendário somente se ainda houver ao menos uma vaga
// para cada experiência escolhida. A reserva final é revalidada após informar
// a quantidade de pessoas, pois a agenda pode mudar enquanto o cliente conversa.
export const availableSiteBookingSlots = (
  date: string,
  pack: PackageSchedule,
  day: DayAvailability,
  reservations: Reservation[],
  now = new Date(),
): { horario: string; vagasRestantes: number | null }[] => {
  const currentDate = saoPauloDate(now);
  if (date < currentDate || day.fechado === true || pack.ativo === false) return [];
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  if (pack.dias?.length && !pack.dias.includes(weekday)) return [];
  if (pack.datasBloqueadas?.includes(date)) return [];

  const isToday = date === currentDate;
  const currentMinutes = isToday ? saoPauloMinutes(now) : -1;
  const isInterval = pack.modoHorario === "intervalo";
  const listedTimes = isInterval ? [""] : pack.horarios ?? [];
  if (!isInterval && listedTimes.length === 0) return [];

  return listedTimes.flatMap<{ horario: string; vagasRestantes: number | null }>((time) => {
    if (isInterval) {
      const end = Math.min(minutes(pack.horarioFim || "16:00") ?? 960, 900); // entrada até 15h
      if (isToday && currentMinutes >= end) return [];
    } else {
      const slotMinutes = minutes(time);
      if (slotMinutes === null || (isToday && currentMinutes >= slotMinutes)) return [];
      if (day.horarios?.[`${date}-${pack.id}-${time}`] === false) return [];
    }

    const capacity = quantity(pack.limite);
    if (capacity === 0) return [{ horario: time, vagasRestantes: null }]; // sem limite configurado
    const occupied = reservations.reduce((total, reservation) => {
      if (!reservaContaParaOcupacao(reservation)) return total;
      const ids = reservationPackageIds(reservation);
      if (!ids.has(pack.id) && !(ids.size === 0 && normalize(reservation.atividade).includes(normalize(pack.nome)))) return total;
      if (!isInterval) {
        const reservationTime = String(reservation.horariosPorPacote?.[pack.id] ?? reservation.horario ?? reservation.Horario ?? "").trim();
        if (reservationTime !== time) return total;
      }
      return total + reservedParticipants(reservation, pack.id);
    }, 0);
    const remaining = Math.max(0, capacity + extraCapacity(day, date, pack.id, time || undefined) - occupied);
    return remaining > 0 ? [{ horario: time, vagasRestantes: remaining }] : [];
  });
};

export const availableSiteBookingTimes = (
  date: string,
  pack: PackageSchedule,
  day: DayAvailability,
  reservations: Reservation[],
  now = new Date(),
): string[] => availableSiteBookingSlots(date, pack, day, reservations, now).map((slot) => slot.horario);

export const consultarAgendaReservaSite = async (month: string, packageIds: string[], now = new Date()) => {
  const db = obterFirestoreAdmin();
  if (!db) throw new Error("FIREBASE_ADMIN_UNAVAILABLE");
  const start = `${month}-01`;
  const nextMonth = new Date(`${start}T12:00:00Z`);
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
  const end = nextMonth.toISOString().slice(0, 10);
  const [packageDocs, dayDocs, reservationDocs] = await Promise.all([
    db.getAll(...packageIds.map((id) => db.collection("pacotes").doc(id))),
    db.collection("disponibilidade")
      .where(FieldPath.documentId(), ">=", start).where(FieldPath.documentId(), "<", end).get(),
    db.collection("reservas").where("data", ">=", start).where("data", "<", end).get(),
  ]);
  const packages = packageDocs.filter((doc) => doc.exists).map((doc) => ({ id: doc.id, ...doc.data() } as PackageSchedule));
  if (packages.length !== packageIds.length) throw new Error("SITE_BOOKING_PACKAGE_NOT_FOUND");
  const days = new Map(dayDocs.docs.map((doc) => [doc.id, doc.data() as DayAvailability]));
  const reservations = new Map<string, Reservation[]>();
  reservationDocs.docs.forEach((doc) => {
    const reservation = doc.data();
    const date = String(reservation.data ?? "");
    reservations.set(date, [...(reservations.get(date) ?? []), reservation]);
  });

  const available: Record<string, Record<string, string[]>> = {};
  const remaining: Record<string, Record<string, Record<string, number | null>>> = {};
  for (let cursor = new Date(`${start}T12:00:00Z`); cursor.toISOString().slice(0, 10) < end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const date = cursor.toISOString().slice(0, 10);
    const slots = Object.fromEntries(packages.map((pack) => [pack.id,
      availableSiteBookingSlots(date, pack, days.get(date) ?? {}, reservations.get(date) ?? [], now),
    ]));
    const perPackage = Object.fromEntries(packages.map((pack) => [pack.id, slots[pack.id].map((slot) => slot.horario)]));
    if (packages.every((pack) => perPackage[pack.id].length > 0)) available[date] = perPackage;
    if (available[date]) remaining[date] = Object.fromEntries(packages.map((pack) => [pack.id,
      Object.fromEntries(slots[pack.id].map((slot) => [slot.horario, slot.vagasRestantes])),
    ]));
  }
  return { dias: available, vagas: remaining };
};
