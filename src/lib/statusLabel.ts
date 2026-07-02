/**
 * Format raw status strings (e.g. "in_progress") into friendly display text
 * (e.g. "In Progress"). Safe for null/undefined.
 */
export function formatStatusLabel(status?: string | null): string {
  if (!status) return '';
  return status
    .toString()
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}
