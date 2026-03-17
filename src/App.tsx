import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { PreviewModeBanner } from "@/components/PreviewModeBanner";
import { useUserRole } from "@/hooks/useUserRole";
import { AppLayout } from "@/components/AppLayout";
import { PortalLayout } from "@/components/PortalLayout";
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
import SettingsPage from "./pages/SettingsPage";
import Schedule from "./pages/Schedule";
import Invoices from "./pages/Invoices";
import InvoiceDetail from "./pages/InvoiceDetail";
import Requests from "./pages/Requests";
import NotFound from "./pages/NotFound";

// Portal pages
import PortalProperties from "./pages/portal/PortalProperties";
import PortalQuotes from "./pages/portal/PortalQuotes";
import PortalVisits from "./pages/portal/PortalVisits";
import PortalPlan from "./pages/portal/PortalPlan";
import PortalPhotos from "./pages/portal/PortalPhotos";
import PortalRequests from "./pages/portal/PortalRequests";
import PortalBilling from "./pages/portal/PortalBilling";
import PortalAccount from "./pages/portal/PortalAccount";

// Worker pages
import { WorkerLayout } from "./components/worker/WorkerLayout";
import WorkerHome from "./pages/worker/WorkerHome";
import WorkerSchedule from "./pages/worker/WorkerSchedule";
import WorkerTimesheet from "./pages/worker/WorkerTimesheet";
import WorkerPlaceholder from "./pages/worker/WorkerPlaceholder";
import WorkerSearch from "./pages/worker/WorkerSearch";
import WorkerMore from "./pages/worker/WorkerMore";
import WorkerVisitExec from "./pages/worker/WorkerVisitExec";
import WorkerWeatherDetail from "./pages/worker/WorkerWeatherDetail";
import WeatherDetail from "./pages/WeatherDetail";

const queryClient = new QueryClient();

function StaffRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { isCustomer, isLoading: roleLoading } = useUserRole();
  if (loading || roleLoading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (isCustomer) return <Navigate to="/portal/properties" replace />;
  return <AppLayout>{children}</AppLayout>;
}

function WorkerRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { isCustomer, isLoading: roleLoading } = useUserRole();
  if (loading || roleLoading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (isCustomer) return <Navigate to="/portal/properties" replace />;
  return <>{children}</>;
}

function PortalRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { isCustomer, isStaff, isLoading: roleLoading } = useUserRole();
  if (loading || roleLoading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isCustomer && !isStaff) return <Navigate to="/" replace />;
  // Staff can preview the portal
  const isPreview = isStaff && !isCustomer;
  return (
    <>
      {isPreview && <PreviewModeBanner />}
      <PortalLayout>{children}</PortalLayout>
    </>
  );
}

function LoginRoute() {
  const { user, loading } = useAuth();
  const { isCustomer, isLoading: roleLoading } = useUserRole();
  if (loading || roleLoading) {
    if (!user) return <Login />;
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  }
  if (user) {
    if (isCustomer) return <Navigate to="/portal/properties" replace />;
    return <Navigate to="/" replace />;
  }
  return <Login />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />

      {/* Staff/Admin routes */}
      <Route path="/" element={<StaffRoute><Dashboard /></StaffRoute>} />
      <Route path="/leads" element={<StaffRoute><Leads /></StaffRoute>} />
      <Route path="/leads/:id" element={<StaffRoute><LeadDetail /></StaffRoute>} />
      <Route path="/quotes" element={<StaffRoute><Quotes /></StaffRoute>} />
      <Route path="/quotes/:id" element={<StaffRoute><QuoteDetail /></StaffRoute>} />
      <Route path="/quotes/:id/print" element={<StaffRoute><QuotePrint /></StaffRoute>} />
      <Route path="/customers" element={<StaffRoute><Customers /></StaffRoute>} />
      <Route path="/customers/:id" element={<StaffRoute><CustomerDetail /></StaffRoute>} />
      <Route path="/properties" element={<StaffRoute><Properties /></StaffRoute>} />
      <Route path="/properties/:id" element={<StaffRoute><PropertyDetail /></StaffRoute>} />
      <Route path="/jobs" element={<StaffRoute><Jobs /></StaffRoute>} />
      <Route path="/jobs/:id" element={<StaffRoute><JobDetail /></StaffRoute>} />
      <Route path="/visits" element={<StaffRoute><Visits /></StaffRoute>} />
      <Route path="/visits/:id" element={<StaffRoute><VisitDetail /></StaffRoute>} />
      <Route path="/invoices" element={<StaffRoute><Invoices /></StaffRoute>} />
      <Route path="/invoices/new" element={<StaffRoute><InvoiceDetail /></StaffRoute>} />
      <Route path="/invoices/:id" element={<StaffRoute><InvoiceDetail /></StaffRoute>} />
      <Route path="/schedule" element={<StaffRoute><Schedule /></StaffRoute>} />
      <Route path="/activity" element={<StaffRoute><ActivityPage /></StaffRoute>} />
      <Route path="/settings" element={<StaffRoute><SettingsPage /></StaffRoute>} />
      <Route path="/requests" element={<StaffRoute><Requests /></StaffRoute>} />
      <Route path="/weather" element={<StaffRoute><WeatherDetail /></StaffRoute>} />

      {/* Customer portal routes */}
      <Route path="/portal/properties" element={<PortalRoute><PortalProperties /></PortalRoute>} />
      <Route path="/portal/quotes" element={<PortalRoute><PortalQuotes /></PortalRoute>} />
      <Route path="/portal/plan" element={<PortalRoute><PortalPlan /></PortalRoute>} />
      <Route path="/portal/visits" element={<PortalRoute><PortalVisits /></PortalRoute>} />
      <Route path="/portal/photos" element={<PortalRoute><PortalPhotos /></PortalRoute>} />
      <Route path="/portal/billing" element={<PortalRoute><PortalBilling /></PortalRoute>} />
      <Route path="/portal/requests" element={<PortalRoute><PortalRequests /></PortalRoute>} />
      <Route path="/portal/account" element={<PortalRoute><PortalAccount /></PortalRoute>} />

      {/* Worker routes */}
      <Route path="/worker" element={<WorkerRoute><WorkerLayout><WorkerHome /></WorkerLayout></WorkerRoute>} />
      <Route path="/worker/schedule" element={<WorkerRoute><WorkerLayout><WorkerSchedule /></WorkerLayout></WorkerRoute>} />
      <Route path="/worker/timesheet" element={<WorkerRoute><WorkerLayout><WorkerTimesheet /></WorkerLayout></WorkerRoute>} />
      <Route path="/worker/search" element={<WorkerRoute><WorkerLayout><WorkerPlaceholder title="Search" /></WorkerLayout></WorkerRoute>} />
      <Route path="/worker/visit/:id" element={<WorkerRoute><WorkerLayout><WorkerVisitExec /></WorkerLayout></WorkerRoute>} />
      <Route path="/worker/weather" element={<WorkerRoute><WorkerLayout><WorkerWeatherDetail /></WorkerLayout></WorkerRoute>} />
      <Route path="/worker/more" element={<WorkerRoute><WorkerLayout><WorkerMore /></WorkerLayout></WorkerRoute>} />

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
