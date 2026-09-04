// Return-to handling for deep links into the Prae approval screens.
//
// Only same-origin application paths are ever stored or replayed — never a
// full URL, never a token, never anything from a query string that could
// carry credentials.
const KEY = 'prae_return_to';

const SAFE_PATH = /^\/[A-Za-z0-9\-._~/]*$/;

export function storeReturnTo(path: string) {
  try {
    const clean = path.split('?')[0].split('#')[0];
    if (!SAFE_PATH.test(clean)) return;
    if (clean === '/login' || clean === '/') return;
    sessionStorage.setItem(KEY, clean);
  } catch {
    // Storage unavailable — the user simply lands on the default screen.
  }
}

/** Reads and clears the stored path. Returns null when there is nothing safe to replay. */
export function takeReturnTo(): string | null {
  try {
    const value = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    if (!value || !SAFE_PATH.test(value)) return null;
    return value;
  } catch {
    return null;
  }
}
