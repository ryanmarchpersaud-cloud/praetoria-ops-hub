import { Navigate } from 'react-router-dom';
import { useModuleAccess, useSettingsAccess } from '@/hooks/useModuleAccess';

/**
 * Page-level guard that wraps admin routes.
 * Checks module-level access AFTER AdminRoute has already verified portal access.
 * Redirects to /access-denied if the user lacks the required module permission.
 *
 * Usage:
 *   <ModuleGuard module="finance">        → financeFullAccess || financeViewLimited
 *   <ModuleGuard module="financeFull">     → financeFullAccess only (no view-limited)
 *   <ModuleGuard module="hr">             → hrFullAccess || hrViewLimited
 *   <ModuleGuard module="hrFull">          → hrFullAccess only
 *   <ModuleGuard module="ops">            → opsFullAccess
 *   <ModuleGuard module="ownerOnly">      → isOwnerOrAdmin only
 *   <ModuleGuard module="messaging">      → !messagingDisabled
 *   <ModuleGuard settingsKey="...">       → specific settings sub-page access
 */

type ModuleType =
  | 'finance' | 'financeFull'
  | 'hr' | 'hrFull'
  | 'ops'
  | 'ownerOnly'
  | 'messaging'
  | 'dashboard';

type SettingsKey =
  | 'companySettings' | 'productsServices' | 'payments' | 'expenseTracking' | 'automations'
  | 'manageTeam' | 'rolesPermissions' | 'workSettings' | 'scheduleSettings'
  | 'routeOptimization' | 'jobForms'
  | 'clientHub' | 'emailsTexts' | 'requestsBookings' | 'portalSettings'
  | 'integrations' | 'connectedApps'
  | 'systemAnnouncements' | 'auditLog' | 'seatUsage';

interface ModuleGuardProps {
  children: React.ReactNode;
  /** Module-level access check */
  module?: ModuleType;
  /** Settings sub-page access check (uses useSettingsAccess) */
  settingsKey?: SettingsKey;
}

export function ModuleGuard({ children, module, settingsKey }: ModuleGuardProps) {
  const access = useModuleAccess();
  const settingsAccess = useSettingsAccess();

  if (access.isLoading) return null; // AdminRoute already shows loading

  let allowed = true;

  if (module) {
    switch (module) {
      case 'dashboard':
        allowed = access.canViewDashboard;
        break;
      case 'finance':
        allowed = access.financeFullAccess || access.financeViewLimited;
        break;
      case 'financeFull':
        allowed = access.financeFullAccess;
        break;
      case 'hr':
        allowed = access.hrFullAccess || access.hrViewLimited;
        break;
      case 'hrFull':
        allowed = access.hrFullAccess;
        break;
      case 'ops':
        allowed = access.opsFullAccess;
        break;
      case 'ownerOnly':
        allowed = access.isOwnerOrAdmin;
        break;
      case 'messaging':
        allowed = !access.messagingDisabled;
        break;
    }
  }

  if (settingsKey) {
    allowed = allowed && settingsAccess[settingsKey];
  }

  if (!allowed) {
    return <Navigate to="/access-denied" replace />;
  }

  return <>{children}</>;
}
