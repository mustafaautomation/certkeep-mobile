import { dueAlertWindows, tightestAlerts } from '@/domain/alerts';
import { daysUntil, isISODate } from '@/domain/dates';
import { extractDocumentFields, validateConfirmedFields } from '@/domain/extraction';
import { tabsForRole } from '@/domain/roles';
import { complianceStatus } from '@/domain/status';

const now = new Date('2026-11-25T15:00:00.000Z');

describe('compliance status', () => {
  test('missing, expired, expiring, and compliant follow the 30-day window', () => {
    expect(complianceStatus(null, now)).toBe('missing');
    expect(complianceStatus({ status: 'rejected', expiresOn: '2027-01-01' }, now)).toBe('missing');
    expect(complianceStatus({ status: 'approved', expiresOn: null }, now)).toBe('compliant');
    expect(complianceStatus({ status: 'approved', expiresOn: '2026-11-24' }, now)).toBe('expired');
    expect(complianceStatus({ status: 'approved', expiresOn: '2026-11-25' }, now)).toBe('expiring');
    expect(complianceStatus({ status: 'approved', expiresOn: '2026-12-25' }, now)).toBe('expiring');
    expect(complianceStatus({ status: 'submitted', expiresOn: '2026-12-26' }, now)).toBe('compliant');
  });

  test('days until uses UTC dates', () => {
    expect(daysUntil('2026-11-25', now)).toBe(0);
    expect(daysUntil('2026-12-07', now)).toBe(12);
    expect(isISODate('2026-02-31')).toBe(false);
  });
});

describe('expiry alerts', () => {
  test('30, 14, and 7 day windows open as the date approaches', () => {
    expect(dueAlertWindows(40)).toEqual([]);
    expect(dueAlertWindows(28)).toEqual([30]);
    expect(dueAlertWindows(12)).toEqual([30, 14]);
    expect(dueAlertWindows(6)).toEqual([30, 14, 7]);
    expect(dueAlertWindows(-1)).toEqual([]);
  });

  test('the inbox keeps the tightest window for each requirement', () => {
    const alerts = tightestAlerts([
      alert('req_a', 30),
      alert('req_a', 14),
      alert('req_a', 7),
      alert('req_b', 30),
    ]);
    expect(alerts.map((item) => `${item.requirementId}:${item.windowDays}`).sort()).toEqual(['req_a:7', 'req_b:30']);
  });
});

describe('extraction', () => {
  test('reads type, number, and expiry from the file name', () => {
    const fields = extractDocumentFields({ fileName: 'northstar-gl-coi.pdf', holderHint: 'Northstar Electric', now });
    expect(fields.documentType).toBe('general_liability');
    expect(fields.documentNumber.startsWith('GL-')).toBe(true);
    expect(fields.holderName).toBe('Northstar Electric');
    expect(fields.expiresOn).toBe('2027-11-25');
    expect(extractDocumentFields({ fileName: 'blurry-osha-card.jpg', now }).confidence).toBeLessThan(0.8);
  });

  test('confirmation rejects an empty number and a backwards expiry', () => {
    expect(validateConfirmedFields({
      documentNumber: '',
      issuer: 'Northbridge',
      holderName: 'Harborline',
      issuedOn: '2026-01-01',
      expiresOn: '2027-01-01',
    }).documentNumber).toBeTruthy();
    expect(validateConfirmedFields({
      documentNumber: 'GL-1',
      issuer: 'Northbridge',
      holderName: 'Harborline',
      issuedOn: '2027-02-01',
      expiresOn: '2026-02-01',
    }).expiresOn).toMatch(/after/);
  });
});

describe('roles', () => {
  test('managers see the directory and field staff do not', () => {
    expect(tabsForRole('compliance_manager')).toContain('directory');
    expect(tabsForRole('employee')).not.toContain('directory');
    expect(tabsForRole('vendor')).toEqual(['vault', 'alerts', 'settings']);
  });
});

function alert(requirementId: string, windowDays: 30 | 14 | 7) {
  return {
    id: `${requirementId}-${windowDays}`,
    organizationId: 'org',
    requirementId,
    recipientUserId: 'user',
    windowDays,
    title: 'title',
    body: 'body',
    readAt: null,
    createdAt: '2026-11-01T00:00:00.000Z',
  };
}
