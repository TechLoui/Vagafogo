import { FaClipboardList, FaCreditCard } from 'react-icons/fa';
import { FaPix } from 'react-icons/fa6';
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
}: {
  formaPagamento?: string;
  criadaManualmente: boolean;
}) {
  const pagamento = identificarPagamento(formaPagamento);
  const badges = [criadaManualmente ? manual : null, pagamento];

  return badges.map((badge) => badge && (
    <span key={badge.tipo} className={`admin-reserva-identificacao admin-reserva-identificacao--${badge.tipo}`}>
      <badge.Icone aria-hidden="true" focusable="false" />
      {badge.rotulo}
    </span>
  ));
}
