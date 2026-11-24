import { useState } from 'react';
import './AgencyReservationBadge.css';

const API_BASE = (import.meta.env.VITE_API_BASE || 'https://vagafogo-production.up.railway.app').replace(/\/+$/, '');

// A reservation stores the server-validated agency identity. Its current logo is
// public branding served by the API, never a client-supplied external image URL.
export function AgencyReservationBadge({ attribution }: { attribution?: unknown }) {
  const raw = attribution && typeof attribution === 'object' ? attribution as Record<string, unknown> : null;
  const agencyId = typeof raw?.agencyId === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(raw.agencyId) ? raw.agencyId : '';
  const name = typeof raw?.agencyName === 'string' ? raw.agencyName.trim().slice(0, 160) : '';
  const partner = typeof raw?.partnerName === 'string' ? raw.partnerName.trim().slice(0, 160) : '';
  const [failedAgency, setFailedAgency] = useState('');
  if (!agencyId) return null;
  const label = name || 'Agência parceira';
  const description = `Agência: ${label}${partner ? ` · Parceiro: ${partner}` : ''}`;
  return <span className="agency-reservation-badge" title={description} aria-label={description}>
    <span className="agency-reservation-badge__logo" aria-hidden="true">
      {failedAgency !== agencyId
        ? <img src={`${API_BASE}/api/affiliates/public/agencies/${encodeURIComponent(agencyId)}/logo`} alt="" loading="lazy"
          onError={() => setFailedAgency(agencyId)} />
        : <span>{label.split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase()}</span>}
    </span>
    <span className="agency-reservation-badge__name">{label}</span>
  </span>;
}
