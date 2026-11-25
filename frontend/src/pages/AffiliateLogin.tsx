import { useRef, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { FaArrowRight, FaEye, FaEyeSlash, FaLeaf } from 'react-icons/fa';
import { auth } from '../../firebase';
import logo from '../assets/logo.jpg';
import heroImage from '../assets/hero/hero-1-800.webp';
import { useAffiliateSession } from '../features/affiliates/AffiliateAccess';
import { AffiliateAccountChoice } from '../features/affiliates/AffiliateAccountChoice';
import { affiliateHome } from '../features/affiliates/affiliateUtils';
import '../features/affiliates/Affiliate.css';

export function AffiliateLogin() {
  const { user, profile, loading, error: profileError, retry } = useAffiliateSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [submittedUid, setSubmittedUid] = useState<string | null>(null);
  const submission = useRef(false);
  const passwordRef = useRef<HTMLInputElement>(null);
  if (!loading && !busy && profile && user?.uid === submittedUid && profile.identity.uid === submittedUid && profile.identity.role !== 'admin') {
    return <Navigate to={affiliateHome(profile.identity.role)} replace />;
  }
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submission.current) return;
    submission.current = true;
    setError(''); setBusy(true); setSubmittedUid(null);
    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      setSubmittedUid(credential.user.uid);
      setPassword('');
    }
    catch { setError('Confira o e-mail e a senha e tente novamente.'); passwordRef.current?.focus(); }
    finally { submission.current = false; setBusy(false); }
  };
  return (
    <main className="aff-auth-page aff-auth-page--login" id="conteudo-principal" tabIndex={-1}>
      <div className="aff-auth-shell">
      <aside className="aff-auth-story" style={{ backgroundImage: `linear-gradient(180deg, #163d2422, #103d2be8), url(${heroImage})` }}>
        <span className="aff-eyebrow"><FaLeaf aria-hidden="true" /> Parcerias Vagafogo</span>
        <div><h2>Mais pessoas perto da natureza.</h2><p>Suas indicações e reservas reunidas em um só lugar.</p></div>
      </aside>
      <section className="aff-auth-card" aria-labelledby="affiliate-login-title">
        <a href="/" className="aff-brand"><img src={logo} alt="Vagafogo" /><span>Vagafogo<small><FaLeaf /> Agências e parceiros</small></span></a>
        <h1 id="affiliate-login-title">Entre no seu painel</h1>
        <p>Acompanhe as reservas indicadas por você ou pela sua agência.</p>
        {loading ? <p role="status" className="aff-empty">Verificando acesso…</p> : user ? (
          <>
            {!profile && <p className="aff-alert aff-alert--error" role="alert">{profileError?.message || 'Sua conta ainda não possui um acesso habilitado.'}</p>}
            <AffiliateAccountChoice identity={profile?.identity} email={user.email} onRetry={profile ? undefined : retry} onSignedOut={() => { setSubmittedUid(null); setPassword(''); setError(''); }} />
          </>
        ) : (
          <form className="aff-form" onSubmit={(event) => void submit(event)}>
            {error && <p id="affiliate-login-error" className="aff-alert aff-alert--error" role="alert">{error}</p>}
            <label>E-mail<input type="email" autoComplete="username" autoCapitalize="none" spellCheck={false} value={email} onChange={(event) => { setEmail(event.target.value); setError(''); }} aria-invalid={Boolean(error)} aria-describedby={error ? 'affiliate-login-error' : undefined} required /></label>
            <div className="aff-field"><label htmlFor="affiliate-password">Senha</label><div className="aff-password-field"><input id="affiliate-password" ref={passwordRef} type={visible ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => { setPassword(event.target.value); setError(''); }} aria-invalid={Boolean(error)} aria-describedby={error ? 'affiliate-login-error' : undefined} required /><button type="button" aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={visible} onClick={() => setVisible((value) => !value)}>{visible ? <FaEyeSlash aria-hidden="true" /> : <FaEye aria-hidden="true" />}</button></div></div>
            <button type="submit" className="aff-button" disabled={busy}>{busy ? 'Entrando…' : <>Entrar <FaArrowRight aria-hidden="true" /></>}</button>
          </form>
        )}
        <p className="aff-help">Primeiro acesso? Abra o link de ativação recebido do responsável pelo seu cadastro.</p>
      </section>
      </div>
    </main>
  );
}
