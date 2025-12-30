import { db } from "./firebase";
import { doc, setDoc, Timestamp } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import { PerguntaPersonalizadaResposta } from "../types/perguntasPersonalizadas";

const normalizarNumero = (valor: unknown) => {
  const numero = Number(valor);
  return Number.isFinite(numero) ? Math.max(numero, 0) : 0;
};

const somarMapa = (mapa?: Record<string, number>) => {
  if (!mapa) return 0;
  return Object.values(mapa).reduce((total, valor) => total + normalizarNumero(valor), 0);
};

const normalizarMapa = (mapa?: Record<string, number>) => {
  if (!mapa) return undefined;
  return Object.fromEntries(
    Object.entries(mapa).map(([chave, valor]) => [chave, normalizarNumero(valor)])
  );
};

export type CriarReservaPayload = {
  nome: string;
  cpf: string;
  email: string;
  valor: number;
  telefone: string;
  atividade: string;
  data: string;
  adultos: number;
  bariatrica: number;
  criancas: number;
  naoPagante: number;
  participantes: number;
  participantesPorTipo?: Record<string, number>;
  horario: string | null;
  status?: string;
  observacao?: string;
  temPet?: boolean;
  perguntasPersonalizadas?: PerguntaPersonalizadaResposta[];
};

export async function criarReserva(payload: CriarReservaPayload): Promise<string> {
  const {
    nome,
    cpf,
    email,
    valor,
    telefone,
    atividade,
    data,
    adultos,
    bariatrica,
    criancas,
    naoPagante,
    participantes,
    participantesPorTipo,
    horario,
    status = "aguardando",
    observacao = "",
    temPet,
    perguntasPersonalizadas,
  } = payload;

  const participantesPorTipoNormalizado = normalizarMapa(participantesPorTipo);
  const mapaAtivo =
    participantesPorTipoNormalizado &&
    Object.keys(participantesPorTipoNormalizado).length > 0;
  const participantesCalculadosBase = mapaAtivo
    ? somarMapa(participantesPorTipoNormalizado)
    : (adultos ?? 0) + (bariatrica ?? 0) + (criancas ?? 0);
  const participantesCalculados = participantesCalculadosBase + (naoPagante ?? 0);
  const participantesConsiderados = Math.max(
    participantesCalculados,
    Number.isFinite(participantes) ? participantes : 0
  );

  const reservaId = uuidv4();
  const reservaRef = doc(db, "reservas", reservaId);

  await setDoc(reservaRef, {
    nome,
    cpf,
    email,
    valor,
    telefone,
    atividade,
    data,
    participantes: participantesConsiderados,
    adultos,
    bariatrica,
    criancas,
    naoPagante,
    ...(mapaAtivo ? { participantesPorTipo: participantesPorTipoNormalizado } : {}),
    horario,
    status,
    observacao,
    temPet,
    perguntasPersonalizadas: perguntasPersonalizadas ?? [],
    criadoEm: Timestamp.now(),
  });

  return reservaId;
}
