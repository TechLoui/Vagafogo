export type ReservaParaFinanceiro = {
  bookingSource: 'manual' | 'checkout' | 'other';
  createdAt?: string;
  paidAt?: string;
  date: string;
  status: string;
  value: number;
};

const statusPago = (valor: string) => {
  const status = String(valor ?? '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return ['pago', 'confirmado', 'paid', 'confirmed', 'approved', 'aprovado', 'received', 'recebido'].includes(status);
};

const diaEmSaoPaulo = (data: Date) => {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(data);
  const parte = (tipo: string) => partes.find((item) => item.type === tipo)?.value ?? '';
  return `${parte('year')}-${parte('month')}-${parte('day')}`;
};

export const hojeEmSaoPaulo = () => diaEmSaoPaulo(new Date());

export const normalizarDiaFinanceiro = (valor: unknown): string => {
  if (!valor) return '';
  if (typeof valor === 'string') {
    const texto = valor.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) return texto;
    const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto);
    if (br) return `${br[3]}-${br[2]}-${br[1]}`;
    const data = new Date(texto);
    return Number.isNaN(data.getTime()) ? '' : diaEmSaoPaulo(data);
  }
  const data = valor instanceof Date ? valor : (valor as { toDate?: () => Date }).toDate?.();
  return data instanceof Date && !Number.isNaN(data.getTime()) ? diaEmSaoPaulo(data) : '';
};

export const referenciaFinanceira = (reserva: ReservaParaFinanceiro) => {
  if (reserva.bookingSource === 'checkout') {
    return reserva.paidAt || reserva.createdAt || reserva.date;
  }
  if (reserva.bookingSource === 'manual') {
    return reserva.paidAt || reserva.createdAt || reserva.date;
  }
  return reserva.createdAt || reserva.date;
};

export const reservaNoPeriodoFinanceiro = (
  reserva: ReservaParaFinanceiro, inicio: string, fim: string,
) => {
  const dia = normalizarDiaFinanceiro(referenciaFinanceira(reserva));
  return Boolean(dia && dia >= inicio && dia <= fim);
};

export const apurarComissaoCheckout = (
  reservas: ReservaParaFinanceiro[], inicio: string, fim: string,
) => {
  const elegiveis = reservas.filter((reserva) =>
    reserva.bookingSource === 'checkout'
    && statusPago(reserva.status)
    && Boolean(reserva.paidAt)
    && reservaNoPeriodoFinanceiro(reserva, inicio, fim));
  const totalCentavos = elegiveis.reduce((total, reserva) =>
    total + (Number.isFinite(reserva.value) ? Math.max(0, Math.round(reserva.value * 100)) : 0), 0);
  return {
    quantidade: elegiveis.length,
    base: totalCentavos / 100,
    comissao: Math.round(totalCentavos * 0.01) / 100,
  };
};
