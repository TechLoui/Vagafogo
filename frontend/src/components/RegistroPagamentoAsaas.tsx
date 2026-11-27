import { useEffect, useRef } from 'react';
import { FaCheck, FaCreditCard, FaMagic } from 'react-icons/fa';
import { ReservaIdentificacaoBadges } from './ReservaIdentificacaoBadges';
import type { RespostaPreenchidaReserva } from '../utils/preenchimentoReservaAsaas';
import './RegistroPagamentoAsaas.css';

export function RegistroPagamentoAsaas({ registrado, formaPagamento, formaPagamentoAutomatica, onRegistrar, onMetodo }: {
  registrado: boolean; formaPagamento?: string; formaPagamentoAutomatica?: boolean;
  onRegistrar: () => void; onMetodo: (metodo: 'PIX' | 'CREDIT_CARD') => void;
}) {
  const previousRegistration = useRef(registrado);
  const methodInput = useRef<HTMLSelectElement>(null);
  useEffect(() => {
    if (registrado && !previousRegistration.current) methodInput.current?.focus();
    previousRegistration.current = registrado;
  }, [registrado]);
  if (registrado) return <section className="admin-asaas-registration" aria-label="Pagamento registrado como Asaas">
    <div className="admin-asaas-registration__title"><span><FaCheck aria-hidden="true" /></span><div><small>Pagamento</small><h5>Registrado como Asaas</h5></div></div>
    <ReservaIdentificacaoBadges formaPagamento={formaPagamento} criadaManualmente={false} formaPagamentoAutomatica={formaPagamentoAutomatica} />
    <label>Método de pagamento<select ref={methodInput} value={formaPagamento || ''} onChange={(event) => onMetodo(event.target.value as 'PIX' | 'CREDIT_CARD')}><option value="" disabled>Não informado</option><option value="PIX">Pix</option><option value="CREDIT_CARD">Cartão</option></select></label>
    {formaPagamentoAutomatica && <p><FaMagic aria-hidden="true" /> Método preenchido automaticamente. Você pode ajustar se necessário.</p>}
    <p>Após salvar, a reserva sai do filtro Manual. Reservas pagas entram no Financeiro e na apuração geral de 1%.</p>
  </section>;
  return <div className="admin-manual-choice-panel"><div className="admin-manual-choice-panel__header"><span className="admin-manual-choice-panel__icon"><FaCreditCard className="h-4 w-4" aria-hidden="true" /></span><div><p className="admin-manual-choice-panel__eyebrow">Pagamento</p><h5 className="admin-manual-choice-panel__title">Registrar como Asaas</h5></div></div>
    <label className="admin-manual-toggle-card"><input type="checkbox" checked={false} onChange={onRegistrar} className="sr-only" /><span className="admin-manual-toggle-card__indicator" aria-hidden="true" /><span className="admin-manual-toggle-card__content"><span className="admin-manual-toggle-card__label">Pago pelo Asaas</span><span className="admin-manual-toggle-card__hint">Define Pix ou cartão e completa as perguntas vazias automaticamente.</span></span></label>
  </div>;
}

export function ReservaRespostasEditor({ respostas, onChange }: {
  respostas: RespostaPreenchidaReserva[]; onChange: (respostas: RespostaPreenchidaReserva[]) => void;
}) {
  if (!respostas.length) return null;
  const update = (index: number, value: string, condicional = false) => onChange(respostas.map((item, position) => {
    if (position !== index) return item;
    if (condicional && item.perguntaCondicional) {
      const conditional = { ...item.perguntaCondicional };
      delete conditional.respostaAutomatica;
      return { ...item, perguntaCondicional: { ...conditional, resposta: value } };
    }
    const answer = { ...item };
    delete answer.respostaAutomatica;
    return { ...answer, resposta: value };
  }));
  const field = (item: RespostaPreenchidaReserva | NonNullable<RespostaPreenchidaReserva['perguntaCondicional']>, index: number, condicional = false) => <label className="admin-asaas-answers__field" key={`${index}-${condicional}`}><span>{item.pergunta}{item.respostaAutomatica && <small><FaMagic aria-hidden="true" /> Automática</small>}</span>{item.tipo === 'sim_nao' ? <select value={item.resposta || ''} onChange={(event) => update(index, event.target.value, condicional)}><option value="">Não informado</option><option value="sim">Sim</option><option value="nao">Não</option></select> : <input type="text" value={item.resposta || ''} onChange={(event) => update(index, event.target.value, condicional)} />}</label>;
  const automaticas = respostas.some((item) => item.respostaAutomatica || item.perguntaCondicional?.respostaAutomatica);
  return <section className="admin-asaas-answers md:col-span-2" aria-label="Respostas da reserva"><div><h5>Respostas da reserva</h5><p>{automaticas ? 'Os campos marcados foram preenchidos automaticamente. Confira e ajuste as respostas quando tiver a informação do visitante.' : 'Respostas registradas nos pacotes desta reserva.'}</p></div><div className="admin-asaas-answers__grid">{respostas.flatMap((item, index) => [field(item, index), ...(item.perguntaCondicional ? [field(item.perguntaCondicional, index, true)] : [])])}</div></section>;
}
