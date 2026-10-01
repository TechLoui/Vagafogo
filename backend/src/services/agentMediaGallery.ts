import { randomUUID } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { obterFirestoreAdmin, obterStorageBucketAdmin } from "./firebaseAdmin";

export const AGENT_GALLERY_CATEGORIES = ["brunch", "trilha", "espacos", "combo", "educacao_ambiental"] as const;
export type AgentGalleryCategory = typeof AGENT_GALLERY_CATEGORIES[number];

const COLLECTION = "crm_agente_galeria";
const SETTINGS_COLLECTION = "crm_agente_galeria_config";
const DEFAULTS_SETTINGS_DOCUMENT = "fotos_padrao";
const MAX_BYTES = 5 * 1024 * 1024;
const MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const PUBLIC_SITE_BASE_URL = (process.env.PUBLIC_SITE_BASE_URL ?? "https://vagafogo.com.br").trim().replace(/\/+$/, "");
type DefaultGalleryPhoto = { id: string; path: string; titulo: string; legenda: string };
const DEFAULT_GALLERY: Record<AgentGalleryCategory, DefaultGalleryPhoto[]> = {
  brunch: [
    { id: "padrao-brunch-mesa", path: "/assets/brunch-1-CUij3LE7.webp", titulo: "Mesa do Brunch Vagafogo", legenda: "Brunch artesanal inspirado nos sabores do Cerrado." },
    { id: "padrao-brunch-sabores", path: "/assets/brunch-2-BdafbEXK.webp", titulo: "Sabores do brunch", legenda: "Preparações sazonais feitas pela Fazenda Vagafogo." },
    { id: "padrao-brunch-experiencia", path: "/assets/brunch-3-qneVD58f.webp", titulo: "Experiência gastronômica", legenda: "Uma manhã de sabores e natureza em Pirenópolis." },
  ],
  trilha: [
    { id: "padrao-trilha-caminho", path: "/assets/trilhaecologica-1-DtfHaYKM.jpg", titulo: "Trilha Vagafogo", legenda: "Caminho autoguiado em área preservada." },
    { id: "padrao-trilha-natureza", path: "/assets/trilhaecologica-2-CgfJLY_U.jpg", titulo: "Natureza preservada", legenda: "Mata, água e pontos de contemplação ao longo da trilha." },
  ],
  espacos: [
    { id: "padrao-espacos-santuario", path: "/assets/hero-1-Bq3bL07N.webp", titulo: "Santuário Vagafogo", legenda: "Natureza e hospitalidade a poucos quilômetros do centro de Pirenópolis." },
    { id: "padrao-espacos-convivencia", path: "/assets/hero-2-D24J1MMy.webp", titulo: "Áreas de convivência", legenda: "Espaços integrados à paisagem do Cerrado." },
  ],
  combo: [
    { id: "padrao-combo-brunch", path: "/assets/brunch-3-qneVD58f.webp", titulo: "Brunch do combo", legenda: "O combo reúne o Brunch Gastronômico e a Trilha Vagafogo." },
    { id: "padrao-combo-trilha", path: "/assets/trilhaecologica-2-CgfJLY_U.jpg", titulo: "Trilha do combo", legenda: "Depois do brunch, a experiência continua em meio à natureza." },
  ],
  educacao_ambiental: [
    { id: "padrao-educacao-ambiental", path: "/assets/educacaoambiental-1-B2Y6RirR.jpg", titulo: "Educação ambiental", legenda: "Vivências educativas conectadas à conservação da natureza." },
  ],
};
const clean = (value: unknown, maximum: number) => String(value ?? "").trim().slice(0, maximum);
const extensionFor = (mimeType: string) => mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";

const validSignature = (buffer: Buffer, mimeType: string) => {
  if (mimeType === "image/jpeg") return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mimeType === "image/png") return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
};

const categoryOf = (value: unknown): AgentGalleryCategory => {
  const category = clean(value, 40).toLowerCase() as AgentGalleryCategory;
  if (!AGENT_GALLERY_CATEGORIES.includes(category)) throw new Error("AGENT_GALLERY_CATEGORY_INVALID");
  return category;
};

const defaultPhotoEntries = () => AGENT_GALLERY_CATEGORIES.flatMap((category) =>
  DEFAULT_GALLERY[category].map((photo) => ({ category, photo })),
);

const hiddenDefaultPhotoIds = async (db: FirebaseFirestore.Firestore) => {
  const snapshot = await db.collection(SETTINGS_COLLECTION).doc(DEFAULTS_SETTINGS_DOCUMENT).get();
  const hidden = snapshot.data()?.ocultas;
  return new Set(Array.isArray(hidden) ? hidden.map((value) => clean(value, 120)).filter(Boolean) : []);
};

export const armazenarFotoGaleriaAgente = async (
  buffer: Buffer,
  mimeTypeInput: unknown,
  filenameInput: unknown,
  categoryInput: unknown,
  titleInput: unknown,
  captionInput: unknown,
  actor: { uid: string; email?: string },
) => {
  const mimeType = clean(mimeTypeInput, 80).toLowerCase();
  if (!MIME_TYPES.has(mimeType)) throw new Error("AGENT_GALLERY_MEDIA_TYPE_INVALID");
  if (!buffer.length || buffer.length > MAX_BYTES) throw new Error("AGENT_GALLERY_MEDIA_SIZE_INVALID");
  if (!validSignature(buffer, mimeType)) throw new Error("AGENT_GALLERY_MEDIA_CONTENT_INVALID");
  const category = categoryOf(categoryInput);
  const title = clean(titleInput, 120);
  if (!title) throw new Error("AGENT_GALLERY_TITLE_REQUIRED");
  const caption = clean(captionInput, 500);
  const db = obterFirestoreAdmin();
  const bucket = obterStorageBucketAdmin();
  if (!db || !bucket) throw new Error("FIREBASE_ADMIN_UNAVAILABLE");

  const id = db.collection(COLLECTION).doc().id;
  const extension = extensionFor(mimeType);
  const originalBase = clean(filenameInput, 100).replace(/[^A-Za-z0-9._-]+/g, "-").replace(/\.(jpe?g|png|webp)$/i, "") || "foto";
  const filename = `${originalBase.slice(0, 90)}.${extension}`;
  const storagePath = `crm-agente-galeria/${id}/${randomUUID()}.${extension}`;
  await bucket.file(storagePath).save(buffer, {
    resumable: false,
    contentType: mimeType,
    metadata: {
      cacheControl: "private, max-age=3600",
      metadata: { uploadedBy: actor.uid, originalFilename: filename, category },
    },
  });
  await db.collection(COLLECTION).doc(id).set({
    categoria: category,
    titulo: title,
    legenda: caption || null,
    storagePath,
    mimeType,
    filename,
    sizeBytes: buffer.length,
    ativo: true,
    criadoPorUid: actor.uid,
    criadoPor: actor.email ?? null,
    criadoEm: FieldValue.serverTimestamp(),
    atualizadoEm: FieldValue.serverTimestamp(),
  });
  return { id, categoria: category, titulo: title, legenda: caption || null, mimeType, filename, sizeBytes: buffer.length, ativo: true };
};

export const listarGaleriaAgente = async () => {
  const db = obterFirestoreAdmin();
  const bucket = obterStorageBucketAdmin();
  if (!db || !bucket) throw new Error("FIREBASE_ADMIN_UNAVAILABLE");
  const [snapshot, hiddenDefaults] = await Promise.all([
    db.collection(COLLECTION).get(),
    hiddenDefaultPhotoIds(db),
  ]);
  const items = await Promise.all(snapshot.docs.map(async (document) => {
    const data = document.data();
    let previewUrl = "";
    try {
      [previewUrl] = await bucket.file(String(data.storagePath || "")).getSignedUrl({
        version: "v4",
        action: "read",
        expires: Date.now() + 60 * 60 * 1000,
      });
    } catch {
      previewUrl = "";
    }
    return {
      id: document.id,
      categoria: data.categoria,
      titulo: data.titulo,
      legenda: data.legenda ?? null,
      mimeType: data.mimeType,
      filename: data.filename,
      sizeBytes: Number(data.sizeBytes ?? 0),
      ativo: data.ativo !== false,
      previewUrl,
      criadoEm: data.criadoEm?.toDate?.().toISOString?.() ?? null,
    };
  }));
  const defaults = defaultPhotoEntries().map(({ category, photo: item }) => ({
    id: item.id,
    categoria: category,
    titulo: item.titulo,
    legenda: item.legenda,
    mimeType: item.path.endsWith(".jpg") ? "image/jpeg" : item.path.endsWith(".png") ? "image/png" : "image/webp",
    filename: item.path.split("/").pop() || "vagafogo.webp",
    sizeBytes: 0,
    ativo: !hiddenDefaults.has(item.id),
    previewUrl: `${PUBLIC_SITE_BASE_URL}${item.path}`,
    criadoEm: null,
    padrao: true,
  }));
  return [...items.sort((a, b) => String(b.criadoEm ?? "").localeCompare(String(a.criadoEm ?? ""))), ...defaults];
};

export const definirFotoPadraoGaleriaAgente = async (idInput: unknown, activeInput: unknown) => {
  const id = clean(idInput, 120);
  const exists = defaultPhotoEntries().some(({ photo }) => photo.id === id);
  if (!exists) throw new Error("AGENT_GALLERY_DEFAULT_NOT_FOUND");
  if (typeof activeInput !== "boolean") throw new Error("AGENT_GALLERY_ACTIVE_INVALID");
  const db = obterFirestoreAdmin();
  if (!db) throw new Error("FIREBASE_ADMIN_UNAVAILABLE");
  await db.collection(SETTINGS_COLLECTION).doc(DEFAULTS_SETTINGS_DOCUMENT).set({
    ocultas: activeInput ? FieldValue.arrayRemove(id) : FieldValue.arrayUnion(id),
    atualizadoEm: FieldValue.serverTimestamp(),
  }, { merge: true });
  return { id, ativo: activeInput };
};

export const excluirFotoGaleriaAgente = async (idInput: unknown) => {
  const id = clean(idInput, 120);
  if (!id || id.includes("/")) throw new Error("AGENT_GALLERY_ID_INVALID");
  const db = obterFirestoreAdmin();
  const bucket = obterStorageBucketAdmin();
  if (!db || !bucket) throw new Error("FIREBASE_ADMIN_UNAVAILABLE");
  const ref = db.collection(COLLECTION).doc(id);
  const snapshot = await ref.get();
  if (!snapshot.exists) return { id, excluido: false };
  const storagePath = clean(snapshot.data()?.storagePath, 400);
  if (storagePath.startsWith(`crm-agente-galeria/${id}/`)) {
    await bucket.file(storagePath).delete({ ignoreNotFound: true });
  }
  await ref.delete();
  return { id, excluido: true };
};

export const obterFotosGaleriaParaAgente = async (categoryInput: unknown, limitInput: unknown) => {
  const category = categoryOf(categoryInput);
  const limit = Math.min(3, Math.max(1, Number(limitInput) || 3));
  const db = obterFirestoreAdmin();
  const bucket = obterStorageBucketAdmin();
  if (!db || !bucket) throw new Error("FIREBASE_ADMIN_UNAVAILABLE");
  const [snapshot, hiddenDefaults] = await Promise.all([
    db.collection(COLLECTION).where("ativo", "==", true).get(),
    hiddenDefaultPhotoIds(db),
  ]);
  const documents = snapshot.docs
    .filter((document) => document.data().categoria === category)
    .sort((a, b) => Number(b.data().atualizadoEm?.toMillis?.() ?? 0) - Number(a.data().atualizadoEm?.toMillis?.() ?? 0))
    .slice(0, limit);
  const fotos = [];
  for (const document of documents) {
    const data = document.data();
    const mimeType = clean(data.mimeType, 80).toLowerCase();
    const [buffer] = await bucket.file(String(data.storagePath || "")).download();
    if (!buffer.length || buffer.length > MAX_BYTES || !MIME_TYPES.has(mimeType)) continue;
    fotos.push({
      id: document.id,
      titulo: clean(data.titulo, 120),
      legenda: clean(data.legenda, 500),
      type: "image",
      dataUrl: `data:${mimeType};base64,${buffer.toString("base64")}`,
      filename: clean(data.filename, 120) || `vagafogo.${extensionFor(mimeType)}`,
    });
  }
  for (const fallback of DEFAULT_GALLERY[category]) {
    if (fotos.length >= limit) break;
    if (hiddenDefaults.has(fallback.id)) continue;
    try {
      const response = await fetch(`${PUBLIC_SITE_BASE_URL}${fallback.path}`);
      if (!response.ok) continue;
      const mimeType = clean(response.headers.get("content-type"), 80).split(";")[0].toLowerCase();
      const buffer = Buffer.from(await response.arrayBuffer());
      if (!buffer.length || buffer.length > MAX_BYTES || !MIME_TYPES.has(mimeType) || !validSignature(buffer, mimeType)) continue;
      fotos.push({
        id: fallback.id,
        titulo: fallback.titulo,
        legenda: fallback.legenda,
        type: "image",
        dataUrl: `data:${mimeType};base64,${buffer.toString("base64")}`,
        filename: fallback.path.split("/").pop() || `vagafogo.${extensionFor(mimeType)}`,
      });
    } catch {
      // Uma imagem padrao indisponivel nao impede o envio das demais.
    }
  }
  return { categoria: category, fotos };
};
