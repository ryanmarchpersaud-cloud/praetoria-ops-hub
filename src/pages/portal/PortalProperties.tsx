import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCustomerProfile } from '@/hooks/useUserRole';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, ChevronRight } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';

export default function PortalProperties() {
  const navigate = useNavigate();
  const { data: customer } = useCustomerProfile();

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['portal_properties', customer?.id],
    queryFn: async () => {
      if (!customer) return [];
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('customer_id', customer.id)
        .order('property_name');
      if (error) throw error;
      return data;
    },
    enabled: !!customer,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">My Properties</h1>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : properties.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No properties found.</CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {properties.map((p: any) => (
            <Card key={p.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-medium text-sm">{p.property_name}</span>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
                {p.address_line_1 && (
                  <p className="text-xs text-muted-foreground pl-6">
                    {p.address_line_1}{p.city ? `, ${p.city}` : ''}{p.province ? `, ${p.province}` : ''}
                  </p>
                )}
                <p className="text-xs text-muted-foreground pl-6">{p.property_type}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
