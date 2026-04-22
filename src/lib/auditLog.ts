/**
 * Centralized audit log writer.
 *
 * Frontend code calls `logAuditEvent({...})` for security-sensitive actions.
 * The actual insert happens server-side via the SECURITY DEFINER RPC
 * `public.write_audit_log(...)`, so the client cannot forge actor identity
 * and ordinary users cannot tamper with the table.
 *
 * Failures are swallowed (never block the user-facing action).
 */

import { supabase } from '@/integrations/supabase/client';

export type AuditAction =
  // auth
  | 'auth.login' | 'auth.logout' | 'auth.password_reset_requested' | 'auth.password_changed'
  // payroll & pay stubs
  | 'pay_stub.view' | 'pay_stub.share' | 'pay_stub.export'
  | 'payroll.export' | 'payroll.run.view'
  // invoices & payments
  | 'invoice.view' | 'invoice.print' | 'invoice.send' | 'invoice.pdf_download'
  | 'payment.refund' | 'payment.record'
  // documents
  | 'document.signed_url_generated' | 'document.download'
  // admin
  | 'admin.user.ban' | 'admin.user.unban' | 'admin.user.password_reset' | 'admin.user.temp_password_set'
  | 'admin.team.invite' | 'admin.portal_invite.send'
  // customer data access (for portal staff/admins viewing customer records)
  | 'customer.data_access'
  // settings / overrides
  | 'settings.update' | 'override.manual'
  // generic fallback
  | 'other';

export interface AuditEventInput {
  action: AuditAction | string;
  targetType?: string;
  targetId?: string | number | null;
  customerId?: string | null;
  success?: boolean;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}

const userAgent = (): string | null => {
  try {
    return typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 500) : null;
  } catch {
    return null;
  }
};

export async function logAuditEvent(input: AuditEventInput): Promise<void> {
  try {
    await supabase.rpc('write_audit_log' as never, {
      _action: input.action,
      _target_type: input.targetType ?? null,
      _target_id: input.targetId != null ? String(input.targetId) : null,
      _customer_id: input.customerId ?? null,
      _success: input.success ?? true,
      _before: input.before ?? null,
      _after: input.after ?? null,
      _metadata: input.metadata ?? null,
      _ip_address: null, // browser cannot reliably know its public IP
      _user_agent: userAgent(),
    } as never);
  } catch (err) {
    // Never let audit logging break user flows
    if (typeof console !== 'undefined') {
      console.warn('[audit] write failed', err);
    }
  }
}
