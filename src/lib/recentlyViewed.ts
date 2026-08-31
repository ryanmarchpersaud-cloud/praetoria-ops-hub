const KEY = 'recentlyViewedCustomers';
const MAX = 5;

export function getRecentCustomerIds(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export function recordRecentCustomer(id: string) {
  if (!id) return;
  try {
    const next = [id, ...getRecentCustomerIds().filter(x => x !== id)].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore storage failures */
  }
}
