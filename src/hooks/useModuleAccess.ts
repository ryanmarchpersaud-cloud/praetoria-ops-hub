import { useMemo } from 'react';
import { usePermissions, type PermissionKey } from './useUserRole';
import { useAuthorization } from './useAuthorization';

/**
 * Module-level access control for the Praetoria Group platform.
 *
 * Resolves the current user's roles + permission keys into a clean
 * boolean map that UI components consume for gating.
 */

export interface ModuleAccess {
  // ── Finance ──
  financeFullAccess: boolean;      // owner, admin, accountant
  financeViewLimited: boolean;     // ops_manager, manager — invoice/payment status only
  financeNoAccess: boolean;

  // ── HR / People ──
  hrFullAccess: boolean;           // owner, admin, hr_admin
  hrViewLimited: boolean;          // ops_manager — roster, assign workers
  hrNoAccess: boolean;

  // ── Operations ──
  opsFullAccess: boolean;          // owner, admin, ops_manager, manager
  opsAssignedOnly: boolean;        // worker, subcontractor
  opsNoAccess: boolean;

  // ── Settings ──
  settingsCompany: boolean;
  settingsFinance: boolean;
  settingsOperations: boolean;
  settingsIntegrations: boolean;
  settingsRoles: boolean;
  settingsAudit: boolean;
  settingsAny: boolean;

  // ── Messaging ──
  messagingAll: boolean;
  messagingInternal: boolean;
  messagingAssigned: boolean;
  messagingDisabled: boolean;      // customer — disabled for now

  // ── Portal-level ──
  canAccessAdminSidebar: boolean;
  canViewDashboard: boolean;

  // ── Convenience ──
  isOwnerOrAdmin: boolean;
  isLoading: boolean;
}

/** Map of sidebar item URLs → required access checks */
export type SidebarItemKey =
  | 'dashboard' | 'leads' | 'quotes' | 'customers' | 'properties'
  | 'jobs' | 'visits' | 'invoices' | 'schedule' | 'requests'
  | 'activity' | 'employees' | 'subcontractors' | 'messaging'
  | 'finance' | 'settings' | 'incidents' | 'hr';

export function useModuleAccess(): ModuleAccess {
  const { permissions, isLoading: permLoading } = usePermissions();
  const auth = useAuthorization();

  return useMemo(() => {
    const has = (key: string) => permissions.includes(key as PermissionKey);
    const { roles, isLoading: authLoading } = auth;

    const isOwner = roles.includes('owner' as any);
    const isAdmin = roles.includes('admin' as any);
    const isAccountant = roles.includes('accountant' as any);
    const isHrAdmin = roles.includes('hr_admin' as any);
    const isOpsManager = roles.includes('ops_manager' as any) || roles.includes('manager' as any);
    const isWorker = roles.includes('staff' as any) || roles.includes('lead_worker' as any) || roles.includes('supervisor' as any) || roles.includes('dispatcher' as any);
    const isSubcontractor = roles.includes('subcontractor' as any);
    const isCustomer = roles.includes('customer' as any);

    const ownerOrAdmin = isOwner || isAdmin;

    // ── Finance ──
    const financeFullAccess = has('finance.manage') || ownerOrAdmin || isAccountant;
    const financeViewLimited = !financeFullAccess && (has('finance.view_limited') || isOpsManager);
    const financeNoAccess = !financeFullAccess && !financeViewLimited;

    // ── HR ──
    const hrFullAccess = has('hr.manage') || ownerOrAdmin || isHrAdmin;
    const hrViewLimited = !hrFullAccess && (has('hr.view_limited') || isOpsManager);
    const hrNoAccess = !hrFullAccess && !hrViewLimited;

    // ── Ops ──
    const opsFullAccess = has('ops.manage') || ownerOrAdmin || isOpsManager;
    const opsAssignedOnly = !opsFullAccess && (isWorker || isSubcontractor);
    const opsNoAccess = !opsFullAccess && !opsAssignedOnly;

    // ── Settings ──
    const settingsCompany = has('settings.company') || ownerOrAdmin;
    const settingsFinance = has('settings.finance') || ownerOrAdmin || isAccountant;
    const settingsOperations = has('settings.operations') || ownerOrAdmin || isOpsManager;
    const settingsIntegrations = has('settings.integrations') || ownerOrAdmin;
    const settingsRoles = has('settings.roles') || ownerOrAdmin;
    const settingsAudit = has('settings.audit') || ownerOrAdmin;
    const settingsAny = settingsCompany || settingsFinance || settingsOperations || settingsIntegrations || settingsRoles || settingsAudit;

    // ── Messaging ──
    const messagingAll = has('messaging.all') || ownerOrAdmin || isOpsManager;
    const messagingInternal = !messagingAll && (has('messaging.internal') || isAccountant || isHrAdmin);
    const messagingAssigned = !messagingAll && !messagingInternal && (isWorker || isSubcontractor);
    const messagingDisabled = isCustomer;

    // ── Admin sidebar ──
    const canAccessAdminSidebar = ownerOrAdmin || isAccountant || isHrAdmin || isOpsManager;
    const canViewDashboard = canAccessAdminSidebar;

    return {
      financeFullAccess, financeViewLimited, financeNoAccess,
      hrFullAccess, hrViewLimited, hrNoAccess,
      opsFullAccess, opsAssignedOnly, opsNoAccess,
      settingsCompany, settingsFinance, settingsOperations, settingsIntegrations,
      settingsRoles, settingsAudit, settingsAny,
      messagingAll, messagingInternal, messagingAssigned, messagingDisabled,
      canAccessAdminSidebar, canViewDashboard,
      isOwnerOrAdmin: ownerOrAdmin,
      isLoading: permLoading || authLoading,
    };
  }, [permissions, auth]);
}

/**
 * Returns which sidebar items should be visible for the current user.
 */
export function useSidebarAccess(): Record<SidebarItemKey, boolean> {
  const m = useModuleAccess();

  return useMemo(() => ({
    dashboard: m.canViewDashboard,
    leads: m.opsFullAccess,
    quotes: m.opsFullAccess,
    customers: m.opsFullAccess || m.financeViewLimited,
    properties: m.opsFullAccess,
    jobs: m.opsFullAccess,
    visits: m.opsFullAccess,
    invoices: m.opsFullAccess || m.financeFullAccess || m.financeViewLimited,
    schedule: m.opsFullAccess,
    requests: m.opsFullAccess,
    activity: m.isOwnerOrAdmin,
    employees: m.hrFullAccess || m.hrViewLimited,
    subcontractors: m.opsFullAccess || m.hrFullAccess,
    messaging: !m.messagingDisabled,
    finance: m.financeFullAccess || m.financeViewLimited,
    incidents: m.opsFullAccess || m.isOwnerOrAdmin || m.hrFullAccess,
    hr: m.hrFullAccess,
    settings: m.settingsAny,
  }), [m]);
}

/**
 * Returns which settings sidebar groups/items should be visible.
 */
export function useSettingsAccess() {
  const m = useModuleAccess();

  return useMemo(() => ({
    // Business Management
    companySettings: m.settingsCompany,
    productsServices: m.settingsCompany || m.settingsOperations,
    payments: m.settingsFinance,
    expenseTracking: m.settingsFinance,
    automations: m.isOwnerOrAdmin,

    // Team Organization
    manageTeam: m.hrFullAccess || m.isOwnerOrAdmin,
    rolesPermissions: m.settingsRoles,
    workSettings: m.settingsOperations,
    scheduleSettings: m.settingsOperations,
    routeOptimization: m.settingsOperations,
    jobForms: m.settingsOperations,

    // Client Communication
    clientHub: m.settingsCompany || m.settingsOperations,
    emailsTexts: m.settingsCompany,
    requestsBookings: m.settingsOperations,
    portalSettings: m.settingsCompany,

    // Connected Apps
    integrations: m.settingsIntegrations,
    connectedApps: m.settingsIntegrations,

    // Administration
    systemAnnouncements: m.isOwnerOrAdmin,
    auditLog: m.settingsAudit,
    seatUsage: m.isOwnerOrAdmin,
  }), [m]);
}
