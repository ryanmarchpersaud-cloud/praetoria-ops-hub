import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, MapPin, Navigation, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DirectionsButton } from '@/components/DirectionsButton';
import { CustomerWarningsBanner } from '@/components/CustomerWarningsBanner';

export default function SubcontractorVisitExec() {
  const { id } = useParams<{ id: string }>();
  const { data: visit, isLoading } = useQuery({
    queryKey: ['subcontractor_visit', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('visits')
        .select('*, properties(property_name, address_line_1, city, access_notes, gate_code), jobs(job_title, service_category, scope_of_work, service_instructions)')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  if (!visit) return <div className="p-8 text-center text-muted-foreground">Visit not found.</div>;

  const prop = visit.properties as any;
  const job = visit.jobs as any;

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/subcontractor/schedule" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-5 w-5" /></Link>
        <div>
          <h1 className="text-lg font-bold text-foreground">{visit.visit_number}</h1>
          <p className="text-xs text-muted-foreground capitalize">{visit.visit_status} · {visit.visit_type}</p>
        </div>
      </div>

      {/* Property */}
      {prop && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <Link to={`/subcontractor/property/${visit.property_id}`} className="text-sm font-semibold text-foreground hover:underline">
              {prop.property_name}
            </Link>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" />{prop.address_line_1}{prop.city ? `, ${prop.city}` : ''}
            </p>
            {prop.access_notes && <p className="text-xs text-muted-foreground">Access: {prop.access_notes}</p>}
            {prop.gate_code && <p className="text-xs text-muted-foreground">Gate: {prop.gate_code}</p>}
            <DirectionsButton address={prop.address_line_1} city={prop.city} />
          </CardContent>
        </Card>
      )}

      {/* Customer Warnings */}
      <CustomerWarningsBanner customerId={(visit as any).customer_id} />

      {/* Job/Service Info */}
      {job && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Service Info</p>
            <p className="text-sm font-medium text-foreground">{job.job_title}</p>
            <p className="text-xs text-muted-foreground">Category: {job.service_category}</p>
            {job.scope_of_work && <p className="text-xs text-muted-foreground">{job.scope_of_work}</p>}
            {job.service_instructions && (
              <div className="bg-muted/50 rounded-lg p-3 mt-2">
                <p className="text-xs font-medium text-foreground mb-1">Instructions</p>
                <p className="text-xs text-muted-foreground">{job.service_instructions}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Visit notes */}
      {visit.crew_notes && (
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Notes</p>
            <p className="text-sm text-foreground">{visit.crew_notes}</p>
          </CardContent>
        </Card>
      )}

      <div className="rounded-lg border border-dashed border-muted-foreground/20 p-4 text-center">
        <Clock className="h-6 w-6 mx-auto text-muted-foreground/40 mb-2" />
        <p className="text-xs text-muted-foreground">Status updates and photo upload coming soon</p>
      </div>
    </div>
  );
}
