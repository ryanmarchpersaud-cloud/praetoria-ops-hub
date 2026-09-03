/**
 * Canonical public URL for customer-facing links (signing links, portal links).
 * Preview/sandbox origins are never emailed to customers — the backend only
 * accepts links on an approved Praetoria domain.
 */
export const PUBLIC_APP_URL = 'https://praetoriagroup.ca';

const APPROVED_HOSTS = [
  'praetoriagroup.ca',
  'www.praetoriagroup.ca',
  'praetoria-ops-hub.lovable.app',
];

/** Returns the current origin when it is a real published domain, otherwise the canonical URL. */
export function publicAppUrl(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (APPROVED_HOSTS.includes(host)) return window.location.origin;
  }
  return PUBLIC_APP_URL;
}

export function publicSigningUrl(token?: string | null): string {
  return `${publicAppUrl()}/sign/${token ?? ''}`;
}
