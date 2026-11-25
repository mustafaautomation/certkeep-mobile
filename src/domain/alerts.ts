import { addDays, daysUntil } from '@/domain/dates';
import { subjectNameFor } from '@/domain/labels';
import { isManager } from '@/domain/roles';
import { effectiveDocument } from '@/domain/status';
import type { Alert, AlertWindow, Membership, Person, Requirement, VaultDocument, Vendor } from '@/domain/types';

export const ALERT_WINDOWS = [30, 14, 7] as const satisfies readonly AlertWindow[];

export function dueAlertWindows(daysRemaining: number): AlertWindow[] {
  if (daysRemaining < 0) return [];
  return ALERT_WINDOWS.filter((windowDays) => daysRemaining <= windowDays);
}

export function alertCopy(input: {
  subjectName: string;
  requirementName: string;
  daysRemaining: number;
  windowDays: AlertWindow;
}): { title: string; body: string } {
  const when =
    input.daysRemaining === 0 ? 'today' : input.daysRemaining === 1 ? 'tomorrow' : `in ${input.daysRemaining} days`;
  return {
    title: `${input.requirementName} expires ${when}`,
    body: `${input.subjectName} · ${input.windowDays}-day reminder. Collect a current document before the job is exposed.`,
  };
}

export function buildAlerts(input: {
  requirements: readonly Requirement[];
  documents: readonly VaultDocument[];
  people: readonly Person[];
  vendors: readonly Vendor[];
  memberships: readonly Membership[];
  now: Date;
}): Alert[] {
  const alerts: Alert[] = [];
  for (const requirement of input.requirements) {
    const latest = effectiveDocument(input.documents.filter((document) => document.requirementId === requirement.id));
    if (!latest?.expiresOn) continue;
    const days = daysUntil(latest.expiresOn, input.now);
    if (days === null || days < 0) continue;
    const subjectName = subjectNameFor(requirement, input.people, input.vendors);
    const recipients = new Set<string>();
    for (const member of input.memberships) {
      if (member.organizationId === requirement.organizationId && isManager(member.role)) {
        recipients.add(member.userId);
      }
    }
    const person = input.people.find((item) => item.id === requirement.personId);
    if (person?.memberUserId) recipients.add(person.memberUserId);
    const vendor = input.vendors.find((item) => item.id === requirement.vendorId);
    if (vendor?.memberUserId) recipients.add(vendor.memberUserId);

    for (const windowDays of dueAlertWindows(days)) {
      const copy = alertCopy({
        subjectName,
        requirementName: requirement.name,
        daysRemaining: days,
        windowDays,
      });
      for (const recipientUserId of recipients) {
        alerts.push({
          id: `alert_${requirement.id}_${windowDays}_${recipientUserId}`,
          organizationId: requirement.organizationId,
          requirementId: requirement.id,
          recipientUserId,
          windowDays,
          title: copy.title,
          body: copy.body,
          readAt: null,
          createdAt: addDays(input.now, -(windowDays - days)).toISOString(),
        });
      }
    }
  }
  return alerts;
}

export function mergeAlertReads(next: readonly Alert[], previous: readonly Alert[]): Alert[] {
  const reads = new Map(previous.map((alert) => [alert.id, alert.readAt]));
  return next.map((alert) => ({ ...alert, readAt: reads.get(alert.id) ?? null }));
}

export function tightestAlerts(alerts: readonly Alert[]): Alert[] {
  const byRequirement = new Map<string, Alert>();
  for (const alert of alerts) {
    const current = byRequirement.get(alert.requirementId);
    if (!current || alert.windowDays < current.windowDays) byRequirement.set(alert.requirementId, alert);
  }
  return [...byRequirement.values()].sort((left, right) => {
    if (left.readAt && !right.readAt) return 1;
    if (!left.readAt && right.readAt) return -1;
    return right.createdAt.localeCompare(left.createdAt);
  });
}
