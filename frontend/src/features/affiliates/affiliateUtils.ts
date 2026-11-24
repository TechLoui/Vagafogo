import type { AffiliateRole, CommissionRule } from './types.ts';

export const affiliateHome = (role: AffiliateRole) => ({
  admin: '/CRM', agency: '/agencia', partner: '/parceiro',
})[role];

export const affiliateMoney = (value: number) => new Intl.NumberFormat('pt-BR', {
  style: 'currency', currency: 'BRL',
}).format(Number.isFinite(value) ? value : 0);

export const affiliateDate = (value?: string | null) => {
  if (!value) return '—';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value.split('-').reverse().join('/');
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short', timeZone: 'America/Sao_Paulo',
  }).format(date);
};

export const commissionLabel = (rule?: CommissionRule | null) => {
  if (!rule) return 'Não definida';
  return rule.mode === 'percent'
    ? `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(rule.value)}%`
    : `${affiliateMoney(rule.value)} por reserva`;
};

export function parseCommissionRule(mode: 'disabled' | 'percent' | 'fixed', value: string): CommissionRule | null {
  if (mode === 'disabled') return null;
  const parsed = Number(value.trim().replace(',', '.'));
  if (!value.trim() || !Number.isFinite(parsed) || parsed < 0 || parsed > (mode === 'percent' ? 100 : 1_000_000)) {
    throw new Error(mode === 'percent' ? 'Informe um percentual entre 0 e 100.' : 'Informe um valor válido para a comissão.');
  }
  if (Math.abs(parsed * 100 - Math.round(parsed * 100)) > 0.000001) {
    throw new Error('Use no máximo duas casas decimais para a comissão.');
  }
  return { mode, value: parsed };
}

export const affiliateStatusLabel = (status: string) => {
  const normalized = status.toLowerCase();
  if (['paid', 'pago', 'received', 'confirmed', 'confirmado', 'aprovado'].includes(normalized)) return 'Paga';
  if (/cancel|refunded|estorn|excluid/.test(normalized)) return 'Cancelada';
  return 'Pendente';
};
