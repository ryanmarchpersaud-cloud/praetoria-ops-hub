import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCustomerProfile } from '@/hooks/useUserRole';
import { useBillingProfile } from '@/hooks/useInvoices';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { useNavigate } from 'react-router-dom';
import {
  CalendarCheck, FileText, Receipt, MessageSquarePlus, ShieldCheck,
  Phone, Mail, ChevronRight, Snowflake, MapPin, Clock, AlertCircle,
  CheckCircle, CreditCard,
} from 'lucide-react';
import { format } from 'date-fns';

export default function PortalDashboard() {
  const { user } = useAuth();
  const { data: customer } = useCustomerProfile();
  const { data: billingProfile } = useBillingProfile(customer?.id);
  const navigate = useNavigate();

  // Upcoming visits (next 7 days or next 5 scheduled)
  const { data: upcomingVisits = [] } = useQuery({
    queryKey: ['portal_dash_visits', customer?.id],
    queryFn: async () => {
      if (!customer) return [];
      const { data, error } = await supabase
        .from('visits')
        .select('id, visit_number, service_date, visit_status, visit_type, properties(property_name)')
        .eq('customer_id', customer.id)
        .in('visit_status', ['Planned', 'Scheduled', 'En Route', 'In Progress'] as any)
        .order('service_date', { ascending: true })
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!customer,
  });

  // Recent completed
  const { data: recentCompleted = [] } = useQuery({
    queryKey: ['portal_dash_completed', customer?.id],
    queryFn: async () => {
      if (!customer) return [];
      const { data, error } = await supabase
        .from('visits')
        .select('id, visit_number, service_date, visit_type, properties(property_name)')
        .eq('customer_id', customer.id)
        .eq('visit_status', 'Completed')
        .order('service_date', { ascending: false })
        .limit(3);
      if (error) throw error;
      return data;
    },
    enabled: !!customer,
  });

  // Open requests
  const { data: openRequests = [] } = useQuery({
    queryKey: ['portal_dash_requests', customer?.id],
    queryFn: async () => {
      if (!customer) return [];
      const { data, error } = await supabase
        .from('service_requests')
        .select('id, subject, status, created_at')
        .eq('customer_id', customer.id)
        .in('status', ['Open', 'In Progress'] as any)
        .order('created_at', { ascending: false })
        .limit(3);
      if (error) throw error;
      return data;
    },
    enabled: !!customer,
  });

  // Quotes awaiting approval
  const { data: pendingQuotes = [] } = useQuery({
    queryKey: ['portal_dash_quotes', customer?.id],
    queryFn: async () => {
      if (!customer) return [];
      const { data, error } = await supabase
        .from('quotes')
        .select('id, quote_number, total, service_category, approval_status')
        .eq('customer_id', customer.id)
        .in('approval_status', ['Sent', 'Needs review'] as any)
        .order('created_at', { ascending: false })
        .limit(3);
      if (error) throw error;
      return data;
    },
    enabled: !!customer,
  });

  // Outstanding invoices
  const { data: outstandingInvoices = [] } = useQuery({
    queryKey: ['portal_dash_invoices', customer?.id],
    queryFn: async () => {
      if (!customer) return [];
      const { data, error } = await supabase
        .from('invoices')
        .select('id, invoice_number, total, balance_due, status, due_date')
        .eq('customer_id', customer.id)
        .in('status', ['Sent', 'Viewed', 'Overdue'] as any)
        .order('due_date', { ascending: true })
        .limit(3);
      if (error) throw error;
      return data;
    },
    enabled: !!customer,
  });

  // Active plans count
  const { data: activePlans = [] } = useQuery({
    queryKey: ['portal_dash_plans', customer?.id],
    queryFn: async () => {
      if (!customer) return [];
      const { data, error } = await supabase
        .from('jobs')
        .select('id, job_title, service_category, status')
        .eq('customer_id', customer.id)
        .in('status', ['Scheduled', 'In Progress'] as any)
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!customer,
  });

  const totalOwing = outstandingInvoices.reduce((sum: number, i: any) => sum + Number(i.balance_due || 0), 0);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Welcome */}
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-foreground">
          Welcome back{customer ? `, ${customer.first_name}` : ''}
        </h1>
        <p className="text-sm text-muted-foreground">
          Here's an overview of your services with Praetoria.
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Upcoming"
          value={upcomingVisits.length}
          icon={CalendarCheck}
          color="text-blue-600"
          onClick={() => navigate('/portal/visits')}
        />
        <StatCard
          label="Quotes"
          value={pendingQuotes.length}
          icon={FileText}
          color="text-amber-600"
          accent={pendingQuotes.length > 0}
          onClick={() => navigate('/portal/quotes')}
        />
        <StatCard
          label="Owing"
          value={`$${totalOwing.toFixed(0)}`}
          icon={Receipt}
          color={totalOwing > 0 ? 'text-destructive' : 'text-emerald-600'}
          accent={totalOwing > 0}
          onClick={() => navigate('/portal/billing')}
        />
        <StatCard
          label="Requests"
          value={openRequests.length}
          icon={MessageSquarePlus}
          color="text-orange-600"
          onClick={() => navigate('/portal/requests')}
        />
      </div>

      {/* Upcoming visits */}
      {upcomingVisits.length > 0 && (
        <DashSection title="Upcoming Service" icon={CalendarCheck} onSeeAll={() => navigate('/portal/visits')}>
          <div className="space-y-2">
            {upcomingVisits.map((v: any) => (
              <div key={v.id} className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg bg-muted/50">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-medium">{v.visit_number}</span>
                    <StatusBadge status={v.visit_status} />
                  </div>
                  {v.properties?.property_name && (
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" /> {v.properties.property_name}
                    </p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {format(new Date(v.service_date), 'MMM d')}
                </span>
              </div>
            ))}
          </div>
        </DashSection>
      )}

      {/* Recent completed */}
      {recentCompleted.length > 0 && (
        <DashSection title="Recently Completed" icon={CheckCircle} onSeeAll={() => navigate('/portal/visits')}>
          <div className="space-y-2">
            {recentCompleted.map((v: any) => (
              <div key={v.id} className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg bg-muted/50">
                <div className="min-w-0">
                  <span className="text-xs font-mono font-medium">{v.visit_number}</span>
                  {v.properties?.property_name && (
                    <p className="text-[11px] text-muted-foreground">{v.properties.property_name}</p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {format(new Date(v.service_date), 'MMM d')}
                </span>
              </div>
            ))}
          </div>
        </DashSection>
      )}

      {/* Quotes awaiting approval */}
      {pendingQuotes.length > 0 && (
        <DashSection title="Quotes Awaiting Approval" icon={FileText} onSeeAll={() => navigate('/portal/quotes')}>
          <div className="space-y-2">
            {pendingQuotes.map((q: any) => (
              <div key={q.id} className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-800/30">
                <div>
                  <span className="text-xs font-mono font-medium">{q.quote_number}</span>
                  <p className="text-[11px] text-muted-foreground">{q.service_category}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">${Number(q.total || 0).toFixed(2)}</p>
                  <Button size="sm" variant="outline" className="h-6 text-[10px] mt-1" onClick={() => navigate('/portal/quotes')}>
                    Review
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </DashSection>
      )}

      {/* Outstanding invoices */}
      {outstandingInvoices.length > 0 && (
        <DashSection title="Outstanding Invoices" icon={Receipt} onSeeAll={() => navigate('/portal/billing')}>
          <div className="space-y-2">
            {outstandingInvoices.map((inv: any) => (
              <div key={inv.id} className={`flex items-center justify-between gap-2 py-2 px-3 rounded-lg ${inv.status === 'Overdue' ? 'bg-destructive/5 border border-destructive/20' : 'bg-muted/50'}`}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-medium">{inv.invoice_number}</span>
                    <StatusBadge status={inv.status} />
                  </div>
                  <p className="text-[11px] text-muted-foreground">Due {format(new Date(inv.due_date), 'MMM d, yyyy')}</p>
                </div>
                <p className="font-semibold text-sm">${Number(inv.balance_due).toFixed(2)}</p>
              </div>
            ))}
          </div>
        </DashSection>
      )}

      {/* Active plans */}
      {activePlans.length > 0 && (
        <DashSection title="Active Service Plans" icon={ShieldCheck} onSeeAll={() => navigate('/portal/plan')}>
          <div className="space-y-2">
            {activePlans.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg bg-muted/50">
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{p.job_title}</p>
                  <p className="text-[11px] text-muted-foreground">{p.service_category}</p>
                </div>
                <StatusBadge status={p.status} />
              </div>
            ))}
          </div>
        </DashSection>
      )}

      {/* Open requests */}
      {openRequests.length > 0 && (
        <DashSection title="Open Requests" icon={MessageSquarePlus} onSeeAll={() => navigate('/portal/requests')}>
          <div className="space-y-2">
            {openRequests.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg bg-muted/50">
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{r.subject}</p>
                  <p className="text-[11px] text-muted-foreground">{format(new Date(r.created_at), 'MMM d')}</p>
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
        </DashSection>
      )}

      {/* Contact card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Need Help?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Our team is here to help with any questions about your service.
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              href="tel:+13067376269"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              <Phone className="h-3.5 w-3.5" /> Call Us
            </a>
            <a
              href="mailto:support@praetoriagroup.ca"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              <Mail className="h-3.5 w-3.5" /> Email Support
            </a>
          </div>
          <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => navigate('/portal/requests')}>
            <MessageSquarePlus className="h-4 w-4 mr-1.5" /> Submit a Request
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, accent, onClick }: {
  label: string; value: string | number; icon: any; color: string; accent?: boolean; onClick: () => void;
}) {
  return (
    <Card
      className={`cursor-pointer hover:shadow-md transition-shadow ${accent ? 'ring-1 ring-primary/20' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-3 text-center space-y-1">
        <Icon className={`h-5 w-5 mx-auto ${color}`} />
        <p className="text-lg font-bold">{value}</p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
      </CardContent>
    </Card>
  );
}

function DashSection({ title, icon: Icon, children, onSeeAll }: {
  title: string; icon: any; children: React.ReactNode; onSeeAll: () => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <Icon className="h-4 w-4 text-primary" /> {title}
          </CardTitle>
          <button onClick={onSeeAll} className="text-[11px] text-primary hover:underline flex items-center gap-0.5">
            See all <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
