import { useRef, useState, type FormEvent } from 'react';
import { FaArrowLeft, FaCheck, FaPalette } from 'react-icons/fa';
import logo from '../../assets/logo.jpg';
import brunchImage from '../../assets/hero/hero-1-800.webp';
import { AgencyLogo } from './AgencyLogo';
import { AgencyLogoInput } from './AgencyLogoInput';
import { brandThemeStyle, normalizeAgencyBranding } from './affiliateBranding';
import { saveAgencyLogo } from './affiliateService';
import type { AffiliateEntity, AgencyBranding } from './types';
import './AgencyProfile.css';

export function AgencyProfile({ agency, onSaved, onSkip }: {
  agency: AffiliateEntity; onSaved: (entity: AffiliateEntity) => void; onSkip: () => void;
}) {
  const [logoChange, setLogoChange] = useState<string | null>();
  const [brandingChange, setBrandingChange] = useState<AgencyBranding | null>();
  const [reading, setReading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const pending = useRef(false);
  const previewLogo = logoChange === undefined ? agency.logoUrl : logoChange;
  const previewBranding = normalizeAgencyBranding(logoChange === null ? null : brandingChange === undefined ? agency.branding : brandingChange);
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (pending.current || reading || logoChange === undefined) return;
    pending.current = true; setBusy(true); setError(''); setNotice('');
    try {
      const { item } = await saveAgencyLogo(agency.id, logoChange, brandingChange);
      if (item.id !== agency.id) throw new Error('A resposta não corresponde à sua agência. Atualize a página e tente novamente.');
      onSaved(item);
      setLogoChange(undefined); setBrandingChange(undefined);
      setNotice(logoChange === null ? 'Logo removida. Os vendedores voltaram às cores da Vagafogo.' : 'Identidade salva. A marca da agência já está disponível para os vendedores.');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Não foi possível salvar a identidade. Tente novamente.'); }
    finally { pending.current = false; setBusy(false); }
  };
  return <section className="ap-profile" aria-labelledby="agency-profile-title">
    <div className="ap-profile-intro"><span className="aff-eyebrow"><FaPalette aria-hidden="true" /> PERFIL E MARCA</span><h2 id="agency-profile-title">Sua marca, junto da Vagafogo.</h2><p>Personalize o espaço dos seus vendedores com a logo e as cores da agência.</p></div>
    <div className="ap-profile-grid">
      <form className="ap-profile-form aff-card" onSubmit={(event) => void save(event)}>
        <div className="ap-profile-account"><h3>Perfil da agência</h3><dl><div><dt>Agência</dt><dd>{agency.name}</dd></div><div><dt>E-mail de acesso</dt><dd>{agency.email}</dd></div></dl></div>
        <AgencyLogoInput currentUrl={agency.logoUrl} value={logoChange} disabled={busy} onChange={(value) => { setLogoChange(value); setNotice(''); setError(''); }} onReading={setReading} onBrandingChange={setBrandingChange} />
        <div className="ap-color-note"><span><FaPalette aria-hidden="true" /></span><div><strong>As cores vêm da sua logo</strong><p>Os destaques, botões e a navegação dos vendedores recebem a identidade da agência. As duas marcas aparecem juntas, com suas logos originais.</p></div></div>
        {error && <p className="aff-alert aff-alert--error" role="alert">{error}</p>}
        {notice && <p className="aff-alert" role="status"><FaCheck aria-hidden="true" /> {notice}</p>}
        <footer className="ap-profile-actions"><button type="button" className="aff-button aff-button--secondary" onClick={onSkip} disabled={busy || reading}><FaArrowLeft aria-hidden="true" /> Voltar ao resumo</button><button type="submit" className="aff-button" disabled={busy || reading || logoChange === undefined}>{reading ? 'Preparando imagem…' : busy ? 'Salvando…' : 'Salvar identidade'}</button></footer>
      </form>
      <aside className="ap-preview" aria-label="Prévia da identidade do vendedor" style={brandThemeStyle(previewBranding)}>
        <span className="ap-preview-label">PRÉVIA DO PAINEL DO VENDEDOR</span>
        <div className="ap-preview-card">
          <div className="ap-preview-brands"><div><span><img src={logo} alt="Logo da Vagafogo" /></span><strong>Vagafogo</strong></div><i aria-hidden="true">+</i><div><AgencyLogo url={previewLogo} name={agency.name} /><strong>{agency.name}</strong></div></div>
          <div className="ap-preview-image"><img src={brunchImage} alt="Brunch artesanal da Vagafogo" /><span>Boas experiências<br />se compartilham.</span></div>
          <div className="ap-preview-content"><span>SEU ESPAÇO</span><h3>Conexões com a sua marca.</h3><p>Suas indicações, suas reservas e a identidade de quem está com você.</p><span className="ap-preview-button">Meu link de reserva <span aria-hidden="true">↗</span></span></div>
        </div>
        <div className="ap-palette" aria-label="Cores da identidade"><div><i style={{ background: previewBranding?.primaryColor || '#225F48' }} aria-hidden="true" /><span>Principal</span></div><div><i style={{ background: previewBranding?.accentColor || '#D8C398' }} aria-hidden="true" /><span>Destaque</span></div></div>
        <p className="ap-preview-help">A prévia é aplicada aos vendedores ao salvar. Eles verão a atualização ao abrir ou atualizar o painel.</p>
      </aside>
    </div>
  </section>;
}
