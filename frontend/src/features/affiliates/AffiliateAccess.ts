import { createContext, useContext, useEffect, useState } from 'react';
import { onIdTokenChanged, type User } from 'firebase/auth';
import { auth } from '../../../firebase';
import { getAffiliateProfile } from './affiliateService';
import type { AffiliateProfile } from './types';

export const AffiliateProfileContext = createContext<AffiliateProfile | null>(null);

export function useAffiliateProfile() {
  const profile = useContext(AffiliateProfileContext);
  if (!profile) throw new Error('O perfil de acesso ainda não foi carregado.');
  return profile;
}

export function useAffiliateSession() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AffiliateProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let disposed = false;
    let version = 0;
    const load = async (current: User | null) => {
      const requestVersion = ++version;
      setUser(current);
      setProfile((previous) => current && previous?.identity.uid === current.uid ? previous : null);
      setError(null);
      if (!current) { setLoading(false); return; }
      setLoading(true);
      try {
        const result = await getAffiliateProfile();
        if (result.identity.uid !== current.uid) throw new Error('O perfil recebido não corresponde à conta atual.');
        if (!disposed && version === requestVersion) setProfile(result);
      } catch (caught) {
        if (!disposed && version === requestVersion) {
          setProfile(null);
          setError(caught instanceof Error ? caught : new Error('Não foi possível verificar seu acesso.'));
        }
      } finally {
        if (!disposed && version === requestVersion) setLoading(false);
      }
    };
    const unsubscribe = onIdTokenChanged(auth, (current) => { void load(current); });
    const timer = window.setInterval(() => { if (auth.currentUser) void load(auth.currentUser); }, 25 * 60_000);
    return () => { disposed = true; version++; unsubscribe(); window.clearInterval(timer); };
  }, [attempt]);

  return { user, profile, loading, error, retry: () => setAttempt((value) => value + 1) };
}
