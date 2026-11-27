import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Seo } from '../components/Seo';
import { agencySlugFromPath, prepareAgencyReferral, type AffiliateReferral } from '../features/affiliateReferral';
import logo from '../assets/logo.jpg';
import { Reserva } from './Reserva';
import { NotFound } from './NotFound';
import './AgencyReferral.css';

export function AgencyReferral() {
  const { agencySlug = '' } = useParams();
  const slug = agencySlugFromPath(`/${agencySlug}`);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ slug: string; referral?: AffiliateReferral; error?: string } | null>(null);
  useEffect(() => {
    let active = true;
    void prepareAgencyReferral(slug || agencySlug).then((referral) => {
      if (active && referral && slug) setResult({ slug, referral });
      else if (active) setResult({ slug: slug || agencySlug, error: 'Não foi possível validar este endereço. Confira o link com a agência.' });
    }).catch((caught) => {
      if (active) setResult({ slug: slug || agencySlug, error: caught instanceof Error ? caught.message : 'Não foi possível abrir este link agora.' });
    });
    return () => { active = false; };
  }, [slug, agencySlug, attempt]);

  if (!slug) return <NotFound />;
  const current = result?.slug === slug ? result : null;
  return <>
    <Seo path={`/${slug}`} title={`${current?.referral?.agencyName || 'Reserva com agência'} | Vagafogo`} description="Reserve sua experiência no Santuário Vagafogo com a indicação da sua agência." noindex />
    {current?.referral ? <Reserva agencyReferral={current.referral} /> : <main className="agency-referral-state" id="conteudo-principal" tabIndex={-1}>
      <div><img src={logo} alt="Vagafogo" width={72} height={72} />
        {current?.error ? <><span>RESERVA COM AGÊNCIA</span><h1>Vamos conferir esse link.</h1><p role="alert">{current.error}</p><button type="button" onClick={() => { setResult(null); setAttempt((value) => value + 1); }}>Tentar novamente</button><Link to="/">Voltar ao site</Link></> : <div role="status"><span>RESERVA COM AGÊNCIA</span><h1>Preparando sua experiência…</h1><p>Estamos conferindo a indicação para abrir o formulário.</p></div>}
      </div>
    </main>}
  </>;
}
