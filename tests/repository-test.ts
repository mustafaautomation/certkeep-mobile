import { withOfflineCache } from '@/data/cache';
import { createMockRepository } from '@/data/mock-repository';
import { IDS } from '@/data/seed';
import { createMemoryStore } from '@/data/storage';
import { isSupabaseConfigured } from '@/data';

const now = new Date('2026-11-25T15:00:00.000Z');

function repo() {
  const store = createMemoryStore();
  return withOfflineCache(createMockRepository({ store, now: () => now }), store);
}

describe('mock vault', () => {
  test('runs with no Supabase env and opens the Harborline demo', async () => {
    expect(isSupabaseConfigured({})).toBe(false);
    const vault = repo();
    await vault.hydrate();
    await vault.signInDemo();
    const summary = await vault.getVault(IDS.orgHarbor);
    expect(summary.summary).toEqual({ compliant: 7, expiring: 4, expired: 1, missing: 3 });
    expect(summary.rows.find((row) => row.requirementId === IDS.reqHarrowGl)?.status).toBe('missing');
    expect(summary.alerts.some((alert) => alert.windowDays === 7)).toBe(true);
  });

  test('a vendor can file a missing license and a manager can approve it', async () => {
    const vault = repo();
    await vault.hydrate();
    await vault.signInWithPassword('priya@northstar.demo', 'harborline');
    const before = await vault.getRequirement(IDS.orgHarbor, IDS.reqNorthstarLicense);
    expect(before.row.status).toBe('missing');
    expect(before.canUpload).toBe(true);
    const filed = await vault.submitDocument({
      organizationId: IDS.orgHarbor,
      requirementId: IDS.reqNorthstarLicense,
      fileName: 'electrical-license-sample.pdf',
      mimeType: 'application/pdf',
      uri: 'sample://certificate.pdf',
      documentType: 'professional_license',
      documentNumber: 'LIC-DEMO-1',
      issuer: 'State Licensing Board',
      holderName: 'Northstar Electric',
      issuedOn: '2026-01-01',
      expiresOn: '2028-01-01',
    });
    expect(filed.row.status).toBe('compliant');
    expect(filed.row.review).toBe('pending');
    await expect(vault.getRequirement(IDS.orgHarbor, IDS.reqLeoOsha)).rejects.toThrow(/not in your vault/);

    await vault.signOut();
    await vault.signInWithPassword('maya@harborline.demo', 'harborline');
    const approved = await vault.reviewDocument({
      organizationId: IDS.orgHarbor,
      documentId: filed.documents[0]!.id,
      decision: 'approved',
    });
    expect(approved.row.review).toBe('approved');
  });

  test('magic link signs Maya in and org switch changes her role', async () => {
    const vault = repo();
    await vault.hydrate();
    const link = await vault.requestMagicLink('maya@harborline.demo');
    expect(link.previewToken).toBeTruthy();
    await vault.consumeMagicLink(link.previewToken!);
    const memberships = await vault.listMemberships();
    expect(memberships.map((item) => item.role).sort()).toEqual(['compliance_manager', 'employee']);
    await vault.setActiveOrganizationId(IDS.orgCedar);
    const cedar = await vault.getVault(IDS.orgCedar);
    expect(cedar.summary.missing).toBe(1);
    expect(cedar.summary.expiring).toBe(1);
    expect(cedar.vendors).toHaveLength(0);
  });

  test('offline reads the saved vault and refuses a new filing', async () => {
    const vault = repo();
    await vault.hydrate();
    await vault.signInDemo();
    await vault.getVault(IDS.orgHarbor);
    await vault.setOffline(true);
    const cached = await vault.getVault(IDS.orgHarbor);
    expect(cached.fromCache).toBe(true);
    expect(cached.summary.expired).toBe(1);
    await expect(
      vault.submitDocument({
        organizationId: IDS.orgHarbor,
        requirementId: IDS.reqHarrowGl,
        fileName: 'gl-sample.pdf',
        mimeType: 'application/pdf',
        uri: null,
        documentType: 'general_liability',
        documentNumber: 'GL-1',
        issuer: 'Northbridge',
        holderName: 'Harrow Hauling',
        issuedOn: '2026-01-01',
        expiresOn: '2027-01-01',
      }),
    ).rejects.toThrow(/offline/i);
  });
});
