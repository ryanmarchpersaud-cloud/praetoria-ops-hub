import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCustomerProfile } from '@/hooks/useUserRole';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquarePlus, Plus, Image as ImageIcon } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';

export default function PortalRequests() {
  const navigate = useNavigate();
  const { data: customer } = useCustomerProfile();
  const [previewImg, setPreviewImg] = useState<string | null>(null);

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
          {requests.map((r: any) => {
            const attachments: string[] = r.attachments || [];
            return (
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

                  {/* Attachment thumbnails */}
                  {attachments.length > 0 && (
                    <div className="flex items-center gap-1.5 pt-1">
                      <ImageIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <div className="flex gap-1.5 overflow-x-auto">
                        {attachments.map((url, i) => (
                          <button key={i} onClick={() => setPreviewImg(url)} className="shrink-0 w-10 h-10 rounded-md overflow-hidden border border-border hover:ring-2 hover:ring-primary/40 transition-all">
                            <img src={url} alt={`Attachment ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Full-size image preview */}
      {previewImg && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setPreviewImg(null)}>
          <img src={previewImg} alt="Attachment preview" className="max-w-full max-h-full rounded-lg object-contain" />
        </div>
      )}
    </div>
  );
}
