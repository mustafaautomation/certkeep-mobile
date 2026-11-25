import type { DocumentType, RequirementStatus } from '@/domain/types';

export const DOCUMENT_TYPE_LABEL: Record<DocumentType, string> = {
  certificate_of_insurance: 'Certificate of insurance',
  general_liability: 'General liability',
  workers_compensation: 'Workers compensation',
  auto_liability: 'Auto liability',
  professional_license: 'Professional license',
  drivers_license: 'Driver license',
  osha_card: 'OSHA card',
  certification: 'Certification',
};

export const DOCUMENT_TYPES = Object.keys(DOCUMENT_TYPE_LABEL) as DocumentType[];

export const STATUS_LABEL: Record<RequirementStatus, string> = {
  compliant: 'Compliant',
  expiring: 'Expiring',
  expired: 'Expired',
  missing: 'Missing',
};

export function subjectNameFor(
  requirement: { personId: string | null; vendorId: string | null },
  people: readonly { id: string; fullName: string }[],
  vendors: readonly { id: string; name: string }[],
): string {
  if (requirement.personId) {
    return people.find((person) => person.id === requirement.personId)?.fullName ?? 'Person';
  }
  return vendors.find((vendor) => vendor.id === requirement.vendorId)?.name ?? 'Vendor';
}
