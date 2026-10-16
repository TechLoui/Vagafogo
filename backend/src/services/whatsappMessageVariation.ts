import { createHash } from "crypto";

type Tipo = "confirmacao" | "lembrete" | "resumo" | "aviso_equipe" | "agradecimento";

const openings: Record<Tipo, string[]> = {
  confirmacao: [
    "🌿 Sua reserva na Fazenda Vagafogo está confirmada.",
    "💚 Está tudo certo com sua reserva na Fazenda Vagafogo.",
    "🌼 Temos uma boa notícia sobre sua reserva na Fazenda Vagafogo.",
  ],
  lembrete: [
    "🌿 Estamos esperando você hoje na Fazenda Vagafogo.",
    "🌼 Sua visita à Fazenda Vagafogo é hoje.",
    "💚 Hoje é dia de visitar a Fazenda Vagafogo.",
  ],
  resumo: [
    "🌿 Agenda de reservas confirmadas para hoje",
    "📋 Reservas confirmadas do dia",
    "🌳 Programação de reservas de hoje",
  ],
  aviso_equipe: [
    "🌿 Reserva confirmada para hoje",
    "📋 Nova reserva para a data de hoje",
    "🌳 Atualização das reservas de hoje",
  ],
  agradecimento: [
    "🌿 Que bom receber você na Fazenda Vagafogo!",
    "💚 Sua presença deixa nosso dia mais especial.",
    "🌼 Ficamos felizes com sua chegada à Fazenda Vagafogo.",
  ],
};

const standardOpening: Record<Tipo, RegExp> = {
  confirmacao: /^Ol[aá],?\s+([^!\n]+)!/i,
  lembrete: /^Bom dia,?\s+([^!\n]+)!/i,
  resumo: /^🌿 Resumo das reservas de hoje/i,
  aviso_equipe: /^🌿 Reserva para hoje[^\n]*/i,
  agradecimento: /^Ol[aá],?\s+([^!\n]+)!/i,
};

// Variacao limitada ao inicio: dados, precos, horarios, avisos e links ficam intactos.
// A escolha e estavel por evento, inclusive em tentativas repetidas.
export const variarMensagemAutomatica = (message: string, kind: Tipo, eventId: string) => {
  const source = String(message ?? "").trim();
  if (!source) return source;
  const hash = createHash("sha256").update(`${kind}:${eventId}`).digest();
  const opening = openings[kind][hash[0] % openings[kind].length];
  const matched = source.match(standardOpening[kind]);
  if (matched) {
    if (kind === "confirmacao" || kind === "agradecimento") {
      const greeting = ["Oi", "Olá", "Que bom falar com você"][hash[0] % 3];
      const name = matched[1].trim();
      return `${greeting}, ${name}!${source.slice(matched[0].length)}`;
    }
    if (kind === "lembrete") {
      const greeting = ["Um ótimo dia", "Bom dia", "Olá, bom dia"][hash[0] % 3];
      const name = matched[1].trim();
      return `${greeting}, ${name}!${source.slice(matched[0].length)}`;
    }
    if (kind === "resumo") return `${opening}${source.slice(matched[0].length)}`;
    const rest = source.slice(matched[0].length).trimStart();
    return `${opening}\n\n${rest}`.trim();
  }
  // Texto configurado no painel pode ter qualquer abertura. Mantemos seu
  // conteudo integral e acrescentamos apenas uma linha contextual curta.
  return `${opening}\n\n${source}`;
};
