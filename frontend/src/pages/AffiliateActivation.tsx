import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../../firebase';
import logo from '../assets/logo.jpg';
import { claimAffiliateInvitation, getAffiliateInvitation } from '../features/affiliates/affiliateService';
import { affiliateHome } from '../features/affiliates/affiliateUtils';
import type { AffiliateInvitation } from '../features/affiliates/types';
import '../features/affiliates/Affiliate.css';

export function AffiliateActivation() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const [user, authLoading] = useAuthState(auth);
  const [invitation, setInvitation] = useState<AffiliateInvitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [resume, setResume] = useState(false);
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const submission = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setInvitation(null); setPassword(''); setConfirmation(''); setVisible(false);
    void getAffiliateInvitation(token, controller.signal).then((value) => { if (!controller.signal.aborted) setInvitation(value); })
      .catch((caught) => { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : 'Não foi possível abrir a ativação.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [token]);
  const matchingUser = user && invitation && user.email?.toLowerCase() === invitation.email.toLowerCase();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!invitation || submission.current) return;
    if (!user && (!password || (!resume && password !== confirmation))) { setError('Confira a senha e a confirmação.'); return; }
    if (user && !matchingUser) { setError('Saia da conta atual para ativar o e-mail deste convite.'); return; }
    submission.current = true; setBusy(true); setError('');
    try {
      if (!auth.currentUser) {
        if (resume) await signInWithEmailAndPassword(auth, invitation.email, password);
        else await createUserWithEmailAndPassword(auth, invitation.email, password);
      }
      const { membership } = await claimAffiliateInvitation(token);
      await auth.currentUser?.getIdToken(true);
      navigate(affiliateHome(membership.role), { replace: true });
    } catch (caught) {
      const code = caught && typeof caught === 'object' && 'code' in caught ? String(caught.code) : '';
      setError(code === 'auth/email-already-in-use'
        ? 'Este e-mail já iniciou um cadastro. Use “Retomar ativação” com a senha definida anteriormente.'
        : code.startsWith('auth/') ? 'Não foi possível concluir o acesso. Confira a senha e tente novamente.'
          : caught instanceof Error ? caught.message : 'Não foi possível ativar o acesso.');
    } finally { submission.current = false; setBusy(false); }
  };

  return (
    <main className="aff-auth-page" id="conteudo-principal" tabIndex={-1}>
      <section className="aff-auth-card">
        <a href="/" className="aff-brand"><img src={logo} alt="Vagafogo" /><span>Vagafogo<small>Ativação de acesso</small></span></a>
        <h1>Ative seu painel</h1>
        {loading || authLoading ? <p className="aff-empty" role="status">Conferindo convite…</p> : (
          <>
            {error && <p className="aff-alert aff-alert--error" role="alert">{error}</p>}
            {invitation ? (
              <form className="aff-form" onSubmit={(event) => void submit(event)} aria-busy={busy}>
                <div className="aff-invitation"><strong>{invitation.name}</strong><span>{invitation.email}</span></div>
                {user && !matchingUser ? <button type="button" className="aff-button aff-button--secondary" onClick={() => void signOut(auth)}>Sair da conta atual</button> : (
                  <>
                    {!user && <><label>{resume ? 'Senha definida anteriormente' : 'Defina sua senha'}<input type={visible ? 'text' : 'password'} autoComplete={resume ? 'current-password' : 'new-password'} minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} aria-describedby="activation-password-help" required /></label>
                      {!resume && <label>Confirme a senha<input type={visible ? 'text' : 'password'} autoComplete="new-password" minLength={6} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required /></label>}
                      <p id="activation-password-help" className="aff-help">Use pelo menos 6 caracteres.</p>
                      <label className="aff-checkbox"><input type="checkbox" checked={visible} onChange={(event) => setVisible(event.target.checked)} />Mostrar senhas</label>
                    </>}
                    <button className="aff-button" type="submit" disabled={busy}>{busy ? 'Ativando…' : user ? 'Concluir ativação' : resume ? 'Retomar ativação' : 'Criar senha e ativar'}</button>
                    {!user && <button type="button" className="aff-text-button" onClick={() => { setResume((value) => !value); setError(''); }}>{resume ? 'Definir uma nova conta' : 'Já comecei esta ativação'}</button>}
                  </>
                )}
              </form>
            ) : <Link className="aff-button" to="/afiliados/login">Ir para o login</Link>}
          </>
        )}
      </section>
    </main>
  );
}
