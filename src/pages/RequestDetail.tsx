import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, User, MapPin, Clock, AlertTriangle, Phone, FileText, ImageIcon, X, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const STATUS_OPTIONS = ['Open', 'In Progress', 'Resolved', 'Closed', 'Cancelled'];

export default function RequestDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [internalNotes, setInternalNotes] = useState('');
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [resolvedUrls, setResolvedUrls] = useState<string[]>([]);

  const { data: request, isLoading } = useQuery({
    queryKey: ['service_request', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('service_requests')
        .select('*, customers(first_name, last_name, email, phone, company_name), properties(property_name, address_line_1, city)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (request?.internal_notes !== undefined) {
      setInternalNotes(request.internal_notes || '');
    }
  }, [request?.internal_notes]);

  // Resolve attachment URLs (private storage paths → signed URLs)
  useEffect(() => {
    if (!request?.attachments?.length) {
      setResolvedUrls([]);
      return;
    }
    (async () => {
      const urls: string[] = [];
      for (const p of request.attachments as string[]) {
        if (p.startsWith('http')) {
          urls.push(p);
        } else {
          const { data } = await supabase.storage
            .from('request-attachments')
            .createSignedUrl(p, 3600);
          if (data?.signedUrl) urls.push(data.signedUrl);
        }
      }
      setResolvedUrls(urls);
    })();
  }, [request?.attachments]);

  const updateRequest = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const { error } = await supabase
        .from('service_requests')
        .update(updates)
        .eq('id', id!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service_request', id] });
      qc.invalidateQueries({ queryKey: ['service_requests'] });
    },
  });

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateRequest.mutateAsync({ status: newStatus });
      toast.success(`Status updated to ${newStatus}`);
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleSaveNotes = async () => {
    try {
      await updateRequest.mutateAsync({ internal_notes: internalNotes });
      toast.success('Notes saved');
    } catch {
      toast.error('Failed to save notes');
    }
  };

  if (isLoading) return <div className="flex items-center justify-center py-16 text-muted-foreground">Loading…</div>;
  if (!request) return <div className="flex items-center justify-center py-16 text-muted-foreground">Request not found</div>;

  const customer = request.customers as any;
  const property = request.properties as any;

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-2">
        <Link to="/requests" className="text-muted-foreground hover:text-foreground mt-1">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl md:text-2xl font-bold truncate">{request.subject}</h1>
            <StatusBadge status={request.status} />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Submitted {format(new Date(request.created_at), 'MMM d, yyyy · h:mm a')}
          </p>
        </div>
      </div>

      {/* Status + Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={request.status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-40 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {request.customer_id && (
          <Link to={`/customers/${request.customer_id}`}>
            <Button variant="outline" size="sm" className="text-xs h-8">
              <User className="h-3.5 w-3.5 mr-1" /> View Customer
            </Button>
          </Link>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Main content */}
        <div className="md:col-span-2 space-y-4">
          {/* Description */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Description
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {request.description || 'No description provided.'}
              </p>
            </CardContent>
          </Card>

          {/* Attachments */}
          {resolvedUrls.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5" /> Attachments ({resolvedUrls.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {resolvedUrls.map((url, i) => (
                    <button
                      key={i}
                      onClick={() => setPreviewImg(url)}
                      className="aspect-square rounded-lg overflow-hidden border hover:ring-2 ring-primary transition-all"
                    >
                      <img src={url} alt={`Attachment ${i + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Internal Notes */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Internal Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Textarea
                value={internalNotes}
                onChange={e => setInternalNotes(e.target.value)}
                placeholder="Add internal notes about this request…"
                rows={3}
                className="text-sm"
              />
              <Button size="sm" variant="outline" onClick={handleSaveNotes} disabled={updateRequest.isPending}>
                Save Notes
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Request Details */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Request Details</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <div>
                <span className="text-muted-foreground text-xs uppercase">Service Type</span>
                <p className="font-medium capitalize">{request.service_type}</p>
              </div>
              {request.specific_request_type && (
                <div>
                  <span className="text-muted-foreground text-xs uppercase">Specific Type</span>
                  <p className="font-medium">{request.specific_request_type}</p>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />
                <div>
                  <span className="text-muted-foreground text-xs uppercase">Urgency</span>
                  <p className="font-medium capitalize">{request.urgency}</p>
                </div>
              </div>
              {request.requested_timing && (
                <div>
                  <span className="text-muted-foreground text-xs uppercase">Timing</span>
                  <p className="font-medium">{request.requested_timing}</p>
                </div>
              )}
              {request.area_of_property && (
                <div>
                  <span className="text-muted-foreground text-xs uppercase">Area of Property</span>
                  <p className="font-medium">{request.area_of_property}</p>
                </div>
              )}
              {request.access_notes && (
                <div>
                  <span className="text-muted-foreground text-xs uppercase">Access Notes</span>
                  <p className="font-medium">{request.access_notes}</p>
                </div>
              )}
              {request.preferred_contact_method && (
                <div className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  <div>
                    <span className="text-muted-foreground text-xs uppercase">Preferred Contact</span>
                    <p className="font-medium capitalize">{request.preferred_contact_method}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer Info */}
          {customer && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" /> Customer
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p className="font-medium">{customer.first_name} {customer.last_name}</p>
                {customer.company_name && <p className="text-muted-foreground">{customer.company_name}</p>}
                {customer.email && <p className="text-muted-foreground">{customer.email}</p>}
                {customer.phone && <p className="text-muted-foreground">{customer.phone}</p>}
              </CardContent>
            </Card>
          )}

          {/* Property Info */}
          {property && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" /> Property
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p className="font-medium">{property.property_name}</p>
                {property.address_line_1 && <p className="text-muted-foreground">{property.address_line_1}</p>}
                {property.city && <p className="text-muted-foreground">{property.city}</p>}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {previewImg && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setPreviewImg(null)}>
          <button className="absolute top-4 right-4 text-white" onClick={() => setPreviewImg(null)}>
            <X className="h-6 w-6" />
          </button>
          <img src={previewImg} alt="Preview" className="max-w-full max-h-[85vh] rounded-lg object-contain" />
        </div>
      )}
    </div>
  );
}
