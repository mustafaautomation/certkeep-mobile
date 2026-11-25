import type { Membership, Person, Requirement, Role, Vendor } from '@/domain/types';

export function isManager(role: Role): boolean {
  return role === 'owner' || role === 'admin' || role === 'compliance_manager';
}

export function roleLabel(role: Role): string {
  switch (role) {
    case 'owner':
      return 'Owner';
    case 'admin':
      return 'Admin';
    case 'compliance_manager':
      return 'Compliance manager';
    case 'employee':
      return 'Employee';
    case 'vendor':
      return 'Vendor';
    default: {
      const neverRole: never = role;
      return neverRole;
    }
  }
}

export function visibleRequirement(
  requirement: Requirement,
  membership: Pick<Membership, 'role' | 'userId'>,
  people: readonly Person[],
  vendors: readonly Vendor[],
): boolean {
  if (isManager(membership.role)) return true;
  if (membership.role === 'employee' && requirement.personId) {
    return people.some((person) => person.id === requirement.personId && person.memberUserId === membership.userId);
  }
  if (membership.role === 'vendor' && requirement.vendorId) {
    return vendors.some((vendor) => vendor.id === requirement.vendorId && vendor.memberUserId === membership.userId);
  }
  return false;
}

export function canUploadRequirement(
  requirement: Requirement,
  membership: Pick<Membership, 'role' | 'userId'>,
  people: readonly Person[],
  vendors: readonly Vendor[],
): boolean {
  return visibleRequirement(requirement, membership, people, vendors);
}

export function tabsForRole(role: Role): ('vault' | 'directory' | 'alerts' | 'settings')[] {
  if (isManager(role)) return ['vault', 'directory', 'alerts', 'settings'];
  return ['vault', 'alerts', 'settings'];
}
