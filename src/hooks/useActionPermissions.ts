import { useMemo } from 'react';
import { useModuleAccess } from './useModuleAccess';

/**
 * Action-level permission checks for use inside pages.
 * These assume the user already passed route-level guards.
 * They gate destructive/write actions within a page.
 */
export function useActionPermissions() {
  const access = useModuleAccess();

  return useMemo(() => ({
    // ── Finance actions ──
    /** Can send/void/record payment on invoices */
    canManageInvoices: access.financeFullAccess || access.isOwnerOrAdmin,
    /** Can view invoices (includes limited viewers) */
    canViewInvoices: access.financeFullAccess || access.financeViewLimited || access.opsFullAccess,
    /** Can edit invoice drafts */
    canEditInvoiceDrafts: access.financeFullAccess || access.opsFullAccess,
    /** Can record payments */
    canRecordPayments: access.financeFullAccess || access.isOwnerOrAdmin,
    /** Can void invoices */
    canVoidInvoices: access.financeFullAccess || access.isOwnerOrAdmin,

    // ── Operations actions ──
    /** Can create/edit/delete jobs */
    canManageJobs: access.opsFullAccess,
    /** Can create/edit visits */
    canManageVisits: access.opsFullAccess,
    /** Can create/edit/delete/send quotes */
    canManageQuotes: access.opsFullAccess,
    /** Can create/edit requests */
    canManageRequests: access.opsFullAccess,
    /** Can manage schedule/dispatch */
    canManageSchedule: access.opsFullAccess,
    /** Can manage properties */
    canManageProperties: access.opsFullAccess,
    /** Can manage leads */
    canManageLeads: access.opsFullAccess,

    // ── HR / People actions ──
    /** Can issue PPE, assign training, approve/revoke certs */
    canManageWorkerAdmin: access.hrFullAccess || access.isOwnerOrAdmin,
    /** Can edit employee records */
    canEditEmployees: access.hrFullAccess || access.isOwnerOrAdmin,

    // ── Settings / Admin actions ──
    /** Can manage integrations/connected apps */
    canManageIntegrations: access.isOwnerOrAdmin,
    /** Can manage roles/permissions */
    canManageRoles: access.isOwnerOrAdmin,
    /** Can manage team members */
    canManageTeam: access.hrFullAccess || access.isOwnerOrAdmin,

    // ── Convenience ──
    isOwnerOrAdmin: access.isOwnerOrAdmin,
    isLoading: access.isLoading,
  }), [access]);
}
