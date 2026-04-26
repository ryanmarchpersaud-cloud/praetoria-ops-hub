import { toast } from 'sonner';

/**
 * Detects the database guard error raised by the protected-customers trigger
 * and shows a friendly toast. Returns true if the error was a protected-customer
 * block (so callers can stop further error handling).
 *
 * Usage:
 *   const { error } = await supabase.from('visits').insert(...);
 *   if (handleProtectedCustomerError(error)) return;
 *   if (error) toast.error(error.message); // your normal handling
 */
export function handleProtectedCustomerError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const msg = String(
    (error as any).message ?? (error as any).details ?? (error as any).hint ?? '',
  );
  if (!msg.includes('PROTECTED_CUSTOMER')) return false;

  // Strip the "PROTECTED_CUSTOMER: " prefix for a cleaner toast
  const friendly = msg.replace(/^.*PROTECTED_CUSTOMER:\s*/, '').trim();

  toast.error('Protected customer — action blocked', {
    description: friendly,
    duration: 8000,
  });
  return true;
}

/** True if a customer id is on the protected list (client-side check, used for UI hints). */
export function isProtectedCustomerError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  return String((error as any).message ?? '').includes('PROTECTED_CUSTOMER');
}
