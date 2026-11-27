type TipoPerguntaReserva = 'sim_nao' | 'texto';

type DadosRespostaReserva = {
  pergunta: string;
  tipo: TipoPerguntaReserva;
  obrigatoria: boolean;
  resposta: string;
  emojiSim?: string;
  emojiNao?: string;
  respostaAutomatica?: boolean;
};

export type RespostaPreenchidaReserva = DadosRespostaReserva & {
  pacoteId: string;
  pacoteNome: string;
  perguntaId: string;
  perguntaCondicional?: DadosRespostaReserva;
};

export type PerguntaPreenchimentoReservaAsaas = {
  id: string;
  pergunta: string;
  tipo: TipoPerguntaReserva;
  obrigatoria: boolean;
  emojiSim?: string;
  emojiNao?: string;
  perguntaCondicional?: {
    condicao: 'sim' | 'nao';
    pergunta: string;
    tipo: TipoPerguntaReserva;
    obrigatoria: boolean;
    emojiSim?: string;
    emojiNao?: string;
  };
};

export type PacotePreenchimentoReservaAsaas = {
  id?: string;
  nome: string;
  perguntasPersonalizadas?: readonly PerguntaPreenchimentoReservaAsaas[];
};

type EntradaPreenchimentoReservaAsaas = {
  formaPagamento?: unknown;
  formaPagamentoAutomatica?: unknown;
  perguntasPersonalizadas?: readonly RespostaPreenchidaReserva[];
};

const textosNaoColetados = [
  'Não informado no cadastro original.',
  'A confirmar com o visitante.',
  'Resposta não coletada no cadastro manual.',
] as const;

const normalizar = (value: string) => value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const temResposta = (value: unknown): value is string => typeof value === 'string' && Boolean(value.trim());
const chave = (pacoteId: string, perguntaId: string) => JSON.stringify([pacoteId, perguntaId]);
const copiarResposta = (item: RespostaPreenchidaReserva): RespostaPreenchidaReserva => ({
  ...item, ...(item.perguntaCondicional ? { perguntaCondicional: { ...item.perguntaCondicional } } : {}),
});

function metodoConhecido(value: unknown): 'PIX' | 'CREDIT_CARD' | null {
  if (typeof value !== 'string') return null;
  const method = normalizar(value).replace(/[^a-z]/g, '');
  if (method === 'pix') return 'PIX';
  return ['creditcard', 'debitcard', 'card', 'cartao', 'cartaocredito', 'cartaodecredito', 'cartaodebito', 'cartaodedebito', 'credito', 'debito'].includes(method) ? 'CREDIT_CARD' : null;
}

function sortear<T>(options: readonly T[], random: () => number): T {
  const value = random();
  const index = Number.isFinite(value) ? Math.max(0, Math.min(options.length - 1, Math.floor(value * options.length))) : 0;
  return options[index];
}

function combinarDuplicata(first: RespostaPreenchidaReserva, next: RespostaPreenchidaReserva): RespostaPreenchidaReserva {
  const preferFirst = temResposta(first.resposta) || !temResposta(next.resposta);
  const combined = preferFirst ? { ...next, ...first } : { ...first, ...next };
  const firstConditional = first.perguntaCondicional, nextConditional = next.perguntaCondicional;
  if (firstConditional && nextConditional) {
    combined.perguntaCondicional = temResposta(firstConditional.resposta) || !temResposta(nextConditional.resposta)
      ? { ...nextConditional, ...firstConditional } : { ...firstConditional, ...nextConditional };
  } else if (firstConditional || nextConditional) {
    combined.perguntaCondicional = { ...(firstConditional || nextConditional)! };
  }
  return combined;
}

const metadados = (question: Omit<DadosRespostaReserva, 'resposta'>): Omit<DadosRespostaReserva, 'resposta'> => ({
  pergunta: question.pergunta, tipo: question.tipo, obrigatoria: question.obrigatoria,
  ...(question.emojiSim !== undefined ? { emojiSim: question.emojiSim } : {}),
  ...(question.emojiNao !== undefined ? { emojiNao: question.emojiNao } : {}),
});

/** Fills only uncollected values. The caller decides when to offer and save this reviewable draft. */
export function preencherReservaAsaas(
  reserva: EntradaPreenchimentoReservaAsaas,
  pacotes: readonly PacotePreenchimentoReservaAsaas[],
  random: () => number = Math.random,
): { formaPagamento: 'PIX' | 'CREDIT_CARD'; formaPagamentoAutomatica?: true; perguntasPersonalizadas: RespostaPreenchidaReserva[] } {
  const knownMethod = metodoConhecido(reserva.formaPagamento);
  const formaPagamento = knownMethod ?? sortear(['PIX', 'CREDIT_CARD'] as const, random);
  const respostas = new Map<string, RespostaPreenchidaReserva>();
  for (const item of reserva.perguntasPersonalizadas ?? []) {
    const key = chave(item.pacoteId, item.perguntaId);
    const previous = respostas.get(key);
    respostas.set(key, previous ? combinarDuplicata(previous, item) : copiarResposta(item));
  }
  const gerarResposta = (tipo: TipoPerguntaReserva) => tipo === 'sim_nao'
    ? sortear(['sim', 'nao'] as const, random) : sortear(textosNaoColetados, random);
  for (const pacote of pacotes) {
    if (typeof pacote.id !== 'string' || !pacote.id.trim()) continue;
    for (const pergunta of pacote.perguntasPersonalizadas ?? []) {
      if (!pergunta.id?.trim() || !pergunta.pergunta?.trim() || !['sim_nao', 'texto'].includes(pergunta.tipo)) continue;
      const key = chave(pacote.id, pergunta.id);
      let resposta = respostas.get(key);
      if (!resposta || !temResposta(resposta.resposta)) {
        resposta = {
          ...resposta, pacoteId: pacote.id, pacoteNome: pacote.nome, perguntaId: pergunta.id,
          ...metadados(pergunta), resposta: gerarResposta(pergunta.tipo), respostaAutomatica: true,
        };
      }
      const condicional = pergunta.perguntaCondicional;
      if (condicional?.pergunta?.trim() && ['sim_nao', 'texto'].includes(condicional.tipo)
        && normalizar(resposta.resposta) === condicional.condicao
        && !temResposta(resposta.perguntaCondicional?.resposta)) {
        resposta = { ...resposta, perguntaCondicional: {
          ...resposta.perguntaCondicional, ...metadados(condicional),
          resposta: gerarResposta(condicional.tipo), respostaAutomatica: true,
        } };
      }
      respostas.set(key, resposta);
    }
  }
  return {
    formaPagamento,
    ...(!knownMethod || reserva.formaPagamentoAutomatica === true ? { formaPagamentoAutomatica: true as const } : {}),
    perguntasPersonalizadas: Array.from(respostas.values()),
  };
}
