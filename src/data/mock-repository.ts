import { buildAlerts, mergeAlertReads } from '@/domain/alerts';
import { extractDocumentFields, validateConfirmedFields } from '@/domain/extraction';
import { projectRequirement, projectRows } from '@/domain/project';
import { canUploadRequirement, isManager, visibleRequirement } from '@/domain/roles';
import type {
  Membership,
  PersonDetail,
  RequirementDetail,
  Session,
  SubmitDocumentInput,
  VaultDocument,
  VaultSnapshot,
  VendorDetail,
} from '@/domain/types';
import { VaultError } from '@/data/errors';
import type { CertkeepRepository } from '@/data/repository';
import { createSeed, DEMO_MANAGER_EMAIL, type Database } from '@/data/seed';
import type { KeyValueStore } from '@/data/storage';

const DB_KEY = 'certkeep.db.v1';
const SESSION_KEY = 'certkeep.session.v1';
const ORG_KEY = 'certkeep.org.v1';

export interface MockRepositoryOptions {
  store: KeyValueStore;
  now?: () => Date;
}

export function createMockRepository(options: MockRepositoryOptions): CertkeepRepository {
  const now = options.now ?? (() => new Date());
  const store = options.store;

  async function readDb(): Promise<Database> {
    const raw = await store.getItem(DB_KEY);
    if (!raw) {
      const seeded = createSeed(now());
      await store.setItem(DB_KEY, JSON.stringify(seeded));
      return seeded;
    }
    return JSON.parse(raw) as Database;
  }

  async function writeDb(database: Database): Promise<void> {
    await store.setItem(DB_KEY, JSON.stringify(database));
  }

  async function readSession(): Promise<Session | null> {
    const raw = await store.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  }

  async function writeSession(session: Session | null): Promise<void> {
    if (!session) {
      await store.removeItem(SESSION_KEY);
      return;
    }
    await store.setItem(SESSION_KEY, JSON.stringify(session));
  }

  async function requireSession(): Promise<Session> {
    const session = await readSession();
    if (!session) throw new VaultError('Sign in to open the vault.', 'auth');
    return session;
  }

  async function requireMembership(organizationId: string): Promise<{ session: Session; database: Database; membership: Membership }> {
    const session = await requireSession();
    const database = await readDb();
    const membership = database.memberships.find(
      (item) => item.organizationId === organizationId && item.userId === session.userId,
    );
    if (!membership) throw new VaultError('That workspace is not on this account.', 'forbidden');
    return { session, database, membership };
  }

  function syncAlerts(database: Database): void {
    const next = buildAlerts({ ...database, now: now() });
    database.alerts = mergeAlertReads(next, database.alerts);
  }

  function snapshotFor(database: Database, membership: Membership): VaultSnapshot {
    const people = database.people.filter((person) => person.organizationId === membership.organizationId);
    const vendors = database.vendors.filter((vendor) => vendor.organizationId === membership.organizationId);
    const requirements = database.requirements.filter(
      (requirement) =>
        requirement.organizationId === membership.organizationId &&
        visibleRequirement(requirement, membership, people, vendors),
    );
    const projected = projectRows({
      requirements,
      documents: database.documents,
      people,
      vendors,
      now: now(),
    });
    const visiblePeople = isManager(membership.role)
      ? people
      : people.filter((person) => person.memberUserId === membership.userId);
    const visibleVendors = isManager(membership.role)
      ? vendors
      : vendors.filter((vendor) => vendor.memberUserId === membership.userId);
    return {
      organizationId: membership.organizationId,
      summary: projected.summary,
      rows: projected.rows,
      people: visiblePeople,
      vendors: visibleVendors,
      alerts: database.alerts
        .filter((alert) => alert.organizationId === membership.organizationId && alert.recipientUserId === membership.userId)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
      fromCache: false,
      fetchedAt: now().toISOString(),
    };
  }

  function detailFor(
    database: Database,
    membership: Membership,
    requirementId: string,
  ): RequirementDetail {
    const people = database.people.filter((person) => person.organizationId === membership.organizationId);
    const vendors = database.vendors.filter((vendor) => vendor.organizationId === membership.organizationId);
    const requirement = database.requirements.find(
      (item) => item.id === requirementId && item.organizationId === membership.organizationId,
    );
    if (!requirement || !visibleRequirement(requirement, membership, people, vendors)) {
      throw new VaultError('That requirement is not in your vault.', 'not_found');
    }
    const documents = database.documents
      .filter((document) => document.requirementId === requirement.id)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    return {
      requirement,
      row: projectRequirement({ requirement, documents, people, vendors, now: now() }),
      documents,
      canUpload: canUploadRequirement(requirement, membership, people, vendors),
      canReview: isManager(membership.role),
      fromCache: false,
    };
  }

  async function establish(user: Database['users'][number], preferredOrgId?: string): Promise<Session> {
    const session: Session = { userId: user.id, email: user.email, displayName: user.displayName };
    await writeSession(session);
    const database = await readDb();
    const memberships = database.memberships.filter((item) => item.userId === user.id);
    const preferred = memberships.find((item) => item.organizationId === preferredOrgId) ?? memberships[0];
    if (preferred) await store.setItem(ORG_KEY, preferred.organizationId);
    return session;
  }

  return {
    mode: 'mock',
    async hydrate() {
      await readDb();
    },
    getSession: readSession,
    async signInWithPassword(email, password) {
      const database = await readDb();
      const user = database.users.find((item) => item.email.toLowerCase() === email.trim().toLowerCase());
      if (!user || user.password !== password) {
        throw new VaultError('That email and password do not match a Certkeep account.', 'auth');
      }
      return establish(user);
    },
    async requestMagicLink(email) {
      const database = await readDb();
      const normalized = email.trim().toLowerCase();
      const user = database.users.find((item) => item.email.toLowerCase() === normalized);
      if (!user) return { email: normalized, previewToken: null };
      const token = `ml_${user.id}_${Math.random().toString(36).slice(2, 10)}`;
      database.magicTokens.push({ token, email: user.email, createdAt: now().toISOString() });
      await writeDb(database);
      return { email: user.email, previewToken: token };
    },
    async consumeMagicLink(token) {
      const database = await readDb();
      const match = database.magicTokens.find((item) => item.token === token);
      if (!match) throw new VaultError('That sign-in link is invalid or already used.', 'auth');
      database.magicTokens = database.magicTokens.filter((item) => item.token !== token);
      await writeDb(database);
      const user = database.users.find((item) => item.email === match.email);
      if (!user) throw new VaultError('That sign-in link is invalid or already used.', 'auth');
      return establish(user);
    },
    async signInDemo() {
      const database = await readDb();
      const user = database.users.find((item) => item.email === DEMO_MANAGER_EMAIL);
      if (!user) throw new VaultError('The demo workspace is unavailable.', 'network');
      return establish(user, 'org_harborline');
    },
    async signOut() {
      await writeSession(null);
      await store.removeItem(ORG_KEY);
    },
    async listMemberships() {
      const session = await requireSession();
      const database = await readDb();
      return database.memberships.filter((item) => item.userId === session.userId);
    },
    async getActiveOrganizationId() {
      return store.getItem(ORG_KEY);
    },
    async setActiveOrganizationId(organizationId) {
      const { database, session } = await requireMembership(organizationId);
      const allowed = database.memberships.some(
        (item) => item.userId === session.userId && item.organizationId === organizationId,
      );
      if (!allowed) throw new VaultError('That workspace is not on this account.', 'forbidden');
      await store.setItem(ORG_KEY, organizationId);
    },
    async getVault(organizationId) {
      const { database, membership } = await requireMembership(organizationId);
      return snapshotFor(database, membership);
    },
    async getPerson(organizationId, personId): Promise<PersonDetail> {
      const { database, membership } = await requireMembership(organizationId);
      const people = database.people.filter((person) => person.organizationId === organizationId);
      const person = people.find((item) => item.id === personId);
      if (!person) throw new VaultError('That person is not in this workspace.', 'not_found');
      if (!isManager(membership.role) && person.memberUserId !== membership.userId) {
        throw new VaultError('That person is not in your vault.', 'forbidden');
      }
      const vendors = database.vendors.filter((vendor) => vendor.organizationId === organizationId);
      const requirements = database.requirements.filter(
        (requirement) => requirement.personId === person.id && visibleRequirement(requirement, membership, people, vendors),
      );
      const projected = projectRows({ requirements, documents: database.documents, people, vendors, now: now() });
      return { person, rows: projected.rows, fromCache: false };
    },
    async getVendor(organizationId, vendorId): Promise<VendorDetail> {
      const { database, membership } = await requireMembership(organizationId);
      const vendors = database.vendors.filter((vendor) => vendor.organizationId === organizationId);
      const vendor = vendors.find((item) => item.id === vendorId);
      if (!vendor) throw new VaultError('That vendor is not in this workspace.', 'not_found');
      if (!isManager(membership.role) && vendor.memberUserId !== membership.userId) {
        throw new VaultError('That vendor is not in your vault.', 'forbidden');
      }
      const people = database.people.filter((person) => person.organizationId === organizationId);
      const requirements = database.requirements.filter(
        (requirement) => requirement.vendorId === vendor.id && visibleRequirement(requirement, membership, people, vendors),
      );
      const projected = projectRows({ requirements, documents: database.documents, people, vendors, now: now() });
      return { vendor, rows: projected.rows, fromCache: false };
    },
    async getRequirement(organizationId, requirementId) {
      const { database, membership } = await requireMembership(organizationId);
      return detailFor(database, membership, requirementId);
    },
    async extractDocument({ file, holderHint }) {
      return extractDocumentFields({ fileName: file.fileName, holderHint, now: now() });
    },
    async submitDocument(input: SubmitDocumentInput) {
      const errors = validateConfirmedFields({
        documentNumber: input.documentNumber,
        issuer: input.issuer,
        holderName: input.holderName,
        issuedOn: input.issuedOn ?? '',
        expiresOn: input.expiresOn,
      });
      if (Object.keys(errors).length > 0) {
        throw new VaultError(Object.values(errors)[0] ?? 'Check the extracted fields.', 'validation');
      }
      const { database, membership, session } = await requireMembership(input.organizationId);
      const people = database.people.filter((person) => person.organizationId === membership.organizationId);
      const vendors = database.vendors.filter((vendor) => vendor.organizationId === membership.organizationId);
      const requirement = database.requirements.find((item) => item.id === input.requirementId);
      if (!requirement || !canUploadRequirement(requirement, membership, people, vendors)) {
        throw new VaultError('You cannot file a document on that requirement.', 'forbidden');
      }
      const document: VaultDocument = {
        id: `doc_${Math.random().toString(36).slice(2, 10)}`,
        organizationId: input.organizationId,
        requirementId: input.requirementId,
        uploadedByUserId: session.userId,
        fileName: input.fileName,
        mimeType: input.mimeType,
        storagePath: input.uri,
        documentType: input.documentType,
        documentNumber: input.documentNumber.trim(),
        issuer: input.issuer.trim(),
        holderName: input.holderName.trim(),
        issuedOn: input.issuedOn,
        expiresOn: input.expiresOn,
        confidence: 1,
        status: 'submitted',
        reviewNote: null,
        createdAt: now().toISOString(),
      };
      database.documents.push(document);
      syncAlerts(database);
      await writeDb(database);
      return detailFor(database, membership, requirement.id);
    },
    async reviewDocument({ organizationId, documentId, decision, note }) {
      const { database, membership } = await requireMembership(organizationId);
      if (!isManager(membership.role)) throw new VaultError('Only a compliance manager can review documents.', 'forbidden');
      const document = database.documents.find((item) => item.id === documentId && item.organizationId === organizationId);
      if (!document) throw new VaultError('That document is no longer in the vault.', 'not_found');
      document.status = decision;
      document.reviewNote = note?.trim() || (decision === 'rejected' ? 'Please upload a clearer copy.' : null);
      syncAlerts(database);
      await writeDb(database);
      return detailFor(database, membership, document.requirementId);
    },
    async markAlertRead(alertId) {
      const session = await requireSession();
      const database = await readDb();
      const alert = database.alerts.find((item) => item.id === alertId && item.recipientUserId === session.userId);
      if (!alert) throw new VaultError('That reminder is not in your inbox.', 'not_found');
      alert.readAt = now().toISOString();
      await writeDb(database);
      return alert;
    },
    async setOffline() {
      return undefined;
    },
    async isOffline() {
      return false;
    },
  };
}
