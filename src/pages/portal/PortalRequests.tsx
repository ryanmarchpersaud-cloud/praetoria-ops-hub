import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCustomerProfile } from '@/hooks/useUserRole';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquarePlus, Plus } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';

export default function PortalRequests() {
  const navigate = useNavigate();
  const { data: customer } = useCustomerProfile();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['portal_requests', customer?.id],
    queryFn: async () => {
      if (!customer) return [];
      const { data, error } = await supabase
        .from('service_requests')
        .select('*, properties(property_name)')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!customer,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">My Requests</h1>
        <Button size="sm" onClick={() => navigate('/portal/requests/new')}>
          <Plus className="h-4 w-4 mr-1" /> New Request
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center space-y-2">
            <MessageSquarePlus className="h-8 w-8 text-muted-foreground/30 mx-auto" />
            <p className="text-sm text-muted-foreground">No requests yet.</p>
            <Button size="sm" variant="outline" onClick={() => navigate('/portal/requests/new')}>
              Submit a Request
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((r: any) => (
            <Card key={r.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm">{r.subject}</span>
                  <StatusBadge status={r.status} />
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{r.service_type}</span>
                  <span>·</span>
                  <span>{r.urgency}</span>
                  {(r as any).properties?.property_name && (
                    <>
                      <span>·</span>
                      <span>{(r as any).properties.property_name}</span>
                    </>
                  )}
                </div>
                {r.description && <p className="text-xs text-muted-foreground line-clamp-2">{r.description}</p>}
                <p className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
