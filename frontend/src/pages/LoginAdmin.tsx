import { useRef, useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useAuthState } from 'react-firebase-hooks/auth';
import { FaArrowRight, FaEye, FaEyeSlash, FaLeaf, FaLock } from 'react-icons/fa';
import { auth } from '../../firebase';
import logo from '../assets/logo.jpg';
import heroImage from '../assets/hero/hero-1-800.webp';
import '../features/affiliates/Affiliate.css';

export function LoginAdmin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [user, authLoading] = useAuthState(auth);
  const submission = useRef(false);
  const passwordRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  if (user && !authLoading) return <Navigate to="/admin" replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submission.current) return;
    submission.current = true; setBusy(true); setError('');
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      navigate('/admin', { replace: true });
    } catch {
      setError('Confira o e-mail e a senha e tente novamente.');
      passwordRef.current?.focus();
    } finally { submission.current = false; setBusy(false); }
  };

  return (
    <main className="aff-auth-page aff-auth-page--login aff-auth-page--admin" id="conteudo-principal" tabIndex={-1}>
      <div className="aff-auth-shell">
        <aside className="aff-auth-story" style={{ backgroundImage: 'linear-gradient(180deg, #33241722, #2d2112ed), url(' + heroImage + ')' }}>
          <span className="aff-eyebrow"><FaLeaf aria-hidden="true" /> Gestão Vagafogo</span>
          <div><h2>Reservas em um só lugar.</h2><p>Agenda, atendimento e organização de cada visita.</p></div>
        </aside>
        <section className="aff-auth-card" aria-labelledby="admin-login-title">
          <a href="/" className="aff-brand"><img src={logo} alt="Vagafogo" /><span>Vagafogo<small>Painel administrativo</small></span></a>
          <h1 id="admin-login-title">Acesso administrativo</h1>
          <p>Entre para gerenciar as reservas.</p>
          <form className="aff-form" onSubmit={(event) => void submit(event)} aria-busy={busy || authLoading}>
            {error && <p className="aff-alert aff-alert--error" id="admin-login-error" role="alert">{error}</p>}
            <label>E-mail do administrador<input type="email" autoComplete="username" autoCapitalize="none" spellCheck={false} value={email} onChange={(event) => { setEmail(event.target.value); setError(''); }} aria-invalid={Boolean(error)} aria-describedby={error ? 'admin-login-error' : undefined} required /></label>
            <div className="aff-field"><label htmlFor="admin-password">Senha</label><div className="aff-password-field"><input id="admin-password" ref={passwordRef} type={visible ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => { setPassword(event.target.value); setError(''); }} aria-invalid={Boolean(error)} aria-describedby={error ? 'admin-login-error' : undefined} required /><button type="button" aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={visible} onClick={() => setVisible((value) => !value)}>{visible ? <FaEyeSlash aria-hidden="true" /> : <FaEye aria-hidden="true" />}</button></div></div>
            <button type="submit" className="aff-button" disabled={busy || authLoading}>{authLoading ? 'Verificando acesso…' : busy ? 'Entrando…' : <>Entrar no painel <FaArrowRight aria-hidden="true" /></>}</button>
          </form>
          <p className="aff-help"><FaLock aria-hidden="true" /> Acesso restrito à equipe autorizada.</p>
        </section>
      </div>
    </main>
  );
}
