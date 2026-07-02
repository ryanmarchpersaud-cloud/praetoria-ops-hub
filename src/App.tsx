import { lazy, Suspense, useEffect, memo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useNavigate, Outlet } from "react-router-dom";
import ScrollToTop from "@/components/ScrollToTop";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { PreviewModeBanner } from "@/components/PreviewModeBanner";
import { AppUpdateBanner } from "@/components/AppUpdateBanner";
import { ModuleGuard } from "@/components/ModuleGuard";
import { useAuthorization } from "@/hooks/useAuthorization";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { AppLayout } from "@/components/AppLayout";
import { PortalLayout } from "@/components/PortalLayout";
import { SubcontractorLayout } from "@/components/subcontractor/SubcontractorLayout";
import { TenantLayout } from "@/components/tenant/TenantLayout";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import ChangePassword from "./pages/ChangePassword";
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/Leads";
import LeadDetail from "./pages/LeadDetail";
import Quotes from "./pages/Quotes";
import QuoteDetail from "./pages/QuoteDetail";
import QuotePrint from "./pages/QuotePrint";
import QuoteFollowUps from "./pages/QuoteFollowUps";
import Customers from "./pages/Customers";
import CustomerDetail from "./pages/CustomerDetail";
import CustomersImport from "./pages/CustomersImport";
import CustomerWatchlistPage from "./pages/CustomerWatchlistPage";
import PersonalAccountsPage from "./pages/PersonalAccountsPage";
import Properties from "./pages/Properties";
import PropertyDetail from "./pages/PropertyDetail";
import Jobs from "./pages/Jobs";
import JobNew from "./pages/JobNew";
import JobDetail from "./pages/JobDetail";
import Visits from "./pages/Visits";
import VisitDetail from "./pages/VisitDetail";
import ActivityPage from "./pages/ActivityPage";

import SettingsIntegrationsPage from "./pages/SettingsIntegrationsPage";
import AuthEmailHealthPage from "./pages/AuthEmailHealthPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import AuthActivityReportPage from "./pages/AuthActivityReportPage";
import SettingsDeleteAccountPage from "./pages/SettingsDeleteAccountPage";
import AccountPrivacyPage from "./pages/AccountPrivacyPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import AdminAccountDeletionRequestsPage from "./pages/AdminAccountDeletionRequestsPage";
import ManageTeamPage from "./pages/ManageTeamPage";
import Schedule from "./pages/Schedule";
const ScheduleNewVisits = lazy(() => import("./pages/ScheduleNewVisits"));
import Invoices from "./pages/Invoices";
import InvoiceDetail from "./pages/InvoiceDetail";
import InvoiceNew from "./pages/InvoiceNew";
import InvoicePrint from "./pages/InvoicePrint";
import Requests from "./pages/Requests";
import RequestDetail from "./pages/RequestDetail";
import RecurringEnrollmentRequests from "./pages/RecurringEnrollmentRequests";
import Employees from "./pages/Employees";
import EmployeeDetail from "./pages/EmployeeDetail";
import Subcontractors from "./pages/Subcontractors";
import SubcontractorDetail from "./pages/SubcontractorDetail";
import SubcontractorPayStubPrint from "./pages/SubcontractorPayStubPrint";
import AdminSubcontractorInvoiceDetail from "./pages/AdminSubcontractorInvoiceDetail";
import AdminSubcontractorInvoicesPage from "./pages/AdminSubcontractorInvoicesPage";
import EmailDirectoryPage from "./pages/EmailDirectoryPage";
import NotFound from "./pages/NotFound";
import AccessDenied from "./pages/AccessDenied";

// Portal pages
import PortalDashboard from "./pages/portal/PortalDashboard";
import PortalProperties from "./pages/portal/PortalProperties";
import PortalQuotes from "./pages/portal/PortalQuotes";
import PortalVisits from "./pages/portal/PortalVisits";
import PortalPlan from "./pages/portal/PortalPlan";
import PortalPhotos from "./pages/portal/PortalPhotos";
import PortalRequests from "./pages/portal/PortalRequests";
import PortalRequestWizard from "./pages/portal/PortalRequestWizard";
import PortalRequestDetail from "./pages/portal/PortalRequestDetail";
import PortalBilling from "./pages/portal/PortalBilling";
import PortalAccount from "./pages/portal/PortalAccount";
import PortalPropertyDetail from "./pages/portal/PortalPropertyDetail";
import PortalServicePreferences from "./pages/portal/PortalServicePreferences";
import PortalRecurringServices from "./pages/portal/PortalRecurringServices";
import PortalReferrals from "./pages/portal/PortalReferrals";
import PortalHelpPage from "./pages/portal/PortalHelpPage";
import PortalSnowHistory from "./pages/portal/PortalSnowHistory";
const PortalAgreementsPage = lazy(() => import("./pages/portal/PortalAgreementsPage"));
const SnowLogArchivePage = lazy(() => import("./pages/SnowLogArchivePage"));
const LabourPriceListPage = lazy(() => import("./pages/LabourPriceListPage"));

// Worker pages
import { WorkerLayout } from "./components/worker/WorkerLayout";
import WorkerHome from "./pages/worker/WorkerHome";
import WorkerSchedule from "./pages/worker/WorkerSchedule";
import WorkerTimesheet from "./pages/worker/WorkerTimesheet";
import WorkerPlaceholder from "./pages/worker/WorkerPlaceholder";
import WorkerSearch from "./pages/worker/WorkerSearch";
import WorkerMore from "./pages/worker/WorkerMore";
import WorkerVisitExec from "./pages/worker/WorkerVisitExec";
import WorkerPropertyDetail from "./pages/worker/WorkerPropertyDetail";
import WorkerJobDetail from "./pages/worker/WorkerJobDetail";

import WorkerSettings from "./pages/worker/WorkerSettings";
import WorkerProfilePage from "./pages/worker/WorkerProfilePage";
import WorkerEmploymentPage from "./pages/worker/WorkerEmploymentPage";
import WorkerDocumentsPage from "./pages/worker/WorkerDocumentsPage";
import WorkerBenefitsPage from "./pages/worker/WorkerBenefitsPage";
import WorkerPayrollPage from "./pages/worker/WorkerPayrollPage";
import WorkerTrainingPage from "./pages/worker/WorkerTrainingPage";
import WorkerTimeOffPage from "./pages/worker/WorkerTimeOffPage";
import WorkerEmergencyContactPage from "./pages/worker/WorkerEmergencyContactPage";
import WorkerSafetyPage from "./pages/worker/WorkerSafetyPage";
import WorkerTaxDocsPage from "./pages/worker/WorkerTaxDocsPage";
import WorkerTrainingSafetyPage from "./pages/worker/WorkerTrainingSafetyPage";
import WorkerPPEPage from "./pages/worker/WorkerPPEPage";
import WorkerIncidentsPage from "./pages/worker/WorkerIncidentsPage";
import WorkerNewIncidentPage from "./pages/worker/WorkerNewIncidentPage";
import WorkerIncidentDetailPage from "./pages/worker/WorkerIncidentDetailPage";
import WorkerExpensesPage from "./pages/worker/WorkerExpensesPage";
import WorkerEmergencySafetyPage from "./pages/worker/WorkerEmergencySafetyPage";
import WorkerMessagesPage from "./pages/worker/WorkerMessagesPage";
import WorkerAgreementsPage from "./pages/worker/WorkerAgreementsPage";

const TasksPage = lazy(() => import("./pages/TasksPage"));
const WorkerTasksPage = lazy(() => import("./pages/worker/WorkerTasksPage"));

// Subcontractor pages
import SubcontractorHome from "./pages/subcontractor/SubcontractorHome";
import SubcontractorSchedule from "./pages/subcontractor/SubcontractorSchedule";
import SubcontractorInvoices from "./pages/subcontractor/SubcontractorInvoices";
import SubcontractorDocuments from "./pages/subcontractor/SubcontractorDocuments";
import SubcontractorMore from "./pages/subcontractor/SubcontractorMore";
import SubcontractorProfile from "./pages/subcontractor/SubcontractorProfile";
import SubcontractorCompany from "./pages/subcontractor/SubcontractorCompany";
import SubcontractorCompliance from "./pages/subcontractor/SubcontractorCompliance";
import SubcontractorPayments from "./pages/subcontractor/SubcontractorPayments";
import SubcontractorSupport from "./pages/subcontractor/SubcontractorSupport";
import SubcontractorSettings from "./pages/subcontractor/SubcontractorSettings";
import SubcontractorVisitExec from "./pages/subcontractor/SubcontractorVisitExec";
import SubcontractorPropertyDetail from "./pages/subcontractor/SubcontractorPropertyDetail";
import SubcontractorInvoiceDetail from "./pages/subcontractor/SubcontractorInvoiceDetail";
import SubcontractorSafetyPage from "./pages/subcontractor/SubcontractorSafetyPage";
import SubcontractorTaxDocsPage from "./pages/subcontractor/SubcontractorTaxDocsPage";
import SubcontractorIncidentsPage from "./pages/subcontractor/SubcontractorIncidentsPage";
import SubcontractorNewIncidentPage from "./pages/subcontractor/SubcontractorNewIncidentPage";
import SubcontractorIncidentDetailPage from "./pages/subcontractor/SubcontractorIncidentDetailPage";
import SubcontractorEmergencySafetyPage from "./pages/subcontractor/SubcontractorEmergencySafetyPage";
import SubcontractorMessagesPage from "./pages/subcontractor/SubcontractorMessagesPage";
import SubcontractorAgreementsPage from "./pages/subcontractor/SubcontractorAgreementsPage";
import SubcontractorPayStubsPage from "./pages/subcontractor/SubcontractorPayStubsPage";

// Admin incident pages
import AdminIncidentsPage from "./pages/AdminIncidentsPage";
import AdminIncidentDetailPage from "./pages/AdminIncidentDetailPage";
import RolesPermissionsPage from "./pages/RolesPermissionsPage";
import AuditLogPage from "./pages/AuditLogPage";
import ConnectedAppsPage from "./pages/ConnectedAppsPage";
import SeatUsagePage from "./pages/SeatUsagePage";
import ProductsServicesPage from "./pages/ProductsServicesPage";
import CompanySettingsPage from "./pages/CompanySettingsPage";
import PaymentsSettingsPage from "./pages/PaymentsSettingsPage";
import ExpenseTrackingPage from "./pages/ExpenseTrackingPage";
import MessagingPage from "./pages/MessagingPage";
import AutomationsPage from "./pages/AutomationsPage";
import SystemAnnouncementsPage from "./pages/SystemAnnouncementsPage";
const AgreementsPage = lazy(() => import("./pages/AgreementsPage"));
const AgreementDetailPage = lazy(() => import("./pages/AgreementDetailPage"));
const AgreementSignPage = lazy(() => import("./pages/AgreementSignPage"));

// HR / Training pages
import HRDashboardPage from "./pages/HRDashboardPage";
import TrainingCatalogPage from "./pages/TrainingCatalogPage";
import TrainingCourseDetailPage from "./pages/TrainingCourseDetailPage";
import ComplianceOverviewPage from "./pages/ComplianceOverviewPage";
import HRContactHubPage from "./pages/hr/HRContactHubPage";
import HRTimeOffPage from "./pages/hr/HRTimeOffPage";
import HREquipmentPage from "./pages/hr/HREquipmentPage";
import HRDocumentsPage from "./pages/hr/HRDocumentsPage";
import HRBenefitsPage from "./pages/hr/HRBenefitsPage";
import HRChecklistsPage from "./pages/hr/HRChecklistsPage";
import HRCaseNotesPage from "./pages/hr/HRCaseNotesPage";
import HRCompensationPage from "./pages/hr/HRCompensationPage";
import HRComplianceWorkflowsPage from "./pages/hr/HRComplianceWorkflowsPage";
import WorkerCoursesPage from "./pages/worker/WorkerCoursesPage";
import WorkerCourseDetailPage from "./pages/worker/WorkerCourseDetailPage";
import SubcontractorTrainingPage from "./pages/subcontractor/SubcontractorTrainingPage";

// Finance pages
const FinanceDashboard = lazy(() => import("./pages/finance/FinanceDashboard"));
const FinanceExpenses = lazy(() => import("./pages/finance/FinanceExpenses"));
const FinanceReceipts = lazy(() => import("./pages/finance/FinanceReceipts"));
const FinanceBills = lazy(() => import("./pages/finance/FinanceBills"));
const FinanceVendors = lazy(() => import("./pages/finance/FinanceVendors"));
const FinanceJobCosting = lazy(() => import("./pages/finance/FinanceJobCosting"));
const FinanceReports = lazy(() => import("./pages/finance/FinanceReports"));
const FinanceAccounts = lazy(() => import("./pages/finance/FinanceAccounts"));
const FinanceReconciliation = lazy(() => import("./pages/finance/FinanceReconciliation"));
const FinancePayroll = lazy(() => import("./pages/finance/FinancePayroll"));
const FinanceSubcontractorPayouts = lazy(() => import("./pages/finance/FinanceSubcontractorPayouts"));
const FinanceRemittances = lazy(() => import("./pages/finance/FinanceRemittances"));
const FinanceTaxSlips = lazy(() => import("./pages/finance/FinanceTaxSlips"));
const FinanceInvoices = lazy(() => import("./pages/finance/FinanceInvoices"));
const FinanceAR = lazy(() => import("./pages/finance/FinanceAR"));
const FinanceStatements = lazy(() => import("./pages/finance/FinanceStatements"));
const FinancePayments = lazy(() => import("./pages/finance/FinancePayments"));
const PaymentDetail = lazy(() => import("./pages/finance/PaymentDetail"));

import WorkSettingsPage from "./pages/WorkSettingsPage";
import ScheduleSettingsPage from "./pages/ScheduleSettingsPage";
import RouteOptimizationPage from "./pages/RouteOptimizationPage";
import JobFormsPage from "./pages/JobFormsPage";
import ClientHubPage from "./pages/ClientHubPage";
import EmailsTextsPage from "./pages/EmailsTextsPage";
import RequestsBookingsPage from "./pages/RequestsBookingsPage";
import PortalSettingsPage from "./pages/PortalSettingsPage";

// Property Management (Phase 1 — Admin foundation)
const PMDashboard = lazy(() => import("./pages/property-management/PMDashboard"));
const PMPropertiesList = lazy(() => import("./pages/property-management/PMPropertiesList"));
const PMPropertyDetail = lazy(() => import("./pages/property-management/PMPropertyDetail"));
const PMUnitsList = lazy(() => import("./pages/property-management/PMUnitsList"));
const PMOwnersList = lazy(() => import("./pages/property-management/PMOwnersList"));
const PMOwnerDetail = lazy(() => import("./pages/property-management/PMOwnerDetail"));
const PMTenantsList = lazy(() => import("./pages/property-management/PMTenantsList"));
const PMTenantDetail = lazy(() => import("./pages/property-management/PMTenantDetail"));
const PMLeasesList = lazy(() => import("./pages/property-management/PMLeasesList"));
const PMLeaseDetail = lazy(() => import("./pages/property-management/PMLeaseDetail"));
const PMMaintenanceRequestsList = lazy(() => import("./pages/property-management/PMMaintenanceRequestsList"));
const PMMaintenanceRequestDetail = lazy(() => import("./pages/property-management/PMMaintenanceRequestDetail"));
const TenantHome = lazy(() => import("./pages/tenant/TenantHome"));
const TenantLease = lazy(() => import("./pages/tenant/TenantLease"));
const TenantMaintenanceList = lazy(() => import("./pages/tenant/TenantMaintenanceList"));
const TenantMaintenanceNew = lazy(() => import("./pages/tenant/TenantMaintenanceNew"));
const TenantMaintenanceDetail = lazy(() => import("./pages/tenant/TenantMaintenanceDetail"));
const TenantAccount = lazy(() => import("./pages/tenant/TenantAccount"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});

const RouteLoading = memo(function RouteLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
      Loading…
    </div>
  );
});

const RouteContentLoading = memo(function RouteContentLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center text-sm text-muted-foreground">
      Loading…
    </div>
  );
});

/** Returns a redirect to /change-password if the user has a temp password to change */
function useForcePasswordChangeRedirect() {
  const { user, mustChangePassword, mustChangePasswordChecked } = useAuth();
  if (user && !mustChangePasswordChecked) {
    return <RouteLoading />;
  }
  if (user && mustChangePasswordChecked && mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }
  return null;
}

/** Block inactive/archived users from all protected areas */
function ActiveGuard({ children }: { children: React.ReactNode }) {
  const { isActiveUser, isLoading } = useAuthorization();
  const { user, loading } = useAuth();
  const forceChange = useForcePasswordChangeRedirect();
  if (loading || isLoading) return <RouteLoading />;
  if (!user) return <Navigate to="/login" replace />;
  if (forceChange) return forceChange;
  if (!isActiveUser) return <Navigate to="/access-denied" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children?: React.ReactNode }) {
  const { user, loading, mustChangePassword, mustChangePasswordChecked } = useAuth();
  const { canAccessAdminPortal, isCustomer, isSubcontractor, isStaff, isActiveUser, isLoading } = useAuthorization();
  if (loading) return <RouteLoading />;
  if (!user) return <Navigate to="/login" replace />;
  if (!mustChangePasswordChecked) {
    return <AppLayout><RouteContentLoading /></AppLayout>;
  }
  if (mustChangePassword) return <Navigate to="/change-password" replace />;
  if (isLoading) {
    return <AppLayout><RouteContentLoading /></AppLayout>;
  }
  if (!isActiveUser) return <Navigate to="/access-denied" replace />;
  if (isSubcontractor && !canAccessAdminPortal) return <Navigate to="/subcontractor" replace />;
  if (isCustomer && !canAccessAdminPortal) return <Navigate to="/portal" replace />;
  if (isStaff && !canAccessAdminPortal) return <Navigate to="/worker" replace />;
  if (!canAccessAdminPortal) return <Navigate to="/access-denied" replace />;
  return <AppLayout>{children ?? <Outlet />}</AppLayout>;
}

function StaffRoute({ children }: { children?: React.ReactNode }) {
  const { user, loading, mustChangePassword, mustChangePasswordChecked } = useAuth();
  const { isCustomer, isStaff, canAccessAdminPortal, isActiveUser, isLoading } = useAuthorization();
  if (loading) return <RouteLoading />;
  if (!user) return <Navigate to="/login" replace />;
  if (!mustChangePasswordChecked) {
    return <AppLayout><RouteContentLoading /></AppLayout>;
  }
  if (mustChangePassword) return <Navigate to="/change-password" replace />;
  if (isLoading) {
    return <AppLayout><RouteContentLoading /></AppLayout>;
  }
  if (!isActiveUser) return <Navigate to="/access-denied" replace />;
  if (isCustomer) return <Navigate to="/portal" replace />;
  if (!isStaff && !canAccessAdminPortal) return <Navigate to="/access-denied" replace />;
  return <AppLayout>{children ?? <Outlet />}</AppLayout>;
}

function SignedInPortalRouteShell({ children }: { children: React.ReactNode }) {
  return <div className="signed-in-portal-route-shell">{children}</div>;
}

/**
 * Bare authenticated wrapper — any signed-in user (Admin, Worker,
 * Subcontractor, Customer) can pass. Used for the universal
 * /account-privacy page that Apple App Review must be able to reach
 * regardless of role.
 */
function AuthedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <RouteLoading />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function WorkerRoute({ children }: { children?: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { isCustomer, canAccessWorkerPortal, isActiveUser, isLoading } = useAuthorization();
  const forceChange = useForcePasswordChangeRedirect();
  if (loading || isLoading) return <RouteLoading />;
  if (!user) return <Navigate to="/login" replace />;
  if (forceChange) return forceChange;
  if (!isActiveUser) return <Navigate to="/access-denied" replace />;
  if (isCustomer) return <Navigate to="/portal/properties" replace />;
  if (!canAccessWorkerPortal) return <Navigate to="/access-denied" replace />;
  return (
    <SignedInPortalRouteShell>
      <WorkerLayout>{children ?? <Outlet />}</WorkerLayout>
    </SignedInPortalRouteShell>
  );
}

function PortalRoute({ children }: { children?: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { isCustomer, canAccessCustomerPortal, isStaff, isActiveUser, isLoading } = useAuthorization();
  const forceChange = useForcePasswordChangeRedirect();
  if (loading || isLoading) return <RouteLoading />;
  if (!user) return <Navigate to="/login" replace />;
  if (forceChange) return forceChange;
  if (!isActiveUser) return <Navigate to="/access-denied" replace />;
  if (!canAccessCustomerPortal) return <Navigate to="/access-denied" replace />;
  const isPreview = isStaff && !isCustomer;
  return (
    <>
      {isPreview && <PreviewModeBanner />}
      <PortalLayout>{children ?? <Outlet />}</PortalLayout>
    </>
  );
}

function SubcontractorRoute({ children }: { children?: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { canAccessSubcontractorPortal, canAccessAdminPortal, isActiveUser, isLoading } = useAuthorization();
  const forceChange = useForcePasswordChangeRedirect();
  if (loading || isLoading) return <RouteLoading />;
  if (!user) return <Navigate to="/login" replace />;
  if (forceChange) return forceChange;
  if (!isActiveUser) return <Navigate to="/access-denied" replace />;
  if (!canAccessSubcontractorPortal && !canAccessAdminPortal) return <Navigate to="/access-denied" replace />;
  return (
    <SignedInPortalRouteShell>
      <SubcontractorLayout>{children ?? <Outlet />}</SubcontractorLayout>
    </SignedInPortalRouteShell>
  );
}

function LoginRoute() {
  const { user, loading, mustChangePassword, mustChangePasswordChecked } = useAuth();
  const { isCustomer, isStaff, isSubcontractor, canAccessAdminPortal, isLoading } = useAuthorization();
  if (loading) return <RouteLoading />;
  if (!user) return <Login />;
  // User just signed in — don't flash a blank "Loading…" frame over the
  // login page while authorization resolves; render nothing so the
  // destination route's own AppLayout takes over without a remount flash.
  if (isLoading || !mustChangePasswordChecked) return null;
  if (mustChangePassword) return <Navigate to="/change-password" replace />;
  if (isSubcontractor && !canAccessAdminPortal) return <Navigate to="/subcontractor" replace />;
  if (isCustomer) return <Navigate to="/portal" replace />;
  if (isStaff && !canAccessAdminPortal) return <Navigate to="/worker" replace />;
  return <Navigate to="/" replace />;
}

function NativeDeepLinkHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const capacitor = (window as unknown as {
      Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string };
    }).Capacitor;

    if (!capacitor?.isNativePlatform?.()) return;

    let cancelled = false;
    let removeListener: (() => void) | undefined;

    const openDeepLink = (incomingUrl: string) => {
      try {
        const url = new URL(incomingUrl);
        const path = `${url.pathname}${url.search}${url.hash}`;

        if (url.pathname === "/reset-password") {
          navigate(path, { replace: true });
        }
      } catch {
        // Ignore malformed links from the native bridge.
      }
    };

    import("@capacitor/app").then(({ App }) => {
      if (cancelled) return;

      App.getLaunchUrl().then((launch) => {
        if (!cancelled && launch?.url) openDeepLink(launch.url);
      });

      App.addListener("appUrlOpen", ({ url }) => openDeepLink(url)).then((listener) => {
        removeListener = () => listener.remove();
      });
    });

    return () => {
      cancelled = true;
      removeListener?.();
    };
  }, [navigate]);

  return null;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/change-password" element={<ChangePassword />} />
      <Route path="/access-denied" element={<AccessDenied />} />

      {/* Public Privacy Policy — must remain accessible without login.
          Both /privacy-policy and /privacy resolve to the same page. */}
      <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
      <Route path="/privacy" element={<PrivacyPolicyPage />} />


      {/* Universal Account & Privacy / Delete Account — reachable by ANY
          authenticated user (Admin, Worker, Subcontractor, Customer).
          Required by Apple App Review Guideline 5.1.1(v). */}
      <Route
        path="/account-privacy"
        element={
          <AuthedRoute>
            <AccountPrivacyPage />
          </AuthedRoute>
        }
      />

      {/* Public signing page — no auth required */}
      <Route path="/sign/:token" element={<Suspense fallback={<RouteLoading />}><AgreementSignPage /></Suspense>} />

      {/* ───────────────────────── Admin layout group ─────────────────────────
          AdminRoute renders <AppLayout><Outlet/></AppLayout> ONCE. All admin
          child routes share that mounted layout, so navigating between them
          no longer remounts the sidebar/header (which previously caused the
          screen to blank and re-flash on every click). */}
      <Route element={<AdminRoute />}>
        <Route path="/" element={<ModuleGuard module="dashboard"><Dashboard /></ModuleGuard>} />
        <Route path="/admin/account-deletion-requests" element={<AdminAccountDeletionRequestsPage />} />

        <Route path="/leads" element={<ModuleGuard module="ops"><Leads /></ModuleGuard>} />
        <Route path="/leads/:id" element={<ModuleGuard module="ops"><LeadDetail /></ModuleGuard>} />
        <Route path="/quotes" element={<ModuleGuard module="ops"><Quotes /></ModuleGuard>} />
        <Route path="/quotes/follow-ups" element={<ModuleGuard module="ops"><QuoteFollowUps /></ModuleGuard>} />
        <Route path="/quotes/:id" element={<ModuleGuard module="ops"><QuoteDetail /></ModuleGuard>} />
        <Route path="/quotes/:id/print" element={<ModuleGuard module="ops"><QuotePrint /></ModuleGuard>} />
        <Route path="/customers" element={<ModuleGuard module="opsOrFinance"><Customers /></ModuleGuard>} />
        <Route path="/customers/watchlist" element={<ModuleGuard module="opsOrFinance"><CustomerWatchlistPage /></ModuleGuard>} />
        <Route path="/personal-accounts" element={<PersonalAccountsPage />} />
        <Route path="/customers/import" element={<ModuleGuard module="opsOrFinance"><CustomersImport /></ModuleGuard>} />
        <Route path="/customers/:id" element={<ModuleGuard module="opsOrFinance"><CustomerDetail /></ModuleGuard>} />
        <Route path="/properties" element={<ModuleGuard module="ops"><Properties /></ModuleGuard>} />
        <Route path="/properties/:id" element={<ModuleGuard module="ops"><PropertyDetail /></ModuleGuard>} />
        <Route path="/jobs" element={<ModuleGuard module="ops"><Jobs /></ModuleGuard>} />
        <Route path="/jobs/new" element={<ModuleGuard module="ops"><JobNew /></ModuleGuard>} />
        <Route path="/jobs/:id" element={<ModuleGuard module="ops"><JobDetail /></ModuleGuard>} />
        <Route path="/visits" element={<ModuleGuard module="ops"><Visits /></ModuleGuard>} />
        <Route path="/visits/:id" element={<ModuleGuard module="ops"><VisitDetail /></ModuleGuard>} />
        <Route path="/schedule" element={<ModuleGuard module="ops"><Schedule /></ModuleGuard>} />
        <Route path="/schedule/new-visits" element={<ModuleGuard module="ops"><Suspense fallback={<RouteLoading />}><ScheduleNewVisits /></Suspense></ModuleGuard>} />
        <Route path="/requests" element={<ModuleGuard module="ops"><Requests /></ModuleGuard>} />
        <Route path="/requests/recurring" element={<ModuleGuard module="ops"><RecurringEnrollmentRequests /></ModuleGuard>} />
        <Route path="/requests/:id" element={<ModuleGuard module="ops"><RequestDetail /></ModuleGuard>} />

        <Route path="/invoices" element={<ModuleGuard module="opsOrFinance"><Invoices /></ModuleGuard>} />
        <Route path="/invoices/new" element={<ModuleGuard module="opsOrFinance"><InvoiceNew /></ModuleGuard>} />
        <Route path="/invoices/:id/print" element={<ModuleGuard module="opsOrFinance"><InvoicePrint /></ModuleGuard>} />
        <Route path="/invoices/:id" element={<ModuleGuard module="opsOrFinance"><InvoiceDetail /></ModuleGuard>} />

        <Route path="/activity" element={<ModuleGuard module="ownerOnly"><ActivityPage /></ModuleGuard>} />
        <Route path="/tasks" element={<ModuleGuard module="ops"><Suspense fallback={<RouteLoading />}><TasksPage /></Suspense></ModuleGuard>} />

        <Route path="/employees" element={<ModuleGuard module="hr"><Employees /></ModuleGuard>} />
        <Route path="/employees/:id" element={<ModuleGuard module="hr"><EmployeeDetail /></ModuleGuard>} />
        <Route path="/subcontractors" element={<ModuleGuard module="ops"><Subcontractors /></ModuleGuard>} />
        <Route path="/subcontractors/invoices" element={<ModuleGuard module="ops"><AdminSubcontractorInvoicesPage /></ModuleGuard>} />
        <Route path="/subcontractors/invoices/:id" element={<ModuleGuard module="ops"><AdminSubcontractorInvoiceDetail /></ModuleGuard>} />
        <Route path="/subcontractors/:id" element={<ModuleGuard module="ops"><SubcontractorDetail /></ModuleGuard>} />
        

        <Route path="/hr" element={<ModuleGuard module="hr"><HRDashboardPage /></ModuleGuard>} />
        <Route path="/hr/training" element={<ModuleGuard module="hr"><TrainingCatalogPage /></ModuleGuard>} />
        <Route path="/hr/training/:id" element={<ModuleGuard module="hr"><TrainingCourseDetailPage /></ModuleGuard>} />
        <Route path="/hr/compliance" element={<ModuleGuard module="hr"><ComplianceOverviewPage /></ModuleGuard>} />
        <Route path="/hr/contacts" element={<ModuleGuard module="hr"><HRContactHubPage /></ModuleGuard>} />
        <Route path="/hr/time-off" element={<ModuleGuard module="hr"><HRTimeOffPage /></ModuleGuard>} />
        <Route path="/hr/equipment" element={<ModuleGuard module="hr"><HREquipmentPage /></ModuleGuard>} />
        <Route path="/hr/documents" element={<ModuleGuard module="hr"><HRDocumentsPage /></ModuleGuard>} />
        <Route path="/hr/benefits" element={<ModuleGuard module="hr"><HRBenefitsPage /></ModuleGuard>} />
        <Route path="/hr/checklists" element={<ModuleGuard module="hr"><HRChecklistsPage /></ModuleGuard>} />
        <Route path="/hr/case-notes" element={<ModuleGuard module="hr"><HRCaseNotesPage /></ModuleGuard>} />
        <Route path="/hr/compensation" element={<ModuleGuard module="hr"><HRCompensationPage /></ModuleGuard>} />
        <Route path="/hr/sk-compliance" element={<ModuleGuard module="hr"><HRComplianceWorkflowsPage /></ModuleGuard>} />

        <Route path="/incidents" element={<ModuleGuard module="opsOrHr"><AdminIncidentsPage /></ModuleGuard>} />
        <Route path="/incidents/:id" element={<ModuleGuard module="opsOrHr"><AdminIncidentDetailPage /></ModuleGuard>} />

        <Route path="/messaging" element={<ModuleGuard module="messaging"><MessagingPage /></ModuleGuard>} />

        <Route path="/finance" element={<ModuleGuard module="finance"><Suspense fallback={<RouteLoading />}><FinanceDashboard /></Suspense></ModuleGuard>} />
        <Route path="/finance/invoices" element={<ModuleGuard module="finance"><Suspense fallback={<RouteLoading />}><FinanceInvoices /></Suspense></ModuleGuard>} />
        <Route path="/finance/accounts-receivable" element={<ModuleGuard module="finance"><Suspense fallback={<RouteLoading />}><FinanceAR /></Suspense></ModuleGuard>} />
        <Route path="/finance/statements" element={<ModuleGuard module="finance"><Suspense fallback={<RouteLoading />}><FinanceStatements /></Suspense></ModuleGuard>} />
        <Route path="/finance/payments" element={<ModuleGuard module="finance"><Suspense fallback={<RouteLoading />}><FinancePayments /></Suspense></ModuleGuard>} />
        <Route path="/finance/payments/:id" element={<ModuleGuard module="finance"><Suspense fallback={<RouteLoading />}><PaymentDetail /></Suspense></ModuleGuard>} />
        <Route path="/finance/expenses" element={<ModuleGuard module="financeFull"><Suspense fallback={<RouteLoading />}><FinanceExpenses /></Suspense></ModuleGuard>} />
        <Route path="/finance/receipts" element={<ModuleGuard module="financeFull"><Suspense fallback={<RouteLoading />}><FinanceReceipts /></Suspense></ModuleGuard>} />
        <Route path="/finance/bills" element={<ModuleGuard module="financeFull"><Suspense fallback={<RouteLoading />}><FinanceBills /></Suspense></ModuleGuard>} />
        <Route path="/finance/vendors" element={<ModuleGuard module="financeFull"><Suspense fallback={<RouteLoading />}><FinanceVendors /></Suspense></ModuleGuard>} />
        <Route path="/finance/job-costing" element={<ModuleGuard module="financeFull"><Suspense fallback={<RouteLoading />}><FinanceJobCosting /></Suspense></ModuleGuard>} />
        <Route path="/finance/reports" element={<ModuleGuard module="financeFull"><Suspense fallback={<RouteLoading />}><FinanceReports /></Suspense></ModuleGuard>} />
        <Route path="/finance/accounts" element={<ModuleGuard module="financeFull"><Suspense fallback={<RouteLoading />}><FinanceAccounts /></Suspense></ModuleGuard>} />
        <Route path="/finance/reconciliation" element={<ModuleGuard module="financeFull"><Suspense fallback={<RouteLoading />}><FinanceReconciliation /></Suspense></ModuleGuard>} />
        <Route path="/finance/payroll" element={<ModuleGuard module="financeFull"><Suspense fallback={<RouteLoading />}><FinancePayroll /></Suspense></ModuleGuard>} />
        <Route path="/finance/subcontractor-payouts" element={<ModuleGuard module="financeFull"><Suspense fallback={<RouteLoading />}><FinanceSubcontractorPayouts /></Suspense></ModuleGuard>} />
        <Route path="/finance/remittances" element={<ModuleGuard module="financeFull"><Suspense fallback={<RouteLoading />}><FinanceRemittances /></Suspense></ModuleGuard>} />
        <Route path="/finance/tax-slips" element={<ModuleGuard module="financeFull"><Suspense fallback={<RouteLoading />}><FinanceTaxSlips /></Suspense></ModuleGuard>} />

        <Route path="/settings" element={<ModuleGuard settingsKey="companySettings"><CompanySettingsPage /></ModuleGuard>} />
        <Route path="/settings/integrations" element={<ModuleGuard settingsKey="integrations"><SettingsIntegrationsPage /></ModuleGuard>} />
        <Route path="/settings/auth-email-health" element={<AuthEmailHealthPage />} />
        <Route path="/settings/users" element={<AdminUsersPage />} />
        <Route path="/settings/auth-activity" element={<AuthActivityReportPage />} />
        <Route path="/settings/delete-account" element={<SettingsDeleteAccountPage />} />
        <Route path="/settings/products" element={<ModuleGuard settingsKey="productsServices"><ProductsServicesPage /></ModuleGuard>} />
        <Route path="/settings/team" element={<ModuleGuard settingsKey="manageTeam"><ManageTeamPage /></ModuleGuard>} />
        <Route path="/settings/roles" element={<ModuleGuard settingsKey="rolesPermissions"><RolesPermissionsPage /></ModuleGuard>} />
        <Route path="/settings/audit-log" element={<ModuleGuard settingsKey="auditLog"><AuditLogPage /></ModuleGuard>} />
        <Route path="/settings/connected-apps" element={<ModuleGuard settingsKey="connectedApps"><ConnectedAppsPage /></ModuleGuard>} />
        <Route path="/settings/usage" element={<ModuleGuard settingsKey="seatUsage"><SeatUsagePage /></ModuleGuard>} />
        <Route path="/settings/payments" element={<ModuleGuard settingsKey="payments"><PaymentsSettingsPage /></ModuleGuard>} />
        <Route path="/settings/expenses" element={<ModuleGuard settingsKey="expenseTracking"><ExpenseTrackingPage /></ModuleGuard>} />
        <Route path="/settings/automations" element={<ModuleGuard settingsKey="automations"><AutomationsPage /></ModuleGuard>} />
        <Route path="/settings/work" element={<ModuleGuard settingsKey="workSettings"><WorkSettingsPage /></ModuleGuard>} />
        <Route path="/settings/schedule-settings" element={<ModuleGuard settingsKey="scheduleSettings"><ScheduleSettingsPage /></ModuleGuard>} />
        <Route path="/settings/routes" element={<ModuleGuard settingsKey="routeOptimization"><RouteOptimizationPage /></ModuleGuard>} />
        <Route path="/settings/job-forms" element={<ModuleGuard settingsKey="jobForms"><JobFormsPage /></ModuleGuard>} />
        <Route path="/settings/client-hub" element={<ModuleGuard settingsKey="clientHub"><ClientHubPage /></ModuleGuard>} />
        <Route path="/settings/messaging" element={<ModuleGuard settingsKey="emailsTexts"><EmailsTextsPage /></ModuleGuard>} />
        <Route path="/settings/requests-config" element={<ModuleGuard settingsKey="requestsBookings"><RequestsBookingsPage /></ModuleGuard>} />
        <Route path="/settings/portal" element={<ModuleGuard settingsKey="portalSettings"><PortalSettingsPage /></ModuleGuard>} />
        <Route path="/settings/announcements" element={<ModuleGuard settingsKey="systemAnnouncements"><SystemAnnouncementsPage /></ModuleGuard>} />

        <Route path="/agreements" element={<Suspense fallback={<RouteLoading />}><AgreementsPage /></Suspense>} />
        <Route path="/agreements/:id" element={<Suspense fallback={<RouteLoading />}><AgreementDetailPage /></Suspense>} />

        <Route path="/email-directory" element={<ModuleGuard module="opsOrFinance"><EmailDirectoryPage /></ModuleGuard>} />

        <Route path="/snow-logs" element={<ModuleGuard module="ops"><Suspense fallback={<RouteLoading />}><SnowLogArchivePage /></Suspense></ModuleGuard>} />
        <Route path="/price-list" element={<ModuleGuard module="ops"><Suspense fallback={<RouteLoading />}><LabourPriceListPage /></Suspense></ModuleGuard>} />

        {/* ── Property Management (Phase 1 — Admin/Owner only) ── */}
        <Route path="/property-management" element={<ModuleGuard module="ownerOnly"><Suspense fallback={<RouteLoading />}><PMDashboard /></Suspense></ModuleGuard>} />
        <Route path="/property-management/properties" element={<ModuleGuard module="ownerOnly"><Suspense fallback={<RouteLoading />}><PMPropertiesList /></Suspense></ModuleGuard>} />
        <Route path="/property-management/properties/:id" element={<ModuleGuard module="ownerOnly"><Suspense fallback={<RouteLoading />}><PMPropertyDetail /></Suspense></ModuleGuard>} />
        <Route path="/property-management/units" element={<ModuleGuard module="ownerOnly"><Suspense fallback={<RouteLoading />}><PMUnitsList /></Suspense></ModuleGuard>} />
        <Route path="/property-management/owners" element={<ModuleGuard module="ownerOnly"><Suspense fallback={<RouteLoading />}><PMOwnersList /></Suspense></ModuleGuard>} />
        <Route path="/property-management/owners/:id" element={<ModuleGuard module="ownerOnly"><Suspense fallback={<RouteLoading />}><PMOwnerDetail /></Suspense></ModuleGuard>} />
        <Route path="/property-management/tenants" element={<ModuleGuard module="ownerOnly"><Suspense fallback={<RouteLoading />}><PMTenantsList /></Suspense></ModuleGuard>} />
        <Route path="/property-management/tenants/:id" element={<ModuleGuard module="ownerOnly"><Suspense fallback={<RouteLoading />}><PMTenantDetail /></Suspense></ModuleGuard>} />
        <Route path="/property-management/leases" element={<ModuleGuard module="ownerOnly"><Suspense fallback={<RouteLoading />}><PMLeasesList /></Suspense></ModuleGuard>} />
        <Route path="/property-management/leases/:id" element={<ModuleGuard module="ownerOnly"><Suspense fallback={<RouteLoading />}><PMLeaseDetail /></Suspense></ModuleGuard>} />
      </Route>

      {/* ───────────────────────── Customer portal layout group ───────────────── */}
      <Route element={<PortalRoute />}>
        <Route path="/portal" element={<PortalDashboard />} />
        <Route path="/portal/properties" element={<PortalProperties />} />
        <Route path="/portal/properties/:id" element={<PortalPropertyDetail />} />
        <Route path="/portal/quotes" element={<PortalQuotes />} />
        <Route path="/portal/plan" element={<PortalPlan />} />
        <Route path="/portal/visits" element={<PortalVisits />} />
        <Route path="/portal/photos" element={<PortalPhotos />} />
        <Route path="/portal/billing" element={<PortalBilling />} />
        <Route path="/portal/requests" element={<PortalRequests />} />
        <Route path="/portal/requests/:id" element={<PortalRequestDetail />} />
        <Route path="/portal/requests/new" element={<PortalRequestWizard />} />
        <Route path="/portal/account" element={<PortalAccount />} />
        <Route path="/portal/preferences" element={<PortalServicePreferences />} />
        <Route path="/portal/recurring" element={<PortalRecurringServices />} />
        <Route path="/portal/referrals" element={<PortalReferrals />} />
        <Route path="/portal/help" element={<PortalHelpPage />} />
        <Route path="/portal/snow-history" element={<PortalSnowHistory />} />
      </Route>

      {/* Customer-facing invoice PDF view — RLS restricts to own invoices only */}
      <Route path="/portal/invoices/:id/print" element={<AuthedRoute><InvoicePrint /></AuthedRoute>} />

      {/* Subcontractor pay stub PDF view — standalone (no admin shell) so the
          print preview is clean and shows only the pay stub. */}
      <Route path="/admin/subcontractor-pay-stub/:id/print" element={<AuthedRoute><SubcontractorPayStubPrint /></AuthedRoute>} />

      {/* ───────────────────────── Worker layout group ─────────────────────── */}
      <Route element={<WorkerRoute />}>
        <Route path="/worker" element={<WorkerHome />} />
        <Route path="/worker/schedule" element={<WorkerSchedule />} />
        <Route path="/worker/timesheet" element={<WorkerTimesheet />} />
        <Route path="/worker/search" element={<WorkerSearch />} />
        <Route path="/worker/visit/:id" element={<WorkerVisitExec />} />
        <Route path="/worker/property/:id" element={<WorkerPropertyDetail />} />
        <Route path="/worker/job/:id" element={<WorkerJobDetail />} />
        <Route path="/worker/more" element={<WorkerMore />} />
        <Route path="/worker/profile" element={<WorkerProfilePage />} />
        <Route path="/worker/employment" element={<WorkerEmploymentPage />} />
        <Route path="/worker/documents" element={<WorkerDocumentsPage />} />
        <Route path="/worker/benefits" element={<WorkerBenefitsPage />} />
        <Route path="/worker/payroll" element={<WorkerPayrollPage />} />
        <Route path="/worker/training" element={<WorkerTrainingPage />} />
        <Route path="/worker/time-off" element={<WorkerTimeOffPage />} />
        <Route path="/worker/emergency-contact" element={<WorkerEmergencyContactPage />} />
        <Route path="/worker/safety" element={<WorkerSafetyPage />} />
        <Route path="/worker/incidents" element={<WorkerIncidentsPage />} />
        <Route path="/worker/incidents/new" element={<WorkerNewIncidentPage />} />
        <Route path="/worker/incidents/:id" element={<WorkerIncidentDetailPage />} />
        <Route path="/worker/tax-documents" element={<WorkerTaxDocsPage />} />
        <Route path="/worker/training-safety" element={<WorkerTrainingSafetyPage />} />
        <Route path="/worker/ppe" element={<WorkerPPEPage />} />
        <Route path="/worker/courses" element={<WorkerCoursesPage />} />
        <Route path="/worker/courses/:id" element={<WorkerCourseDetailPage />} />
        <Route path="/worker/expenses" element={<WorkerExpensesPage />} />
        <Route path="/worker/emergency-safety" element={<WorkerEmergencySafetyPage />} />
        <Route path="/worker/settings" element={<WorkerSettings />} />
        <Route path="/worker/messages" element={<WorkerMessagesPage />} />
        <Route path="/worker/tasks" element={<Suspense fallback={<RouteLoading />}><WorkerTasksPage /></Suspense>} />
      </Route>

      {/* ───────────────────────── Subcontractor layout group ──────────────── */}
      <Route element={<SubcontractorRoute />}>
        <Route path="/subcontractor" element={<SubcontractorHome />} />
        <Route path="/subcontractor/schedule" element={<SubcontractorSchedule />} />
        <Route path="/subcontractor/invoices" element={<SubcontractorInvoices />} />
        <Route path="/subcontractor/documents" element={<SubcontractorDocuments />} />
        <Route path="/subcontractor/more" element={<SubcontractorMore />} />
        <Route path="/subcontractor/profile" element={<SubcontractorProfile />} />
        <Route path="/subcontractor/company" element={<SubcontractorCompany />} />
        <Route path="/subcontractor/compliance" element={<SubcontractorCompliance />} />
        <Route path="/subcontractor/payments" element={<SubcontractorPayments />} />
        <Route path="/subcontractor/pay-stubs" element={<SubcontractorPayStubsPage />} />
        <Route path="/subcontractor/support" element={<SubcontractorSupport />} />
        <Route path="/subcontractor/settings" element={<SubcontractorSettings />} />
        <Route path="/subcontractor/visit/:id" element={<SubcontractorVisitExec />} />
        <Route path="/subcontractor/property/:id" element={<SubcontractorPropertyDetail />} />
        <Route path="/subcontractor/invoices/:id" element={<SubcontractorInvoiceDetail />} />
        <Route path="/subcontractor/safety" element={<SubcontractorSafetyPage />} />
        <Route path="/subcontractor/incidents" element={<SubcontractorIncidentsPage />} />
        <Route path="/subcontractor/incidents/new" element={<SubcontractorNewIncidentPage />} />
        <Route path="/subcontractor/incidents/:id" element={<SubcontractorIncidentDetailPage />} />
        <Route path="/subcontractor/tax-documents" element={<SubcontractorTaxDocsPage />} />
        <Route path="/subcontractor/emergency-safety" element={<SubcontractorEmergencySafetyPage />} />
        <Route path="/subcontractor/messages" element={<SubcontractorMessagesPage />} />
        <Route path="/subcontractor/training" element={<SubcontractorTrainingPage />} />
        <Route path="/subcontractor/training/:id" element={<WorkerCourseDetailPage backTo="/subcontractor/training" />} />
        <Route path="/subcontractor/tasks" element={<Suspense fallback={<RouteLoading />}><WorkerTasksPage /></Suspense>} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

import GoogleAnalytics from '@/components/GoogleAnalytics';

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <GoogleAnalytics />
          <NativeDeepLinkHandler />
          <ScrollToTop />
          <AppUpdateBanner />
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
