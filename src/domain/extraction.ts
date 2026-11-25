import { addDays, toISODate } from '@/domain/dates';
import type { DocumentType, Extraction } from '@/domain/types';

export interface ExtractionInput {
  fileName: string;
  holderHint?: string;
  now: Date;
}

function serialFromName(fileName: string): string {
  const compact = fileName.replace(/[^a-z0-9]/gi, '').toUpperCase();
  const tail = compact.slice(-6);
  return tail.padStart(4, 'X');
}

function classify(fileName: string): { documentType: DocumentType; issuer: string; prefix: string; days: number } {
  const name = fileName.toLowerCase();
  if (name.includes('osha')) {
    return { documentType: 'osha_card', issuer: 'OSHA Training Institute', prefix: 'OSHA', days: 365 };
  }
  if (name.includes('driver')) {
    return { documentType: 'drivers_license', issuer: 'Department of Motor Vehicles', prefix: 'DL', days: 1460 };
  }
  if (name.includes('fork') || name.includes('cert')) {
    return { documentType: 'certification', issuer: 'National Safety Council', prefix: 'CERT', days: 365 };
  }
  if (name.includes('worker') || name.includes('comp')) {
    return { documentType: 'workers_compensation', issuer: 'Harbor Mutual', prefix: 'WC', days: 300 };
  }
  if (name.includes('auto')) {
    return { documentType: 'auto_liability', issuer: 'Pinnacle Casualty', prefix: 'AL', days: 180 };
  }
  if (name.includes('license') || name.includes('licence')) {
    return { documentType: 'professional_license', issuer: 'State Licensing Board', prefix: 'LIC', days: 730 };
  }
  if (name.includes('gl') || name.includes('liability')) {
    return { documentType: 'general_liability', issuer: 'Northbridge Mutual', prefix: 'GL', days: 365 };
  }
  return { documentType: 'certificate_of_insurance', issuer: 'Northbridge Mutual', prefix: 'COI', days: 365 };
}

/** Mocked field extraction. The holder confirms every value before submit. */
export function extractDocumentFields(input: ExtractionInput): Extraction {
  const classified = classify(input.fileName);
  const issued = addDays(input.now, -21);
  const confidence = input.fileName.toLowerCase().includes('blur') ? 0.62 : 0.91;
  return {
    documentType: classified.documentType,
    documentNumber: `${classified.prefix}-${serialFromName(input.fileName)}`,
    issuer: classified.issuer,
    holderName: input.holderHint?.trim() || 'Harborline Construction',
    issuedOn: toISODate(issued),
    expiresOn: toISODate(addDays(input.now, classified.days)),
    confidence,
  };
}

export function validateConfirmedFields(input: {
  documentNumber: string;
  issuer: string;
  holderName: string;
  issuedOn: string;
  expiresOn: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!input.documentNumber.trim()) errors.documentNumber = 'Enter the document number.';
  if (!input.issuer.trim()) errors.issuer = 'Enter the issuer.';
  if (!input.holderName.trim()) errors.holderName = 'Enter the name on the document.';
  if (input.issuedOn && !/^\d{4}-\d{2}-\d{2}$/.test(input.issuedOn)) {
    errors.issuedOn = 'Use YYYY-MM-DD.';
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.expiresOn)) {
    errors.expiresOn = 'Enter an expiry date as YYYY-MM-DD.';
  } else if (input.issuedOn && /^\d{4}-\d{2}-\d{2}$/.test(input.issuedOn) && input.issuedOn > input.expiresOn) {
    errors.expiresOn = 'Expiry must be on or after the issued date.';
  }
  return errors;
}
