import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCustomerProfile } from '@/hooks/useUserRole';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import {
  FileText, Calendar, MapPin, Snowflake, Repeat, DollarSign,
  ClipboardList, Download, ExternalLink, ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const FREQ_LABELS: Record<string, string> = {
  'one-time': 'One-time',
  weekly: 'Weekly',
  biweekly: 'Every 2 weeks',
  monthly: 'Monthly',
  'on-snowfall': 'On snowfall',
  'custom-seasonal': 'Seasonal coverage',
};

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function PortalPlan() {
  const { data: customer } = useCustomerProfile();

  // Fetch active jobs (plans) for this customer
  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['portal_plans', customer?.id],
    queryFn: async () => {
      if (!customer) return [];
      const { data, error } = await supabase
        .from('jobs')
        .select('id, job_title, job_number, service_category, status, service_frequency, contract_start_date, contract_end_date, season_name, minimum_included_visits, additional_visit_rate, service_instructions, properties(property_name)')
        .eq('customer_id', customer.id)
        .in('status', ['Scheduled', 'In Progress', 'Completed', 'On Hold'])
        .order('contract_start_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!customer,
  });

  // Fetch agreement files linked to this customer
  const { data: agreements = [], isLoading: filesLoading } = useQuery({
    queryKey: ['portal_agreements', customer?.id],
    queryFn: async () => {
      if (!customer) return [];
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('record_type', 'customer_agreement')
        .eq('record_id', customer.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!customer,
  });

  const isLoading = plansLoading || filesLoading;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-primary" /> My Plan & Agreement
      </h1>

      {/* ── My Plan ── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">My Service Plans</h2>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map(i => <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />)}
          </div>
        ) : plans.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center space-y-1">
              <ClipboardList className="h-8 w-8 mx-auto text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No active service plans.</p>
              <p className="text-xs text-muted-foreground">Once your service agreement is set up, your plan details will appear here.</p>
            </CardContent>
          </Card>
        ) : (
          plans.map((plan: any) => (
            <Card key={plan.id} className="overflow-hidden">
              <CardContent className="pt-4 pb-4 px-4 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-foreground">{plan.job_title}</p>
                    <p className="text-[11px] text-muted-foreground font-mono">{plan.job_number}</p>
                  </div>
                  <StatusBadge status={plan.status} showIcon={false} />
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <InfoRow icon={FileText} label="Service" value={plan.service_category} />
                  {plan.properties?.property_name && (
                    <InfoRow icon={MapPin} label="Property" value={plan.properties.property_name} />
                  )}
                  {plan.service_frequency && (
                    <InfoRow icon={Repeat} label="Schedule" value={FREQ_LABELS[plan.service_frequency] || plan.service_frequency} />
                  )}
                  {plan.minimum_included_visits && (
                    <InfoRow icon={ClipboardList} label="Included Visits" value={`${plan.minimum_included_visits} visits`} />
                  )}
                  {plan.additional_visit_rate != null && Number(plan.additional_visit_rate) > 0 && (
                    <InfoRow icon={DollarSign} label="Additional Visit Rate" value={`$${Number(plan.additional_visit_rate).toFixed(2)}`} />
                  )}
                </div>

                {/* Contract period */}
                {(plan.contract_start_date || plan.contract_end_date) && (
                  <div className="bg-muted/50 rounded-md p-3 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                      <Calendar className="h-3.5 w-3.5 text-primary" />
                      Contract Period
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(plan.contract_start_date)} — {formatDate(plan.contract_end_date)}
                    </p>
                    {plan.season_name && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                        <Snowflake className="h-3 w-3 text-blue-500" />
                        <span className="font-medium">{plan.season_name}</span>
                        {plan.contract_start_date && plan.contract_end_date && (
                          <span>
                            : {formatDate(plan.contract_start_date)} to {formatDate(plan.contract_end_date)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Service instructions */}
                {plan.service_instructions && (
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Service Instructions</p>
                    <p className="text-xs text-foreground leading-relaxed">{plan.service_instructions}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </section>

      {/* ── My Agreement ── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">My Agreement</h2>

        {isLoading ? (
          <div className="h-20 rounded-lg bg-muted animate-pulse" />
        ) : agreements.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center space-y-1">
              <FileText className="h-8 w-8 mx-auto text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No agreement on file.</p>
              <p className="text-xs text-muted-foreground">Your signed service agreement will appear here once uploaded.</p>
            </CardContent>
          </Card>
        ) : (
          agreements.map((file: any) => (
            <Card key={file.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="pt-4 pb-4 px-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md bg-red-50 dark:bg-red-900/20 flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5 text-red-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{file.file_name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Uploaded {new Date(file.created_at).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <a
                      href={file.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline px-2 py-1.5 rounded-md hover:bg-primary/5 transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> View
                    </a>
                    <a
                      href={file.file_url}
                      download={file.file_name}
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline px-2 py-1.5 rounded-md hover:bg-primary/5 transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" /> Download
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </section>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof FileText; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className="text-xs font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}
