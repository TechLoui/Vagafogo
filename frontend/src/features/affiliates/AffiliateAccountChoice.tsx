import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../../firebase';
import { affiliateHome } from './affiliateUtils';
import type { AffiliateIdentity } from './types';

export function AffiliateAccountChoice({ identity, email, onRetry, onSignedOut }: {
  identity?: AffiliateIdentity;
  email?: string | null;
  onRetry?: () => void;
  onSignedOut?: () => void;
}) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const switching = useRef(false);
  const accountEmail = identity?.email || email;
  const switchAccount = async () => {
    if (switching.current) return;
    switching.current = true;
    setBusy(true);
    setError('');
    try {
      await signOut(auth);
      onSignedOut?.();
    } catch {
      setError('Não foi possível sair da conta. Tente novamente.');
    } finally {
      switching.current = false;
      setBusy(false);
    }
  };

  return (
    <div className="aff-form" aria-busy={busy}>
      {identity && <p>Você está conectado com uma conta de {{ admin: 'administrador', agency: 'agência', partner: 'parceiro' }[identity.role]}.</p>}
      {accountEmail && <p style={{ overflowWrap: 'anywhere' }}>{accountEmail}</p>}
      {error && <p className="aff-alert aff-alert--error" role="alert">{error}</p>}
      {identity && <button type="button" className="aff-button" disabled={busy} onClick={() => navigate(affiliateHome(identity.role), { replace: true })}>Continuar no meu painel</button>}
      {onRetry && <button type="button" className="aff-button" disabled={busy} onClick={onRetry}>Verificar novamente</button>}
      <button type="button" className="aff-button aff-button--secondary" disabled={busy} onClick={() => void switchAccount()}>{busy ? 'Saindo…' : 'Entrar com outra conta'}</button>
    </div>
  );
}
