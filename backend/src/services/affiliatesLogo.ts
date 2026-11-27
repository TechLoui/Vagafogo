import { createHash } from "crypto";
import { obterStorageBucketAdmin } from "./firebaseAdmin";
import { AffiliateBranding, AffiliateError, AffiliateIdentity, affiliateAgencyLogoUrl, affiliateBranding, affiliateDb, affiliateId, getAffiliateProfile, readAffiliate, requireAffiliateRole } from "./affiliates";

export const AFFILIATE_LOGO_MAX_BYTES = 2 * 1024 * 1024;
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const EXTENSIONS: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
type LogoImage = { buffer: Buffer; mimeType: string; width: number; height: number };
const invalidContent = () => new AffiliateError("AFFILIATE_LOGO_CONTENT_INVALID", 400, "Envie uma imagem PNG, JPEG ou WebP válida.");
const crcTable = Array.from({ length: 256 }, (_, value) => {
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
const crc32 = (bytes: Buffer) => {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};
const pngDimensions = (buffer: Buffer) => {
  if (buffer.length < 57 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) throw invalidContent();
  let offset = 8, width = 0, height = 0, data = false, ended = false;
  while (offset + 12 <= buffer.length) {
    const size = buffer.readUInt32BE(offset), type = buffer.toString("ascii", offset + 4, offset + 8);
    if (size > buffer.length - offset - 12 || !/^[A-Za-z]{4}$/.test(type)) throw invalidContent();
    const end = offset + 8 + size;
    if (crc32(buffer.subarray(offset + 4, end)) !== buffer.readUInt32BE(end)) throw invalidContent();
    if (offset === 8 && (type !== "IHDR" || size !== 13)) throw invalidContent();
    if (type === "IHDR") {
      if (offset !== 8) throw invalidContent();
      width = buffer.readUInt32BE(offset + 8); height = buffer.readUInt32BE(offset + 12);
    }
    if (type === "IDAT" && size > 0) data = true;
    if (type === "IEND") { if (size !== 0 || end + 4 !== buffer.length) throw invalidContent(); ended = true; break; }
    offset = end + 4;
  }
  if (!ended || !data) throw invalidContent();
  return { width, height };
};
const jpegDimensions = (buffer: Buffer) => {
  if (buffer.length < 16 || buffer[0] !== 255 || buffer[1] !== 216 || buffer[buffer.length - 2] !== 255 || buffer[buffer.length - 1] !== 217) throw invalidContent();
  let offset = 2, dimensions: { width: number; height: number } | undefined;
  while (offset + 4 <= buffer.length) {
    if (buffer[offset++] !== 255) throw invalidContent();
    while (buffer[offset] === 255) offset++;
    const marker = buffer[offset++];
    if (marker === 218) { if (!dimensions) throw invalidContent(); return dimensions; }
    if (marker === 216 || marker === 217 || marker === 0 || marker === 1 || (marker >= 208 && marker <= 215)) throw invalidContent();
    if (offset + 2 > buffer.length) throw invalidContent();
    const size = buffer.readUInt16BE(offset);
    if (size < 2 || offset + size > buffer.length) throw invalidContent();
    if ([192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207].includes(marker)) {
      if (size < 8) throw invalidContent();
      dimensions = { height: buffer.readUInt16BE(offset + 3), width: buffer.readUInt16BE(offset + 5) };
    }
    offset += size;
  }
  throw invalidContent();
};
const webpDimensions = (buffer: Buffer) => {
  if (buffer.length < 30 || buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WEBP"
    || buffer.readUInt32LE(4) !== buffer.length - 8) throw invalidContent();
  let offset = 12, dimensions: { width: number; height: number } | undefined, image = false;
  while (offset + 8 <= buffer.length) {
    const type = buffer.toString("ascii", offset, offset + 4), size = buffer.readUInt32LE(offset + 4), start = offset + 8;
    if (size > buffer.length - start) throw invalidContent();
    if (type === "VP8X") {
      if (size !== 10) throw invalidContent();
      dimensions = { width: 1 + buffer.readUIntLE(start + 4, 3), height: 1 + buffer.readUIntLE(start + 7, 3) };
    } else if (type === "VP8 ") {
      if (size < 10 || buffer[start + 3] !== 157 || buffer[start + 4] !== 1 || buffer[start + 5] !== 42) throw invalidContent();
      const frame = { width: buffer.readUInt16LE(start + 6) & 0x3fff, height: buffer.readUInt16LE(start + 8) & 0x3fff };
      if (!dimensions) dimensions = frame;
      image = true;
    } else if (type === "VP8L") {
      if (size < 5 || buffer[start] !== 47) throw invalidContent();
      const bits = buffer.readUInt32LE(start + 1);
      if (bits >>> 29) throw invalidContent();
      if (!dimensions) dimensions = { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
      image = true;
    } else if (type === "ANMF") image = size > 16;
    offset = start + size + (size % 2);
  }
  if (offset !== buffer.length || !dimensions || !image) throw invalidContent();
  return dimensions;
};
export const validateAffiliateLogoBytes = (buffer: Buffer, mimeType: string): LogoImage => {
  if (!buffer.length || buffer.length > AFFILIATE_LOGO_MAX_BYTES) throw new AffiliateError("AFFILIATE_LOGO_SIZE_INVALID", 400, "O logo deve ter até 2 MB.");
  if (!EXTENSIONS[mimeType]) throw new AffiliateError("AFFILIATE_LOGO_TYPE_INVALID", 400, "Use PNG, JPEG ou WebP.");
  const dimensions = mimeType === "image/png" ? pngDimensions(buffer) : mimeType === "image/jpeg" ? jpegDimensions(buffer) : webpDimensions(buffer);
  if (dimensions.width < 32 || dimensions.height < 32 || dimensions.width > 4096 || dimensions.height > 4096
    || dimensions.width * dimensions.height > 16_000_000) throw new AffiliateError("AFFILIATE_LOGO_DIMENSIONS_INVALID", 400, "O logo deve ter entre 32 e 4096 pixels em cada lado.");
  return { buffer, mimeType, ...dimensions };
};
export const parseAffiliateLogo = (input: unknown): LogoImage & { branding?: AffiliateBranding } => {
  const raw = input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : {};
  if (Object.keys(raw).some((key) => !["dataUrl", "branding"].includes(key)) || typeof raw.dataUrl !== "string") throw invalidContent();
  const branding = affiliateBranding(raw.branding);
  if (Object.prototype.hasOwnProperty.call(raw, "branding") && !branding) throw new AffiliateError("AFFILIATE_BRANDING_INVALID", 400, "Informe as duas cores no formato #RRGGBB.");
  if (raw.dataUrl.length > Math.ceil(AFFILIATE_LOGO_MAX_BYTES / 3) * 4 + 80) throw new AffiliateError("AFFILIATE_LOGO_SIZE_INVALID", 400);
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(raw.dataUrl);
  if (!match) throw new AffiliateError("AFFILIATE_LOGO_TYPE_INVALID", 400, "Use PNG, JPEG ou WebP.");
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.toString("base64") !== match[2]) throw invalidContent();
  return { ...validateAffiliateLogoBytes(buffer, match[1]), ...(branding ? { branding } : {}) };
};
export const assertAffiliateAgencyLogoAccess = (idValue: unknown, identity: AffiliateIdentity) => {
  requireAffiliateRole(identity, ["admin", "agency"]);
  const id = affiliateId(idValue);
  if (identity.role === "agency" && identity.agencyId !== id) throw new AffiliateError("AFFILIATE_PERMISSION_REQUIRED", 403);
  return id;
};
const assertAgencyActive = (data: Record<string, any>, identity: AffiliateIdentity) => {
  if (identity.role === "agency" && data.status !== "active") throw new AffiliateError("AFFILIATE_ACCESS_DISABLED", 403);
};
const logoPath = (id: string, version: string, mimeType: string) => `affiliate-agency-logos/${id}/${version}.${EXTENSIONS[mimeType]}`;
const removeUnusedLogo = async (agencyId: string, path: unknown) => {
  if (typeof path !== "string" || !new RegExp(`^affiliate-agency-logos/${agencyId}/[a-f0-9]{24}\\.(?:png|jpg|webp)$`).test(path)) return;
  try {
    const current = await affiliateDb().collection("affiliate_agencies").doc(agencyId).get();
    if (current.data()?.logoStoragePath !== path) await obterStorageBucketAdmin()?.file(path).delete({ ignoreNotFound: true });
  } catch { console.warn("[affiliates] Nao foi possivel remover um logo antigo do storage."); }
};
export const uploadAffiliateAgencyLogo = async (id: unknown, input: unknown, identity: AffiliateIdentity) => {
  const agency = await readAffiliate("agency", assertAffiliateAgencyLogoAccess(id, identity), identity);
  assertAgencyActive(agency.data, identity);
  const image = parseAffiliateLogo(input);
  const bucket = obterStorageBucketAdmin();
  if (!bucket) throw new AffiliateError("AFFILIATE_LOGO_STORAGE_UNAVAILABLE", 503);
  const version = createHash("sha256").update(image.buffer).digest("hex").slice(0, 24);
  const path = logoPath(agency.id, version, image.mimeType), now = new Date();
  await bucket.file(path).save(image.buffer, { resumable: false, contentType: image.mimeType,
    metadata: { cacheControl: "private, max-age=31536000, immutable", metadata: { uploadedBy: identity.uid } } });
  let previousPath: unknown;
  try {
    await affiliateDb().runTransaction(async (tx) => {
      const current = await tx.get(agency.ref);
      if (!current.exists) throw new AffiliateError("AFFILIATE_NOT_FOUND", 404);
      assertAgencyActive(current.data()!, identity);
      previousPath = current.data()?.logoStoragePath;
      const fields = { logoVersion: version, logoMimeType: image.mimeType };
      tx.update(agency.ref, { ...fields, logoUrl: affiliateAgencyLogoUrl(agency.id, fields), logoUpdatedAt: now,
        logoStoragePath: path, logoSizeBytes: image.buffer.length, logoWidth: image.width, logoHeight: image.height,
        logoUploadedBy: identity.uid, branding: image.branding ?? null, updatedAt: now, updatedBy: identity.uid });
    });
  } catch (error) { await removeUnusedLogo(agency.id, path); throw error; }
  if (previousPath !== path) await removeUnusedLogo(agency.id, previousPath);
  return getAffiliateProfile("agency", agency.id, identity);
};
export const deleteAffiliateAgencyLogo = async (id: unknown, identity: AffiliateIdentity) => {
  const agency = await readAffiliate("agency", assertAffiliateAgencyLogoAccess(id, identity), identity);
  assertAgencyActive(agency.data, identity);
  let previousPath: unknown;
  await affiliateDb().runTransaction(async (tx) => {
    const current = await tx.get(agency.ref);
    if (!current.exists) throw new AffiliateError("AFFILIATE_NOT_FOUND", 404);
    assertAgencyActive(current.data()!, identity);
    previousPath = current.data()?.logoStoragePath;
    tx.update(agency.ref, { logoVersion: null, logoMimeType: null, logoUrl: null, logoUpdatedAt: null, logoStoragePath: null,
      logoSizeBytes: null, logoWidth: null, logoHeight: null, logoUploadedBy: null, branding: null, updatedAt: new Date(), updatedBy: identity.uid });
  });
  await removeUnusedLogo(agency.id, previousPath);
  return getAffiliateProfile("agency", agency.id, identity);
};
export const readPublicAffiliateAgencyLogo = async (idValue: unknown, versionValue?: unknown) => {
  const id = affiliateId(idValue);
  const snapshot = await affiliateDb().collection("affiliate_agencies").doc(id).get();
  const raw = snapshot.data();
  if (!raw || !affiliateAgencyLogoUrl(id, raw) || (versionValue !== undefined && versionValue !== raw.logoVersion)
    || raw.logoStoragePath !== logoPath(id, raw.logoVersion, raw.logoMimeType)) throw new AffiliateError("AFFILIATE_LOGO_NOT_FOUND", 404);
  const bucket = obterStorageBucketAdmin();
  if (!bucket) throw new AffiliateError("AFFILIATE_LOGO_STORAGE_UNAVAILABLE", 503);
  const file = bucket.file(raw.logoStoragePath);
  const [metadata] = await file.getMetadata();
  if (!Number.isFinite(Number(metadata.size)) || Number(metadata.size) > AFFILIATE_LOGO_MAX_BYTES) throw invalidContent();
  const [buffer] = await file.download();
  const image = validateAffiliateLogoBytes(buffer, raw.logoMimeType);
  if (createHash("sha256").update(buffer).digest("hex").slice(0, 24) !== raw.logoVersion) throw invalidContent();
  return { ...image, version: raw.logoVersion, extension: EXTENSIONS[raw.logoMimeType] };
};
