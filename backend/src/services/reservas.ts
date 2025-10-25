import { db } from "./firebase";
import { doc, setDoc, Timestamp } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import { PerguntaPersonalizadaResposta } from "../types/perguntasPersonalizadas";

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
    horario,
    status = "aguardando",
    observacao = "",
    temPet,
    perguntasPersonalizadas,
  } = payload;

  const totalParticipantes =
    (adultos ?? 0) + (bariatrica ?? 0) + (criancas ?? 0) + (naoPagante ?? 0);

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
    participantes: totalParticipantes,
    adultos,
    bariatrica,
    criancas,
    naoPagante,
    horario,
    status,
    observacao,
    temPet,
    perguntasPersonalizadas: perguntasPersonalizadas ?? [],
    criadoEm: Timestamp.now(),
  });

  return reservaId;
}
