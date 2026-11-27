import { FaClipboardList, FaCreditCard } from 'react-icons/fa';
import { FaPix } from 'react-icons/fa6';
import { reservaManualNaExibicao } from '../utils/classificacaoPagamentoReserva';
import './ReservaIdentificacaoBadges.css';

const cartao = { tipo: 'cartao', rotulo: 'Cartão', Icone: FaCreditCard };
const pix = { tipo: 'pix', rotulo: 'Pix', Icone: FaPix };
const manual = { tipo: 'manual', rotulo: 'Manual', Icone: FaClipboardList };

const identificarPagamento = (formaPagamento?: string) => {
  if (typeof formaPagamento !== 'string') return null;

  const forma = formaPagamento
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[\s-]+/g, '_');

  if (forma === 'PIX') return pix;
  if (['CREDIT_CARD', 'DEBIT_CARD', 'CARTAO', 'CARTAO_DE_CREDITO', 'CARTAO_DE_DEBITO'].includes(forma)) return cartao;
  return null;
};

export function ReservaIdentificacaoBadges({
  formaPagamento,
  criadaManualmente,
  pagamentoRegistradoNoAsaas,
  formaPagamentoAutomatica,
  origem,
}: {
  formaPagamento?: string;
  criadaManualmente: boolean;
  pagamentoRegistradoNoAsaas?: unknown;
  formaPagamentoAutomatica?: boolean;
  origem?: unknown;
}) {
  const pagamento = identificarPagamento(formaPagamento);
  const manualNaExibicao = reservaManualNaExibicao({ pagamentoRegistradoNoAsaas, origem }, criadaManualmente);
  const badges = [manualNaExibicao ? manual : null, pagamento];

  return badges.map((badge) => {
    if (!badge) return null;
    const automatica = badge.tipo !== 'manual' && formaPagamentoAutomatica === true;
    return <span key={badge.tipo} className={`admin-reserva-identificacao admin-reserva-identificacao--${badge.tipo}`} title={automatica ? 'Forma de pagamento gerada automaticamente no cadastro administrativo.' : undefined}>
      <badge.Icone aria-hidden="true" focusable="false" />
      {badge.rotulo}{automatica ? ' · automático' : ''}
    </span>;
  });
}
