import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCustomerProfile } from '@/hooks/useUserRole';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquarePlus, Plus, Image as ImageIcon, ChevronRight, RefreshCw, Loader2 } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { toast } from 'sonner';

/** Resolve attachment strings to signed URLs. */
async function resolveAttachmentUrls(paths: string[]): Promise<string[]> {
  const results: string[] = [];
  for (const p of paths) {
    if (p.startsWith('http')) {
      results.push(p);
    } else {
      const { data } = await supabase.storage
        .from('request-attachments')
        .createSignedUrl(p, 3600);
      if (data?.signedUrl) results.push(data.signedUrl);
    }
  }
  return results;
}

export default function PortalRequests() {
  const navigate = useNavigate();
  const { data: customer } = useCustomerProfile();
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [signedUrlMap, setSignedUrlMap] = useState<Record<string, string[]>>({});

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

  useEffect(() => {
    async function resolve() {
      const map: Record<string, string[]> = {};
      for (const r of requests as any[]) {
        const raw: string[] = r.attachments || [];
        if (raw.length > 0) {
          map[r.id] = await resolveAttachmentUrls(raw);
        }
      }
      setSignedUrlMap(map);
    }
    if (requests.length > 0) resolve();
  }, [requests]);

  const queryClient = useQueryClient();
  const [reorderingId, setReorderingId] = useState<string | null>(null);

  const handleReorder = async (r: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (reorderingId) return;
    setReorderingId(r.id);
    try {
      const { error } = await supabase.from('service_requests').insert({
        customer_id: r.customer_id,
        property_id: r.property_id,
        subject: r.subject,
        service_type: r.service_type,
        specific_request_type: r.specific_request_type,
        description: r.description,
        urgency: r.urgency,
        status: 'open',
        requested_timing: r.requested_timing,
        area_of_property: r.area_of_property,
        access_notes: r.access_notes,
        preferred_contact_method: r.preferred_contact_method,
      });
      if (error) throw error;
      toast.success('Request resubmitted successfully!');
      queryClient.invalidateQueries({ queryKey: ['portal_requests'] });
    } catch (err: any) {
      toast.error('Failed to resubmit request');
    } finally {
      setReorderingId(null);
    }
  };

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
            const attachments: string[] = signedUrlMap[r.id] || [];
            return (
              <Card
                key={r.id}
                className="hover:shadow-md transition-shadow cursor-pointer active:scale-[0.99]"
                onClick={() => navigate(`/portal/requests/${r.id}`)}
              >
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm truncate">{r.subject}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <StatusBadge status={r.status} />
                      <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{r.service_type}</span>
                    <span>·</span>
                    <span className="capitalize">{r.urgency}</span>
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
                          <button key={i} onClick={(e) => { e.stopPropagation(); setPreviewImg(url); }} className="shrink-0 w-10 h-10 rounded-md overflow-hidden border border-border hover:ring-2 hover:ring-primary/40 transition-all">
                            <img src={url} alt={`Attachment ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <p className="text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs gap-1 text-primary hover:text-primary"
                      disabled={reorderingId === r.id}
                      onClick={(e) => handleReorder(r, e)}
                    >
                      {reorderingId === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                      {reorderingId === r.id ? 'Submitting…' : 'Request Again'}
                    </Button>
                  </div>
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
