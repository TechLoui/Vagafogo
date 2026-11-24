import { useState } from 'react';

export function AgencyLogo({ url, name, className = '' }: { url?: string | null; name: string; className?: string }) {
  const [failedUrl, setFailedUrl] = useState('');
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => Array.from(part)[0] ?? '').join('').toUpperCase();
  return (
    <span className={`aff-agency-logo ${className}`} aria-hidden={!url || failedUrl === url ? true : undefined}>
      {url && failedUrl !== url ? <img src={url} alt={`Logo de ${name}`} loading="lazy" onError={() => setFailedUrl(url)} /> : <span>{initials || 'A'}</span>}
    </span>
  );
}
