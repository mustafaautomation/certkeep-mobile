export type Role = 'owner' | 'admin' | 'compliance_manager' | 'employee' | 'vendor';

export type Plan = 'trial' | 'pro';

export type SubjectType = 'person' | 'vendor';

export type RequirementStatus = 'compliant' | 'expiring' | 'expired' | 'missing';

export type DocumentType =
  | 'certificate_of_insurance'
  | 'general_liability'
  | 'workers_compensation'
  | 'auto_liability'
  | 'professional_license'
  | 'drivers_license'
  | 'osha_card'
  | 'certification';

export type DocumentReview = 'submitted' | 'approved' | 'rejected';

export type AlertWindow = 30 | 14 | 7;

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: Plan;
  stripeCustomerId: string | null;
  createdAt: string;
}

export interface Membership {
  id: string;
  organizationId: string;
  userId: string;
  role: Role;
  displayName: string;
  email: string;
  organization: Organization;
}

export interface Session {
  userId: string;
  email: string;
  displayName: string;
}

export interface Person {
  id: string;
  organizationId: string;
  memberUserId: string | null;
  fullName: string;
  email: string;
  title: string;
  trade: string | null;
}

export interface Vendor {
  id: string;
  organizationId: string;
  memberUserId: string | null;
  name: string;
  trade: string;
  contactName: string;
  contactEmail: string;
}

export interface Requirement {
  id: string;
  organizationId: string;
  name: string;
  documentType: DocumentType;
  personId: string | null;
  vendorId: string | null;
  notes: string | null;
}

export interface VaultDocument {
  id: string;
  organizationId: string;
  requirementId: string;
  uploadedByUserId: string;
  fileName: string;
  mimeType: string;
  storagePath: string | null;
  documentType: DocumentType;
  documentNumber: string;
  issuer: string;
  holderName: string;
  issuedOn: string | null;
  expiresOn: string | null;
  confidence: number;
  status: DocumentReview;
  reviewNote: string | null;
  createdAt: string;
}

export interface Alert {
  id: string;
  organizationId: string;
  requirementId: string;
  recipientUserId: string;
  windowDays: AlertWindow;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

export interface Extraction {
  documentType: DocumentType;
  documentNumber: string;
  issuer: string;
  holderName: string;
  issuedOn: string | null;
  expiresOn: string | null;
  confidence: number;
}

export interface RequirementRow {
  requirementId: string;
  name: string;
  documentType: DocumentType;
  subjectType: SubjectType;
  subjectId: string;
  subjectName: string;
  status: RequirementStatus;
  expiresOn: string | null;
  daysRemaining: number | null;
  review: 'pending' | 'approved' | 'none';
  documentNumber: string | null;
}

export interface ComplianceSummary {
  compliant: number;
  expiring: number;
  expired: number;
  missing: number;
}

export interface VaultSnapshot {
  organizationId: string;
  summary: ComplianceSummary;
  rows: RequirementRow[];
  people: Person[];
  vendors: Vendor[];
  alerts: Alert[];
  fromCache: boolean;
  fetchedAt: string;
}

export interface RequirementDetail {
  requirement: Requirement;
  row: RequirementRow;
  documents: VaultDocument[];
  canUpload: boolean;
  canReview: boolean;
  fromCache: boolean;
}

export interface PersonDetail {
  person: Person;
  rows: RequirementRow[];
  fromCache: boolean;
}

export interface VendorDetail {
  vendor: Vendor;
  rows: RequirementRow[];
  fromCache: boolean;
}

export interface SubmitDocumentInput {
  organizationId: string;
  requirementId: string;
  fileName: string;
  mimeType: string;
  uri: string | null;
  documentType: DocumentType;
  documentNumber: string;
  issuer: string;
  holderName: string;
  issuedOn: string | null;
  expiresOn: string;
}

export interface CapturedFile {
  fileName: string;
  mimeType: string;
  uri: string | null;
}
