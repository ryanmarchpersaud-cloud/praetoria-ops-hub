/**
 * Centralized timezone helpers for visit/job time tracking.
 *
 * Praetoria Group operates in Saskatchewan (Regina), which does NOT observe
 * Daylight Saving Time. We always display and edit times in `America/Regina`
 * so commercial customer proof-of-service is consistent regardless of the
 * viewer's browser timezone (browsers on lovable preview/servers are often UTC).
 *
 * All timestamps are stored in the database as UTC (timestamptz). Use these
 * helpers anywhere a worker arrival/completion time is shown or edited.
 */

export const COMPANY_TZ = 'America/Regina';

/** Format an ISO timestamp as "h:mm AM/PM" in Regina time. */
export function formatTzTime(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString('en-CA', {
      timeZone: COMPANY_TZ,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
}

/** Format an ISO timestamp as "MMM d, yyyy h:mm AM/PM" in Regina time. */
export function formatTzDateTime(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('en-CA', {
      timeZone: COMPANY_TZ,
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
}

/** Return the Regina-local YYYY-MM-DD date for an ISO timestamp. */
export function tzDateKey(iso: string | null | undefined): string {
  if (!iso) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: COMPANY_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(iso));
  const y = parts.find(p => p.type === 'year')?.value;
  const m = parts.find(p => p.type === 'month')?.value;
  const d = parts.find(p => p.type === 'day')?.value;
  return `${y}-${m}-${d}`;
}

/** Return Regina-local "HH:mm" (24h) for an ISO timestamp — for <input type="time"> values. */
export function tzTimeInputValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: COMPANY_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(iso));
  const h = parts.find(p => p.type === 'hour')?.value ?? '00';
  const m = parts.find(p => p.type === 'minute')?.value ?? '00';
  // Intl can return "24" for midnight in some locales — normalize.
  return `${h === '24' ? '00' : h}:${m}`;
}

/**
 * Build a UTC ISO string from a Regina-local date (`YYYY-MM-DD`) + time (`HH:mm`).
 * Regina is fixed UTC-6 (no DST), so we can offset deterministically.
 */
export function reginaLocalToUtcIso(dateStr: string, timeStr: string): string | null {
  if (!dateStr || !timeStr) return null;
  const [y, mo, d] = dateStr.split('-').map(Number);
  const [h, mi] = timeStr.split(':').map(Number);
  if (!y || !mo || !d || Number.isNaN(h) || Number.isNaN(mi)) return null;
  // Regina = UTC-6 year-round. Local 08:00 = 14:00 UTC.
  const utcMs = Date.UTC(y, mo - 1, d, h + 6, mi, 0, 0);
  return new Date(utcMs).toISOString();
}

/** Minutes between two ISO timestamps (>= 0). */
export function minutesBetween(startIso: string | null | undefined, endIso: string | null | undefined): number {
  if (!startIso || !endIso) return 0;
  return Math.max(0, Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000));
}

/** Format a minute count as "Xh YYm" or "YY min". */
export function formatDurationMinutes(mins: number): string {
  const m = Math.max(0, Math.round(mins));
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h > 0 ? `${h}h ${r.toString().padStart(2, '0')}m` : `${r} min`;
}
