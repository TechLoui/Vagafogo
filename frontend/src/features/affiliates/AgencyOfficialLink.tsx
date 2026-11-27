import { useRef, useState, type FormEvent } from 'react';
import { FaArrowRight, FaCheck, FaCopy, FaExternalLinkAlt, FaLink } from 'react-icons/fa';
import { useAffiliateProfile } from './AffiliateAccess';
import { saveAgencyOfficialLink } from './affiliateService';
import { PortalArtwork } from './PortalArtwork';
import type { AffiliateEntity, AffiliateLink } from './types';
import './AgencyOfficialLink.css';

const publicBase = 'https://vagafogo.com.br';
const validSlug = (value: string) => value.length >= 3 && value.length <= 60 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
const suggestedSlug = (name: string) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60).replace(/-$/g, '');

export function AgencyOfficialLink({ agency, onSaved, compact = false }: {
  agency: AffiliateEntity; onSaved?: (link: AffiliateLink) => void; compact?: boolean;
}) {
  const profile = useAffiliateProfile();
  const canManage = profile.identity.role === 'admin' || profile.identity.role === 'agency' && profile.identity.agencyId === agency.id;
  const [slug, setSlug] = useState(agency.publicSlug || suggestedSlug(agency.name));
  const [activeSlug, setActiveSlug] = useState(agency.publicSlug || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [copied, setCopied] = useState(false);
  const pending = useRef(false);
  const activeUrl = activeSlug && validSlug(activeSlug) ? `${publicBase}/${activeSlug}` : '';
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!canManage || pending.current) return;
    const next = slug.trim().toLowerCase();
    if (!validSlug(next)) { setError('Use de 3 a 60 letras, números e hífens entre as palavras. Exemplo: aquino-turismo.'); return; }
    pending.current = true; setBusy(true); setError(''); setNotice(''); setCopied(false);
    try {
      const { item } = await saveAgencyOfficialLink(agency.id, next);
      if (item.agencyId !== agency.id || item.partnerId !== null || !item.slug || !validSlug(item.slug)
        || item.url !== `${publicBase}/${item.slug}`) throw new Error('A resposta não corresponde ao link oficial desta agência. Atualize a página e tente novamente.');
      setSlug(item.slug); setActiveSlug(item.slug); onSaved?.(item);
      setNotice('Endereço salvo. As reservas feitas por este link serão identificadas como vendas diretas da agência.');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Não foi possível salvar o endereço. Tente novamente.'); }
    finally { pending.current = false; setBusy(false); }
  };
  const copy = async () => {
    if (!activeUrl) return;
    setError('');
    try { await navigator.clipboard.writeText(activeUrl); setCopied(true); }
    catch { setError('Não foi possível copiar automaticamente. Selecione o endereço e copie o link.'); }
  };
  if (!canManage) return null;
  return <section className={`aol-module${compact ? ' aol-module--compact' : ''}`} aria-labelledby="agency-official-link-title">
    {!compact && <header className="aol-hero"><div><span>O ENDEREÇO DA SUA AGÊNCIA</span><h2 id="agency-official-link-title">Sua agência.<br /><em>Seu próprio caminho.</em></h2><p>Um link oficial, com o nome da agência, para divulgar suas experiências na Vagafogo.</p></div><PortalArtwork kind="sharing" /></header>}
    {compact && <h3 id="agency-official-link-title">Link oficial de {agency.name}</h3>}
    <div className="aol-grid">
      <div className="aol-panel">
        <div className="aol-heading"><span><FaLink aria-hidden="true" /></span><div><h3>Escolha seu endereço</h3><p>O visitante reserva e paga pelo formulário. A indicação fica vinculada diretamente à agência.</p></div></div>
        <form onSubmit={(event) => void save(event)} className="aol-form">
          <label htmlFor={`agency-slug-${agency.id}`}>Nome no link</label>
          <div className="aol-slug-field"><span>vagafogo.com.br/</span><input id={`agency-slug-${agency.id}`} value={slug} onChange={(event) => { setSlug(event.target.value.toLowerCase()); setError(''); setNotice(''); }} autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="off" maxLength={60} aria-describedby={`agency-slug-help-${agency.id}`} disabled={busy} required /></div>
          <p id={`agency-slug-help-${agency.id}`} className="aol-help">Use o nome da agência, sem espaços ou acentos. O endereço precisa estar disponível.</p>
          <button type="submit" className="aff-button" disabled={busy || slug.trim().toLowerCase() === activeSlug}>{busy ? 'Salvando endereço…' : activeSlug ? 'Atualizar endereço' : 'Criar link oficial'}<FaArrowRight aria-hidden="true" /></button>
        </form>
        {error && <p className="aff-alert aff-alert--error" role="alert">{error}</p>}
        {notice && <p className="aff-alert" role="status">{notice}</p>}
        {activeUrl && <div className="aol-active"><span className="aol-active-label"><i aria-hidden="true" /> Link oficial ativo</span><label>Seu endereço de divulgação<input readOnly value={activeUrl} onFocus={(event) => event.currentTarget.select()} /></label><div className="aol-share-actions"><button type="button" className="aff-button" onClick={() => void copy()}>{copied ? <FaCheck aria-hidden="true" /> : <FaCopy aria-hidden="true" />}{copied ? 'Link copiado' : 'Copiar link'}</button><a className="aff-button aff-button--secondary" href={activeUrl} target="_blank" rel="noopener noreferrer"><FaExternalLinkAlt aria-hidden="true" /> Abrir formulário</a></div><p className="aol-copy-status" role="status">{copied ? 'Link copiado para a área de transferência.' : ''}</p></div>}
        {activeSlug && <p className="aol-change-note">Ao alterar o endereço, o link anterior fica indisponível. Atualize os lugares onde ele foi divulgado. As reservas já registradas são preservadas.</p>}
      </div>
      {!compact && <aside className="aol-guide"><span>UMA REDE. DOIS CAMINHOS.</span><h3>O link oficial e os links da equipe trabalham juntos.</h3><div><strong>01 · Link da agência</strong><p>Use nas redes sociais, na bio e nos canais oficiais. As reservas aparecem no resultado da agência como vendas diretas.</p></div><div><strong>02 · Links dos vendedores</strong><p>Cada vendedor mantém seu link. A agência acompanha as indicações de toda a equipe, com identificação de quem vendeu.</p></div><div className="aol-guide-foot"><FaCheck aria-hidden="true" /><p>Todos os resultados reunidos nos seus relatórios, com o pagamento identificado em cada reserva.</p></div></aside>}
    </div>
  </section>;
}
