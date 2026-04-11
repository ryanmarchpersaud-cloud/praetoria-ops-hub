import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCustomerProfile } from '@/hooks/useUserRole';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { ArrowLeft, MapPin, Clock, FileText, ImageIcon, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

async function resolveAttachmentUrls(paths: string[]): Promise<string[]> {
  const results: string[] = [];
  for (const p of paths) {
    if (p.startsWith('http')) {
      results.push(p);
    } else {
      const { data } = await supabase.storage.from('request-attachments').createSignedUrl(p, 3600);
      if (data?.signedUrl) results.push(data.signedUrl);
    }
  }
  return results;
}

export default function PortalRequestDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: customer } = useCustomerProfile();
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [resolvedUrls, setResolvedUrls] = useState<string[]>([]);

  const { data: request, isLoading } = useQuery({
    queryKey: ['portal_request_detail', id],
    queryFn: async () => {
      if (!id || !customer) return null;
      const { data, error } = await supabase
        .from('service_requests')
        .select('*, properties(property_name, address_line_1, city)')
        .eq('id', id)
        .eq('customer_id', customer.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!customer,
  });

  useEffect(() => {
    if (!request?.attachments?.length) { setResolvedUrls([]); return; }
    resolveAttachmentUrls(request.attachments as string[]).then(setResolvedUrls);
  }, [request?.attachments]);

  if (isLoading) return <div className="flex items-center justify-center py-16 text-muted-foreground">Loading…</div>;
  if (!request) return <div className="flex items-center justify-center py-16 text-muted-foreground">Request not found</div>;

  const property = request.properties as any;

  const handleReorder = () => {
    const params = new URLSearchParams();
    if (request.property_id) params.set('property_id', request.property_id);
    if (request.service_type) params.set('service_category', request.service_type);
    if (request.specific_request_type) params.set('specific_request_type', request.specific_request_type as string);
    if (request.requested_timing) params.set('requested_timing', request.requested_timing as string);
    navigate(`/portal/requests/new?${params.toString()}`);
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-start gap-2">
        <button onClick={() => navigate('/portal/requests')} className="p-1.5 rounded-lg hover:bg-muted mt-0.5">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold truncate">{request.subject}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Submitted {format(new Date(request.created_at), 'MMM d, yyyy · h:mm a')}
          </p>
        </div>
      </div>

      {/* Status + Reorder */}
      <div className="flex items-center gap-3 flex-wrap">
        <StatusBadge status={request.status} />
        <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={handleReorder}>
          <RefreshCw className="h-3.5 w-3.5" /> Request Again
        </Button>
      </div>

      {/* Details */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <FileText className="h-4 w-4" /> Request Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <DetailRow label="Service Type" value={request.service_type} />
          {request.specific_request_type && <DetailRow label="Specific Request" value={request.specific_request_type as string} />}
          <DetailRow label="Priority" value={request.urgency} />
          {request.requested_timing && <DetailRow label="Timing" value={request.requested_timing as string} />}
          {request.area_of_property && <DetailRow label="Area of Property" value={request.area_of_property as string} />}
          {request.access_notes && <DetailRow label="Access Notes" value={request.access_notes as string} />}
          {request.preferred_contact_method && <DetailRow label="Contact Preference" value={request.preferred_contact_method as string} />}
        </CardContent>
      </Card>

      {/* Description */}
      {request.description && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Your Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{request.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Property */}
      {property && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <MapPin className="h-4 w-4" /> Property
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p className="font-medium">{property.property_name}</p>
            {property.address_line_1 && <p className="text-muted-foreground">{property.address_line_1}</p>}
            {property.city && <p className="text-muted-foreground">{property.city}</p>}
          </CardContent>
        </Card>
      )}

      {/* Attachments */}
      {resolvedUrls.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <ImageIcon className="h-4 w-4" /> Photos ({resolvedUrls.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {resolvedUrls.map((url, i) => (
                <button key={i} onClick={() => setPreviewImg(url)} className="aspect-square rounded-lg overflow-hidden border hover:ring-2 ring-primary transition-all">
                  <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <Clock className="h-4 w-4" /> Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Submitted</span>
            <span className="font-medium">{format(new Date(request.created_at), 'MMM d, yyyy')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Current Status</span>
            <StatusBadge status={request.status} />
          </div>
        </CardContent>
      </Card>

      {/* Lightbox */}
      {previewImg && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setPreviewImg(null)}>
          <img src={previewImg} alt="Preview" className="max-w-full max-h-[85vh] rounded-lg object-contain" />
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-right capitalize">{value}</span>
    </div>
  );
}
