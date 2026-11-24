import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { FaLeaf } from 'react-icons/fa';
import { auth } from '../../firebase';
import logo from '../assets/logo.jpg';
import { useAffiliateSession } from '../features/affiliates/AffiliateAccess';
import { affiliateHome } from '../features/affiliates/affiliateUtils';
import '../features/affiliates/Affiliate.css';

export function AffiliateLogin() {
  const { user, profile, loading, error: profileError, retry } = useAffiliateSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (profile && !loading) return <Navigate to={affiliateHome(profile.identity.role)} replace />;
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setError(''); setBusy(true);
    try { await signInWithEmailAndPassword(auth, email.trim(), password); }
    catch { setError('Confira o e-mail e a senha e tente novamente.'); }
    finally { setBusy(false); }
  };
  return (
    <main className="aff-auth-page" id="conteudo-principal" tabIndex={-1}>
      <section className="aff-auth-card">
        <a href="/" className="aff-brand"><img src={logo} alt="Vagafogo" /><span>Vagafogo<small><FaLeaf /> Agências e parceiros</small></span></a>
        <h1>Entre no seu painel</h1>
        <p>Acompanhe as reservas indicadas por você ou pela sua agência.</p>
        {loading ? <p role="status" className="aff-empty">Verificando acesso…</p> : user ? (
          <div className="aff-form"><p className="aff-alert aff-alert--error" role="alert">{profileError?.message || 'Sua conta ainda não possui um acesso habilitado.'}</p>
            <button type="button" className="aff-button" onClick={retry}>Verificar novamente</button>
            <button type="button" className="aff-button aff-button--secondary" onClick={() => void signOut(auth)}>Entrar com outra conta</button>
          </div>
        ) : (
          <form className="aff-form" onSubmit={(event) => void submit(event)}>
            {error && <p className="aff-alert aff-alert--error" role="alert">{error}</p>}
            <label>E-mail<input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
            <label>Senha<input type={visible ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
            <label className="aff-checkbox"><input type="checkbox" checked={visible} onChange={(event) => setVisible(event.target.checked)} /> Mostrar senha</label>
            <button type="submit" className="aff-button" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
          </form>
        )}
        <p className="aff-help">Primeiro acesso? Abra o link de ativação recebido do responsável pelo seu cadastro.</p>
      </section>
    </main>
  );
}
