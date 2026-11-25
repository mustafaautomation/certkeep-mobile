import type {
  Alert,
  CapturedFile,
  Extraction,
  Membership,
  PersonDetail,
  RequirementDetail,
  Session,
  SubmitDocumentInput,
  VaultSnapshot,
  VendorDetail,
} from '@/domain/types';

export interface CertkeepRepository {
  readonly mode: 'mock' | 'supabase';
  hydrate(): Promise<void>;
  getSession(): Promise<Session | null>;
  signInWithPassword(email: string, password: string): Promise<Session>;
  requestMagicLink(email: string): Promise<{ email: string; previewToken: string | null }>;
  consumeMagicLink(token: string): Promise<Session>;
  signInDemo(): Promise<Session>;
  signOut(): Promise<void>;
  listMemberships(): Promise<Membership[]>;
  getActiveOrganizationId(): Promise<string | null>;
  setActiveOrganizationId(organizationId: string): Promise<void>;
  getVault(organizationId: string): Promise<VaultSnapshot>;
  getPerson(organizationId: string, personId: string): Promise<PersonDetail>;
  getVendor(organizationId: string, vendorId: string): Promise<VendorDetail>;
  getRequirement(organizationId: string, requirementId: string): Promise<RequirementDetail>;
  extractDocument(input: { file: CapturedFile; holderHint?: string }): Promise<Extraction>;
  submitDocument(input: SubmitDocumentInput): Promise<RequirementDetail>;
  reviewDocument(input: {
    organizationId: string;
    documentId: string;
    decision: 'approved' | 'rejected';
    note?: string;
  }): Promise<RequirementDetail>;
  markAlertRead(alertId: string): Promise<Alert>;
  setOffline(offline: boolean): Promise<void>;
  isOffline(): Promise<boolean>;
}
