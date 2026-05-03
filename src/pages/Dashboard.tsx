import { StatusBadge } from '@/components/StatusBadge';
import { OperationsMap } from '@/components/dashboard/OperationsMap';
import { ServiceCarousel } from '@/components/ServiceCarousel';
import { WorkflowCards } from '@/components/dashboard/WorkflowCards';
import { TodayAppointments } from '@/components/dashboard/TodayAppointments';
import { AlertsPanel } from '@/components/dashboard/AlertsPanel';
import { BusinessPerformance } from '@/components/dashboard/BusinessPerformance';
import { LiveWorkforcePanel } from '@/components/dashboard/LiveWorkforcePanel';
import { CustomerStatusWidget } from '@/components/dashboard/CustomerStatusWidget';
import { RevenueTrendChart } from '@/components/dashboard/RevenueTrendChart';
import { ARAgingPanel } from '@/components/dashboard/ARAgingPanel';
import { QuickActionBar } from '@/components/dashboard/QuickActionBar';
import { ConversionFunnel } from '@/components/dashboard/ConversionFunnel';
import { TomorrowSchedule } from '@/components/dashboard/TomorrowSchedule';
import { PendingApprovalsHub } from '@/components/dashboard/PendingApprovalsHub';
import { TopPerformersLeaderboard } from '@/components/dashboard/TopPerformersLeaderboard';
import { ServiceMixDonut } from '@/components/dashboard/ServiceMixDonut';
import { JobsCompletedBarChart } from '@/components/dashboard/JobsCompletedBarChart';
import { LiveWorkerMap } from '@/components/dashboard/LiveWorkerMap';
import { BusinessHealthScore } from '@/components/dashboard/BusinessHealthScore';
import { GoalProgressRings } from '@/components/dashboard/GoalProgressRings';
import { SparklineKPIStrip } from '@/components/dashboard/SparklineKPIStrip';
import { ServiceRevenueBreakdown } from '@/components/dashboard/ServiceRevenueBreakdown';
import { CashFlowWaterfall } from '@/components/dashboard/CashFlowWaterfall';
import { RecentWinsTicker } from '@/components/dashboard/RecentWinsTicker';
import { MarketingIntelligence } from '@/components/dashboard/MarketingIntelligence';
import {
  useDashboardRequests,
  useDashboardQuotes,
  useDashboardJobs,
  useDashboardInvoices,
  useTodayVisits,
  useDashboardEmployees,
  useDashboardIncidents,
  useDashboardCertifications,
  useDashboardLeads,
  useDashboardActivities,
  useDashboardSubcontractorInvoices,
  useInvoiceLineCategoryMap,
} from '@/hooks/useDashboardData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileText, Clock, CheckCircle, AlertCircle, Activity, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  // All dashboard data from lightweight hooks
  const { data: requests = [], isLoading: loadReq } = useDashboardRequests();
  const { data: dashQuotes = [], isLoading: loadQuotes } = useDashboardQuotes();
  const { data: jobs = [], isLoading: loadJobs } = useDashboardJobs();
  const { data: invoices = [], isLoading: loadInv } = useDashboardInvoices();
  const { data: visits = [], isLoading: loadVisits } = useTodayVisits();
  const { data: employees = [], isLoading: loadEmp } = useDashboardEmployees();
  const { data: incidents = [], isLoading: loadInc } = useDashboardIncidents();
  const { data: certs = [], isLoading: loadCerts } = useDashboardCertifications();
  const { data: leads = [], isLoading: loadLeads } = useDashboardLeads();
  const { data: activities = [], isLoading: loadAct } = useDashboardActivities();
  const { data: subInvoices = [], isLoading: loadSubInv } = useDashboardSubcontractorInvoices();

  const isWorkflowLoading = loadReq || loadQuotes || loadJobs || loadInv;
  const isAlertsLoading = loadInv || loadJobs || loadVisits || loadInc || loadCerts || loadSubInv;

  // Computed from lightweight data
  const newLeads = leads.filter(l => l.status === 'New');
  const reviewLeads = leads.filter(l => ['Reviewing', 'Awaiting info'].includes(l.status ?? ''));
  const draftQuotes = dashQuotes.filter(q => q.approval_status === 'Draft' || q.approval_status === 'Needs review');
  const sentQuotes = dashQuotes.filter(q => q.approval_status === 'Sent');
  const followUps = dashQuotes.filter((q: any) => q.follow_up_due_at && new Date(q.follow_up_due_at) <= new Date());

  const stats = [
    { label: 'New Leads', value: newLeads.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100 dark:bg-blue-950/30 dark:border-blue-900/40', link: '/leads' },
    { label: 'Review', value: reviewLeads.length, icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100 dark:bg-amber-950/30 dark:border-amber-900/40', link: '/leads' },
    { label: 'Drafts', value: draftQuotes.length, icon: FileText, color: 'text-slate-500', bg: 'bg-slate-50 border-slate-100 dark:bg-slate-950/30 dark:border-slate-800/40', link: '/quotes' },
    { label: 'Sent', value: sentQuotes.length, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-900/40', link: '/quotes' },
    { label: 'Follow-up', value: followUps.length, icon: Clock, color: 'text-rose-600', bg: 'bg-rose-50 border-rose-100 dark:bg-rose-950/30 dark:border-rose-900/40', link: '/quotes' },
    { label: 'Activity', value: activities.length, icon: Activity, color: 'text-cyan-600', bg: 'bg-cyan-50 border-cyan-100 dark:bg-cyan-950/30 dark:border-cyan-900/40', link: '/activity' },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 md:p-5">
        <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-foreground">Operations Dashboard</h1>
        <p className="text-muted-foreground text-xs md:text-sm mt-1 font-medium">Praetoria Group — Command Center</p>
      </div>

      {/* Premium hero — Health Score + Goal Rings */}
      <div className="grid lg:grid-cols-2 gap-4">
        <BusinessHealthScore
          invoices={invoices}
          quotes={dashQuotes}
          visits={visits}
          leads={leads}
          isLoading={loadInv || loadQuotes || loadVisits || loadLeads}
        />
        <GoalProgressRings
          invoices={invoices}
          visits={visits}
          isLoading={loadInv || loadVisits}
        />
      </div>

      {/* Sparkline KPI Strip */}
      <SparklineKPIStrip
        invoices={invoices}
        jobs={jobs}
        quotes={dashQuotes}
        leads={leads}
        isLoading={loadInv || loadJobs || loadQuotes || loadLeads}
      />

      {/* Recent Wins live ticker */}
      <RecentWinsTicker />

      {/* Quick Create action bar */}
      <QuickActionBar />

      {/* Quick stats — 3×2 grid (legacy) */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3">
        {stats.map(s => (
          <Link key={s.label} to={s.link} className={`rounded-xl border p-3 md:p-4 transition-all hover:shadow-md active:scale-[0.97] ${s.bg}`}>
            <s.icon className={`h-5 w-5 md:h-6 md:w-6 ${s.color} mb-1.5`} />
            <p className="text-2xl md:text-3xl font-extrabold leading-none text-foreground tabular-nums">{s.value}</p>
            <p className="text-[11px] md:text-xs font-semibold text-muted-foreground mt-1 uppercase tracking-wide">{s.label}</p>
          </Link>
        ))}
      </div>

      {/* Revenue + AR row */}
      <div className="grid lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <RevenueTrendChart invoices={invoices} isLoading={loadInv} />
        </div>
        <div className="lg:col-span-2">
          <ARAgingPanel invoices={invoices} isLoading={loadInv} />
        </div>
      </div>

      {/* Cash Flow waterfall */}
      <CashFlowWaterfall invoices={invoices} isLoading={loadInv} />

      {/* Conversion Funnel + Pending Approvals row */}
      <div className="grid lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <ConversionFunnel
            leads={leads}
            quotes={dashQuotes}
            jobs={jobs}
            invoices={invoices}
            isLoading={loadLeads || loadQuotes || loadJobs || loadInv}
          />
        </div>
        <div className="lg:col-span-2">
          <PendingApprovalsHub />
        </div>
      </div>

      {/* Marketing & Conversion Intelligence */}
      <MarketingIntelligence
        leads={leads}
        quotes={dashQuotes}
        jobs={jobs}
        invoices={invoices}
        isLoading={loadLeads || loadQuotes || loadJobs || loadInv}
      />

      {/* Performance Insights row */}
      <div className="grid lg:grid-cols-3 gap-4">
        <TopPerformersLeaderboard />
        <ServiceMixDonut invoices={invoices} jobs={jobs} isLoading={loadInv || loadJobs} />
        <JobsCompletedBarChart />
      </div>

      {/* Full 25-service revenue breakdown */}
      <ServiceRevenueBreakdown
        invoices={invoices}
        jobs={jobs}
        isLoading={loadInv || loadJobs}
      />

      {/* Workflow Cards (new ops) */}
      <WorkflowCards
        requests={requests}
        quotes={dashQuotes}
        jobs={jobs}
        invoices={invoices}
        isLoading={isWorkflowLoading}
      />

      {/* Operations Control */}
      <OperationsMap
        visits={visits}
        jobs={jobs}
        employees={employees}
        requests={requests}
        isLoading={loadVisits || loadJobs || loadEmp || loadReq}
      />

      {/* Live Worker Map */}
      <LiveWorkerMap />

      {/* Service Carousel */}
      <ServiceCarousel />

      {/* Main ops grid */}
      <div className="grid lg:grid-cols-5 gap-4">
        {/* Left — Appointments + legacy list cards */}
        <div className="lg:col-span-3 space-y-4">
          <TodayAppointments
            visits={visits}
            employees={employees}
            isLoadingVisits={loadVisits}
            isLoadingEmployees={loadEmp}
          />

          <TomorrowSchedule />

          {/* Legacy list cards */}
          <div className="grid md:grid-cols-2 gap-3">
            <DashboardListCard
              title="New Leads"
              icon={Users}
              iconBg="bg-blue-50 dark:bg-blue-950/30"
              iconColor="text-blue-600"
              emptyText="No new leads"
              viewAllLink="/leads"
              items={newLeads.slice(0, 3).map(lead => ({
                id: lead.id,
                link: `/leads/${lead.id}`,
                primary: `${lead.first_name} ${lead.last_name}`,
                secondary: lead.service_type,
                badge: <StatusBadge status={lead.status} showIcon={false} />,
              }))}
            />
            <DashboardListCard
              title="Needs Approval"
              icon={FileText}
              iconBg="bg-amber-50 dark:bg-amber-950/30"
              iconColor="text-amber-600"
              emptyText="No pending quotes"
              viewAllLink="/quotes"
              items={draftQuotes.slice(0, 3).map((q: any) => ({
                id: q.id,
                link: `/quotes/${q.id}`,
                primary: q.quote_number,
                secondary: `${q.leads?.first_name || ''} ${q.leads?.last_name || ''} · $${Number(q.total).toLocaleString()}`,
                badge: <StatusBadge status={q.approval_status} showIcon={false} />,
                mono: true,
              }))}
            />
            <DashboardListCard
              title="Follow-ups Due"
              icon={Clock}
              iconBg={followUps.length > 0 ? 'bg-rose-50 dark:bg-rose-950/30' : 'bg-muted'}
              iconColor={followUps.length > 0 ? 'text-rose-600' : 'text-muted-foreground'}
              emptyText="All caught up"
              viewAllLink="/quotes"
              items={followUps.slice(0, 3).map((q: any) => ({
                id: q.id,
                link: `/quotes/${q.id}`,
                primary: q.quote_number,
                secondary: `Due ${formatDistanceToNow(new Date(q.follow_up_due_at), { addSuffix: true })}`,
                secondaryClass: 'text-destructive font-medium',
                badge: <StatusBadge status="Sent" showIcon={false} />,
                mono: true,
              }))}
            />
            <DashboardListCard
              title="Recent Activity"
              icon={Activity}
              iconBg="bg-cyan-50 dark:bg-cyan-950/30"
              iconColor="text-cyan-600"
              emptyText="No recent activity"
              viewAllLink="/activity"
              items={activities.slice(0, 3).map(a => ({
                id: a.id,
                primary: a.action_name,
                secondary: `${a.record_type} · ${formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}`,
                badge: <span className="text-[10px] text-muted-foreground shrink-0">{a.status}</span>,
              }))}
            />
          </div>
        </div>

        {/* Right — Alerts + Performance */}
        <div className="lg:col-span-2 space-y-4">
          <AlertsPanel
            invoices={invoices}
            jobs={jobs}
            visits={visits}
            incidents={incidents}
            certifications={certs}
            subcontractorInvoices={subInvoices}
            isLoading={isAlertsLoading}
          />
          <CustomerStatusWidget />
          <LiveWorkforcePanel />
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

/* ─── Reusable compact list card ──────────────────────────── */

interface ListItem {
  id: string;
  link?: string;
  primary: string;
  secondary?: string;
  secondaryClass?: string;
  badge?: React.ReactNode;
  mono?: boolean;
}

function DashboardListCard({
  title, icon: Icon, iconBg, iconColor, emptyText, viewAllLink, items,
}: {
  title: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  emptyText: string;
  viewAllLink: string;
  items: ListItem[];
}) {
  return (
    <Card>
      <CardHeader className="pb-2 px-3 md:px-6 pt-3 md:pt-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base md:text-lg font-extrabold tracking-tight flex items-center gap-2">
            <span className={cn('w-8 h-8 rounded-lg flex items-center justify-center', iconBg)}>
              <Icon className={cn('h-4 w-4', iconColor)} />
            </span>
            {title}
          </CardTitle>
          <Link to={viewAllLink} className="text-[11px] md:text-xs font-semibold text-primary flex items-center gap-0.5 hover:underline">
            View all <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
        {items.length === 0 ? (
          <p className="text-[11px] text-muted-foreground py-1.5">{emptyText}</p>
        ) : (
          <div className="divide-y divide-border/50">
            {items.map(item => {
              const content = (
                <div className="flex items-center justify-between py-2 -mx-1 px-1">
                  <div className="min-w-0">
                    <p className={cn('text-xs md:text-sm font-medium truncate', item.mono && 'font-mono')}>{item.primary}</p>
                    {item.secondary && (
                      <p className={cn('text-[10px] md:text-[11px] text-muted-foreground', item.secondaryClass)}>{item.secondary}</p>
                    )}
                  </div>
                  {item.badge}
                </div>
              );
              return item.link ? (
                <Link key={item.id} to={item.link} className="block active:bg-muted/30 rounded transition-colors">
                  {content}
                </Link>
              ) : (
                <div key={item.id}>{content}</div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
