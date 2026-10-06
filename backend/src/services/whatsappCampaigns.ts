import { createHash, randomUUID } from "crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { obterFirestoreAdmin, obterStorageBucketAdmin } from "./firebaseAdmin";
import {
  enviarMensagemWhatsappGerenciada,
  obterStatusWhatsApp,
  registrarObservadorAckWhatsapp,
  registrarObservadorMensagemWhatsapp,
  type WhatsappAckEvent,
  type WhatsappInboundEvent,
  type WhatsappMediaPayload,
} from "./whatsapp";

export type CampaignSegment =
  | "inactive90"
  | "inactive180"
  | "inactive365"
  | "recurring"
  | "brunch"
  | "trail"
  | "pending"
  | "abandoned"
  | "lost";

export type CriarCampanhaInput = {
  nome: string;
  segmento: CampaignSegment;
  variacoes: string[];
  intervaloMinSegundos?: number;
  intervaloMaxSegundos?: number;
  limiteDiario?: number;
  horarioInicio?: string;
  horarioFim?: string;
  diasSemana?: number[];
  maxTentativas?: number;
  midia?: WhatsappMediaPayload;
};

type CampaignCustomer = {
  phone: string;
  name: string;
  email?: string;
  bookings: number;
  lastVisit?: string;
  activities: Set<string>;
  hasPending: boolean;
  optIn: boolean;
  reservationIds: string[];
  abandoned?: boolean;
  lastInteractionMs?: number;
};

const CAMPAIGN_SENDING_ENABLED =
  (process.env.WHATSAPP_CAMPAIGNS_ENABLED ?? "false").trim().toLowerCase() === "true";
const WORKER_INTERVAL_MS = Math.max(Number(process.env.WHATSAPP_CAMPAIGN_WORKER_MS ?? 15000), 5000);
const TIMEZONE = "America/Sao_Paulo";
const ACTIVE_STATUSES = ["agendada", "enviando"];
const SEGMENTS: CampaignSegment[] = ["inactive90", "inactive180", "inactive365", "recurring", "brunch", "trail", "pending", "abandoned", "lost"];
const SEGMENT_LABELS: Record<CampaignSegment, string> = {
  inactive90: "Sem visita há 90+ dias",
  inactive180: "Sem visita há 180+ dias",
  inactive365: "Sem visita há 1 ano",
  recurring: "Clientes recorrentes",
  brunch: "Experiência Brunch",
  trail: "Experiência Trilha",
  pending: "Pagamento não concluído",
  abandoned: "Checkout abandonado com opt-in",
  lost: "Oportunidades perdidas com opt-in",
};
const OPT_OUT_WORDS = /^(sair|pare|parar|cancelar|descadastrar|nao quero|não quero|stop)$/i;
const CAMPAIGN_MEDIA_MAX_BYTES = 5 * 1024 * 1024;
const CAMPAIGN_MEDIA_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const INTERNAL_TEST_DESTINATION = "5562991150376";

let workerTimer: NodeJS.Timeout | null = null;
let workerRunning = false;
let observersRegistered = false;

const normalizeText = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

const normalizePhone = (value: unknown) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
};

const hashId = (value: string) => createHash("sha256").update(value).digest("hex").slice(0, 40);
const clamp = (value: unknown, minimum: number, maximum: number, fallback: number) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(maximum, Math.max(minimum, Math.floor(number))) : fallback;
};
const clean = (value: unknown, maximum: number) => String(value ?? "").trim().slice(0, maximum);

const extensionForMedia = (mimeType: string) => mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";

const hasValidImageSignature = (buffer: Buffer, mimeType: string) => {
  if (mimeType === "image/jpeg") return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mimeType === "image/png") return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
};

export const armazenarMidiaCampanhaWhatsapp = async (
  buffer: Buffer,
  mimeTypeInput: unknown,
  filenameInput: unknown,
  actor: { uid: string },
): Promise<WhatsappMediaPayload> => {
  const mimeType = clean(mimeTypeInput, 80).toLowerCase();
  if (!CAMPAIGN_MEDIA_TYPES.has(mimeType)) throw new Error("CAMPAIGN_MEDIA_TYPE_INVALID");
  if (!buffer.length || buffer.length > CAMPAIGN_MEDIA_MAX_BYTES) throw new Error("CAMPAIGN_MEDIA_SIZE_INVALID");
  if (!hasValidImageSignature(buffer, mimeType)) throw new Error("CAMPAIGN_MEDIA_CONTENT_INVALID");
  const bucket = obterStorageBucketAdmin();
  if (!bucket) throw new Error("FIREBASE_ADMIN_UNAVAILABLE");
  const extension = extensionForMedia(mimeType);
  const filenameBase = clean(filenameInput, 100).replace(/[^A-Za-z0-9._-]+/g, "-").replace(/\.(jpe?g|png|webp)$/i, "") || "campanha";
  const filename = `${filenameBase.slice(0, 90)}.${extension}`;
  const storagePath = `crm-campanhas/${actor.uid}/${randomUUID()}.${extension}`;
  await bucket.file(storagePath).save(buffer, {
    resumable: false,
    contentType: mimeType,
    metadata: { cacheControl: "private, max-age=3600", metadata: { uploadedBy: actor.uid, originalFilename: filename } },
  });
  return { storagePath, mimeType: mimeType as WhatsappMediaPayload["mimeType"], filename, sizeBytes: buffer.length };
};

export const removerMidiaCampanhaWhatsapp = async (storagePathInput: unknown, actor: { uid: string }) => {
  const storagePath = clean(storagePathInput, 300);
  if (!storagePath.startsWith(`crm-campanhas/${actor.uid}/`)) throw new Error("CAMPAIGN_MEDIA_PATH_INVALID");
  const bucket = obterStorageBucketAdmin();
  if (!bucket) throw new Error("FIREBASE_ADMIN_UNAVAILABLE");
  await bucket.file(storagePath).delete({ ignoreNotFound: true });
};

const validateStoredMedia = async (value: unknown, actor: { uid: string }): Promise<WhatsappMediaPayload | undefined> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const raw = value as Record<string, unknown>;
  const storagePath = clean(raw.storagePath, 300);
  const mimeType = clean(raw.mimeType, 80).toLowerCase();
  const filename = clean(raw.filename, 120);
  const sizeBytes = Number(raw.sizeBytes);
  if (!storagePath.startsWith(`crm-campanhas/${actor.uid}/`) || !CAMPAIGN_MEDIA_TYPES.has(mimeType)) throw new Error("CAMPAIGN_MEDIA_INVALID");
  const bucket = obterStorageBucketAdmin();
  if (!bucket) throw new Error("FIREBASE_ADMIN_UNAVAILABLE");
  const [metadata] = await bucket.file(storagePath).getMetadata();
  const storedSize = Number(metadata.size ?? sizeBytes);
  const storedType = String(metadata.contentType ?? mimeType).toLowerCase();
  if (!Number.isFinite(storedSize) || storedSize <= 0 || storedSize > CAMPAIGN_MEDIA_MAX_BYTES || storedType !== mimeType) throw new Error("CAMPAIGN_MEDIA_INVALID");
  return { storagePath, mimeType: mimeType as WhatsappMediaPayload["mimeType"], filename: filename || `campanha.${extensionForMedia(mimeType)}`, sizeBytes: storedSize };
};

const dateKey = (value: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(value);

const normalizeDate = (value: unknown) => {
  if (typeof value === "string") {
    const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
    const br = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(value);
    if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  }
  const maybeDate = (value as { toDate?: () => Date } | null)?.toDate?.();
  return maybeDate instanceof Date ? dateKey(maybeDate) : "";
};

const isPaid = (status: unknown) =>
  ["pago", "confirmado", "paid", "confirmed", "approved", "aprovado", "received", "recebido"].includes(normalizeText(status));
const isPending = (status: unknown) => {
  const normalized = normalizeText(status);
  return ["aguard", "pending", "processing", "pre_reserva", "pre-reserva"].some((part) => normalized.includes(part));
};

const daysSince = (date: string) => {
  const value = new Date(`${date}T12:00:00-03:00`).getTime();
  return Number.isFinite(value) ? Math.max(0, Math.floor((Date.now() - value) / 86400000)) : 0;
};

const segmentMatches = (customer: CampaignCustomer, segment: CampaignSegment) => {
  const inactiveDays = customer.lastVisit ? daysSince(customer.lastVisit) : 0;
  if (segment === "inactive90") return Boolean(customer.lastVisit && inactiveDays >= 90);
  if (segment === "inactive180") return Boolean(customer.lastVisit && inactiveDays >= 180);
  if (segment === "inactive365") return Boolean(customer.lastVisit && inactiveDays >= 365);
  if (segment === "recurring") return customer.bookings >= 2;
  if (segment === "pending") return customer.hasPending;
  if (segment === "abandoned" || segment === "lost") return customer.abandoned === true;
  const activities = Array.from(customer.activities).join(" ");
  return segment === "brunch" ? normalizeText(activities).includes("brunch") : normalizeText(activities).includes("trilha");
};

const loadAudience = async (segment: CampaignSegment) => {
  const db = obterFirestoreAdmin();
  if (!db) throw new Error("FIREBASE_ADMIN_UNAVAILABLE");
  const [reservationsSnapshot, contactsSnapshot, journeysSnapshot, agentLeadsSnapshot] = await Promise.all([
    db.collection("reservas").get(),
    db.collection("crm_whatsapp_contatos").get(),
    db.collection("crm_jornadas").get(),
    db.collection("crm_leads_agente").get(),
  ]);
  const contacts = new Map(contactsSnapshot.docs.map((document) => [document.id, document.data()]));
  const customers = new Map<string, CampaignCustomer>();
  const today = dateKey(new Date());
  let recordsWithPhone = 0;

  reservationsSnapshot.docs.forEach((document) => {
    const raw = document.data();
    const phone = normalizePhone(raw.telefone ?? raw.Telefone);
    if (!phone) return;
    recordsWithPhone += 1;
    const name = clean(raw.nome ?? raw.Nome ?? "Cliente", 160) || "Cliente";
    const date = normalizeDate(raw.data ?? raw.Data);
    const status = raw.status ?? raw.Status ?? (raw.confirmada ? "confirmado" : "");
    const activity = clean(raw.atividade ?? raw.Atividade, 240);
    const confirmedPast = Boolean(date && date <= today && isPaid(status));
    const existing = customers.get(phone) ?? {
      phone,
      name,
      email: clean(raw.email ?? raw.Email, 240) || undefined,
      bookings: 0,
      activities: new Set<string>(),
      hasPending: false,
      optIn: false,
      reservationIds: [],
    };
    existing.reservationIds.push(document.id);
    if (confirmedPast) {
      existing.bookings += 1;
      if (!existing.lastVisit || date > existing.lastVisit) existing.lastVisit = date;
      if (activity) existing.activities.add(activity);
    }
    if (isPending(status)) existing.hasPending = true;
    if (
      raw.whatsappMarketingOptIn === true ||
      raw.consentimentoWhatsappMarketing === true ||
      raw.aceiteMarketingWhatsapp === true
    ) existing.optIn = true;
    customers.set(phone, existing);
  });

  if (segment === "abandoned" || segment === "lost") {
    const cutoff = Date.now() - 30 * 60 * 1000;
    const abandonedCustomers = new Map<string, CampaignCustomer>();
    let journeyRecordsWithPhone = 0;
    journeysSnapshot.docs.forEach((document) => {
      const raw = document.data();
      if (raw.status === "convertida" || raw.reservaId) return;
      const lastEvent = raw.ultimoEventoEm?.toDate?.() as Date | undefined;
      const lastInteractionMs = lastEvent?.getTime?.() ?? 0;
      if (!lastInteractionMs || lastInteractionMs > cutoff) return;
      const phone = normalizePhone(raw.telefone);
      if (!phone) return;
      journeyRecordsWithPhone += 1;
      const previous = abandonedCustomers.get(phone);
      if (previous?.lastInteractionMs && previous.lastInteractionMs >= lastInteractionMs) return;
      abandonedCustomers.set(phone, {
        phone,
        name: clean(raw.nome ?? "Cliente", 160) || "Cliente",
        email: clean(raw.email, 240) || undefined,
        bookings: 0,
        activities: new Set(Array.isArray(raw.interesseAtividades) ? raw.interesseAtividades.map((item: unknown) => clean(item, 160)).filter(Boolean) : []),
        hasPending: false,
        optIn: raw.recuperacaoWhatsappOptIn === true,
        reservationIds: [],
        abandoned: true,
        lastInteractionMs,
      });
    });
    if (segment === "lost") {
      agentLeadsSnapshot.docs.forEach((document) => {
        const raw = document.data();
        if (raw.teste === true) return;
        const signal = normalizeText(`${raw.etapa ?? ""} ${raw.resultado ?? ""} ${raw.motivo ?? ""}`);
        if (!/nao convert|encerrado sem reserva|pagamento (nao identificado|expirado|nao concluido)|abandono|desistencia|desistiu|oportunidade perdida/.test(signal)) return;
        const phone = normalizePhone(raw.telefone ?? String(raw.sessionId ?? "").match(/^whatsapp_(\d{10,15})$/)?.[1]);
        if (!phone) return;
        journeyRecordsWithPhone += 1;
        const updatedAt = raw.atualizadoEm?.toDate?.() as Date | undefined;
        const createdAt = raw.criadoEm?.toDate?.() as Date | undefined;
        const lastInteractionMs = updatedAt?.getTime?.() ?? createdAt?.getTime?.() ?? 0;
        const previous = abandonedCustomers.get(phone);
        if (previous?.lastInteractionMs && previous.lastInteractionMs >= lastInteractionMs) return;
        const activities = new Set(previous?.activities ?? []);
        if (Array.isArray(raw.atividades))
          raw.atividades
            .map((item: unknown) => clean(item, 160))
            .filter(Boolean)
            .forEach((item: string) => activities.add(item));
        abandonedCustomers.set(phone, {
          phone,
          name: clean(raw.nome ?? "Cliente", 160) || "Cliente",
          email: clean(raw.email, 240) || undefined,
          bookings: 0,
          activities,
          hasPending: /pagamento|pix|cobranca/.test(signal),
          optIn: raw.marketingOptIn === true || previous?.optIn === true,
          reservationIds: Array.from(
            new Set([
              ...(previous?.reservationIds ?? []),
              ...(raw.reservaId ? [String(raw.reservaId)] : []),
            ]),
          ),
          abandoned: true,
          lastInteractionMs,
        });
      });
    }
    const segmentCustomers = Array.from(abandonedCustomers.values());
    const eligible: CampaignCustomer[] = [];
    let withoutConsent = 0;
    let optedOut = 0;
    segmentCustomers.forEach((customer) => {
      const contact = contacts.get(customer.phone);
      if (contact?.optOutAt || contact?.marketingOptIn === false) {
        optedOut += 1;
        return;
      }
      if (!customer.optIn) {
        withoutConsent += 1;
        return;
      }
      eligible.push(customer);
    });
    return {
      eligible,
      totalSegment: segmentCustomers.length,
      withoutConsent,
      optedOut,
      duplicateRecords: Math.max(0, journeyRecordsWithPhone - abandonedCustomers.size),
    };
  }

  const segmentCustomers = Array.from(customers.values()).filter((customer) => segmentMatches(customer, segment));
  const eligible: CampaignCustomer[] = [];
  let withoutConsent = 0;
  let optedOut = 0;
  segmentCustomers.forEach((customer) => {
    const contact = contacts.get(customer.phone);
    if (contact?.optOutAt || contact?.marketingOptIn === false) {
      optedOut += 1;
      return;
    }
    const hasConsent = contact?.marketingOptIn === true || customer.optIn;
    if (!hasConsent) {
      withoutConsent += 1;
      return;
    }
    eligible.push(customer);
  });

  return {
    eligible,
    totalSegment: segmentCustomers.length,
    withoutConsent,
    optedOut,
    duplicateRecords: Math.max(0, recordsWithPhone - customers.size),
  };
};

const validateInput = (input: CriarCampanhaInput) => {
  const nome = clean(input.nome, 120);
  if (!nome) throw new Error("CAMPAIGN_NAME_REQUIRED");
  if (!SEGMENTS.includes(input.segmento)) throw new Error("INVALID_CAMPAIGN_SEGMENT");
  const variacoes = Array.from(new Set((Array.isArray(input.variacoes) ? input.variacoes : [])
    .map((value) => clean(value, 1500))
    .filter(Boolean))).slice(0, 5);
  if (!variacoes.length) throw new Error("CAMPAIGN_VARIANT_REQUIRED");
  const intervaloMinSegundos = clamp(input.intervaloMinSegundos, 60, 3600, 120);
  const intervaloMaxSegundos = Math.max(
    intervaloMinSegundos,
    clamp(input.intervaloMaxSegundos, 60, 7200, 240),
  );
  const horarioInicio = /^\d{2}:\d{2}$/.test(input.horarioInicio ?? "") ? input.horarioInicio! : "08:00";
  const horarioFim = /^\d{2}:\d{2}$/.test(input.horarioFim ?? "") ? input.horarioFim! : "18:00";
  const diasSemana = Array.from(new Set((input.diasSemana ?? [1, 2, 3, 4, 5, 6])
    .map(Number)
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)));
  return {
    nome,
    segmento: input.segmento,
    variacoes,
    intervaloMinSegundos,
    intervaloMaxSegundos,
    limiteDiario: clamp(input.limiteDiario, 10, 500, 100),
    horarioInicio,
    horarioFim,
    diasSemana: diasSemana.length ? diasSemana : [1, 2, 3, 4, 5, 6],
    maxTentativas: clamp(input.maxTentativas, 1, 5, 3),
  };
};

export const criarCampanhaWhatsapp = async (
  input: CriarCampanhaInput,
  actor: { uid: string; email?: string },
) => {
  const db = obterFirestoreAdmin();
  if (!db) throw new Error("FIREBASE_ADMIN_UNAVAILABLE");
  const config = validateInput(input);
  const media = await validateStoredMedia(input.midia, actor);
  const audience = await loadAudience(config.segmento);
  const campaignRef = db.collection("crm_campanhas").doc();
  const now = FieldValue.serverTimestamp();
  await campaignRef.set({
    nome: config.nome,
    segmento: config.segmento,
    segmentoLabel: SEGMENT_LABELS[config.segmento],
    variacoes: config.variacoes,
    ...(media ? { midia: media } : {}),
    status: "rascunho",
    canal: "whatsapp",
    intervaloMinSegundos: config.intervaloMinSegundos,
    intervaloMaxSegundos: config.intervaloMaxSegundos,
    limiteDiario: config.limiteDiario,
    horarioInicio: config.horarioInicio,
    horarioFim: config.horarioFim,
    diasSemana: config.diasSemana,
    maxTentativas: config.maxTentativas,
    publicoSegmento: audience.totalSegment,
    publicoElegivel: audience.eligible.length,
    publicoEstimado: audience.eligible.length,
    semConsentimento: audience.withoutConsent,
    optOut: audience.optedOut,
    duplicidadesEliminadas: audience.duplicateRecords,
    aguardando: audience.eligible.length,
    enviadas: 0,
    entregues: 0,
    lidas: 0,
    respostas: 0,
    cliques: 0,
    reservasGeradas: 0,
    conversoes: 0,
    receitaAtribuida: 0,
    erros: 0,
    ignoradas: 0,
    criadoEm: now,
    atualizadoEm: now,
    criadoPorUid: actor.uid,
    criadoPor: actor.email ?? null,
  });

  for (let index = 0; index < audience.eligible.length; index += 400) {
    const batch = db.batch();
    audience.eligible.slice(index, index + 400).forEach((customer) => {
      const recipientRef = campaignRef.collection("destinatarios").doc(hashId(customer.phone));
      batch.set(recipientRef, {
        campanhaId: campaignRef.id,
        nome: customer.name,
        telefone: customer.phone,
        email: customer.email ?? null,
        status: "aguardando",
        tentativas: 0,
        reservas: customer.bookings,
        ultimaVisita: customer.lastVisit ?? null,
        atividades: Array.from(customer.activities).slice(0, 10),
        reservaIds: customer.reservationIds.slice(-20),
        consentimento: true,
        temMidia: Boolean(media),
        criadoEm: now,
        atualizadoEm: now,
      });
    });
    await batch.commit();
  }

  return {
    id: campaignRef.id,
    publicoSegmento: audience.totalSegment,
    publicoElegivel: audience.eligible.length,
    semConsentimento: audience.withoutConsent,
    optOut: audience.optedOut,
    duplicidadesEliminadas: audience.duplicateRecords,
  };
};

const getCampaign = async (campaignId: string) => {
  const db = obterFirestoreAdmin();
  if (!db) throw new Error("FIREBASE_ADMIN_UNAVAILABLE");
  const ref = db.collection("crm_campanhas").doc(campaignId);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new Error("CAMPAIGN_NOT_FOUND");
  return { db, ref, data: snapshot.data()! };
};

export const iniciarCampanhaWhatsapp = async (campaignId: string) => {
  if (!CAMPAIGN_SENDING_ENABLED) throw new Error("CAMPAIGN_SENDING_DISABLED");
  const { ref, data } = await getCampaign(campaignId);
  if (Number(data.publicoElegivel ?? 0) <= 0) throw new Error("CAMPAIGN_WITHOUT_ELIGIBLE_RECIPIENTS");
  if (!["rascunho", "pausada"].includes(String(data.status))) throw new Error("CAMPAIGN_CANNOT_START");
  await ref.update({ status: "agendada", proximoDisparoEm: Timestamp.now(), iniciadoEm: data.iniciadoEm ?? FieldValue.serverTimestamp(), atualizadoEm: FieldValue.serverTimestamp() });
};

export const pausarCampanhaWhatsapp = async (campaignId: string) => {
  const { ref } = await getCampaign(campaignId);
  await ref.update({ status: "pausada", pausadoEm: FieldValue.serverTimestamp(), atualizadoEm: FieldValue.serverTimestamp() });
};

export const retomarCampanhaWhatsapp = async (campaignId: string) => {
  if (!CAMPAIGN_SENDING_ENABLED) throw new Error("CAMPAIGN_SENDING_DISABLED");
  const { ref, data } = await getCampaign(campaignId);
  if (String(data.status) !== "pausada") throw new Error("CAMPAIGN_NOT_PAUSED");
  await ref.update({ status: "agendada", proximoDisparoEm: Timestamp.now(), atualizadoEm: FieldValue.serverTimestamp() });
};

export const cancelarCampanhaWhatsapp = async (campaignId: string) => {
  const { ref, data } = await getCampaign(campaignId);
  if (["concluida", "cancelada"].includes(String(data.status))) throw new Error("CAMPAIGN_ALREADY_FINISHED");
  await ref.update({ status: "cancelada", canceladoEm: FieldValue.serverTimestamp(), atualizadoEm: FieldValue.serverTimestamp() });
};

export const reenfileirarErrosCampanhaWhatsapp = async (campaignId: string) => {
  const { db, ref } = await getCampaign(campaignId);
  const snapshot = await ref.collection("destinatarios").where("status", "==", "erro").get();
  for (let index = 0; index < snapshot.docs.length; index += 400) {
    const batch = db.batch();
    snapshot.docs.slice(index, index + 400).forEach((document) => {
      batch.update(document.ref, { status: "aguardando", tentativas: 0, proximaTentativaEm: Timestamp.now(), atualizadoEm: FieldValue.serverTimestamp() });
    });
    await batch.commit();
  }
  if (snapshot.size) {
    await ref.update({
      status: "pausada",
      erros: FieldValue.increment(-snapshot.size),
      aguardando: FieldValue.increment(snapshot.size),
      atualizadoEm: FieldValue.serverTimestamp(),
    });
  }
  return snapshot.size;
};

const localTimeParts = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  const weekdays: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { day: weekdays[value("weekday")] ?? 0, minutes: Number(value("hour")) * 60 + Number(value("minute")) };
};

const inSendingWindow = (campaign: FirebaseFirestore.DocumentData, now: Date) => {
  const { day, minutes } = localTimeParts(now);
  const days = Array.isArray(campaign.diasSemana) ? campaign.diasSemana.map(Number) : [1, 2, 3, 4, 5, 6];
  if (!days.includes(day)) return false;
  const toMinutes = (value: unknown, fallback: number) => {
    const match = /^(\d{2}):(\d{2})$/.exec(String(value ?? ""));
    return match ? Number(match[1]) * 60 + Number(match[2]) : fallback;
  };
  const start = toMinutes(campaign.horarioInicio, 480);
  const end = toMinutes(campaign.horarioFim, 1080);
  return start <= end ? minutes >= start && minutes <= end : minutes >= start || minutes <= end;
};

const renderMessage = (template: string, recipient: FirebaseFirestore.DocumentData, trackingUrl = "") => {
  const firstName = clean(recipient.nome, 160).split(/\s+/)[0] || "cliente";
  const replacements: Record<string, string> = {
    nome: firstName,
    nomecompleto: clean(recipient.nome, 160),
    ultimavisita: recipient.ultimaVisita ? normalizeDate(recipient.ultimaVisita) : "",
    reservas: String(recipient.reservas ?? 0),
    atividade: Array.isArray(recipient.atividades) ? recipient.atividades[0] ?? "" : "",
    link: trackingUrl,
  };
  const rendered = template.replace(/\{([a-z]+)\}/gi, (match, key) => replacements[normalizeText(key)] ?? match).trim();
  return trackingUrl && !template.toLowerCase().includes("{link}")
    ? `${rendered}\n\nReserve aqui: ${trackingUrl}`
    : rendered;
};

const trackingUrlFor = (campaignId: string, recipientId: string) => {
  const base = (process.env.PUBLIC_API_BASE_URL ?? "https://vagafogo-production.up.railway.app").trim().replace(/\/+$/, "");
  return `${base}/r/${encodeURIComponent(campaignId)}/${encodeURIComponent(recipientId)}`;
};

const enviarViaDisparadorCampanhas = async (
  phone: string,
  text: string,
  media?: WhatsappMediaPayload,
) => enviarMensagemWhatsappGerenciada(phone, text, media);

export const enviarTesteInternoCampanhaWhatsapp = async (
  input: Pick<CriarCampanhaInput, "variacoes" | "midia">,
  actor: { uid: string; email?: string },
) => {
  const db = obterFirestoreAdmin();
  if (!db) throw new Error("FIREBASE_ADMIN_UNAVAILABLE");
  const variants = Array.from(new Set((Array.isArray(input.variacoes) ? input.variacoes : [])
    .map((value) => clean(value, 1500))
    .filter(Boolean))).slice(0, 5);
  if (!variants.length) throw new Error("CAMPAIGN_VARIANT_REQUIRED");
  const media = await validateStoredMedia(input.midia, actor);
  const variantIndex = Math.floor(Math.random() * variants.length);
  const message = `[TESTE INTERNO CRM — CAMPANHA]\n\n${renderMessage(variants[variantIndex], {
    nome: "Equipe Vagafogo",
    reservas: 2,
    ultimaVisita: dateKey(new Date()),
    atividades: ["Experiência Vagafogo"],
  })}`;
  const configSnapshot = await db.collection("configuracoes").doc("whatsapp").get();
  const destination = normalizePhone(configSnapshot.data()?.avisoNovaReservaEquipeNumero) || INTERNAL_TEST_DESTINATION;
  if (!destination) throw new Error("INTERNAL_TEST_DESTINATION_INVALID");
  const auditRef = db.collection("crm_campanhas_testes").doc();
  await auditRef.set({
    status: "enviando",
    destino: destination,
    mensagem: message,
    variacaoIndice: variantIndex,
    variacoesDisponiveis: variants.length,
    formato: media ? "foto_legenda" : "texto",
    ...(media ? { midia: { filename: media.filename, mimeType: media.mimeType, sizeBytes: media.sizeBytes } } : {}),
    criadoPorUid: actor.uid,
    criadoPor: actor.email ?? null,
    criadoEm: FieldValue.serverTimestamp(),
    atualizadoEm: FieldValue.serverTimestamp(),
  });
  try {
    const result = await enviarViaDisparadorCampanhas(destination, message, media);
    await auditRef.update({
      status: result.enviado ? "enviado" : "erro",
      messageId: result.messageId ?? null,
      motivo: result.motivo ?? null,
      midiaEnviada: result.midiaEnviada === true,
      concluidoEm: FieldValue.serverTimestamp(),
      atualizadoEm: FieldValue.serverTimestamp(),
    });
    return {
      id: auditRef.id,
      enviado: result.enviado,
      motivo: result.motivo,
      formato: media ? "foto_legenda" : "texto",
      variacao: variantIndex + 1,
      destinoMascarado: `***${destination.slice(-4)}`,
    };
  } finally {
    if (media) await removerMidiaCampanhaWhatsapp(media.storagePath, actor).catch(() => undefined);
  }
};

const acquireCampaignLease = async (campaignRef: FirebaseFirestore.DocumentReference) => {
  const db = campaignRef.firestore;
  const owner = randomUUID();
  const data = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(campaignRef);
    if (!snapshot.exists || !ACTIVE_STATUSES.includes(String(snapshot.data()?.status))) return null;
    const lockUntil = snapshot.data()?.lockAte?.toDate?.() as Date | undefined;
    if (lockUntil && lockUntil.getTime() > Date.now()) return null;
    transaction.update(campaignRef, { lockOwner: owner, lockAte: Timestamp.fromMillis(Date.now() + 60000) });
    return snapshot.data()!;
  });
  return data ? { owner, data } : null;
};

const releaseCampaignLease = async (campaignRef: FirebaseFirestore.DocumentReference, owner: string, patch: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData> = {}) => {
  await campaignRef.update({ ...patch, lockOwner: FieldValue.delete(), lockAte: FieldValue.delete(), atualizadoEm: FieldValue.serverTimestamp() }).catch(() => undefined);
};

const randomIntervalMs = (campaign: FirebaseFirestore.DocumentData) => {
  const minimum = clamp(campaign.intervaloMinSegundos, 60, 3600, 120);
  const maximum = Math.max(minimum, clamp(campaign.intervaloMaxSegundos, 60, 7200, 240));
  return (minimum + Math.floor(Math.random() * (maximum - minimum + 1))) * 1000;
};

const processCampaign = async (campaignRef: FirebaseFirestore.DocumentReference) => {
  const lease = await acquireCampaignLease(campaignRef);
  if (!lease) return;
  const { owner, data: campaign } = lease;
  const now = new Date();
  let activeRecipientRef: FirebaseFirestore.DocumentReference | null = null;
  let activeAttempts = 0;
  try {
    const nextDispatch = campaign.proximoDisparoEm?.toDate?.() as Date | undefined;
    if (nextDispatch && nextDispatch.getTime() > now.getTime()) {
      await releaseCampaignLease(campaignRef, owner);
      return;
    }
    if (!inSendingWindow(campaign, now)) {
      await releaseCampaignLease(campaignRef, owner, { proximoDisparoEm: Timestamp.fromMillis(now.getTime() + 15 * 60000) });
      return;
    }
    const currentDate = dateKey(now);
    const dailySent = campaign.dataContadorDiario === currentDate ? Number(campaign.enviadasHoje ?? 0) : 0;
    if (dailySent >= Number(campaign.limiteDiario ?? 100)) {
      await releaseCampaignLease(campaignRef, owner, { proximoDisparoEm: Timestamp.fromMillis(now.getTime() + 60 * 60000) });
      return;
    }

    const pendingSnapshot = await campaignRef.collection("destinatarios").where("status", "==", "aguardando").limit(25).get();
    if (pendingSnapshot.empty) {
      await releaseCampaignLease(campaignRef, owner, { status: "concluida", concluidoEm: FieldValue.serverTimestamp(), proximoDisparoEm: FieldValue.delete() });
      return;
    }
    const due = pendingSnapshot.docs.find((document) => {
      const nextAttempt = document.data().proximaTentativaEm?.toDate?.() as Date | undefined;
      return !nextAttempt || nextAttempt.getTime() <= now.getTime();
    });
    if (!due) {
      const earliest = Math.min(...pendingSnapshot.docs.map((document) => document.data().proximaTentativaEm?.toDate?.()?.getTime?.() ?? now.getTime() + 60000));
      await releaseCampaignLease(campaignRef, owner, { proximoDisparoEm: Timestamp.fromMillis(earliest) });
      return;
    }

    const recipientData = due.data();
    const attempts = Number(recipientData.tentativas ?? 0) + 1;
    activeRecipientRef = due.ref;
    activeAttempts = attempts;
    await due.ref.update({ status: "enviando", tentativas: attempts, ultimaTentativaEm: FieldValue.serverTimestamp(), atualizadoEm: FieldValue.serverTimestamp() });
    const variants = Array.isArray(campaign.variacoes) ? campaign.variacoes.map((value: unknown) => clean(value, 1500)).filter(Boolean) : [];
    if (!variants.length) throw new Error("CAMPAIGN_WITHOUT_VARIANTS");
    const variantIndex = Math.floor(Math.random() * variants.length);
    const message = renderMessage(variants[variantIndex], recipientData, trackingUrlFor(campaignRef.id, due.id));
    const media = campaign.midia && typeof campaign.midia === "object"
      ? campaign.midia as WhatsappMediaPayload
      : undefined;
    const result = await enviarViaDisparadorCampanhas(String(recipientData.telefone ?? ""), message, media);
    const nextDispatchAt = Timestamp.fromMillis(Date.now() + randomIntervalMs(campaign));

    if (result.enviado) {
      const messageId = result.messageId ?? "";
      const batch = campaignRef.firestore.batch();
      batch.update(due.ref, {
        status: "enviado",
        mensagem: message,
        variacaoIndice: variantIndex,
        messageId: messageId || null,
        midiaEnviada: result.midiaEnviada === true,
        enviadoEm: FieldValue.serverTimestamp(),
        ultimoErro: FieldValue.delete(),
        atualizadoEm: FieldValue.serverTimestamp(),
      });
      batch.update(campaignRef, {
        status: "enviando",
        enviadas: FieldValue.increment(1),
        aguardando: FieldValue.increment(-1),
        enviadasHoje: campaign.dataContadorDiario === currentDate ? FieldValue.increment(1) : 1,
        dataContadorDiario: currentDate,
        proximoDisparoEm: nextDispatchAt,
        ultimoDisparoEm: FieldValue.serverTimestamp(),
        lockOwner: FieldValue.delete(),
        lockAte: FieldValue.delete(),
        atualizadoEm: FieldValue.serverTimestamp(),
      });
      const contactRef = campaignRef.firestore.collection("crm_whatsapp_contatos").doc(String(recipientData.telefone));
      batch.set(contactRef, {
        telefone: recipientData.telefone,
        nome: recipientData.nome,
        marketingOptIn: true,
        ultimaCampanhaId: campaignRef.id,
        ultimoDestinatarioId: due.id,
        ultimaMensagemEnviadaEm: FieldValue.serverTimestamp(),
      }, { merge: true });
      if (messageId) {
        batch.set(campaignRef.firestore.collection("crm_whatsapp_mensagens").doc(hashId(messageId)), {
          messageId,
          campanhaId: campaignRef.id,
          destinatarioId: due.id,
          telefone: recipientData.telefone,
          criadoEm: FieldValue.serverTimestamp(),
        });
      }
      await batch.commit();
      return;
    }

    const maxAttempts = Number(campaign.maxTentativas ?? 3);
    if (attempts < maxAttempts) {
      const retryAt = Timestamp.fromMillis(Date.now() + Math.max(randomIntervalMs(campaign), attempts * 5 * 60000));
      await due.ref.update({ status: "aguardando", ultimoErro: result.motivo ?? "erro_envio", proximaTentativaEm: retryAt, atualizadoEm: FieldValue.serverTimestamp() });
      await releaseCampaignLease(campaignRef, owner, { proximoDisparoEm: nextDispatchAt, tentativasComErro: FieldValue.increment(1) });
    } else {
      const batch = campaignRef.firestore.batch();
      batch.update(due.ref, { status: "erro", ultimoErro: result.motivo ?? "erro_envio", erroEm: FieldValue.serverTimestamp(), atualizadoEm: FieldValue.serverTimestamp() });
      batch.update(campaignRef, {
        status: "enviando",
        erros: FieldValue.increment(1),
        aguardando: FieldValue.increment(-1),
        proximoDisparoEm: nextDispatchAt,
        lockOwner: FieldValue.delete(),
        lockAte: FieldValue.delete(),
        atualizadoEm: FieldValue.serverTimestamp(),
      });
      await batch.commit();
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (activeRecipientRef) {
      const finalFailure = activeAttempts >= Number(campaign.maxTentativas ?? 3);
      if (finalFailure) {
        const batch = campaignRef.firestore.batch();
        batch.update(activeRecipientRef, {
          status: "erro",
          ultimoErro: errorMessage,
          erroEm: FieldValue.serverTimestamp(),
          atualizadoEm: FieldValue.serverTimestamp(),
        });
        batch.update(campaignRef, {
          erros: FieldValue.increment(1),
          aguardando: FieldValue.increment(-1),
          ultimoErroWorker: errorMessage,
          proximoDisparoEm: Timestamp.fromMillis(Date.now() + 5 * 60000),
          lockOwner: FieldValue.delete(),
          lockAte: FieldValue.delete(),
          atualizadoEm: FieldValue.serverTimestamp(),
        });
        await batch.commit().catch(() => undefined);
        return;
      }
      await activeRecipientRef.update({
        status: "aguardando",
        ultimoErro: errorMessage,
        proximaTentativaEm: Timestamp.fromMillis(Date.now() + 5 * 60000),
        atualizadoEm: FieldValue.serverTimestamp(),
      }).catch(() => undefined);
    }
    await releaseCampaignLease(campaignRef, owner, {
      ultimoErroWorker: errorMessage,
      proximoDisparoEm: Timestamp.fromMillis(Date.now() + 5 * 60000),
    });
  }
};

const handleAck = async (event: WhatsappAckEvent) => {
  const db = obterFirestoreAdmin();
  if (!db) return;
  const mapping = await db.collection("crm_whatsapp_mensagens").doc(hashId(event.messageId)).get();
  if (!mapping.exists || mapping.data()?.messageId !== event.messageId) return;
  const { campanhaId, destinatarioId } = mapping.data()!;
  const campaignRef = db.collection("crm_campanhas").doc(String(campanhaId));
  const recipientRef = campaignRef.collection("destinatarios").doc(String(destinatarioId));
  await db.runTransaction(async (transaction) => {
    const recipient = await transaction.get(recipientRef);
    if (!recipient.exists) return;
    const current = String(recipient.data()?.status ?? "");
    const ranks: Record<string, number> = { aguardando: 0, enviando: 1, enviado: 2, entregue: 3, lido: 4, respondido: 5 };
    if (event.ack <= 0) {
      if (current === "erro") return;
      transaction.update(recipientRef, { status: "erro", erroAposEnvio: "ack_failed", erroEm: FieldValue.serverTimestamp(), atualizadoEm: FieldValue.serverTimestamp() });
      transaction.update(campaignRef, { erros: FieldValue.increment(1), atualizadoEm: FieldValue.serverTimestamp() });
      return;
    }
    // whatsapp-web.js: 1/2 = enviado/servidor, 3 = aparelho, 4+ = lido/tocado.
    const nextStatus = event.ack >= 4 ? "lido" : event.ack >= 3 ? "entregue" : "enviado";
    if ((ranks[current] ?? 0) >= ranks[nextStatus]) return;
    const campaignPatch: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData> = { atualizadoEm: FieldValue.serverTimestamp() };
    if ((ranks[current] ?? 0) < ranks.entregue && ranks[nextStatus] >= ranks.entregue) campaignPatch.entregues = FieldValue.increment(1);
    if ((ranks[current] ?? 0) < ranks.lido && ranks[nextStatus] >= ranks.lido) campaignPatch.lidas = FieldValue.increment(1);
    transaction.update(recipientRef, { status: nextStatus, [`${nextStatus}Em`]: FieldValue.serverTimestamp(), atualizadoEm: FieldValue.serverTimestamp() });
    transaction.update(campaignRef, campaignPatch);
  });
};

const handleInbound = async (event: WhatsappInboundEvent) => {
  const db = obterFirestoreAdmin();
  if (!db) return;
  const phone = normalizePhone(event.telefone);
  if (!phone) return;
  const contactRef = db.collection("crm_whatsapp_contatos").doc(phone);
  const contact = await contactRef.get();
  if (!contact.exists) return;
  const campaignId = String(contact.data()?.ultimaCampanhaId ?? "");
  const recipientId = String(contact.data()?.ultimoDestinatarioId ?? "");
  const optedOut = OPT_OUT_WORDS.test(event.mensagem.trim());
  await contactRef.set({
    ultimaMensagemRecebidaEm: Timestamp.fromDate(event.recebidoEm),
    respondeuUltimaCampanha: true,
    ...(optedOut ? { marketingOptIn: false, optOutAt: FieldValue.serverTimestamp(), optOutOrigem: "mensagem_recebida" } : {}),
  }, { merge: true });
  if (!campaignId || !recipientId) return;
  const campaignRef = db.collection("crm_campanhas").doc(campaignId);
  const recipientRef = campaignRef.collection("destinatarios").doc(recipientId);
  await db.runTransaction(async (transaction) => {
    const recipient = await transaction.get(recipientRef);
    if (!recipient.exists) return;
    const alreadyReplied = ["respondido", "opt_out"].includes(String(recipient.data()?.status));
    transaction.update(recipientRef, {
      status: optedOut ? "opt_out" : "respondido",
      tipoResposta: optedOut ? "opt_out" : "resposta_recebida",
      respondidoEm: Timestamp.fromDate(event.recebidoEm),
      atualizadoEm: FieldValue.serverTimestamp(),
    });
    if (!alreadyReplied) transaction.update(campaignRef, { respostas: FieldValue.increment(1), ...(optedOut ? { optOut: FieldValue.increment(1) } : {}), atualizadoEm: FieldValue.serverTimestamp() });
  });
};

export const obterCapacidadeCampanhasWhatsapp = () => {
  const whatsapp = obterStatusWhatsApp();
  return {
  envioHabilitado: CAMPAIGN_SENDING_ENABLED,
  conectado: whatsapp.status === "ready",
  intervaloMinimoSegundos: 60,
  limiteDiarioMaximo: 500,
  provedor: "Central WhatsApp Vagafogo / whatsapp-web.js",
  recomendacao: "Conecte a Central WhatsApp no Admin, homologue com o teste interno e mantenha consentimento, limites, pausas e monitoramento de bloqueios.",
  };
};

export const registrarAckCampanhaExterno = async (event: WhatsappAckEvent) => handleAck(event);

export const registrarRespostaCampanhaExterna = async (event: WhatsappInboundEvent) => handleInbound(event);

export const obterAtribuicaoCampanhaPorTelefone = async (telefone: unknown) => {
  const phone = normalizePhone(telefone);
  const db = obterFirestoreAdmin();
  if (!phone || !db) return {};
  const snapshot = await db.collection("crm_whatsapp_contatos").doc(phone).get();
  if (!snapshot.exists) return {};
  const data = snapshot.data()!;
  const campaignId = clean(data.ultimaCampanhaId, 100);
  const recipientId = clean(data.ultimoDestinatarioId, 100);
  const sentAt = data.ultimaMensagemEnviadaEm?.toDate?.() as Date | undefined;
  const attributionDays = clamp(process.env.WHATSAPP_CAMPAIGN_ATTRIBUTION_DAYS, 1, 90, 30);
  if (!campaignId || !recipientId || !sentAt || Date.now() - sentAt.getTime() > attributionDays * 86400000) return {};
  return { campaignId, recipientId };
};

export const registrarCliqueCampanha = async (campaignId: string, recipientId: string) => {
  if (!/^[A-Za-z0-9_-]{10,100}$/.test(campaignId) || !/^[a-f0-9]{40}$/.test(recipientId)) return false;
  const db = obterFirestoreAdmin();
  if (!db) return false;
  const campaignRef = db.collection("crm_campanhas").doc(campaignId);
  const recipientRef = campaignRef.collection("destinatarios").doc(recipientId);
  return db.runTransaction(async (transaction) => {
    const recipient = await transaction.get(recipientRef);
    if (!recipient.exists) return false;
    if (!recipient.data()?.clicadoEm) {
      transaction.update(recipientRef, { clicadoEm: FieldValue.serverTimestamp(), atualizadoEm: FieldValue.serverTimestamp() });
      transaction.update(campaignRef, { cliques: FieldValue.increment(1), atualizadoEm: FieldValue.serverTimestamp() });
    }
    return true;
  });
};

export const registrarResultadoCampanhaReserva = async (
  attribution: unknown,
  reservationId: string,
  value: number,
  paid: boolean,
) => {
  const raw = attribution && typeof attribution === "object" && !Array.isArray(attribution)
    ? attribution as Record<string, unknown>
    : {};
  const campaignId = clean(raw.campaignId, 100);
  const recipientId = clean(raw.recipientId, 100);
  if (!/^[A-Za-z0-9_-]{10,100}$/.test(campaignId) || !/^[a-f0-9]{40}$/.test(recipientId)) return false;
  const db = obterFirestoreAdmin();
  if (!db) return false;
  const campaignRef = db.collection("crm_campanhas").doc(campaignId);
  const recipientRef = campaignRef.collection("destinatarios").doc(recipientId);
  return db.runTransaction(async (transaction) => {
    const recipient = await transaction.get(recipientRef);
    if (!recipient.exists) return false;
    const data = recipient.data()!;
    const recipientPatch: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData> = {
      reservaIdGerada: reservationId,
      reservaGeradaEm: data.reservaGeradaEm ?? FieldValue.serverTimestamp(),
      atualizadoEm: FieldValue.serverTimestamp(),
    };
    const campaignPatch: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData> = {
      atualizadoEm: FieldValue.serverTimestamp(),
    };
    if (!data.reservaGeradaEm) campaignPatch.reservasGeradas = FieldValue.increment(1);
    if (paid && !data.convertidoEm) {
      recipientPatch.convertidoEm = FieldValue.serverTimestamp();
      recipientPatch.receitaAtribuida = Math.max(0, Number(value) || 0);
      campaignPatch.conversoes = FieldValue.increment(1);
      campaignPatch.receitaAtribuida = FieldValue.increment(Math.max(0, Number(value) || 0));
    }
    transaction.update(recipientRef, recipientPatch);
    transaction.update(campaignRef, campaignPatch);
    return true;
  });
};

export const processarFilaCampanhasWhatsapp = async () => {
  if (!CAMPAIGN_SENDING_ENABLED || workerRunning) return;
  const db = obterFirestoreAdmin();
  if (!db) return;
  workerRunning = true;
  try {
    const campaigns = await db.collection("crm_campanhas").where("status", "in", ACTIVE_STATUSES).limit(10).get();
    for (const campaign of campaigns.docs) await processCampaign(campaign.ref);
  } finally {
    workerRunning = false;
  }
};

export const iniciarProcessadorCampanhasWhatsapp = () => {
  if (!observersRegistered) {
    registrarObservadorAckWhatsapp(handleAck);
    registrarObservadorMensagemWhatsapp(handleInbound);
    observersRegistered = true;
  }
  if (workerTimer) return;
  workerTimer = setInterval(() => void processarFilaCampanhasWhatsapp(), WORKER_INTERVAL_MS);
  workerTimer.unref?.();
  void processarFilaCampanhasWhatsapp();
};
