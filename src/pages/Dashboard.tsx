import { useLeads } from '@/hooks/useLeads';
import { useQuotes } from '@/hooks/useQuotes';
import { useActivities } from '@/hooks/useActivities';
import { StatusBadge } from '@/components/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileText, Clock, CheckCircle, AlertCircle, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

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
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-xs md:text-sm mt-0.5">Praetoria Group — Operations</p>
      </div>

      {/* Stats — 3×2 grid on mobile, 6 across on desktop */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3">
        {stats.map(s => (
          <Link key={s.label} to={s.link} className={`rounded-lg border p-3 md:p-4 transition-all hover:shadow-sm active:scale-[0.98] ${s.bg}`}>
            <s.icon className={`h-3.5 w-3.5 md:h-4 md:w-4 ${s.color} mb-1.5`} />
            <p className="text-xl md:text-2xl font-bold leading-none text-foreground">{s.value}</p>
            <p className="text-[10px] md:text-xs text-muted-foreground mt-1">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* New Leads */}
        <Card>
          <CardHeader className="pb-2 px-3 md:px-6">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> New Leads
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 md:px-6">
            {newLeads.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">No new leads</p>
            ) : (
              <div className="divide-y divide-border/50">
                {newLeads.slice(0, 5).map(lead => (
                  <Link key={lead.id} to={`/leads/${lead.id}`}
                    className="flex items-center justify-between py-2.5 active:bg-muted/30 -mx-1 px-1 rounded transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{lead.first_name} {lead.last_name}</p>
                      <p className="text-[11px] text-muted-foreground">{lead.service_type}</p>
                    </div>
                    <StatusBadge status={lead.status} showIcon={false} />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quotes Awaiting Approval */}
        <Card>
          <CardHeader className="pb-2 px-3 md:px-6">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4 text-warning" /> Needs Approval
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 md:px-6">
            {draftQuotes.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">No pending quotes</p>
            ) : (
              <div className="divide-y divide-border/50">
                {draftQuotes.slice(0, 5).map((q: any) => (
                  <Link key={q.id} to={`/quotes/${q.id}`}
                    className="flex items-center justify-between py-2.5 active:bg-muted/30 -mx-1 px-1 rounded transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium mono">{q.quote_number}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {q.leads?.first_name} {q.leads?.last_name} · ${Number(q.total).toLocaleString()}
                      </p>
                    </div>
                    <StatusBadge status={q.approval_status} showIcon={false} />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Follow-ups */}
        <Card>
          <CardHeader className="pb-2 px-3 md:px-6">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className={`h-4 w-4 ${followUps.length > 0 ? 'text-destructive' : 'text-muted-foreground'}`} /> Follow-ups Due
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 md:px-6">
            {followUps.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">All caught up</p>
            ) : (
              <div className="divide-y divide-border/50">
                {followUps.slice(0, 5).map((q: any) => (
                  <Link key={q.id} to={`/quotes/${q.id}`}
                    className="flex items-center justify-between py-2.5 active:bg-muted/30 -mx-1 px-1 rounded transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium mono">{q.quote_number}</p>
                      <p className="text-[11px] text-destructive font-medium">
                        Due {formatDistanceToNow(new Date(q.follow_up_due_at), { addSuffix: true })}
                      </p>
                    </div>
                    <StatusBadge status="Sent" showIcon={false} />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-2 px-3 md:px-6">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-info" /> Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 md:px-6">
            {activities.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">No recent activity</p>
            ) : (
              <div className="divide-y divide-border/50">
                {activities.slice(0, 5).map(a => (
                  <div key={a.id} className="flex items-center justify-between py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{a.action_name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {a.record_type} · {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <span className="text-[11px] text-muted-foreground shrink-0">{a.status}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
