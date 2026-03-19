import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { ArrowLeft, Briefcase, MapPin, Calendar, Loader2, ChevronRight, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PropertyVerificationCard } from '@/components/PropertyVerificationCard';

export default function WorkerJobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: job, isLoading } = useQuery({
    queryKey: ['worker_job', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('*, customers(first_name, last_name), properties(property_name, address_line_1, city, province, postal_code, gate_code, access_notes, access_type, landmark_notes, caution_notes, high_risk_flag, house_number_location, photo_front_url, photo_winter_url, photo_night_url)')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: visits = [] } = useQuery({
    queryKey: ['worker_job_visits', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visits')
        .select('id, visit_number, visit_status, service_date, visit_type')
        .eq('job_id', id!)
        .order('service_date', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!job) return <div className="p-6 text-center text-muted-foreground">Job not found</div>;

  const customer = job.customers as any;
  const property = job.properties as any;

  return (
    <div className="px-4 pt-3 pb-4 space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs">{job.job_number}</span>
            <StatusBadge status={job.status} showIcon={false} />
          </div>
          <h1 className="text-lg font-bold truncate">{job.job_title}</h1>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">{job.service_category}</span>
            {job.service_frequency && <span className="text-xs text-muted-foreground">· {job.service_frequency}</span>}
          </div>
          {customer && (
            <p className="text-sm text-muted-foreground">Customer: {customer.first_name} {customer.last_name}</p>
          )}
          {job.service_instructions && (
            <div className="pt-2 border-t">
              <div className="flex items-center gap-1.5 mb-1">
                <FileText className="h-3.5 w-3.5 text-amber-600" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-600">Instructions</span>
              </div>
              <p className="text-xs whitespace-pre-wrap">{job.service_instructions}</p>
            </div>
          )}
          {job.scope_of_work && (
            <div className="pt-2 border-t">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Scope of Work</p>
              <p className="text-xs whitespace-pre-wrap">{job.scope_of_work}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Property Verification */}
      {property && <PropertyVerificationCard property={property} compact />}
          {job.service_instructions && (
            <div className="pt-2 border-t">
              <div className="flex items-center gap-1.5 mb-1">
                <FileText className="h-3.5 w-3.5 text-amber-600" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-600">Instructions</span>
              </div>
              <p className="text-xs whitespace-pre-wrap">{job.service_instructions}</p>
            </div>
          )}
          {job.scope_of_work && (
            <div className="pt-2 border-t">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Scope of Work</p>
              <p className="text-xs whitespace-pre-wrap">{job.scope_of_work}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="text-sm font-semibold mb-2">Visits</h2>
        {visits.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No visits for this job yet.</CardContent></Card>
        ) : (
          <div className="space-y-1.5">
            {visits.map((v: any) => (
              <Link key={v.id} to={`/worker/visit/${v.id}`}>
                <Card className="active:shadow-sm transition-shadow">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">{v.visit_number}</span>
                        <StatusBadge status={v.visit_status} showIcon={false} />
                      </div>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {v.service_date}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
