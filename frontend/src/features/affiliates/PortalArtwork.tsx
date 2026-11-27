import network from '../../assets/portal/network-v1.webp';
import reservations from '../../assets/portal/reservations-v1.webp';
import sharing from '../../assets/portal/sharing-v1.webp';

const illustrations = { network, reservations, sharing };
export function PortalArtwork({ kind, className = '' }: { kind: keyof typeof illustrations; className?: string }) {
  return <img className={`portal-artwork ${className}`} src={illustrations[kind]} alt="" aria-hidden="true" loading="lazy" decoding="async" width={96} height={96} />;
}
