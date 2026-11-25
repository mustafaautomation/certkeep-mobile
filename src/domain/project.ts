import { daysUntil } from '@/domain/dates';
import { subjectNameFor } from '@/domain/labels';
import { complianceStatus, effectiveDocument, sortRows, summarize } from '@/domain/status';
import type {
  ComplianceSummary,
  Person,
  Requirement,
  RequirementRow,
  VaultDocument,
  Vendor,
} from '@/domain/types';

export function projectRequirement(input: {
  requirement: Requirement;
  documents: readonly VaultDocument[];
  people: readonly Person[];
  vendors: readonly Vendor[];
  now: Date;
}): RequirementRow {
  const latest = effectiveDocument(input.documents.filter((document) => document.requirementId === input.requirement.id));
  const subjectType = input.requirement.personId ? 'person' : 'vendor';
  const subjectId = input.requirement.personId ?? input.requirement.vendorId ?? '';
  return {
    requirementId: input.requirement.id,
    name: input.requirement.name,
    documentType: input.requirement.documentType,
    subjectType,
    subjectId,
    subjectName: subjectNameFor(input.requirement, input.people, input.vendors),
    status: complianceStatus(latest, input.now),
    expiresOn: latest?.expiresOn ?? null,
    daysRemaining: daysUntil(latest?.expiresOn ?? null, input.now),
    review: !latest ? 'none' : latest.status === 'submitted' ? 'pending' : 'approved',
    documentNumber: latest?.documentNumber ?? null,
  };
}

export function projectRows(input: {
  requirements: readonly Requirement[];
  documents: readonly VaultDocument[];
  people: readonly Person[];
  vendors: readonly Vendor[];
  now: Date;
}): { rows: RequirementRow[]; summary: ComplianceSummary } {
  const rows = sortRows(
    input.requirements.map((requirement) =>
      projectRequirement({
        requirement,
        documents: input.documents,
        people: input.people,
        vendors: input.vendors,
        now: input.now,
      }),
    ),
  );
  return { rows, summary: summarize(rows) };
}
