export function toISODate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseISODate(iso: string): Date {
  const [year, month, day] = iso.split('-').map((part) => Number(part));
  return new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1));
}

export function isISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return toISODate(parseISODate(value)) === value;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function daysUntil(iso: string | null, now: Date): number | null {
  if (!iso || !isISODate(iso)) return null;
  const target = parseISODate(iso).getTime();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((target - today) / 86_400_000);
}

export function formatMedium(iso: string | null): string {
  if (!iso || !isISODate(iso)) return 'No date';
  return parseISODate(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function expiryPhrase(days: number | null, expiresOn: string | null): string {
  if (!expiresOn || days === null) return 'No expiry on file';
  if (days < 0) {
    const elapsed = Math.abs(days);
    return elapsed === 1 ? 'Expired yesterday' : `Expired ${elapsed} days ago`;
  }
  if (days === 0) return 'Expires today';
  if (days === 1) return 'Expires tomorrow';
  return `Expires in ${days} days · ${formatMedium(expiresOn)}`;
}
