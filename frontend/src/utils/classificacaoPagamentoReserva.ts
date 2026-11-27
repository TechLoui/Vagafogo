import { pagamentoAsaasNoEditor } from './registroPagamentoManual.ts';

type ReservaParaClassificacaoPagamento = {
  pagamentoRegistradoNoAsaas?: unknown;
  origem?: unknown;
};

/** Presentation only: administrative payment registration never rewrites booking provenance. */
export const reservaManualNaExibicao = (
  reserva: ReservaParaClassificacaoPagamento | null | undefined,
  criadaManualmente: boolean,
): boolean => criadaManualmente && !pagamentoAsaasNoEditor(reserva ?? {}, criadaManualmente);
