import { obterFirestoreAdmin } from "./firebaseAdmin";
import { reservaContaParaOcupacao } from "./reservaStatus";

type RecordData = Record<string, any>;
export type PublicOccupancy = { pacoteIds: string[]; horario: string; participantes: number };

const number = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
};
const mapTotal = (value: unknown) => value && typeof value === "object" && !Array.isArray(value)
  ? Object.values(value).reduce<number>((total, amount) => total + number(amount), 0) : 0;
const normalize = (value: unknown) => String(value ?? "").normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
const packageIds = (reservation: RecordData, packages: RecordData[]) => {
  const ids = [
    ...(Array.isArray(reservation.pacoteIds) ? reservation.pacoteIds : []),
    ...(Array.isArray(reservation.gruposParticipacao) ? reservation.gruposParticipacao.flatMap((group: RecordData) =>
      Array.isArray(group?.pacoteIds) ? group.pacoteIds : group?.tipo === "pacote" ? [group.refId] : []) : []),
  ].filter((id): id is string => typeof id === "string" && /^[A-Za-z0-9_-]{1,100}$/.test(id));
  if (ids.length) return [...new Set(ids)];
  const activity = normalize(reservation.atividade);
  return packages.filter((pack) => pack.id && normalize(pack.nome) && activity.includes(normalize(pack.nome)))
    .map((pack) => String(pack.id));
};

// Public clients need occupancy, never customer records, contact details or IDs.
export const resumirOcupacaoPublica = (reservations: RecordData[], packages: RecordData[] = []): PublicOccupancy[] => {
  const buckets = new Map<string, PublicOccupancy>();
  for (const reservation of reservations) {
    if (!reservaContaParaOcupacao(reservation)) continue;
    for (const id of packageIds(reservation, packages)) {
      const groups = Array.isArray(reservation.gruposParticipacao) ? reservation.gruposParticipacao : [];
      const grouped = groups.reduce((total: number, group: RecordData) =>
        Array.isArray(group?.pacoteIds) && group.pacoteIds.includes(id)
          ? total + Math.max(mapTotal(group.participantesPorTipo), number(group.participantes)) : total, 0);
      const amount = grouped || Math.max(mapTotal(reservation.participantesPorTipo), number(reservation.participantes),
        number(reservation.adultos) + number(reservation.criancas) + number(reservation.bariatrica) + number(reservation.naoPagante));
      if (amount <= 0) continue;
      const rawTime = String(reservation.horariosPorPacote?.[id] ?? reservation.horario ?? reservation.Horario ?? "").trim();
      const time = /^(?:[01]?\d|2[0-3]):[0-5]\d$/.test(rawTime) ? rawTime.padStart(5, "0") : "";
      const key = `${id}__${time}`;
      const bucket = buckets.get(key) ?? { pacoteIds: [id], horario: time, participantes: 0 };
      bucket.participantes += amount;
      buckets.set(key, bucket);
    }
  }
  return [...buckets.values()].sort((a, b) => `${a.pacoteIds[0]}${a.horario}`.localeCompare(`${b.pacoteIds[0]}${b.horario}`));
};

export const publicBookingDateValid = (value: unknown): value is string => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

export const consultarOcupacaoPublica = async (date: string) => {
  const db = obterFirestoreAdmin();
  if (!db) throw new Error("FIREBASE_ADMIN_UNAVAILABLE");
  const [reservations, packages] = await Promise.all([
    db.collection("reservas").where("data", "==", date).get(),
    db.collection("pacotes").get(),
  ]);
  return resumirOcupacaoPublica(reservations.docs.map((doc) => doc.data()), packages.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
};

export const codigoConsultaValido = (value: unknown): value is string =>
  typeof value === "string" && /^[A-Za-z0-9_-]{20,128}$/.test(value);
export const cpfConsultaValido = (value: string) => {
  if (!/^\d{11}$/.test(value) || /^(\d)\1+$/.test(value)) return false;
  return [9, 10].every((size) => {
    const total = Array.from(value.slice(0, size)).reduce((sum, digit, index) => sum + Number(digit) * (size + 1 - index), 0);
    const remainder = (total * 10) % 11;
    return (remainder === 10 ? 0 : remainder) === Number(value[size]);
  });
};

export const reservaPublicaDoTitular = (id: string, reservation: RecordData, cpf: string) => {
  if (!cpfConsultaValido(cpf) || String(reservation.cpf ?? "").replace(/\D/g, "") !== cpf) return null;
  const date = reservation.dataPagamento;
  const paidAt = date && typeof date.toDate === "function" ? date.toDate().toISOString()
    : date instanceof Date ? date.toISOString() : typeof date === "string" ? date : undefined;
  return {
    id, atividade: String(reservation.atividade ?? "").slice(0, 300), data: String(reservation.data ?? "").slice(0, 30),
    horario: String(reservation.horario ?? "").slice(0, 30), participantes: number(reservation.participantes),
    valor: Number.isFinite(Number(reservation.valor)) ? Number(reservation.valor) : 0,
    status: String(reservation.status ?? "").slice(0, 40), confirmada: reservation.confirmada === true,
    ...(paidAt ? { dataPagamento: paidAt } : {}),
  };
};

export const consultarReservasPublicasTitular = async (cpf: string, codigo: string, db = obterFirestoreAdmin()) => {
  if (!cpfConsultaValido(cpf) || !codigoConsultaValido(codigo)) return [];
  if (!db) throw new Error("FIREBASE_ADMIN_UNAVAILABLE");
  const snapshot = await db.collection("reservas").doc(codigo).get();
  if (!snapshot.exists) return [];
  const reservation = reservaPublicaDoTitular(snapshot.id, snapshot.data() ?? {}, cpf);
  return reservation ? [reservation] : [];
};
