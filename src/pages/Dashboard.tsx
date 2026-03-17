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
    { label: 'New Leads', value: newLeads.length, icon: Users, color: 'text-primary' },
    { label: 'Needs Review', value: reviewLeads.length, icon: AlertCircle, color: 'text-warning' },
    { label: 'Draft Quotes', value: draftQuotes.length, icon: FileText, color: 'text-muted-foreground' },
    { label: 'Sent Quotes', value: sentQuotes.length, icon: CheckCircle, color: 'text-success' },
    { label: 'Follow-ups Due', value: followUps.length, icon: Clock, color: 'text-destructive' },
    { label: 'Total Activities', value: activities.length, icon: Activity, color: 'text-info' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Operations overview — Praetoria Group</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map(s => (
          <Card key={s.label} className="stat-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* New Leads */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> New Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            {newLeads.length === 0 ? (
              <p className="text-sm text-muted-foreground">No new leads</p>
            ) : (
              <div className="space-y-2">
                {newLeads.slice(0, 5).map(lead => (
                  <Link
                    key={lead.id}
                    to={`/leads/${lead.id}`}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">{lead.first_name} {lead.last_name}</p>
                      <p className="text-xs text-muted-foreground">{lead.service_type}</p>
                    </div>
                    <StatusBadge status={lead.status} />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Draft Quotes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-warning" /> Quotes Awaiting Approval
            </CardTitle>
          </CardHeader>
          <CardContent>
            {draftQuotes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending quotes</p>
            ) : (
              <div className="space-y-2">
                {draftQuotes.slice(0, 5).map((q: any) => (
                  <Link
                    key={q.id}
                    to={`/quotes/${q.id}`}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium mono">{q.quote_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {q.leads?.first_name} {q.leads?.last_name} — ${Number(q.total).toLocaleString()}
                      </p>
                    </div>
                    <StatusBadge status={q.approval_status} />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Follow-ups Due */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-destructive" /> Follow-ups Due
            </CardTitle>
          </CardHeader>
          <CardContent>
            {followUps.length === 0 ? (
              <p className="text-sm text-muted-foreground">No follow-ups due</p>
            ) : (
              <div className="space-y-2">
                {followUps.slice(0, 5).map((q: any) => (
                  <Link
                    key={q.id}
                    to={`/quotes/${q.id}`}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium mono">{q.quote_number}</p>
                      <p className="text-xs text-muted-foreground">
                        Due {formatDistanceToNow(new Date(q.follow_up_due_at), { addSuffix: true })}
                      </p>
                    </div>
                    <StatusBadge status="Reviewing" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-info" /> Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent activity</p>
            ) : (
              <div className="space-y-2">
                {activities.slice(0, 5).map(a => (
                  <div key={a.id} className="flex items-center justify-between p-2 rounded-md">
                    <div>
                      <p className="text-sm font-medium">{a.action_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.record_type} — {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">{a.status}</span>
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
