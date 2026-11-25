export type AffiliateRole = 'admin' | 'agency' | 'partner';
export type AffiliateStatus = 'active' | 'disabled';
export type CommissionRule = { mode: 'percent' | 'fixed'; value: number };

export type AffiliateIdentity = {
  uid: string;
  email?: string;
  role: AffiliateRole;
  agencyId: string | null;
  partnerId: string | null;
};

export type AffiliateEntity = {
  id: string;
  name: string;
  email: string;
  status: AffiliateStatus;
  agencyId?: string | null;
  commissionRule?: CommissionRule | null;
  createdAt?: string;
  updatedAt?: string;
  logoUrl?: string | null;
  logoVersion?: string;
  logoUpdatedAt?: string;
};

export type AffiliateProfile = {
  identity: AffiliateIdentity;
  agency?: AffiliateEntity;
  partner?: AffiliateEntity;
};

export type AffiliateEntityInput = {
  name: string;
  email: string;
  status: AffiliateStatus;
  agencyId?: string | null;
  commissionRule?: CommissionRule | null;
};

export type AffiliatePage<T> = { items: T[]; nextCursor: string | null };
export type AffiliateActivationLink = { url: string; expiresAt: string };
export type AffiliateInvitation = {
  name: string;
  email: string;
  role: 'agency' | 'partner';
  expiresAt: string;
};

export type AffiliateLink = {
  id: string;
  partnerId: string;
  label: string;
  status: AffiliateStatus;
  url: string;
  createdAt?: string;
};

export type AffiliateSale = {
  id: string;
  reservationCode?: string;
  createdAt?: string | null;
  paymentMethod?: 'PIX' | 'CREDIT_CARD' | 'MANUAL' | null;
  guestCount?: number | null;
  time?: string | null;
  date: string;
  activity: string;
  status: string;
  value: number;
  paidAt: string | null;
  partnerId: string;
  partnerName: string;
  agencyId: string | null;
  agencyName?: string | null;
  agencyLogoUrl?: string | null;
  commission?: number | null;
  commissionRule?: CommissionRule | null;
};

export type AffiliateSummary = {
  paidCount: number;
  pendingCount: number;
  cancelledCount: number;
  revenue: number;
  commission?: number | null;
  commissionConfigured?: boolean;
  currency: 'BRL';
};

export type AffiliateReportQuery = {
  from: string;
  to: string;
  agencyId?: string;
  partnerId?: string;
  q?: string;
  status?: 'paid' | 'pending' | 'cancelled';
  paymentMethod?: 'PIX' | 'CREDIT_CARD' | 'MANUAL';
};
