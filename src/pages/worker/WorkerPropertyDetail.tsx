import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { ArrowLeft, Loader2, Calendar, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PropertyVerificationCard } from '@/components/PropertyVerificationCard';

export default function WorkerPropertyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: property, isLoading } = useQuery({
    queryKey: ['worker_property', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('*, customers(first_name, last_name, phone, company_name)')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: visits = [] } = useQuery({
    queryKey: ['worker_property_visits', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visits')
        .select('id, visit_number, visit_status, service_date, visit_type')
        .eq('property_id', id!)
        .order('service_date', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!property) return <div className="p-6 text-center text-muted-foreground">Property not found</div>;

  const customer = property.customers as any;

  return (
    <div className="px-4 pt-3 pb-4 space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold truncate">{property.property_name}</h1>
          <StatusBadge status={property.status} showIcon={false} />
        </div>
      </div>

      <PropertyVerificationCard property={property} />

      <div>
        <h2 className="text-sm font-semibold mb-2">Recent Visits</h2>
        {visits.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No visits for this property yet.</CardContent></Card>
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
