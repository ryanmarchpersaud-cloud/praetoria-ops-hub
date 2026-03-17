import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCustomerProfile } from '@/hooks/useUserRole';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { ClipboardCheck } from 'lucide-react';

export default function PortalVisits() {
  const { data: customer } = useCustomerProfile();

  const { data: visits = [], isLoading } = useQuery({
    queryKey: ['portal_visits', customer?.id],
    queryFn: async () => {
      if (!customer) return [];
      const { data, error } = await supabase
        .from('visits')
        .select('id, visit_number, service_date, visit_status, visit_type, service_summary, customer_visible_notes, weather_notes, snow_depth, properties(property_name)')
        .eq('customer_id', customer.id)
        .in('visit_status', ['Completed', 'In Progress', 'Scheduled'])
        .order('service_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!customer,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">My Visits</h1>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : visits.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No visits found.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {visits.map((v: any) => (
            <Card key={v.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-medium text-sm font-mono">{v.visit_number}</span>
                  </div>
                  <StatusBadge status={v.visit_status} />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{new Date(v.service_date).toLocaleDateString()}</span>
                  <span>{v.visit_type}</span>
                </div>
                {v.properties?.property_name && (
                  <p className="text-xs text-muted-foreground">{v.properties.property_name}</p>
                )}
                {v.service_summary && (
                  <p className="text-xs text-foreground line-clamp-2">{v.service_summary}</p>
                )}
                {v.customer_visible_notes && (
                  <p className="text-xs text-muted-foreground italic">{v.customer_visible_notes}</p>
                )}
                {(v.weather_notes || v.snow_depth) && (
                  <p className="text-[10px] text-muted-foreground">
                    {[v.weather_notes, v.snow_depth && `Snow: ${v.snow_depth}`].filter(Boolean).join(' · ')}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
