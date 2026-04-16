export type PerguntaCondicionalResposta = {
  pergunta: string;
  tipo: "sim_nao" | "texto";
  obrigatoria: boolean;
  resposta: string;
};

export type PerguntaPersonalizadaResposta = {
  pacoteId: string;
  pacoteNome: string;
  perguntaId: string;
  pergunta: string;
  tipo: "sim_nao" | "texto";
  obrigatoria: boolean;
  resposta: string;
  perguntaCondicional?: PerguntaCondicionalResposta;
};

