export const MAX_AGENCY_LOGO_BYTES = 2 * 1024 * 1024;
const LOGO_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

export function validateAgencyLogo(file: { type: string; size: number }) {
  if (!LOGO_TYPES.has(file.type)) throw new Error('Escolha uma imagem PNG, JPG ou WebP.');
  if (file.size <= 0 || file.size > MAX_AGENCY_LOGO_BYTES) throw new Error('A imagem deve ter até 2 MB e não pode estar vazia.');
}

export function agencyLogoDimensions(width: number, height: number) {
  if (![width, height].every((value) => Number.isInteger(value) && value >= 32 && value <= 4096)
    || width * height > 16_000_000) throw new Error('A logo deve ter de 32 a 4096 pixels em cada lado, com até 16 milhões de pixels.');
  // Keep a minimum 32px side for unusually wide/tall logos accepted by the API.
  const scale = Math.max(Math.min(1, 512 / Math.max(width, height)), 32 / Math.min(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export async function readAgencyLogo(file: File): Promise<string> {
  validateAgencyLogo(file);
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Não foi possível ler a imagem.'));
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem. Escolha o arquivo novamente.'));
    reader.onabort = () => reject(new Error('A leitura da imagem foi interrompida.'));
    reader.readAsDataURL(file);
  });
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const decoded = new Image();
    decoded.onload = () => resolve(decoded);
    decoded.onerror = () => reject(new Error('Não foi possível abrir esta imagem. Escolha um arquivo PNG, JPG ou WebP válido.'));
    decoded.src = dataUrl;
  });
  const dimensions = agencyLogoDimensions(image.naturalWidth, image.naturalHeight);
  const canvas = document.createElement('canvas');
  canvas.width = dimensions.width; canvas.height = dimensions.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Não foi possível preparar a imagem. Tente em outro navegador.');
  context.drawImage(image, 0, 0, dimensions.width, dimensions.height);
  return canvas.toDataURL('image/webp', 0.9);
}
