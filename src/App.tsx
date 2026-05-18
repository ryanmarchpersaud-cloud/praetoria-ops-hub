import { lazy, Suspense, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useNavigate } from "react-router-dom";
import ScrollToTop from "@/components/ScrollToTop";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { PreviewModeBanner } from "@/components/PreviewModeBanner";
import { AppUpdateBanner } from "@/components/AppUpdateBanner";
import { ModuleGuard } from "@/components/ModuleGuard";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuthorization } from "@/hooks/useAuthorization";
import { AppLayout } from "@/components/AppLayout";
import { PortalLayout } from "@/components/PortalLayout";
import { SubcontractorLayout } from "@/components/subcontractor/SubcontractorLayout";
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

const queryClient = new QueryClient();

function RouteLoading() {
  return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
}

/** Returns a redirect to /change-password if the user has a temp password to change */
function useForcePasswordChangeRedirect() {
  const { user, mustChangePassword, mustChangePasswordChecked } = useAuth();
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

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { canAccessAdminPortal, isCustomer, isSubcontractor, isStaff, isActiveUser, isLoading } = useAuthorization();
  const forceChange = useForcePasswordChangeRedirect();
  if (loading || isLoading) return <RouteLoading />;
  if (!user) return <Navigate to="/login" replace />;
  if (forceChange) return forceChange;
  if (!isActiveUser) return <Navigate to="/access-denied" replace />;
  if (isSubcontractor && !canAccessAdminPortal) return <Navigate to="/subcontractor" replace />;
  if (isCustomer && !canAccessAdminPortal) return <Navigate to="/portal" replace />;
  if (isStaff && !canAccessAdminPortal) return <Navigate to="/worker" replace />;
  if (!canAccessAdminPortal) return <Navigate to="/access-denied" replace />;
  return <AppLayout>{children}</AppLayout>;
}

function StaffRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { isCustomer, isStaff, canAccessAdminPortal, isActiveUser, isLoading } = useAuthorization();
  const forceChange = useForcePasswordChangeRedirect();
  if (loading || isLoading) return <RouteLoading />;
  if (!user) return <Navigate to="/login" replace />;
  if (forceChange) return forceChange;
  if (!isActiveUser) return <Navigate to="/access-denied" replace />;
  if (isCustomer) return <Navigate to="/portal" replace />;
  if (!isStaff && !canAccessAdminPortal) return <Navigate to="/access-denied" replace />;
  return <AppLayout>{children}</AppLayout>;
}

function SignedInPortalRouteShell({ children }: { children: React.ReactNode }) {
  return <div className="signed-in-portal-route-shell">{children}</div>;
}

function WorkerRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { isCustomer, canAccessWorkerPortal, isActiveUser, isLoading } = useAuthorization();
  const forceChange = useForcePasswordChangeRedirect();
  if (loading || isLoading) return <RouteLoading />;
  if (!user) return <Navigate to="/login" replace />;
  if (forceChange) return forceChange;
  if (!isActiveUser) return <Navigate to="/access-denied" replace />;
  if (isCustomer) return <Navigate to="/portal/properties" replace />;
  if (!canAccessWorkerPortal) return <Navigate to="/access-denied" replace />;
  return <SignedInPortalRouteShell>{children}</SignedInPortalRouteShell>;
}

function PortalRoute({ children }: { children: React.ReactNode }) {
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
      <PortalLayout>{children}</PortalLayout>
    </>
  );
}

function SubcontractorRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { canAccessSubcontractorPortal, canAccessAdminPortal, isActiveUser, isLoading } = useAuthorization();
  const forceChange = useForcePasswordChangeRedirect();
  if (loading || isLoading) return <RouteLoading />;
  if (!user) return <Navigate to="/login" replace />;
  if (forceChange) return forceChange;
  if (!isActiveUser) return <Navigate to="/access-denied" replace />;
  if (!canAccessSubcontractorPortal && !canAccessAdminPortal) return <Navigate to="/access-denied" replace />;
  return <SignedInPortalRouteShell>{children}</SignedInPortalRouteShell>;
}

function LoginRoute() {
  const { user, loading, mustChangePassword, mustChangePasswordChecked } = useAuth();
  const { isCustomer, isStaff, isAdmin, isSubcontractor, canAccessAdminPortal, isLoading } = useAuthorization();
  if (loading || isLoading) {
    if (!user) return <Login />;
    return <RouteLoading />;
  }
  if (user) {
    if (mustChangePasswordChecked && mustChangePassword) {
      return <Navigate to="/change-password" replace />;
    }
    if (isSubcontractor && !canAccessAdminPortal) return <Navigate to="/subcontractor" replace />;
    if (isCustomer) return <Navigate to="/portal" replace />;
    if (isStaff && !canAccessAdminPortal) return <Navigate to="/worker" replace />;
    return <Navigate to="/" replace />;
  }
  return <Login />;
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

      {/* Admin-only routes */}
      {/* Dashboard — any admin-portal user */}
      <Route path="/" element={<AdminRoute><ModuleGuard module="dashboard"><Dashboard /></ModuleGuard></AdminRoute>} />
      <Route path="/admin/account-deletion-requests" element={<AdminRoute><AdminAccountDeletionRequestsPage /></AdminRoute>} />

      {/* Operations module — ops_manager, owner */}
      <Route path="/leads" element={<AdminRoute><ModuleGuard module="ops"><Leads /></ModuleGuard></AdminRoute>} />
      <Route path="/leads/:id" element={<AdminRoute><ModuleGuard module="ops"><LeadDetail /></ModuleGuard></AdminRoute>} />
      <Route path="/quotes" element={<AdminRoute><ModuleGuard module="ops"><Quotes /></ModuleGuard></AdminRoute>} />
      <Route path="/quotes/follow-ups" element={<AdminRoute><ModuleGuard module="ops"><QuoteFollowUps /></ModuleGuard></AdminRoute>} />
      <Route path="/quotes/:id" element={<AdminRoute><ModuleGuard module="ops"><QuoteDetail /></ModuleGuard></AdminRoute>} />
      <Route path="/quotes/:id/print" element={<AdminRoute><ModuleGuard module="ops"><QuotePrint /></ModuleGuard></AdminRoute>} />
      <Route path="/customers" element={<AdminRoute><ModuleGuard module="opsOrFinance"><Customers /></ModuleGuard></AdminRoute>} />
      <Route path="/customers/watchlist" element={<AdminRoute><ModuleGuard module="opsOrFinance"><CustomerWatchlistPage /></ModuleGuard></AdminRoute>} />
      <Route path="/personal-accounts" element={<AdminRoute><PersonalAccountsPage /></AdminRoute>} />
      <Route path="/customers/import" element={<AdminRoute><ModuleGuard module="opsOrFinance"><CustomersImport /></ModuleGuard></AdminRoute>} />
      <Route path="/customers/:id" element={<AdminRoute><ModuleGuard module="opsOrFinance"><CustomerDetail /></ModuleGuard></AdminRoute>} />
      <Route path="/properties" element={<AdminRoute><ModuleGuard module="ops"><Properties /></ModuleGuard></AdminRoute>} />
      <Route path="/properties/:id" element={<AdminRoute><ModuleGuard module="ops"><PropertyDetail /></ModuleGuard></AdminRoute>} />
      <Route path="/jobs" element={<AdminRoute><ModuleGuard module="ops"><Jobs /></ModuleGuard></AdminRoute>} />
      <Route path="/jobs/new" element={<AdminRoute><ModuleGuard module="ops"><JobNew /></ModuleGuard></AdminRoute>} />
      <Route path="/jobs/:id" element={<AdminRoute><ModuleGuard module="ops"><JobDetail /></ModuleGuard></AdminRoute>} />
      <Route path="/visits" element={<AdminRoute><ModuleGuard module="ops"><Visits /></ModuleGuard></AdminRoute>} />
      <Route path="/visits/:id" element={<AdminRoute><ModuleGuard module="ops"><VisitDetail /></ModuleGuard></AdminRoute>} />
      <Route path="/schedule" element={<AdminRoute><ModuleGuard module="ops"><Schedule /></ModuleGuard></AdminRoute>} />
      <Route path="/schedule/new-visits" element={<AdminRoute><ModuleGuard module="ops"><Suspense fallback={<RouteLoading />}><ScheduleNewVisits /></Suspense></ModuleGuard></AdminRoute>} />
      <Route path="/requests" element={<AdminRoute><ModuleGuard module="ops"><Requests /></ModuleGuard></AdminRoute>} />
      <Route path="/requests/:id" element={<AdminRoute><ModuleGuard module="ops"><RequestDetail /></ModuleGuard></AdminRoute>} />

      {/* Invoices — ops OR finance */}
      <Route path="/invoices" element={<AdminRoute><ModuleGuard module="opsOrFinance"><Invoices /></ModuleGuard></AdminRoute>} />
      <Route path="/invoices/new" element={<AdminRoute><ModuleGuard module="opsOrFinance"><InvoiceNew /></ModuleGuard></AdminRoute>} />
      <Route path="/invoices/:id/print" element={<AdminRoute><ModuleGuard module="opsOrFinance"><InvoicePrint /></ModuleGuard></AdminRoute>} />
      <Route path="/invoices/:id" element={<AdminRoute><ModuleGuard module="opsOrFinance"><InvoiceDetail /></ModuleGuard></AdminRoute>} />

      {/* Activity — owner/admin only */}
      <Route path="/activity" element={<AdminRoute><ModuleGuard module="ownerOnly"><ActivityPage /></ModuleGuard></AdminRoute>} />
      <Route path="/tasks" element={<AdminRoute><ModuleGuard module="ops"><Suspense fallback={<RouteLoading />}><TasksPage /></Suspense></ModuleGuard></AdminRoute>} />

      {/* HR / People module */}
      <Route path="/employees" element={<AdminRoute><ModuleGuard module="hr"><Employees /></ModuleGuard></AdminRoute>} />
      <Route path="/employees/:id" element={<AdminRoute><ModuleGuard module="hr"><EmployeeDetail /></ModuleGuard></AdminRoute>} />
      <Route path="/subcontractors" element={<AdminRoute><ModuleGuard module="ops"><Subcontractors /></ModuleGuard></AdminRoute>} />
      <Route path="/subcontractors/invoices" element={<AdminRoute><ModuleGuard module="ops"><AdminSubcontractorInvoicesPage /></ModuleGuard></AdminRoute>} />
      <Route path="/subcontractors/invoices/:id" element={<AdminRoute><ModuleGuard module="ops"><AdminSubcontractorInvoiceDetail /></ModuleGuard></AdminRoute>} />
      <Route path="/subcontractors/:id" element={<AdminRoute><ModuleGuard module="ops"><SubcontractorDetail /></ModuleGuard></AdminRoute>} />
      <Route path="/admin/subcontractor-pay-stub/:id/print" element={<AdminRoute><ModuleGuard module="ops"><SubcontractorPayStubPrint /></ModuleGuard></AdminRoute>} />

      {/* HR Workspace */}
      <Route path="/hr" element={<AdminRoute><ModuleGuard module="hr"><HRDashboardPage /></ModuleGuard></AdminRoute>} />
      <Route path="/hr/training" element={<AdminRoute><ModuleGuard module="hr"><TrainingCatalogPage /></ModuleGuard></AdminRoute>} />
      <Route path="/hr/training/:id" element={<AdminRoute><ModuleGuard module="hr"><TrainingCourseDetailPage /></ModuleGuard></AdminRoute>} />
      <Route path="/hr/compliance" element={<AdminRoute><ModuleGuard module="hr"><ComplianceOverviewPage /></ModuleGuard></AdminRoute>} />
      <Route path="/hr/contacts" element={<AdminRoute><ModuleGuard module="hr"><HRContactHubPage /></ModuleGuard></AdminRoute>} />
      <Route path="/hr/time-off" element={<AdminRoute><ModuleGuard module="hr"><HRTimeOffPage /></ModuleGuard></AdminRoute>} />
      <Route path="/hr/equipment" element={<AdminRoute><ModuleGuard module="hr"><HREquipmentPage /></ModuleGuard></AdminRoute>} />
      <Route path="/hr/documents" element={<AdminRoute><ModuleGuard module="hr"><HRDocumentsPage /></ModuleGuard></AdminRoute>} />
      <Route path="/hr/benefits" element={<AdminRoute><ModuleGuard module="hr"><HRBenefitsPage /></ModuleGuard></AdminRoute>} />
      <Route path="/hr/checklists" element={<AdminRoute><ModuleGuard module="hr"><HRChecklistsPage /></ModuleGuard></AdminRoute>} />
      <Route path="/hr/case-notes" element={<AdminRoute><ModuleGuard module="hr"><HRCaseNotesPage /></ModuleGuard></AdminRoute>} />
      <Route path="/hr/compensation" element={<AdminRoute><ModuleGuard module="hr"><HRCompensationPage /></ModuleGuard></AdminRoute>} />
      <Route path="/hr/sk-compliance" element={<AdminRoute><ModuleGuard module="hr"><HRComplianceWorkflowsPage /></ModuleGuard></AdminRoute>} />

      {/* Incidents — ops + HR access */}
      <Route path="/incidents" element={<AdminRoute><ModuleGuard module="opsOrHr"><AdminIncidentsPage /></ModuleGuard></AdminRoute>} />
      <Route path="/incidents/:id" element={<AdminRoute><ModuleGuard module="opsOrHr"><AdminIncidentDetailPage /></ModuleGuard></AdminRoute>} />

      {/* Messaging */}
      <Route path="/messaging" element={<AdminRoute><ModuleGuard module="messaging"><MessagingPage /></ModuleGuard></AdminRoute>} />

      {/* Finance Hub — full or view-limited */}
      <Route path="/finance" element={<AdminRoute><ModuleGuard module="finance"><Suspense fallback={<RouteLoading />}><FinanceDashboard /></Suspense></ModuleGuard></AdminRoute>} />
      <Route path="/finance/invoices" element={<AdminRoute><ModuleGuard module="finance"><Suspense fallback={<RouteLoading />}><FinanceInvoices /></Suspense></ModuleGuard></AdminRoute>} />
      <Route path="/finance/accounts-receivable" element={<AdminRoute><ModuleGuard module="finance"><Suspense fallback={<RouteLoading />}><FinanceAR /></Suspense></ModuleGuard></AdminRoute>} />
      <Route path="/finance/statements" element={<AdminRoute><ModuleGuard module="finance"><Suspense fallback={<RouteLoading />}><FinanceStatements /></Suspense></ModuleGuard></AdminRoute>} />
      <Route path="/finance/payments" element={<AdminRoute><ModuleGuard module="finance"><Suspense fallback={<RouteLoading />}><FinancePayments /></Suspense></ModuleGuard></AdminRoute>} />
      <Route path="/finance/payments/:id" element={<AdminRoute><ModuleGuard module="finance"><Suspense fallback={<RouteLoading />}><PaymentDetail /></Suspense></ModuleGuard></AdminRoute>} />
      {/* Finance full-access only pages */}
      <Route path="/finance/expenses" element={<AdminRoute><ModuleGuard module="financeFull"><Suspense fallback={<RouteLoading />}><FinanceExpenses /></Suspense></ModuleGuard></AdminRoute>} />
      <Route path="/finance/receipts" element={<AdminRoute><ModuleGuard module="financeFull"><Suspense fallback={<RouteLoading />}><FinanceReceipts /></Suspense></ModuleGuard></AdminRoute>} />
      <Route path="/finance/bills" element={<AdminRoute><ModuleGuard module="financeFull"><Suspense fallback={<RouteLoading />}><FinanceBills /></Suspense></ModuleGuard></AdminRoute>} />
      <Route path="/finance/vendors" element={<AdminRoute><ModuleGuard module="financeFull"><Suspense fallback={<RouteLoading />}><FinanceVendors /></Suspense></ModuleGuard></AdminRoute>} />
      <Route path="/finance/job-costing" element={<AdminRoute><ModuleGuard module="financeFull"><Suspense fallback={<RouteLoading />}><FinanceJobCosting /></Suspense></ModuleGuard></AdminRoute>} />
      <Route path="/finance/reports" element={<AdminRoute><ModuleGuard module="financeFull"><Suspense fallback={<RouteLoading />}><FinanceReports /></Suspense></ModuleGuard></AdminRoute>} />
      <Route path="/finance/accounts" element={<AdminRoute><ModuleGuard module="financeFull"><Suspense fallback={<RouteLoading />}><FinanceAccounts /></Suspense></ModuleGuard></AdminRoute>} />
      <Route path="/finance/reconciliation" element={<AdminRoute><ModuleGuard module="financeFull"><Suspense fallback={<RouteLoading />}><FinanceReconciliation /></Suspense></ModuleGuard></AdminRoute>} />
      <Route path="/finance/payroll" element={<AdminRoute><ModuleGuard module="financeFull"><Suspense fallback={<RouteLoading />}><FinancePayroll /></Suspense></ModuleGuard></AdminRoute>} />
      <Route path="/finance/subcontractor-payouts" element={<AdminRoute><ModuleGuard module="financeFull"><Suspense fallback={<RouteLoading />}><FinanceSubcontractorPayouts /></Suspense></ModuleGuard></AdminRoute>} />
      <Route path="/finance/remittances" element={<AdminRoute><ModuleGuard module="financeFull"><Suspense fallback={<RouteLoading />}><FinanceRemittances /></Suspense></ModuleGuard></AdminRoute>} />
      <Route path="/finance/tax-slips" element={<AdminRoute><ModuleGuard module="financeFull"><Suspense fallback={<RouteLoading />}><FinanceTaxSlips /></Suspense></ModuleGuard></AdminRoute>} />

      {/* Settings — guarded by settingsKey */}
      <Route path="/settings" element={<AdminRoute><ModuleGuard settingsKey="companySettings"><CompanySettingsPage /></ModuleGuard></AdminRoute>} />
      <Route path="/settings/integrations" element={<AdminRoute><ModuleGuard settingsKey="integrations"><SettingsIntegrationsPage /></ModuleGuard></AdminRoute>} />
      <Route path="/settings/auth-email-health" element={<AdminRoute><AuthEmailHealthPage /></AdminRoute>} />
      <Route path="/settings/users" element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
      <Route path="/settings/auth-activity" element={<AdminRoute><AuthActivityReportPage /></AdminRoute>} />
      <Route path="/settings/delete-account" element={<AdminRoute><SettingsDeleteAccountPage /></AdminRoute>} />
      <Route path="/settings/products" element={<AdminRoute><ModuleGuard settingsKey="productsServices"><ProductsServicesPage /></ModuleGuard></AdminRoute>} />
      <Route path="/settings/team" element={<AdminRoute><ModuleGuard settingsKey="manageTeam"><ManageTeamPage /></ModuleGuard></AdminRoute>} />
      <Route path="/settings/roles" element={<AdminRoute><ModuleGuard settingsKey="rolesPermissions"><RolesPermissionsPage /></ModuleGuard></AdminRoute>} />
      <Route path="/settings/audit-log" element={<AdminRoute><ModuleGuard settingsKey="auditLog"><AuditLogPage /></ModuleGuard></AdminRoute>} />
      <Route path="/settings/connected-apps" element={<AdminRoute><ModuleGuard settingsKey="connectedApps"><ConnectedAppsPage /></ModuleGuard></AdminRoute>} />
      <Route path="/settings/usage" element={<AdminRoute><ModuleGuard settingsKey="seatUsage"><SeatUsagePage /></ModuleGuard></AdminRoute>} />
      <Route path="/settings/payments" element={<AdminRoute><ModuleGuard settingsKey="payments"><PaymentsSettingsPage /></ModuleGuard></AdminRoute>} />
      <Route path="/settings/expenses" element={<AdminRoute><ModuleGuard settingsKey="expenseTracking"><ExpenseTrackingPage /></ModuleGuard></AdminRoute>} />
      <Route path="/settings/automations" element={<AdminRoute><ModuleGuard settingsKey="automations"><AutomationsPage /></ModuleGuard></AdminRoute>} />
      <Route path="/settings/work" element={<AdminRoute><ModuleGuard settingsKey="workSettings"><WorkSettingsPage /></ModuleGuard></AdminRoute>} />
      <Route path="/settings/schedule-settings" element={<AdminRoute><ModuleGuard settingsKey="scheduleSettings"><ScheduleSettingsPage /></ModuleGuard></AdminRoute>} />
      <Route path="/settings/routes" element={<AdminRoute><ModuleGuard settingsKey="routeOptimization"><RouteOptimizationPage /></ModuleGuard></AdminRoute>} />
      <Route path="/settings/job-forms" element={<AdminRoute><ModuleGuard settingsKey="jobForms"><JobFormsPage /></ModuleGuard></AdminRoute>} />
      <Route path="/settings/client-hub" element={<AdminRoute><ModuleGuard settingsKey="clientHub"><ClientHubPage /></ModuleGuard></AdminRoute>} />
      <Route path="/settings/messaging" element={<AdminRoute><ModuleGuard settingsKey="emailsTexts"><EmailsTextsPage /></ModuleGuard></AdminRoute>} />
      <Route path="/settings/requests-config" element={<AdminRoute><ModuleGuard settingsKey="requestsBookings"><RequestsBookingsPage /></ModuleGuard></AdminRoute>} />
      <Route path="/settings/portal" element={<AdminRoute><ModuleGuard settingsKey="portalSettings"><PortalSettingsPage /></ModuleGuard></AdminRoute>} />
      <Route path="/settings/announcements" element={<AdminRoute><ModuleGuard settingsKey="systemAnnouncements"><SystemAnnouncementsPage /></ModuleGuard></AdminRoute>} />

      {/* Agreements */}
      <Route path="/agreements" element={<AdminRoute><Suspense fallback={<RouteLoading />}><AgreementsPage /></Suspense></AdminRoute>} />
      <Route path="/agreements/:id" element={<AdminRoute><Suspense fallback={<RouteLoading />}><AgreementDetailPage /></Suspense></AdminRoute>} />
      {/* Public signing page — no auth required */}
      <Route path="/sign/:token" element={<Suspense fallback={<RouteLoading />}><AgreementSignPage /></Suspense>} />

      {/* Email Directory */}
      <Route path="/email-directory" element={<AdminRoute><ModuleGuard module="opsOrFinance"><EmailDirectoryPage /></ModuleGuard></AdminRoute>} />

      

      {/* Customer portal routes */}
      <Route path="/portal" element={<PortalRoute><PortalDashboard /></PortalRoute>} />
      <Route path="/portal/properties" element={<PortalRoute><PortalProperties /></PortalRoute>} />
      <Route path="/portal/properties/:id" element={<PortalRoute><PortalPropertyDetail /></PortalRoute>} />
      <Route path="/portal/quotes" element={<PortalRoute><PortalQuotes /></PortalRoute>} />
      <Route path="/portal/plan" element={<PortalRoute><PortalPlan /></PortalRoute>} />
      <Route path="/portal/visits" element={<PortalRoute><PortalVisits /></PortalRoute>} />
      <Route path="/portal/photos" element={<PortalRoute><PortalPhotos /></PortalRoute>} />
      <Route path="/portal/billing" element={<PortalRoute><PortalBilling /></PortalRoute>} />
      <Route path="/portal/requests" element={<PortalRoute><PortalRequests /></PortalRoute>} />
      <Route path="/portal/requests/:id" element={<PortalRoute><PortalRequestDetail /></PortalRoute>} />
      <Route path="/portal/requests/new" element={<PortalRoute><PortalRequestWizard /></PortalRoute>} />
      <Route path="/portal/account" element={<PortalRoute><PortalAccount /></PortalRoute>} />
      <Route path="/portal/preferences" element={<PortalRoute><PortalServicePreferences /></PortalRoute>} />
      <Route path="/portal/recurring" element={<PortalRoute><PortalRecurringServices /></PortalRoute>} />
      <Route path="/portal/referrals" element={<PortalRoute><PortalReferrals /></PortalRoute>} />
      <Route path="/portal/help" element={<PortalRoute><PortalHelpPage /></PortalRoute>} />
      <Route path="/portal/snow-history" element={<PortalRoute><PortalSnowHistory /></PortalRoute>} />
      <Route path="/snow-logs" element={<AdminRoute><ModuleGuard module="ops"><Suspense fallback={<RouteLoading />}><SnowLogArchivePage /></Suspense></ModuleGuard></AdminRoute>} />
      <Route path="/price-list" element={<AdminRoute><ModuleGuard module="ops"><Suspense fallback={<RouteLoading />}><LabourPriceListPage /></Suspense></ModuleGuard></AdminRoute>} />
      {/* Worker routes */}
      <Route path="/worker" element={<WorkerRoute><WorkerLayout><WorkerHome /></WorkerLayout></WorkerRoute>} />
      <Route path="/worker/schedule" element={<WorkerRoute><WorkerLayout><WorkerSchedule /></WorkerLayout></WorkerRoute>} />
      <Route path="/worker/timesheet" element={<WorkerRoute><WorkerLayout><WorkerTimesheet /></WorkerLayout></WorkerRoute>} />
      <Route path="/worker/search" element={<WorkerRoute><WorkerLayout><WorkerSearch /></WorkerLayout></WorkerRoute>} />
      <Route path="/worker/visit/:id" element={<WorkerRoute><WorkerLayout><WorkerVisitExec /></WorkerLayout></WorkerRoute>} />
      <Route path="/worker/property/:id" element={<WorkerRoute><WorkerLayout><WorkerPropertyDetail /></WorkerLayout></WorkerRoute>} />
      <Route path="/worker/job/:id" element={<WorkerRoute><WorkerLayout><WorkerJobDetail /></WorkerLayout></WorkerRoute>} />
      
      <Route path="/worker/more" element={<WorkerRoute><WorkerLayout><WorkerMore /></WorkerLayout></WorkerRoute>} />
      <Route path="/worker/profile" element={<WorkerRoute><WorkerLayout><WorkerProfilePage /></WorkerLayout></WorkerRoute>} />
      <Route path="/worker/employment" element={<WorkerRoute><WorkerLayout><WorkerEmploymentPage /></WorkerLayout></WorkerRoute>} />
      <Route path="/worker/documents" element={<WorkerRoute><WorkerLayout><WorkerDocumentsPage /></WorkerLayout></WorkerRoute>} />
      <Route path="/worker/benefits" element={<WorkerRoute><WorkerLayout><WorkerBenefitsPage /></WorkerLayout></WorkerRoute>} />
      <Route path="/worker/payroll" element={<WorkerRoute><WorkerLayout><WorkerPayrollPage /></WorkerLayout></WorkerRoute>} />
      <Route path="/worker/training" element={<WorkerRoute><WorkerLayout><WorkerTrainingPage /></WorkerLayout></WorkerRoute>} />
      <Route path="/worker/time-off" element={<WorkerRoute><WorkerLayout><WorkerTimeOffPage /></WorkerLayout></WorkerRoute>} />
      <Route path="/worker/emergency-contact" element={<WorkerRoute><WorkerLayout><WorkerEmergencyContactPage /></WorkerLayout></WorkerRoute>} />
      <Route path="/worker/safety" element={<WorkerRoute><WorkerLayout><WorkerSafetyPage /></WorkerLayout></WorkerRoute>} />
      <Route path="/worker/incidents" element={<WorkerRoute><WorkerLayout><WorkerIncidentsPage /></WorkerLayout></WorkerRoute>} />
      <Route path="/worker/incidents/new" element={<WorkerRoute><WorkerLayout><WorkerNewIncidentPage /></WorkerLayout></WorkerRoute>} />
      <Route path="/worker/incidents/:id" element={<WorkerRoute><WorkerLayout><WorkerIncidentDetailPage /></WorkerLayout></WorkerRoute>} />
      <Route path="/worker/tax-documents" element={<WorkerRoute><WorkerLayout><WorkerTaxDocsPage /></WorkerLayout></WorkerRoute>} />
      <Route path="/worker/training-safety" element={<WorkerRoute><WorkerLayout><WorkerTrainingSafetyPage /></WorkerLayout></WorkerRoute>} />
      <Route path="/worker/ppe" element={<WorkerRoute><WorkerLayout><WorkerPPEPage /></WorkerLayout></WorkerRoute>} />
      <Route path="/worker/courses" element={<WorkerRoute><WorkerLayout><WorkerCoursesPage /></WorkerLayout></WorkerRoute>} />
      <Route path="/worker/courses/:id" element={<WorkerRoute><WorkerLayout><WorkerCourseDetailPage /></WorkerLayout></WorkerRoute>} />
      <Route path="/worker/expenses" element={<WorkerRoute><WorkerLayout><WorkerExpensesPage /></WorkerLayout></WorkerRoute>} />
      <Route path="/worker/emergency-safety" element={<WorkerRoute><WorkerLayout><WorkerEmergencySafetyPage /></WorkerLayout></WorkerRoute>} />
      <Route path="/worker/settings" element={<WorkerRoute><WorkerLayout><WorkerSettings /></WorkerLayout></WorkerRoute>} />
      <Route path="/worker/messages" element={<WorkerRoute><WorkerLayout><WorkerMessagesPage /></WorkerLayout></WorkerRoute>} />
      <Route path="/worker/tasks" element={<WorkerRoute><WorkerLayout><Suspense fallback={<RouteLoading />}><WorkerTasksPage /></Suspense></WorkerLayout></WorkerRoute>} />

      {/* Subcontractor routes */}
      <Route path="/subcontractor" element={<SubcontractorRoute><SubcontractorLayout><SubcontractorHome /></SubcontractorLayout></SubcontractorRoute>} />
      <Route path="/subcontractor/schedule" element={<SubcontractorRoute><SubcontractorLayout><SubcontractorSchedule /></SubcontractorLayout></SubcontractorRoute>} />
      <Route path="/subcontractor/invoices" element={<SubcontractorRoute><SubcontractorLayout><SubcontractorInvoices /></SubcontractorLayout></SubcontractorRoute>} />
      <Route path="/subcontractor/documents" element={<SubcontractorRoute><SubcontractorLayout><SubcontractorDocuments /></SubcontractorLayout></SubcontractorRoute>} />
      <Route path="/subcontractor/more" element={<SubcontractorRoute><SubcontractorLayout><SubcontractorMore /></SubcontractorLayout></SubcontractorRoute>} />
      <Route path="/subcontractor/profile" element={<SubcontractorRoute><SubcontractorLayout><SubcontractorProfile /></SubcontractorLayout></SubcontractorRoute>} />
      <Route path="/subcontractor/company" element={<SubcontractorRoute><SubcontractorLayout><SubcontractorCompany /></SubcontractorLayout></SubcontractorRoute>} />
      <Route path="/subcontractor/compliance" element={<SubcontractorRoute><SubcontractorLayout><SubcontractorCompliance /></SubcontractorLayout></SubcontractorRoute>} />
      <Route path="/subcontractor/payments" element={<SubcontractorRoute><SubcontractorLayout><SubcontractorPayments /></SubcontractorLayout></SubcontractorRoute>} />
      <Route path="/subcontractor/support" element={<SubcontractorRoute><SubcontractorLayout><SubcontractorSupport /></SubcontractorLayout></SubcontractorRoute>} />
      <Route path="/subcontractor/settings" element={<SubcontractorRoute><SubcontractorLayout><SubcontractorSettings /></SubcontractorLayout></SubcontractorRoute>} />
      <Route path="/subcontractor/visit/:id" element={<SubcontractorRoute><SubcontractorLayout><SubcontractorVisitExec /></SubcontractorLayout></SubcontractorRoute>} />
      <Route path="/subcontractor/property/:id" element={<SubcontractorRoute><SubcontractorLayout><SubcontractorPropertyDetail /></SubcontractorLayout></SubcontractorRoute>} />
      <Route path="/subcontractor/invoices/:id" element={<SubcontractorRoute><SubcontractorLayout><SubcontractorInvoiceDetail /></SubcontractorLayout></SubcontractorRoute>} />
      <Route path="/subcontractor/safety" element={<SubcontractorRoute><SubcontractorLayout><SubcontractorSafetyPage /></SubcontractorLayout></SubcontractorRoute>} />
      <Route path="/subcontractor/incidents" element={<SubcontractorRoute><SubcontractorLayout><SubcontractorIncidentsPage /></SubcontractorLayout></SubcontractorRoute>} />
      <Route path="/subcontractor/incidents/new" element={<SubcontractorRoute><SubcontractorLayout><SubcontractorNewIncidentPage /></SubcontractorLayout></SubcontractorRoute>} />
      <Route path="/subcontractor/incidents/:id" element={<SubcontractorRoute><SubcontractorLayout><SubcontractorIncidentDetailPage /></SubcontractorLayout></SubcontractorRoute>} />
      <Route path="/subcontractor/tax-documents" element={<SubcontractorRoute><SubcontractorLayout><SubcontractorTaxDocsPage /></SubcontractorLayout></SubcontractorRoute>} />
      <Route path="/subcontractor/emergency-safety" element={<SubcontractorRoute><SubcontractorLayout><SubcontractorEmergencySafetyPage /></SubcontractorLayout></SubcontractorRoute>} />
      <Route path="/subcontractor/messages" element={<SubcontractorRoute><SubcontractorLayout><SubcontractorMessagesPage /></SubcontractorLayout></SubcontractorRoute>} />
      <Route path="/subcontractor/training" element={<SubcontractorRoute><SubcontractorLayout><SubcontractorTrainingPage /></SubcontractorLayout></SubcontractorRoute>} />
      <Route path="/subcontractor/training/:id" element={<SubcontractorRoute><SubcontractorLayout><WorkerCourseDetailPage backTo="/subcontractor/training" /></SubcontractorLayout></SubcontractorRoute>} />
      <Route path="/subcontractor/tasks" element={<SubcontractorRoute><SubcontractorLayout><Suspense fallback={<RouteLoading />}><WorkerTasksPage /></Suspense></SubcontractorLayout></SubcontractorRoute>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
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
