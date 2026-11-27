import { useEffect, useRef, useState, type ReactNode } from 'react';
import { signOut } from 'firebase/auth';
import { FaArrowRight, FaBars, FaChartBar, FaLink, FaPalette, FaReceipt, FaRegCalendarAlt, FaSignOutAlt, FaTimes, FaUsers } from 'react-icons/fa';
import { auth } from '../../../firebase';
import logo from '../../assets/logo.jpg';
import { useAffiliateProfile } from './AffiliateAccess';
import { AgencyLogo } from './AgencyLogo';
import { brandThemeStyle } from './affiliateBranding';
import type { PartnerView } from './PartnerDashboard';
import type { AffiliateEntity } from './types';
import './PartnerPortal.css';
import './AgencySellerPortal.css';
import './AgencyPortalShell.css';

export type AgencyPortalView = PartnerView | 'sellers' | 'profile';

const navigation = [
  { id: 'overview', label: 'Visão geral', icon: FaChartBar },
  { id: 'reservations', label: 'Reservas', icon: FaReceipt },
  { id: 'reports', label: 'Relatórios', icon: FaRegCalendarAlt },
  { id: 'sellers', label: 'Vendedores', icon: FaUsers },
  { id: 'sharing', label: 'Divulgação', icon: FaLink },
  { id: 'profile', label: 'Perfil e marca', icon: FaPalette },
] as const;

export function AgencyPortalShell({ agency, view, onNavigate, children }: {
  agency: AffiliateEntity;
  view: AgencyPortalView;
  onNavigate: (view: AgencyPortalView) => void;
  children: ReactNode;
}) {
  const profile = useAffiliateProfile();
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 1000px)').matches);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const sidebar = useRef<HTMLElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const logoutPending = useRef(false);
  const email = agency.email || profile.identity.email;
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
    setDrawerOpen(false);
    if (typeof window.scrollTo === 'function') window.scrollTo({ top: 0, behavior: 'instant' });
  }, [view]);

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

  const navigate = (next: AgencyPortalView) => {
    onNavigate(next); setDrawerOpen(false);
  };
  const logout = async () => {
    if (logoutPending.current) return;
    logoutPending.current = true;
    setSigningOut(true); setLogoutError('');
    try { await signOut(auth); }
    catch { setLogoutError('Não foi possível sair da conta. Tente novamente.'); }
    finally { logoutPending.current = false; setSigningOut(false); }
  };

  return <div className="aff-portal pps-shell asp-shell agp-shell" style={brandThemeStyle(agency.branding)}>
    {mobile && drawerOpen && <div className="pps-backdrop" aria-hidden="true" onClick={() => setDrawerOpen(false)} />}
    <aside id="agency-portal-sidebar" ref={sidebar} className={`pps-sidebar${drawerOpen ? ' is-open' : ''}`} inert={mobile && !drawerOpen} aria-hidden={mobile && !drawerOpen ? true : undefined} role={mobile ? 'dialog' : undefined} aria-modal={mobile && drawerOpen ? true : undefined} aria-labelledby="agency-portal-navigation-title">
      <div className="pps-sidebar-brand">
        <a className="pps-brand" href="/"><span className="pps-brand-mark"><img src={logo} alt="" /></span><span><strong id="agency-portal-navigation-title">Vagafogo</strong><small>Portal da agência</small></span></a>
        <button type="button" className="pps-close" aria-label="Fechar menu" onClick={() => setDrawerOpen(false)}><FaTimes aria-hidden="true" /></button>
      </div>
      <div className="agp-sidebar-identity"><AgencyLogo url={agency.logoUrl} name={agency.name} /><div><span>Agência parceira</span><strong title={agency.name}>{agency.name}</strong></div></div>
      <nav className="pps-navigation" aria-label="Portal da agência">
        {navigation.map(({ id, label, icon: Icon }) => <button type="button" key={id} aria-current={view === id ? 'page' : undefined} onClick={() => navigate(id)}><Icon aria-hidden="true" /><span>{label}</span>{view === id && <FaArrowRight className="pps-active-arrow" aria-hidden="true" />}</button>)}
      </nav>
      <div className="pps-sidebar-footer">
        <div className="agp-account-label">CONTA DA AGÊNCIA</div>
        <div className="pps-account"><span className="agp-account-mark" aria-hidden="true"><FaUsers /></span><div><strong title={agency.name}>{agency.name}</strong><span title={email}>{email}</span></div></div>
        {logoutError && <p className="pps-logout-error" role="alert">{logoutError}</p>}
        <button type="button" className="pps-signout" disabled={signingOut} onClick={() => void logout()}><FaSignOutAlt aria-hidden="true" />{signingOut ? 'Saindo…' : 'Sair da conta'}</button>
      </div>
    </aside>
    <div className="pps-main-frame" inert={mobile && drawerOpen}>
      <header className="pps-topbar">
        <button type="button" ref={opener} className="pps-menu-trigger" aria-label="Abrir menu" aria-expanded={drawerOpen} aria-controls="agency-portal-sidebar" onClick={() => setDrawerOpen(true)}><FaBars aria-hidden="true" /></button>
        <div className="pps-page-heading"><span>Portal da agência</span><h1>{current.label}</h1><p>Suas conexões, em um só lugar.</p></div>
        <div className="pps-topbar-account"><div><small>Agência parceira</small><strong>{agency.name}</strong></div><AgencyLogo url={agency.logoUrl} name={agency.name} /></div>
      </header>
      <main className="pps-main agp-main" id="conteudo-principal" tabIndex={-1}>
        {view !== 'profile' && <section className="agp-brand-ribbon" aria-label={`Parceria entre Vagafogo e ${agency.name}`}><div className="agp-ribbon-logo"><img src={logo} alt="Vagafogo" /></div><span className="agp-ribbon-join" aria-hidden="true">+</span><div className="agp-ribbon-logo"><AgencyLogo url={agency.logoUrl} name={agency.name} /></div><div className="agp-ribbon-copy"><span>UMA PARCERIA QUE APROXIMA</span><strong>{agency.name} <span>&amp;</span> Vagafogo</strong></div></section>}
        {children}
      </main>
      <footer className="pps-page-footer"><span>Vagafogo · Natureza que aproxima</span><span>{agency.name} · Portal da agência</span></footer>
    </div>
  </div>;
}
