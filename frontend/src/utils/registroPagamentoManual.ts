import { reservaEhPendente, reservaEstaConfirmada } from './reservaStatus.ts';

type ReservaParaRegistroPagamento = {
  pagamentoRegistradoNoAsaas?: unknown;
  status?: unknown;
  confirmada?: unknown;
  dataPagamento?: unknown;
  origem?: unknown;
  criadaManualmente?: unknown;
};

export const pagamentoAsaasNoEditor = (reserva: ReservaParaRegistroPagamento, criadaManualmente: boolean): boolean =>
  reserva.pagamentoRegistradoNoAsaas != null
    ? reserva.pagamentoRegistradoNoAsaas === true
    : criadaManualmente && String(reserva.origem ?? '').trim().toLowerCase() === 'checkout';

const diaValido = (ano: number, mes: number, dia: number) => {
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia;
};

export const dataPagamentoValida = (valor: unknown): boolean => {
  if (valor instanceof Date) return Number.isFinite(valor.getTime());
  if (typeof valor === 'string') {
    const texto = valor.trim();
    const brasileira = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto);
    if (brasileira) return diaValido(Number(brasileira[3]), Number(brasileira[2]), Number(brasileira[1]));
    const iso = /^(\d{4})-(\d{2})-(\d{2})(?:T.+)?$/.exec(texto);
    return Boolean(iso && diaValido(Number(iso[1]), Number(iso[2]), Number(iso[3])) && Number.isFinite(Date.parse(texto)));
  }
  if (valor && typeof valor === 'object' && 'toDate' in valor && typeof valor.toDate === 'function') {
    try {
      const data = valor.toDate();
      return data instanceof Date && Number.isFinite(data.getTime());
    } catch { return false; }
  }
  return false;
};

/** Adds a payment date once; existing dates and the booking's operational origin remain untouched. */
export const camposRegistroPagamentoManual = (
  reserva: ReservaParaRegistroPagamento,
  original: ReservaParaRegistroPagamento | null,
  agora: Date,
): { dataPagamento?: Date } => {
  if (reserva.pagamentoRegistradoNoAsaas !== true || !reservaEstaConfirmada(reserva) || dataPagamentoValida(reserva.dataPagamento)) return {};
  if (original) {
    const jaRegistradaNoAsaas = pagamentoAsaasNoEditor(original, original.criadaManualmente === true);
    if (jaRegistradaNoAsaas && !reservaEhPendente(original)) return {};
  }
  if (!Number.isFinite(agora.getTime())) throw new RangeError('Data atual inválida para registrar o pagamento.');
  return { dataPagamento: new Date(agora.getTime()) };
};
