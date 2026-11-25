import { useEffect, useRef, useState } from 'react';
import { signOut } from 'firebase/auth';
import { FaArrowRight, FaBars, FaChartBar, FaLeaf, FaLink, FaReceipt, FaRegCalendarAlt, FaSignOutAlt, FaTimes } from 'react-icons/fa';
import { auth } from '../../../firebase';
import logo from '../../assets/logo.jpg';
import { useAffiliateProfile } from './AffiliateAccess';
import { PartnerDashboard, type PartnerView } from './PartnerDashboard';
import './PartnerPortal.css';

const menu = [
  { id: 'overview', label: 'Visão geral', icon: FaChartBar, description: 'Sua parceria em um só lugar' },
  { id: 'reservations', label: 'Reservas', icon: FaReceipt, description: 'Acompanhe suas indicações' },
  { id: 'reports', label: 'Relatórios', icon: FaRegCalendarAlt, description: 'Resultados para acompanhar de perto' },
  { id: 'sharing', label: 'Divulgação', icon: FaLink, description: 'Compartilhe novas experiências' },
] as const;

export function PartnerPortalShell() {
  const profile = useAffiliateProfile();
  const [view, setView] = useState<PartnerView>('overview');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 1000px)').matches);
  const [signingOut, setSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const menuButton = useRef<HTMLButtonElement>(null);
  const sidebar = useRef<HTMLElement>(null);
  const logoutPending = useRef(false);
  const name = profile.partner?.name || 'Parceiro Vagafogo';
  const email = profile.partner?.email || profile.identity.email;
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => Array.from(part)[0] || '').join('').toUpperCase();
  const current = menu.find((item) => item.id === view) || menu[0];

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
    const opener = menuButton.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = window.requestAnimationFrame(() => sidebar.current?.querySelector<HTMLElement>('button[aria-current="page"]')?.focus({ preventScroll: true }));
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault(); event.stopPropagation(); setDrawerOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !sidebar.current) return;
      const elements = Array.from(sidebar.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),[tabindex="0"]')).filter((item) => item.getClientRects().length > 0);
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (!sidebar.current.contains(document.activeElement) || document.activeElement === first)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (!sidebar.current.contains(document.activeElement) || document.activeElement === last)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
      if (opener?.getClientRects().length) opener.focus({ preventScroll: true });
    };
  }, [mobile, drawerOpen]);

  const navigate = (next: PartnerView) => {
    setView(next);
    setDrawerOpen(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
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
    <div className="aff-portal pps-shell">
      {mobile && drawerOpen && <div className="pps-backdrop" aria-hidden="true" onClick={() => setDrawerOpen(false)} />}
      <aside id="partner-sidebar" ref={sidebar} className={`pps-sidebar${drawerOpen ? ' is-open' : ''}`} inert={mobile && !drawerOpen} aria-hidden={mobile && !drawerOpen ? true : undefined} role={mobile ? 'dialog' : undefined} aria-modal={mobile && drawerOpen ? true : undefined} aria-labelledby="partner-sidebar-title">
        <div className="pps-sidebar-brand">
          <a href="/" className="pps-brand"><span className="pps-brand-mark"><img src={logo} alt="" /></span><span><strong id="partner-sidebar-title">Vagafogo</strong><small>Portal do parceiro</small></span></a>
          <button type="button" className="pps-close" aria-label="Fechar menu" onClick={() => setDrawerOpen(false)}><FaTimes aria-hidden="true" /></button>
        </div>
        <div className="pps-nav-caption">Seu espaço</div>
        <nav className="pps-navigation" aria-label="Painel do parceiro independente">
          {menu.map(({ id, label, icon: Icon }) => <button type="button" key={id} aria-current={view === id ? 'page' : undefined} onClick={() => navigate(id)}><Icon aria-hidden="true" /><span>{label}</span>{view === id && <FaArrowRight className="pps-active-arrow" aria-hidden="true" />}</button>)}
        </nav>
        <div className="pps-sidebar-footer">
          <div className="pps-partnership-note"><FaLeaf aria-hidden="true" /><p>Conexões que<br /><em>aproximam da natureza.</em></p></div>
          <div className="pps-account"><span className="pps-avatar" aria-hidden="true">{initials || 'P'}</span><div><strong title={name}>{name}</strong><span title={email}>{email || 'Parceiro independente'}</span></div></div>
          {logoutError && <p className="pps-logout-error" role="alert">{logoutError}</p>}
          <button type="button" className="pps-signout" disabled={signingOut} onClick={() => void logout()}><FaSignOutAlt aria-hidden="true" />{signingOut ? 'Saindo…' : 'Sair da conta'}</button>
        </div>
      </aside>
      <div className="pps-main-frame" inert={mobile && drawerOpen}>
        <header className="pps-topbar">
          <button ref={menuButton} type="button" className="pps-menu-trigger" aria-label="Abrir menu" aria-expanded={drawerOpen} aria-controls="partner-sidebar" onClick={() => setDrawerOpen(true)}><FaBars aria-hidden="true" /></button>
          <div className="pps-page-heading"><span>Painel do parceiro</span><h1>{current.label}</h1><p>{current.description}</p></div>
          <div className="pps-topbar-account"><div><small>Bem-vindo ao seu espaço</small><strong>{name}</strong></div><span className="pps-avatar" aria-hidden="true">{initials || 'P'}</span></div>
        </header>
        <main className="pps-main" id="conteudo-principal" tabIndex={-1}><PartnerDashboard view={view} onNavigate={navigate} /></main>
        <footer className="pps-page-footer"><span>Vagafogo · Natureza que aproxima</span><span>Portal do parceiro independente</span></footer>
      </div>
    </div>
  );
}
