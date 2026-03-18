import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { Link } from 'react-router-dom';
import { MessageSquarePlus, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function Requests() {
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['service_requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_requests')
        .select('*, customers(first_name, last_name), properties(property_name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg md:text-2xl font-bold">Service Requests</h1>
          <p className="text-muted-foreground text-xs md:text-sm">Customer-submitted requests</p>
        </div>
        <span className="text-xs text-muted-foreground">{requests.length} total</span>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquarePlus className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No service requests yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {requests.map((req: any) => (
            <Link key={req.id} to={`/requests/${req.id}`} className="block">
            <Card className="active:shadow-sm transition-shadow hover:bg-muted/30">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{req.subject}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {req.customers?.first_name} {req.customers?.last_name}
                      {req.properties?.property_name && ` · ${req.properties.property_name}`}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <StatusBadge status={req.status} showIcon={false} />
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    {req.description && (
                      <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{req.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">
                      {req.urgency}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                  </div>
                </div>
              </CardContent>
            </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
