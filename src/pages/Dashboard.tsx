import { WorkflowCards } from '@/components/dashboard/WorkflowCards';
import { TodayAppointments } from '@/components/dashboard/TodayAppointments';
import { AlertsPanel } from '@/components/dashboard/AlertsPanel';
import { BusinessPerformance } from '@/components/dashboard/BusinessPerformance';
import {
  useDashboardRequests,
  useDashboardQuotes,
  useDashboardJobs,
  useDashboardInvoices,
  useTodayVisits,
  useDashboardEmployees,
  useDashboardIncidents,
  useDashboardCertifications,
} from '@/hooks/useDashboardData';

export default function Dashboard() {
  const { data: requests = [], isLoading: loadReq } = useDashboardRequests();
  const { data: quotes = [], isLoading: loadQuotes } = useDashboardQuotes();
  const { data: jobs = [], isLoading: loadJobs } = useDashboardJobs();
  const { data: invoices = [], isLoading: loadInv } = useDashboardInvoices();
  const { data: visits = [], isLoading: loadVisits } = useTodayVisits();
  const { data: employees = [], isLoading: loadEmp } = useDashboardEmployees();
  const { data: incidents = [], isLoading: loadInc } = useDashboardIncidents();
  const { data: certs = [], isLoading: loadCerts } = useDashboardCertifications();

  const isWorkflowLoading = loadReq || loadQuotes || loadJobs || loadInv;
  const isAlertsLoading = loadInv || loadJobs || loadVisits || loadInc || loadCerts;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-lg md:text-2xl font-bold">Operations Dashboard</h1>
        <p className="text-muted-foreground text-[11px] md:text-sm">Praetoria Group — Command Center</p>
      </div>

      {/* Phase 1: Workflow Cards */}
      <WorkflowCards
        requests={requests}
        quotes={quotes}
        jobs={jobs}
        invoices={invoices}
        isLoading={isWorkflowLoading}
      />

      {/* Main content grid: Left = appointments, Right = alerts + performance */}
      <div className="grid lg:grid-cols-5 gap-4">
        {/* Left — 3 cols */}
        <div className="lg:col-span-3">
          <TodayAppointments
            visits={visits}
            employees={employees}
            isLoadingVisits={loadVisits}
            isLoadingEmployees={loadEmp}
          />
        </div>

        {/* Right — 2 cols */}
        <div className="lg:col-span-2 space-y-4">
          <AlertsPanel
            invoices={invoices}
            jobs={jobs}
            visits={visits}
            incidents={incidents}
            certifications={certs}
            isLoading={isAlertsLoading}
          />
          <BusinessPerformance
            invoices={invoices}
            jobs={jobs}
            isLoading={loadInv || loadJobs}
          />
        </div>
      </div>
    </div>
  );
}
