import { daysUntil } from '@/domain/dates';
import type { RequirementRow, RequirementStatus, VaultDocument } from '@/domain/types';

export const EXPIRING_WITHIN_DAYS = 30;

const STATUS_RANK: Record<RequirementStatus, number> = {
  expired: 0,
  missing: 1,
  expiring: 2,
  compliant: 3,
};

export function effectiveDocument(documents: readonly VaultDocument[]): VaultDocument | null {
  const usable = documents.filter((document) => document.status !== 'rejected');
  usable.sort((left, right) => (left.createdAt < right.createdAt ? 1 : left.createdAt > right.createdAt ? -1 : 0));
  return usable[0] ?? null;
}

export function complianceStatus(
  document: Pick<VaultDocument, 'status' | 'expiresOn'> | null,
  now: Date,
): RequirementStatus {
  if (!document || document.status === 'rejected') return 'missing';
  const days = daysUntil(document.expiresOn, now);
  if (days === null) return 'compliant';
  if (days < 0) return 'expired';
  if (days <= EXPIRING_WITHIN_DAYS) return 'expiring';
  return 'compliant';
}

export function summarize(rows: readonly RequirementRow[]) {
  return {
    compliant: rows.filter((row) => row.status === 'compliant').length,
    expiring: rows.filter((row) => row.status === 'expiring').length,
    expired: rows.filter((row) => row.status === 'expired').length,
    missing: rows.filter((row) => row.status === 'missing').length,
  };
}

export function sortRows(rows: readonly RequirementRow[]): RequirementRow[] {
  return [...rows].sort((left, right) => {
    const byStatus = STATUS_RANK[left.status] - STATUS_RANK[right.status];
    if (byStatus !== 0) return byStatus;
    const bySubject = left.subjectName.localeCompare(right.subjectName);
    if (bySubject !== 0) return bySubject;
    return left.name.localeCompare(right.name);
  });
}
