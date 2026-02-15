export const WHATSAPP_NUMBER =
  (import.meta.env.VITE_WHATSAPP_NUMBER as string | undefined) ?? "5562992225471";

export function buildWhatsAppLink(message?: string) {
  const number = WHATSAPP_NUMBER.replace(/\D/g, "");
  const baseUrl = `https://wa.me/${number}`;

  if (!message) return baseUrl;
  return `${baseUrl}?text=${encodeURIComponent(message)}`;
}

