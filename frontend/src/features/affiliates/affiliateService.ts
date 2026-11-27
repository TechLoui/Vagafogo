import { auth } from '../../../firebase';
import type {
  AffiliateActivationLink, AffiliateEntity, AffiliateEntityInput, AffiliateInvitation,
  AffiliateLink, AffiliatePage, AffiliateProfile, AffiliateReportQuery, AffiliateSale, AffiliateSummary, AgencyBranding,
} from './types';

const API_BASE = (import.meta.env.VITE_API_BASE || 'https://vagafogo-production.up.railway.app').replace(/\/+$/, '');
const BASE = `${API_BASE}/api/affiliates`;
const errorMessages: Record<string, string> = {
  AFFILIATES_NOT_ENABLED: 'O painel de afiliados está preparado e aguarda a ativação pela administração.',
  AFFILIATE_PERMISSION_REQUIRED: 'Sua conta ainda não possui um perfil autorizado para este painel.',
  AFFILIATE_ACCESS_DISABLED: 'Este acesso foi desabilitado. Fale com o responsável pelo cadastro.',
  AFFILIATE_AGENCY_DISABLED: 'A agência está desabilitada. Fale com a administração.',
  AFFILIATE_ACCOUNT_ALREADY_EXISTS: 'Este e-mail já possui uma conta. Use outro e-mail para o novo acesso.',
  AFFILIATE_ACCOUNT_ALREADY_ASSIGNED: 'Esta conta já está vinculada a outro acesso.',
  AFFILIATE_EMAIL_IN_USE: 'Este e-mail já está vinculado a um cadastro.',
  AFFILIATE_EMAIL_IMMUTABLE: 'O e-mail de um acesso já ativado não pode ser alterado.',
  AFFILIATE_ACTIVATION_EXPIRED: 'Este link de ativação expirou. Solicite um novo link ao responsável pelo cadastro.',
  AFFILIATE_ACTIVATION_INVALID: 'Este link de ativação é inválido. Solicite um novo link ao responsável pelo cadastro.',
  AFFILIATE_ACTIVATION_UNAVAILABLE: 'Esta ativação não está disponível. Solicite um novo link ao responsável pelo cadastro.',
  AFFILIATE_ACTIVATION_ACCOUNT_MISMATCH: 'Use o e-mail e a conta criados para este convite. Uma conta anterior não pode ser vinculada.',
  AFFILIATE_COMMISSION_INVALID: 'Confira a comissão e use no máximo duas casas decimais.',
  AFFILIATE_COMMISSION_INHERITED: 'A comissão deste parceiro segue a regra da agência.',
  AFFILIATE_BRANDING_INVALID: 'Não foi possível reconhecer as cores da marca. Escolha a imagem novamente e salve.',
  AFFILIATE_SLUG_INVALID: 'Use de 3 a 60 letras minúsculas, números e hífens entre as palavras.',
  AFFILIATE_SLUG_RESERVED: 'Esse endereço é usado pelo site. Escolha outro nome para sua agência.',
  AFFILIATE_SLUG_IN_USE: 'Esse endereço já está reservado. Escolha outra combinação para sua agência.',
  AFFILIATE_SERVICE_UNAVAILABLE: 'O serviço está temporariamente indisponível. Tente novamente.',
  AFFILIATE_RATE_LIMIT: 'Aguarde um minuto antes de tentar novamente.',
  AFFILIATE_FILTER_INVALID: 'Confira os filtros e use até 120 caracteres na busca.',
};

export class AffiliateApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = 'AffiliateApiError';
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, init: RequestInit = {}, publicRequest = false): Promise<T> {
  const execute = async (refresh: boolean) => {
    const headers = new Headers(init.headers);
    headers.set('Accept', 'application/json');
    if (init.body) headers.set('Content-Type', 'application/json');
    if (!publicRequest) {
      const user = auth.currentUser;
      if (!user) throw new AffiliateApiError('Entre na sua conta para continuar.', 401, 'AUTH_REQUIRED');
      headers.set('Authorization', `Bearer ${await user.getIdToken(refresh)}`);
    }
    let response: Response;
    try {
      response = await fetch(`${BASE}${path}`, { ...init, headers, cache: 'no-store' });
    } catch (error) {
      if (init.signal?.aborted) throw error;
      throw new AffiliateApiError('Não foi possível conectar ao serviço. Confira sua conexão e tente novamente.', 503, 'AFFILIATE_NETWORK_ERROR');
    }
    const body = await response.json().catch(() => ({}));
    return { response, body };
  };
  let result = await execute(false);
  if (result.response.status === 401 && !publicRequest) result = await execute(true);
  if (!result.response.ok) {
    const code = typeof result.body.code === 'string' ? result.body.code : '';
    const message = typeof result.body.error === 'string' ? result.body.error : typeof result.body.message === 'string' ? result.body.message : '';
    throw new AffiliateApiError(
      errorMessages[code] || (message && !/^AFFILIATE_/.test(message) ? message : 'Não foi possível concluir a operação. Confira os dados e tente novamente.'),
      result.response.status,
      code,
    );
  }
  return result.body as T;
}

const queryString = (values: Record<string, string | number | undefined>) => {
  const query = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => { if (value !== undefined && value !== '') query.set(key, String(value)); });
  return query.size ? `?${query}` : '';
};

export const getAffiliateProfile = async () => {
  const profile = await request<AffiliateProfile>('/me');
  if (!profile.identity || !profile.identity.uid || !['admin', 'agency', 'partner'].includes(profile.identity.role)
    || (profile.identity.role === 'agency' && !profile.identity.agencyId)
    || (profile.identity.role === 'partner' && !profile.identity.partnerId)) {
    throw new Error('O perfil de acesso recebido é inválido.');
  }
  return profile;
};

export const listAffiliateEntities = (kind: 'agencies' | 'partners', agencyId?: string | null, cursor?: string) =>
  request<AffiliatePage<AffiliateEntity>>(`/${kind}${queryString({ agencyId: agencyId === null ? 'null' : agencyId, cursor, limit: 25 })}`);

export const saveAffiliateEntity = (kind: 'agencies' | 'partners', input: AffiliateEntityInput, id?: string) =>
  request<{ item: AffiliateEntity }>(`/${kind}${id ? `/${encodeURIComponent(id)}` : ''}`, {
    method: id ? 'PATCH' : 'POST', body: JSON.stringify(input),
  });

export const saveAgencyLogo = (id: string, dataUrl: string | null, branding?: AgencyBranding | null) =>
  request<{ item: AffiliateEntity }>(`/agencies/${encodeURIComponent(id)}/logo`, dataUrl === null
    ? { method: 'DELETE' } : { method: 'POST', body: JSON.stringify({ dataUrl, ...(branding ? { branding } : {}) }) });

export const createAffiliateActivation = (kind: 'agencies' | 'partners', id: string) =>
  request<AffiliateActivationLink>(`/${kind}/${encodeURIComponent(id)}/activation`, { method: 'POST' });

export const getAffiliateInvitation = (token: string, signal?: AbortSignal) =>
  request<AffiliateInvitation>(`/activation/${encodeURIComponent(token)}`, { signal }, true);

export const claimAffiliateInvitation = (token: string) =>
  request<{ membership: AffiliateProfile['identity'] }>(`/activation/${encodeURIComponent(token)}`, { method: 'POST' });

export const getAffiliateSummary = (query: AffiliateReportQuery, signal?: AbortSignal) =>
  request<AffiliateSummary>(`/summary${queryString(query)}`, { signal });

export const getAffiliateSales = (query: AffiliateReportQuery, cursor?: string, signal?: AbortSignal, limit = 25) =>
  request<AffiliatePage<AffiliateSale>>(`/sales${queryString({ ...query, cursor, limit })}`, { signal });

export const getAffiliateLinks = () => request<AffiliatePage<AffiliateLink>>('/links');

export const saveAgencyOfficialLink = (agencyId: string, slug: string) =>
  request<{ item: AffiliateLink }>(`/agencies/${encodeURIComponent(agencyId)}/link`, {
    method: 'POST', body: JSON.stringify({ slug }),
  });
