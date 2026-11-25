import type { PersonDetail, RequirementDetail, VaultSnapshot, VendorDetail } from '@/domain/types';
import { VaultError } from '@/data/errors';
import type { CertkeepRepository } from '@/data/repository';
import type { KeyValueStore } from '@/data/storage';

const OFFLINE_KEY = 'certkeep.offline.v1';

export function withOfflineCache(inner: CertkeepRepository, store: KeyValueStore): CertkeepRepository {
  let offline = false;

  async function userScope(): Promise<string> {
    const session = await inner.getSession();
    return session?.userId ?? 'anon';
  }

  async function readCache<T>(key: string): Promise<T | null> {
    const raw = await store.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async function writeCache(key: string, value: unknown): Promise<void> {
    await store.setItem(key, JSON.stringify(value));
  }

  async function cachedRead<T extends { fromCache: boolean }>(key: string, load: () => Promise<T>): Promise<T> {
    if (offline) {
      const cached = await readCache<T>(key);
      if (!cached) {
        throw new VaultError('You are offline, and this device has not saved that record yet.', 'offline');
      }
      return { ...cached, fromCache: true };
    }
    try {
      const fresh = await load();
      await writeCache(key, { ...fresh, fromCache: false });
      return { ...fresh, fromCache: false };
    } catch (error) {
      const cached = await readCache<T>(key);
      if (cached) return { ...cached, fromCache: true };
      throw error;
    }
  }

  function assertOnline(): void {
    if (offline) throw new VaultError('You are offline. Reconnect to file this change.', 'offline');
  }

  return {
    mode: inner.mode,
    async hydrate() {
      offline = (await store.getItem(OFFLINE_KEY)) === '1';
      await inner.hydrate();
    },
    getSession: () => inner.getSession(),
    signInWithPassword: (email, password) => inner.signInWithPassword(email, password),
    requestMagicLink: (email) => inner.requestMagicLink(email),
    consumeMagicLink: (token) => inner.consumeMagicLink(token),
    signInDemo: () => inner.signInDemo(),
    signOut: () => inner.signOut(),
    listMemberships: () => inner.listMemberships(),
    getActiveOrganizationId: () => inner.getActiveOrganizationId(),
    setActiveOrganizationId: (organizationId) => inner.setActiveOrganizationId(organizationId),
    async getVault(organizationId): Promise<VaultSnapshot> {
      const scope = await userScope();
      return cachedRead(`certkeep.cache.v1.${scope}.vault.${organizationId}`, () => inner.getVault(organizationId));
    },
    async getPerson(organizationId, personId): Promise<PersonDetail> {
      const scope = await userScope();
      return cachedRead(`certkeep.cache.v1.${scope}.person.${personId}`, () => inner.getPerson(organizationId, personId));
    },
    async getVendor(organizationId, vendorId): Promise<VendorDetail> {
      const scope = await userScope();
      return cachedRead(`certkeep.cache.v1.${scope}.vendor.${vendorId}`, () => inner.getVendor(organizationId, vendorId));
    },
    async getRequirement(organizationId, requirementId): Promise<RequirementDetail> {
      const scope = await userScope();
      return cachedRead(`certkeep.cache.v1.${scope}.requirement.${requirementId}`, () =>
        inner.getRequirement(organizationId, requirementId),
      );
    },
    extractDocument: (input) => inner.extractDocument(input),
    async submitDocument(input) {
      assertOnline();
      return inner.submitDocument(input);
    },
    async reviewDocument(input) {
      assertOnline();
      return inner.reviewDocument(input);
    },
    async markAlertRead(alertId) {
      assertOnline();
      return inner.markAlertRead(alertId);
    },
    async setOffline(next) {
      offline = next;
      await store.setItem(OFFLINE_KEY, next ? '1' : '0');
    },
    async isOffline() {
      return offline;
    },
  };
}
