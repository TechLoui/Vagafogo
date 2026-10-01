export type AgentCheckoutAnswer = {
  pacoteId: string;
  perguntaId: string;
  resposta: string;
  perguntaCondicional?: { resposta?: string };
};

export type AgentCheckoutHandoff = {
  version: 1;
  tipoOferta: "combo" | "pacote";
  ofertaId: string;
  ofertaNome: string;
  pacoteIds: string[];
  data: string;
  horario: string;
  horariosPorPacote: Record<string, string>;
  participantesPorTipo: Record<string, number>;
  idadesPorTipo: Record<string, number[]>;
  perguntasPersonalizadas: AgentCheckoutAnswer[];
  confirmouCarteirinhaBariatrica: boolean;
  nome: string;
  email: string;
  cpf: string;
  telefone: string;
  temPet: boolean;
  whatsappMarketingOptIn: boolean;
  formaPagamento: "CREDIT_CARD";
  valorValidado: number;
  sessionId?: string | null;
  campaignId?: string | null;
  recipientId?: string | null;
  geradoEm: string;
  expiraEm: string;
};

const API_BASE = (
  import.meta.env.VITE_API_BASE || "https://vagafogo-production.up.railway.app"
).replace(/\/$/, "");

export const carregarCheckoutAgente = async (token: string, signal?: AbortSignal) => {
  const response = await fetch(`${API_BASE}/checkout-agente/${encodeURIComponent(token)}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal,
  });
  const body = await response.json().catch(() => ({})) as AgentCheckoutHandoff & { error?: string };
  if (!response.ok) throw new Error(body.error || "Nao foi possivel carregar os dados do atendimento.");
  return body;
};
