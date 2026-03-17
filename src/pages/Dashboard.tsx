import { useLeads } from '@/hooks/useLeads';
import { useQuotes } from '@/hooks/useQuotes';
import { useActivities } from '@/hooks/useActivities';
import { StatusBadge } from '@/components/StatusBadge';
import { WeatherCard } from '@/components/WeatherCard';
import { ServiceCarousel } from '@/components/ServiceCarousel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileText, Clock, CheckCircle, AlertCircle, Activity, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const { data: leads = [] } = useLeads();
  const { data: quotes = [] } = useQuotes();
  const { data: activities = [] } = useActivities({ limit: 10 });

  const newLeads = leads.filter(l => l.status === 'New');
  const reviewLeads = leads.filter(l => ['Reviewing', 'Awaiting info'].includes(l.status));
  const draftQuotes = quotes.filter(q => q.approval_status === 'Draft' || q.approval_status === 'Needs review');
  const sentQuotes = quotes.filter(q => q.approval_status === 'Sent');
  const followUps = quotes.filter(q => q.follow_up_due_at && new Date(q.follow_up_due_at) <= new Date());

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
      {/* Header - compact on mobile */}
      <div>
        <h1 className="text-lg md:text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-[11px] md:text-sm">Praetoria Group — Operations</p>
      </div>

      {/* Stats — 3×2 grid */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-1.5 md:gap-3">
        {stats.map(s => (
          <Link key={s.label} to={s.link} className={`rounded-lg border p-2.5 md:p-4 transition-all hover:shadow-sm active:scale-[0.97] ${s.bg}`}>
            <s.icon className={`h-3.5 w-3.5 ${s.color} mb-1`} />
            <p className="text-lg md:text-2xl font-bold leading-none text-foreground">{s.value}</p>
            <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </Link>
        ))}
      </div>

      {/* Weather - compact */}
      <WeatherCard city="regina" />

      {/* Service Carousel — swipeable on mobile */}
      <ServiceCarousel />

      {/* Cards grid */}
      <div className="grid md:grid-cols-2 gap-3">
        {/* New Leads */}
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

        {/* Quotes Awaiting Approval */}
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

        {/* Follow-ups */}
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

        {/* Recent Activity */}
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
      <CardHeader className="pb-1.5 px-3 md:px-6 pt-3 md:pt-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs md:text-sm flex items-center gap-2">
            <span className={cn('w-6 h-6 rounded-lg flex items-center justify-center', iconBg)}>
              <Icon className={cn('h-3.5 w-3.5', iconColor)} />
            </span>
            {title}
          </CardTitle>
          <Link to={viewAllLink} className="text-[10px] md:text-xs text-primary flex items-center gap-0.5 hover:underline">
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
