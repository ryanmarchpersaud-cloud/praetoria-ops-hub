import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { PreviewModeBanner } from "@/components/PreviewModeBanner";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuthorization } from "@/hooks/useAuthorization";
import { AppLayout } from "@/components/AppLayout";
import { PortalLayout } from "@/components/PortalLayout";
import { SubcontractorLayout } from "@/components/subcontractor/SubcontractorLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/Leads";
import LeadDetail from "./pages/LeadDetail";
import Quotes from "./pages/Quotes";
import QuoteDetail from "./pages/QuoteDetail";
import QuotePrint from "./pages/QuotePrint";
import Customers from "./pages/Customers";
import CustomerDetail from "./pages/CustomerDetail";
import Properties from "./pages/Properties";
import PropertyDetail from "./pages/PropertyDetail";
import Jobs from "./pages/Jobs";
import JobDetail from "./pages/JobDetail";
import Visits from "./pages/Visits";
import VisitDetail from "./pages/VisitDetail";
import ActivityPage from "./pages/ActivityPage";

import SettingsIntegrationsPage from "./pages/SettingsIntegrationsPage";
import ManageTeamPage from "./pages/ManageTeamPage";
import Schedule from "./pages/Schedule";
import Invoices from "./pages/Invoices";
import InvoiceDetail from "./pages/InvoiceDetail";
import Requests from "./pages/Requests";
import RequestDetail from "./pages/RequestDetail";
import Employees from "./pages/Employees";
import EmployeeDetail from "./pages/EmployeeDetail";
import Subcontractors from "./pages/Subcontractors";
import SubcontractorDetail from "./pages/SubcontractorDetail";
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
import PortalBilling from "./pages/portal/PortalBilling";
import PortalAccount from "./pages/portal/PortalAccount";
import PortalPropertyDetail from "./pages/portal/PortalPropertyDetail";
import PortalServicePreferences from "./pages/portal/PortalServicePreferences";
import PortalRecurringServices from "./pages/portal/PortalRecurringServices";
import PortalReferrals from "./pages/portal/PortalReferrals";

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
import WorkerWeatherDetail from "./pages/worker/WorkerWeatherDetail";
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
import WeatherDetail from "./pages/WeatherDetail";

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
import AutomationsPage from "./pages/AutomationsPage";

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

/** Block inactive/archived users from all protected areas */
function ActiveGuard({ children }: { children: React.ReactNode }) {
  const { isActiveUser, isLoading } = useAuthorization();
  const { user, loading } = useAuth();
  if (loading || isLoading) return <RouteLoading />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isActiveUser) return <Navigate to="/access-denied" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { canAccessAdminPortal, isCustomer, isSubcontractor, isStaff, isActiveUser, isLoading } = useAuthorization();
  if (loading || isLoading) return <RouteLoading />;
  if (!user) return <Navigate to="/login" replace />;
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
  if (loading || isLoading) return <RouteLoading />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isActiveUser) return <Navigate to="/access-denied" replace />;
  if (isCustomer) return <Navigate to="/portal" replace />;
  if (!isStaff && !canAccessAdminPortal) return <Navigate to="/access-denied" replace />;
  return <AppLayout>{children}</AppLayout>;
}

function WorkerRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { isCustomer, canAccessWorkerPortal, isActiveUser, isLoading } = useAuthorization();
  if (loading || isLoading) return <RouteLoading />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isActiveUser) return <Navigate to="/access-denied" replace />;
  if (isCustomer) return <Navigate to="/portal/properties" replace />;
  if (!canAccessWorkerPortal) return <Navigate to="/access-denied" replace />;
  return <>{children}</>;
}

function PortalRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { isCustomer, canAccessCustomerPortal, isStaff, isActiveUser, isLoading } = useAuthorization();
  if (loading || isLoading) return <RouteLoading />;
  if (!user) return <Navigate to="/login" replace />;
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
  if (loading || isLoading) return <RouteLoading />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isActiveUser) return <Navigate to="/access-denied" replace />;
  if (!canAccessSubcontractorPortal && !canAccessAdminPortal) return <Navigate to="/access-denied" replace />;
  return <>{children}</>;
}

function LoginRoute() {
  const { user, loading } = useAuth();
  const { isCustomer, isStaff, isAdmin, isSubcontractor, canAccessAdminPortal, isLoading } = useAuthorization();
  if (loading || isLoading) {
    if (!user) return <Login />;
    return <RouteLoading />;
  }
  if (user) {
    if (isSubcontractor && !canAccessAdminPortal) return <Navigate to="/subcontractor" replace />;
    if (isCustomer) return <Navigate to="/portal" replace />;
    if (isStaff && !canAccessAdminPortal) return <Navigate to="/worker" replace />;
    return <Navigate to="/" replace />;
  }
  return <Login />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/access-denied" element={<AccessDenied />} />

      {/* Admin-only routes */}
      <Route path="/" element={<AdminRoute><Dashboard /></AdminRoute>} />
      <Route path="/leads" element={<AdminRoute><Leads /></AdminRoute>} />
      <Route path="/leads/:id" element={<AdminRoute><LeadDetail /></AdminRoute>} />
      <Route path="/quotes" element={<AdminRoute><Quotes /></AdminRoute>} />
      <Route path="/quotes/:id" element={<AdminRoute><QuoteDetail /></AdminRoute>} />
      <Route path="/quotes/:id/print" element={<AdminRoute><QuotePrint /></AdminRoute>} />
      <Route path="/customers" element={<AdminRoute><Customers /></AdminRoute>} />
      <Route path="/customers/:id" element={<AdminRoute><CustomerDetail /></AdminRoute>} />
      <Route path="/properties" element={<AdminRoute><Properties /></AdminRoute>} />
      <Route path="/properties/:id" element={<AdminRoute><PropertyDetail /></AdminRoute>} />
      <Route path="/jobs" element={<AdminRoute><Jobs /></AdminRoute>} />
      <Route path="/jobs/:id" element={<AdminRoute><JobDetail /></AdminRoute>} />
      <Route path="/visits" element={<AdminRoute><Visits /></AdminRoute>} />
      <Route path="/visits/:id" element={<AdminRoute><VisitDetail /></AdminRoute>} />
      <Route path="/invoices" element={<AdminRoute><Invoices /></AdminRoute>} />
      <Route path="/invoices/new" element={<AdminRoute><InvoiceDetail /></AdminRoute>} />
      <Route path="/invoices/:id" element={<AdminRoute><InvoiceDetail /></AdminRoute>} />
      <Route path="/schedule" element={<AdminRoute><Schedule /></AdminRoute>} />
      <Route path="/activity" element={<AdminRoute><ActivityPage /></AdminRoute>} />
      <Route path="/requests" element={<AdminRoute><Requests /></AdminRoute>} />
      <Route path="/requests/:id" element={<AdminRoute><RequestDetail /></AdminRoute>} />
      <Route path="/employees" element={<AdminRoute><Employees /></AdminRoute>} />
      <Route path="/employees/:id" element={<AdminRoute><EmployeeDetail /></AdminRoute>} />
      <Route path="/subcontractors" element={<AdminRoute><Subcontractors /></AdminRoute>} />
      <Route path="/subcontractors/:id" element={<AdminRoute><SubcontractorDetail /></AdminRoute>} />
      <Route path="/incidents" element={<AdminRoute><AdminIncidentsPage /></AdminRoute>} />
      <Route path="/incidents/:id" element={<AdminRoute><AdminIncidentDetailPage /></AdminRoute>} />

      <Route path="/settings" element={<AdminRoute><CompanySettingsPage /></AdminRoute>} />
      <Route path="/settings/integrations" element={<AdminRoute><SettingsIntegrationsPage /></AdminRoute>} />
      <Route path="/settings/products" element={<AdminRoute><ProductsServicesPage /></AdminRoute>} />
      <Route path="/settings/team" element={<AdminRoute><ManageTeamPage /></AdminRoute>} />
      <Route path="/settings/roles" element={<AdminRoute><RolesPermissionsPage /></AdminRoute>} />
      <Route path="/settings/audit-log" element={<AdminRoute><AuditLogPage /></AdminRoute>} />
      <Route path="/settings/connected-apps" element={<AdminRoute><ConnectedAppsPage /></AdminRoute>} />
      <Route path="/settings/usage" element={<AdminRoute><SeatUsagePage /></AdminRoute>} />
      <Route path="/settings/payments" element={<AdminRoute><PaymentsSettingsPage /></AdminRoute>} />
      <Route path="/settings/expenses" element={<AdminRoute><ExpenseTrackingPage /></AdminRoute>} />
      <Route path="/settings/automations" element={<AdminRoute><AutomationsPage /></AdminRoute>} />
      <Route path="/settings/work" element={<AdminRoute><WorkSettingsPage /></AdminRoute>} />
      <Route path="/settings/schedule-settings" element={<AdminRoute><ScheduleSettingsPage /></AdminRoute>} />
      <Route path="/settings/routes" element={<AdminRoute><RouteOptimizationPage /></AdminRoute>} />
      <Route path="/settings/job-forms" element={<AdminRoute><JobFormsPage /></AdminRoute>} />
      <Route path="/settings/client-hub" element={<AdminRoute><ClientHubPage /></AdminRoute>} />
      <Route path="/settings/messaging" element={<AdminRoute><EmailsTextsPage /></AdminRoute>} />
      <Route path="/settings/requests-config" element={<AdminRoute><RequestsBookingsPage /></AdminRoute>} />
      <Route path="/settings/portal" element={<AdminRoute><PortalSettingsPage /></AdminRoute>} />
      <Route path="/weather" element={<StaffRoute><WeatherDetail /></StaffRoute>} />

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
      <Route path="/portal/requests/new" element={<PortalRoute><PortalRequestWizard /></PortalRoute>} />
      <Route path="/portal/account" element={<PortalRoute><PortalAccount /></PortalRoute>} />
      <Route path="/portal/preferences" element={<PortalRoute><PortalServicePreferences /></PortalRoute>} />
      <Route path="/portal/recurring" element={<PortalRoute><PortalRecurringServices /></PortalRoute>} />
      <Route path="/portal/referrals" element={<PortalRoute><PortalReferrals /></PortalRoute>} />
      {/* Worker routes */}
      <Route path="/worker" element={<WorkerRoute><WorkerLayout><WorkerHome /></WorkerLayout></WorkerRoute>} />
      <Route path="/worker/schedule" element={<WorkerRoute><WorkerLayout><WorkerSchedule /></WorkerLayout></WorkerRoute>} />
      <Route path="/worker/timesheet" element={<WorkerRoute><WorkerLayout><WorkerTimesheet /></WorkerLayout></WorkerRoute>} />
      <Route path="/worker/search" element={<WorkerRoute><WorkerLayout><WorkerSearch /></WorkerLayout></WorkerRoute>} />
      <Route path="/worker/visit/:id" element={<WorkerRoute><WorkerLayout><WorkerVisitExec /></WorkerLayout></WorkerRoute>} />
      <Route path="/worker/property/:id" element={<WorkerRoute><WorkerLayout><WorkerPropertyDetail /></WorkerLayout></WorkerRoute>} />
      <Route path="/worker/job/:id" element={<WorkerRoute><WorkerLayout><WorkerJobDetail /></WorkerLayout></WorkerRoute>} />
      <Route path="/worker/weather" element={<WorkerRoute><WorkerLayout><WorkerWeatherDetail /></WorkerLayout></WorkerRoute>} />
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
      <Route path="/worker/expenses" element={<WorkerRoute><WorkerLayout><WorkerExpensesPage /></WorkerLayout></WorkerRoute>} />
      <Route path="/worker/settings" element={<WorkerRoute><WorkerLayout><WorkerSettings /></WorkerLayout></WorkerRoute>} />

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
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
