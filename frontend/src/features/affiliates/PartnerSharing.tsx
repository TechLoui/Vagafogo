import { useEffect, useState } from 'react';
import { FaCheck, FaCopy, FaExternalLinkAlt, FaLink, FaSyncAlt, FaWhatsapp } from 'react-icons/fa';
import { AffiliateApiError, getAffiliateLinks } from './affiliateService';
import { AffiliatePreparedState } from './AffiliatePreparedState';
import type { AffiliateLink } from './types';
import sharingImage from '../../assets/hero/hero-1-800.webp';
import './PartnerPortal.css';

export function PartnerSharing({ compact = false }: { compact?: boolean }) {
  const [links, setLinks] = useState<AffiliateLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copyError, setCopyError] = useState('');
  const [copied, setCopied] = useState('');
  const [prepared, setPrepared] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let disposed = false;
    setLoading(true); setError(''); setCopyError(''); setCopied(''); setPrepared(false); setLinks([]);
    void getAffiliateLinks().then((page) => { if (!disposed) setLinks(page.items); })
      .catch((caught) => {
        if (disposed) return;
        if (caught instanceof AffiliateApiError && caught.code === 'AFFILIATES_NOT_ENABLED') setPrepared(true);
        else setError(caught instanceof Error ? caught.message : 'Não foi possível carregar seu link.');
      })
      .finally(() => { if (!disposed) setLoading(false); });
    return () => { disposed = true; };
  }, [refresh]);

  const copy = async (link: AffiliateLink) => {
    setCopyError(''); setCopied('');
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(link.id);
    } catch { setCopyError('Não foi possível copiar automaticamente. Selecione o endereço abaixo e copie o link.'); }
  };
  const activeLinks = links.filter((link) => link.status === 'active');

  if (prepared) return <AffiliatePreparedState />;

  return (
    <section className={`pp-sharing${compact ? '' : ' ps-studio'}`} aria-labelledby="partner-sharing-title">
      {!compact && <div className="ps-visual">
        <img src={sharingImage} alt="Mesa de brunch da Vagafogo com receitas artesanais e frutas" />
        <div className="ps-visual-shade" />
        <div className="ps-visual-copy"><span>COMPARTILHE O VAGAFOGO</span><h2>Experiências que<br />merecem ser<br />{' '}<em>compartilhadas.</em></h2><p>Sabores, encontros e natureza.<br />Sua indicação abre esse caminho.</p></div>
      </div>}
      <div className={compact ? undefined : 'ps-tools'}>
      <div className="pp-sharing-heading">
        <span className="pp-heading-icon" aria-hidden="true"><FaLink /></span>
        <div><h2 id="partner-sharing-title">Seu link de reserva</h2><p>Compartilhe seu endereço para que as reservas sejam identificadas como suas indicações.</p></div>
      </div>
      {loading ? (
        <div className="pp-sharing-skeleton" role="status"><span className="pp-sr-only">Carregando seu link de reserva…</span><span /><span /></div>
      ) : error ? (
        <div className="pp-feedback"><p className="aff-alert aff-alert--error" role="alert">{error}</p><button type="button" className="aff-button aff-button--secondary" onClick={() => setRefresh((value) => value + 1)}><FaSyncAlt aria-hidden="true" /> Tentar novamente</button></div>
      ) : activeLinks.length === 0 ? (
        <p className="pp-sharing-empty">Seu link está indisponível. Fale com o responsável pelo seu cadastro para verificar o acesso.</p>
      ) : (
        <div className="pp-links">
          {copyError && <p className="aff-alert aff-alert--error" role="alert">{copyError}</p>}
          {activeLinks.map((link) => (
            <div className="pp-share-item" key={link.id}>
              {activeLinks.length > 1 && <h3>{link.label || 'Link de reserva'}</h3>}
              {!compact && <span className="ps-link-label">Seu endereço exclusivo</span>}
              <input className="pp-link-input" readOnly value={link.url} aria-label="Seu link de reserva" onFocus={(event) => event.currentTarget.select()} />
              <div className="pp-share-actions">
                <button type="button" className="aff-button" onClick={() => void copy(link)}>{copied === link.id ? <FaCheck aria-hidden="true" /> : <FaCopy aria-hidden="true" />}{copied === link.id ? 'Link copiado' : 'Copiar link'}</button>
                {!compact && <a className="aff-button aff-button--secondary" href={`https://wa.me/?text=${encodeURIComponent(`Conheça o Vagafogo e faça sua reserva pelo meu link: ${link.url}`)}`} target="_blank" rel="noopener noreferrer"><FaWhatsapp aria-hidden="true" /> WhatsApp</a>}
                <a className="aff-button aff-button--secondary" href={link.url} target="_blank" rel="noopener noreferrer" aria-label="Abrir formulário de reserva em nova aba"><FaExternalLinkAlt aria-hidden="true" /> Abrir formulário</a>
              </div>
            </div>
          ))}
          <p className="pp-sr-only" role="status">{copied ? 'Link copiado para a área de transferência.' : ''}</p>
        </div>
      )}
      {!compact && !loading && !error && activeLinks.length > 0 && (
        <div className="pp-sharing-tips">
          <div><span>01</span><h3>Divulgue seu endereço</h3><p>Use o link nas suas redes sociais, na bio ou em uma conversa com seus visitantes.</p></div>
          <div><span>02</span><h3>Acompanhe no painel</h3><p>Consulte as reservas atribuídas ao seu link e acompanhe o pagamento nas abas Reservas e Relatórios.</p></div>
        </div>
      )}
      </div>
    </section>
  );
}
