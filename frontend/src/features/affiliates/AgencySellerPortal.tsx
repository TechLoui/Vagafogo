import { useEffect, useRef, useState } from 'react';
import { signOut } from 'firebase/auth';
import { FaArrowRight, FaBars, FaChartBar, FaLeaf, FaLink, FaPlus, FaReceipt, FaRegCalendarAlt, FaSignOutAlt, FaTimes } from 'react-icons/fa';
import { auth } from '../../../firebase';
import logo from '../../assets/logo.jpg';
import { useAffiliateProfile } from './AffiliateAccess';
import { AgencyLogo } from './AgencyLogo';
import { brandThemeStyle } from './affiliateBranding';
import { PartnerDashboard, type PartnerView } from './PartnerDashboard';
import './PartnerPortal.css';
import './AgencySellerPortal.css';

const navigation = [
  { id: 'overview', label: 'Visão geral', icon: FaChartBar },
  { id: 'reservations', label: 'Reservas', icon: FaReceipt },
  { id: 'reports', label: 'Relatórios', icon: FaRegCalendarAlt },
  { id: 'sharing', label: 'Divulgação', icon: FaLink },
] as const;

export function AgencySellerPortal() {
  const profile = useAffiliateProfile();
  const [view, setView] = useState<PartnerView>('overview');
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 1000px)').matches);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const sidebar = useRef<HTMLElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const logoutPending = useRef(false);
  const agencyName = profile.agency?.name || 'Sua agência';
  const name = profile.partner?.name || 'Vendedor';
  const email = profile.partner?.email || profile.identity.email;
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => Array.from(part)[0] || '').join('').toUpperCase() || 'V';
  const current = navigation.find((item) => item.id === view) || navigation[0];

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(max-width: 1000px)');
    const sync = () => { setMobile(media.matches); if (!media.matches) setDrawerOpen(false); };
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (!mobile || !drawerOpen) return;
    const trigger = opener.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = window.requestAnimationFrame(() => sidebar.current?.querySelector<HTMLElement>('button[aria-current="page"]')?.focus({ preventScroll: true }));
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setDrawerOpen(false); return; }
      if (event.key !== 'Tab' || !sidebar.current) return;
      const fields = Array.from(sidebar.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),[tabindex="0"]')).filter((element) => element.getClientRects().length > 0);
      const first = fields[0];
      const last = fields[fields.length - 1];
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (!sidebar.current.contains(document.activeElement) || document.activeElement === first)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (!sidebar.current.contains(document.activeElement) || document.activeElement === last)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', keydown);
      document.body.style.overflow = previousOverflow;
      if (trigger?.getClientRects().length) trigger.focus({ preventScroll: true });
    };
  }, [mobile, drawerOpen]);

  const navigate = (next: PartnerView) => {
    setView(next); setDrawerOpen(false);
    if (typeof window.scrollTo === 'function') window.scrollTo({ top: 0, behavior: 'instant' });
  };
  const logout = async () => {
    if (logoutPending.current) return;
    logoutPending.current = true;
    setSigningOut(true); setLogoutError('');
    try { await signOut(auth); }
    catch { setLogoutError('Não foi possível sair da conta. Tente novamente.'); }
    finally { logoutPending.current = false; setSigningOut(false); }
  };

  return (
    <div className="aff-portal pps-shell asp-shell" style={brandThemeStyle(profile.agency?.branding)}>
      {mobile && drawerOpen && <div className="pps-backdrop" aria-hidden="true" onClick={() => setDrawerOpen(false)} />}
      <aside id="agency-seller-sidebar" ref={sidebar} className={`pps-sidebar${drawerOpen ? ' is-open' : ''}`} inert={mobile && !drawerOpen} aria-hidden={mobile && !drawerOpen ? true : undefined} role={mobile ? 'dialog' : undefined} aria-modal={mobile && drawerOpen ? true : undefined} aria-labelledby="agency-seller-navigation-title">
        <div className="pps-sidebar-brand">
          <a className="pps-brand" href="/"><span className="pps-brand-mark"><img src={logo} alt="" /></span><span><strong id="agency-seller-navigation-title">Vagafogo</strong><small>Portal do vendedor</small></span></a>
          <button type="button" className="pps-close" aria-label="Fechar menu" onClick={() => setDrawerOpen(false)}><FaTimes aria-hidden="true" /></button>
        </div>
        <div className="asp-agency-context"><span>Em parceria com</span><strong title={agencyName}>{agencyName}</strong></div>
        <nav className="pps-navigation" aria-label="Painel do vendedor">
          {navigation.map(({ id, label, icon: Icon }) => <button type="button" key={id} aria-current={view === id ? 'page' : undefined} onClick={() => navigate(id)}><Icon aria-hidden="true" /><span>{label}</span>{view === id && <FaArrowRight className="pps-active-arrow" aria-hidden="true" />}</button>)}
        </nav>
        <div className="pps-sidebar-footer">
          <div className="pps-partnership-note"><FaLeaf aria-hidden="true" /><p>Novas experiências.<br /><em>Uma parceria que aproxima.</em></p></div>
          <div className="pps-account"><span className="pps-avatar" aria-hidden="true">{initials}</span><div><strong title={name}>{name}</strong><span title={email}>{email || 'Vendedor da agência'}</span></div></div>
          {logoutError && <p className="pps-logout-error" role="alert">{logoutError}</p>}
          <button type="button" className="pps-signout" disabled={signingOut} onClick={() => void logout()}><FaSignOutAlt aria-hidden="true" />{signingOut ? 'Saindo…' : 'Sair da conta'}</button>
        </div>
      </aside>
      <div className="pps-main-frame" inert={mobile && drawerOpen}>
        <header className="pps-topbar">
          <button type="button" ref={opener} className="pps-menu-trigger" aria-label="Abrir menu" aria-expanded={drawerOpen} aria-controls="agency-seller-sidebar" onClick={() => setDrawerOpen(true)}><FaBars aria-hidden="true" /></button>
          <div className="pps-page-heading"><span>Portal do vendedor</span><h1>{current.label}</h1><p>Suas indicações, acompanhadas de perto.</p></div>
          <div className="pps-topbar-account"><div><small>Seu espaço na parceria</small><strong>{name}</strong></div><span className="pps-avatar" aria-hidden="true">{initials}</span></div>
        </header>
        <main className="pps-main asp-main" id="conteudo-principal" tabIndex={-1}>
          <section className="asp-brand-card" aria-label={`Parceria entre Vagafogo e ${agencyName}`}>
            <div className="asp-brand-pair">
              <div className="asp-logo-pad"><img src={logo} alt="Vagafogo" /></div>
              <span className="asp-brand-join" aria-hidden="true"><FaPlus /></span>
              <div className="asp-logo-pad"><AgencyLogo url={profile.agency?.logoUrl} name={agencyName} className="asp-agency-logo" /></div>
            </div>
            <div className="asp-brand-copy"><span>JUNTOS, MAIS PERTO DA NATUREZA</span><h2>Vagafogo <span>&amp;</span> {agencyName}</h2><p>Seu espaço para acompanhar as reservas indicadas por você.</p></div>
          </section>
          <PartnerDashboard view={view} onNavigate={navigate} />
        </main>
        <footer className="pps-page-footer"><span>Vagafogo · Natureza que aproxima</span><span>{agencyName} · Portal do vendedor</span></footer>
      </div>
    </div>
  );
}
