import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import { extractDocumentFields } from '@/domain/extraction';
import { projectRequirement, projectRows } from '@/domain/project';
import { canUploadRequirement, isManager, visibleRequirement } from '@/domain/roles';
import type {
  Alert,
  AlertWindow,
  DocumentReview,
  DocumentType,
  Membership,
  Organization,
  Person,
  Plan,
  Requirement,
  RequirementDetail,
  Role,
  SubmitDocumentInput,
  VaultDocument,
  VaultSnapshot,
  Vendor,
} from '@/domain/types';
import { VaultError } from '@/data/errors';
import type { CertkeepRepository } from '@/data/repository';
import type { KeyValueStore } from '@/data/storage';

const ORG_KEY = 'certkeep.org.v1';

/**
 * Talks to the same Postgres project as the Certkeep web app.
 * The anon key is the only credential. Row Level Security is the boundary.
 * Never put a service-role key in this app.
 */
export function createSupabaseRepository(options: {
  url: string;
  anonKey: string;
  store: KeyValueStore;
  now?: () => Date;
}): CertkeepRepository {
  const now = options.now ?? (() => new Date());
  const supabase = createClient(options.url, options.anonKey, {
    auth: {
      storage: options.store,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === 'web',
    },
  });

  async function requireUser() {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw new VaultError('Sign in to open the vault.', 'auth');
    return data.user;
  }

  async function membershipsFor(userId: string): Promise<Membership[]> {
    const { data, error } = await supabase
      .from('members')
      .select(
        'id, organization_id, user_id, role, display_name, email, organizations ( id, name, slug, plan, stripe_customer_id, created_at )',
      )
      .eq('user_id', userId);
    if (error) throw new VaultError(error.message, 'network');
    return (data ?? []).map((row) => mapMembership(row as MemberQueryRow));
  }

  return {
    mode: 'supabase',
    async hydrate() {
      await supabase.auth.getSession();
    },
    async getSession() {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) return null;
      const memberships = await membershipsFor(user.id);
      const named = memberships[0];
      return {
        userId: user.id,
        email: user.email ?? named?.email ?? '',
        displayName: named?.displayName ?? user.email ?? 'Certkeep user',
      };
    },
    async signInWithPassword(email, password) {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error || !data.user) throw new VaultError(error?.message ?? 'Sign-in failed.', 'auth');
      const memberships = await membershipsFor(data.user.id);
      const active = memberships[0];
      if (active) await options.store.setItem(ORG_KEY, active.organizationId);
      return {
        userId: data.user.id,
        email: data.user.email ?? email.trim(),
        displayName: active?.displayName ?? data.user.email ?? 'Certkeep user',
      };
    },
    async requestMagicLink(email) {
      const redirect = LinkingLike.redirect();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: redirect },
      });
      if (error) throw new VaultError(error.message, 'auth');
      return { email: email.trim(), previewToken: null };
    },
    async consumeMagicLink(token) {
      const { data, error } = await supabase.auth.verifyOtp({ token_hash: token, type: 'magiclink' });
      if (error || !data.user) throw new VaultError(error?.message ?? 'That sign-in link is invalid.', 'auth');
      const memberships = await membershipsFor(data.user.id);
      return {
        userId: data.user.id,
        email: data.user.email ?? '',
        displayName: memberships[0]?.displayName ?? data.user.email ?? 'Certkeep user',
      };
    },
    async signInDemo() {
      throw new VaultError('The seeded demo is available when Supabase keys are not set.', 'validation');
    },
    async signOut() {
      await supabase.auth.signOut();
      await options.store.removeItem(ORG_KEY);
    },
    async listMemberships() {
      const user = await requireUser();
      return membershipsFor(user.id);
    },
    async getActiveOrganizationId() {
      return options.store.getItem(ORG_KEY);
    },
    async setActiveOrganizationId(organizationId) {
      const user = await requireUser();
      const memberships = await membershipsFor(user.id);
      if (!memberships.some((item) => item.organizationId === organizationId)) {
        throw new VaultError('That workspace is not on this account.', 'forbidden');
      }
      await options.store.setItem(ORG_KEY, organizationId);
    },
    async getVault(organizationId) {
      const user = await requireUser();
      const membership = (await membershipsFor(user.id)).find((item) => item.organizationId === organizationId);
      if (!membership) throw new VaultError('That workspace is not on this account.', 'forbidden');
      const [people, vendors, requirements, documents, alerts] = await Promise.all([
        selectPeople(supabase, organizationId),
        selectVendors(supabase, organizationId),
        selectRequirements(supabase, organizationId),
        selectDocuments(supabase, organizationId),
        selectAlerts(supabase, organizationId, user.id),
      ]);
      const visible = requirements.filter((requirement) => visibleRequirement(requirement, membership, people, vendors));
      const projected = projectRows({ requirements: visible, documents, people, vendors, now: now() });
      const snapshot: VaultSnapshot = {
        organizationId,
        summary: projected.summary,
        rows: projected.rows,
        people: isManager(membership.role) ? people : people.filter((person) => person.memberUserId === user.id),
        vendors: isManager(membership.role) ? vendors : vendors.filter((vendor) => vendor.memberUserId === user.id),
        alerts,
        fromCache: false,
        fetchedAt: now().toISOString(),
      };
      return snapshot;
    },
    async getPerson(organizationId, personId) {
      const user = await requireUser();
      const membership = (await membershipsFor(user.id)).find((item) => item.organizationId === organizationId);
      if (!membership) throw new VaultError('That workspace is not on this account.', 'forbidden');
      const people = await selectPeople(supabase, organizationId);
      const person = people.find((item) => item.id === personId);
      if (!person) throw new VaultError('That person is not in this workspace.', 'not_found');
      const vendors = await selectVendors(supabase, organizationId);
      const requirements = (await selectRequirements(supabase, organizationId)).filter(
        (requirement) => requirement.personId === personId && visibleRequirement(requirement, membership, people, vendors),
      );
      const documents = await selectDocuments(supabase, organizationId);
      const projected = projectRows({ requirements, documents, people, vendors, now: now() });
      return { person, rows: projected.rows, fromCache: false };
    },
    async getVendor(organizationId, vendorId) {
      const user = await requireUser();
      const membership = (await membershipsFor(user.id)).find((item) => item.organizationId === organizationId);
      if (!membership) throw new VaultError('That workspace is not on this account.', 'forbidden');
      const vendors = await selectVendors(supabase, organizationId);
      const vendor = vendors.find((item) => item.id === vendorId);
      if (!vendor) throw new VaultError('That vendor is not in this workspace.', 'not_found');
      const people = await selectPeople(supabase, organizationId);
      const requirements = (await selectRequirements(supabase, organizationId)).filter(
        (requirement) => requirement.vendorId === vendorId && visibleRequirement(requirement, membership, people, vendors),
      );
      const documents = await selectDocuments(supabase, organizationId);
      const projected = projectRows({ requirements, documents, people, vendors, now: now() });
      return { vendor, rows: projected.rows, fromCache: false };
    },
    async getRequirement(organizationId, requirementId) {
      return loadRequirement(supabase, organizationId, requirementId, now);
    },
    async extractDocument({ file, holderHint }) {
      return extractDocumentFields({ fileName: file.fileName, holderHint, now: now() });
    },
    async submitDocument(input: SubmitDocumentInput) {
      const user = await requireUser();
      let storagePath: string | null = null;
      if (input.uri && !input.uri.startsWith('sample://')) {
        const path = `${input.organizationId}/${input.requirementId}/${Date.now()}-${sanitize(input.fileName)}`;
        const body = await fetch(input.uri).then((response) => response.blob());
        const uploaded = await supabase.storage.from('documents').upload(path, body, { contentType: input.mimeType, upsert: false });
        if (uploaded.error) throw new VaultError(uploaded.error.message, 'network');
        storagePath = path;
      }
      const inserted = await supabase
        .from('documents')
        .insert({
          organization_id: input.organizationId,
          requirement_id: input.requirementId,
          uploaded_by: user.id,
          file_name: input.fileName,
          mime_type: input.mimeType,
          storage_path: storagePath,
          document_type: input.documentType,
          document_number: input.documentNumber.trim(),
          issuer: input.issuer.trim(),
          holder_name: input.holderName.trim(),
          issued_on: input.issuedOn,
          expires_on: input.expiresOn,
          confidence: 1,
          status: 'submitted',
        })
        .select('id')
        .single();
      if (inserted.error) throw new VaultError(inserted.error.message, 'network');
      await supabase.rpc('refresh_requirement_alerts', { target: input.requirementId });
      return loadRequirement(supabase, input.organizationId, input.requirementId, now);
    },
    async reviewDocument({ organizationId, documentId, decision, note }) {
      const updated = await supabase
        .from('documents')
        .update({
          status: decision,
          review_note: note?.trim() || (decision === 'rejected' ? 'Please upload a clearer copy.' : null),
        })
        .eq('id', documentId)
        .eq('organization_id', organizationId)
        .select('requirement_id')
        .single();
      if (updated.error || !updated.data) throw new VaultError(updated.error?.message ?? 'Review failed.', 'network');
      const requirementId = String(updated.data.requirement_id);
      await supabase.rpc('refresh_requirement_alerts', { target: requirementId });
      return loadRequirement(supabase, organizationId, requirementId, now);
    },
    async markAlertRead(alertId) {
      const readAt = now().toISOString();
      const updated = await supabase.from('alerts').update({ read_at: readAt }).eq('id', alertId).select('*').single();
      if (updated.error || !updated.data) throw new VaultError(updated.error?.message ?? 'Could not update the reminder.', 'network');
      return mapAlert(updated.data as AlertRow);
    },
    async setOffline() {
      return undefined;
    },
    async isOffline() {
      return false;
    },
  };
}

const LinkingLike = {
  redirect(): string | undefined {
    const configured = process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL;
    if (configured) return configured;
    if (Platform.OS === 'web' && typeof window !== 'undefined') return `${window.location.origin}/auth/callback`;
    return 'certkeep://auth/callback';
  },
};

async function loadRequirement(
  supabase: SupabaseClient,
  organizationId: string,
  requirementId: string,
  now: () => Date,
): Promise<RequirementDetail> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new VaultError('Sign in to open the vault.', 'auth');
  const membership = (
    await supabase
      .from('members')
      .select(
        'id, organization_id, user_id, role, display_name, email, organizations ( id, name, slug, plan, stripe_customer_id, created_at )',
      )
      .eq('user_id', userData.user.id)
      .eq('organization_id', organizationId)
  ).data?.[0];
  if (!membership) throw new VaultError('That workspace is not on this account.', 'forbidden');
  const mappedMembership = mapMembership(membership as MemberQueryRow);
  const [people, vendors, requirements, documents] = await Promise.all([
    selectPeople(supabase, organizationId),
    selectVendors(supabase, organizationId),
    selectRequirements(supabase, organizationId),
    selectDocuments(supabase, organizationId),
  ]);
  const requirement = requirements.find((item) => item.id === requirementId);
  if (!requirement || !visibleRequirement(requirement, mappedMembership, people, vendors)) {
    throw new VaultError('That requirement is not in your vault.', 'not_found');
  }
  const related = documents.filter((document) => document.requirementId === requirementId);
  return {
    requirement,
    row: projectRequirement({ requirement, documents: related, people, vendors, now: now() }),
    documents: related,
    canUpload: canUploadRequirement(requirement, mappedMembership, people, vendors),
    canReview: isManager(mappedMembership.role),
    fromCache: false,
  };
}

function sanitize(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
}

type MemberQueryRow = {
  id: string;
  organization_id: string;
  user_id: string;
  role: Role;
  display_name: string;
  email: string;
  organizations: OrganizationEmbed | OrganizationEmbed[] | null;
};

type OrganizationEmbed = {
  id: string;
  name: string;
  slug: string;
  plan: Plan;
  stripe_customer_id: string | null;
  created_at: string;
};

function mapMembership(row: MemberQueryRow): Membership {
  const org = Array.isArray(row.organizations) ? row.organizations[0] : row.organizations;
  if (!org) throw new VaultError('A membership is missing its organization.', 'network');
  const organization: Organization = {
    id: org.id,
    name: org.name,
    slug: org.slug,
    plan: org.plan,
    stripeCustomerId: org.stripe_customer_id,
    createdAt: org.created_at,
  };
  return {
    id: row.id,
    organizationId: row.organization_id,
    userId: row.user_id,
    role: row.role,
    displayName: row.display_name,
    email: row.email,
    organization,
  };
}

type PersonRow = {
  id: string;
  organization_id: string;
  member_user_id: string | null;
  full_name: string;
  email: string;
  title: string;
  trade: string | null;
};

type VendorRow = {
  id: string;
  organization_id: string;
  member_user_id: string | null;
  name: string;
  trade: string;
  contact_name: string;
  contact_email: string;
};

type RequirementRowDb = {
  id: string;
  organization_id: string;
  name: string;
  document_type: DocumentType;
  person_id: string | null;
  vendor_id: string | null;
  notes: string | null;
};

type DocumentRow = {
  id: string;
  organization_id: string;
  requirement_id: string;
  uploaded_by: string;
  file_name: string;
  mime_type: string;
  storage_path: string | null;
  document_type: DocumentType;
  document_number: string;
  issuer: string;
  holder_name: string;
  issued_on: string | null;
  expires_on: string | null;
  confidence: number;
  status: DocumentReview;
  review_note: string | null;
  created_at: string;
};

type AlertRow = {
  id: string;
  organization_id: string;
  requirement_id: string;
  recipient_user_id: string;
  window_days: AlertWindow;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

function mapPerson(row: PersonRow): Person {
  return {
    id: row.id,
    organizationId: row.organization_id,
    memberUserId: row.member_user_id,
    fullName: row.full_name,
    email: row.email,
    title: row.title,
    trade: row.trade,
  };
}

function mapVendor(row: VendorRow): Vendor {
  return {
    id: row.id,
    organizationId: row.organization_id,
    memberUserId: row.member_user_id,
    name: row.name,
    trade: row.trade,
    contactName: row.contact_name,
    contactEmail: row.contact_email,
  };
}

function mapRequirement(row: RequirementRowDb): Requirement {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    documentType: row.document_type,
    personId: row.person_id,
    vendorId: row.vendor_id,
    notes: row.notes,
  };
}

function mapDocument(row: DocumentRow): VaultDocument {
  return {
    id: row.id,
    organizationId: row.organization_id,
    requirementId: row.requirement_id,
    uploadedByUserId: row.uploaded_by,
    fileName: row.file_name,
    mimeType: row.mime_type,
    storagePath: row.storage_path,
    documentType: row.document_type,
    documentNumber: row.document_number,
    issuer: row.issuer,
    holderName: row.holder_name,
    issuedOn: row.issued_on,
    expiresOn: row.expires_on,
    confidence: Number(row.confidence),
    status: row.status,
    reviewNote: row.review_note,
    createdAt: row.created_at,
  };
}

function mapAlert(row: AlertRow): Alert {
  return {
    id: row.id,
    organizationId: row.organization_id,
    requirementId: row.requirement_id,
    recipientUserId: row.recipient_user_id,
    windowDays: row.window_days,
    title: row.title,
    body: row.body,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

async function selectPeople(supabase: SupabaseClient, organizationId: string): Promise<Person[]> {
  const { data, error } = await supabase.from('people').select('*').eq('organization_id', organizationId);
  if (error) throw new VaultError(error.message, 'network');
  return ((data ?? []) as PersonRow[]).map(mapPerson);
}

async function selectVendors(supabase: SupabaseClient, organizationId: string): Promise<Vendor[]> {
  const { data, error } = await supabase.from('vendors').select('*').eq('organization_id', organizationId);
  if (error) throw new VaultError(error.message, 'network');
  return ((data ?? []) as VendorRow[]).map(mapVendor);
}

async function selectRequirements(supabase: SupabaseClient, organizationId: string): Promise<Requirement[]> {
  const { data, error } = await supabase.from('requirements').select('*').eq('organization_id', organizationId);
  if (error) throw new VaultError(error.message, 'network');
  return ((data ?? []) as RequirementRowDb[]).map(mapRequirement);
}

async function selectDocuments(supabase: SupabaseClient, organizationId: string): Promise<VaultDocument[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });
  if (error) throw new VaultError(error.message, 'network');
  return ((data ?? []) as DocumentRow[]).map(mapDocument);
}

async function selectAlerts(supabase: SupabaseClient, organizationId: string, userId: string): Promise<Alert[]> {
  const { data, error } = await supabase
    .from('alerts')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('recipient_user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new VaultError(error.message, 'network');
  return ((data ?? []) as AlertRow[]).map(mapAlert);
}
