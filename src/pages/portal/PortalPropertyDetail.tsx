import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCustomerProfile } from '@/hooks/useUserRole';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import {
  ArrowLeft, MapPin, Key, StickyNote, Camera, AlertTriangle,
  History, ShieldCheck, Snowflake, FileText, ClipboardCheck, MessageSquarePlus,
} from 'lucide-react';

export default function PortalPropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: customer } = useCustomerProfile();

  const { data: property, isLoading } = useQuery({
    queryKey: ['portal_property', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('properties').select('*').eq('id', id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: visits = [] } = useQuery({
    queryKey: ['portal_property_visits', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visits')
        .select('id, visit_number, service_date, visit_status, visit_type, service_summary, weather_notes, snow_depth')
        .eq('property_id', id!)
        .order('service_date', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: photos = [] } = useQuery({
    queryKey: ['portal_property_photos', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visit_photos')
        .select('id, file_url, photo_tag, caption, created_at')
        .eq('property_id', id!)
        .order('created_at', { ascending: false })
        .limit(8);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['portal_property_plans', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('id, job_title, job_number, service_category, service_frequency, status, season_name')
        .eq('property_id', id!)
        .in('status', ['In Progress', 'Scheduled'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: requests = [] } = useQuery({
    queryKey: ['portal_property_requests', id],
    queryFn: async () => {
      if (!customer) return [];
      const { data, error } = await supabase
        .from('service_requests')
        .select('id, subject, status, urgency, created_at')
        .eq('property_id', id!)
        .eq('customer_id', customer.id)
        .in('status', ['Open', 'In Progress'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!customer,
  });

  // Property-specific documents (files table)
  const { data: documents = [] } = useQuery({
    queryKey: ['portal_property_docs', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('files')
        .select('id, file_name, file_type, file_url, created_at')
        .eq('record_type', 'property')
        .eq('record_id', id!)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) return <p className="text-sm text-muted-foreground p-4">Loading...</p>;
  if (!property) return <p className="text-sm text-muted-foreground p-4">Property not found.</p>;

  const fullAddress = [property.address_line_1, property.city, property.province, property.postal_code].filter(Boolean).join(', ');

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" className="mb-2 -ml-2" onClick={() => navigate('/portal/properties')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Properties
        </Button>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              {property.property_name}
            </h1>
            {fullAddress && <p className="text-sm text-muted-foreground mt-0.5">{fullAddress}</p>}
          </div>
          <StatusBadge status={property.status} />
        </div>
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          <span>{property.property_type}</span>
          {property.gate_code && (
            <span className="flex items-center gap-1"><Key className="h-3 w-3" /> Gate: {property.gate_code}</span>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Button variant="outline" size="sm" className="h-auto py-3 flex-col gap-1" onClick={() => navigate('/portal/requests/new')}>
          <MessageSquarePlus className="h-4 w-4" />
          <span className="text-[10px]">New Request</span>
        </Button>
        <Button variant="outline" size="sm" className="h-auto py-3 flex-col gap-1" onClick={() => navigate('/portal/requests/new')}>
          <AlertTriangle className="h-4 w-4" />
          <span className="text-[10px]">Report Issue</span>
        </Button>
        <Button variant="outline" size="sm" className="h-auto py-3 flex-col gap-1" onClick={() => navigate('/portal/photos')}>
          <Camera className="h-4 w-4" />
          <span className="text-[10px]">All Photos</span>
        </Button>
        <Button variant="outline" size="sm" className="h-auto py-3 flex-col gap-1" onClick={() => navigate('/portal/preferences')}>
          <ClipboardCheck className="h-4 w-4" />
          <span className="text-[10px]">Preferences</span>
        </Button>
      </div>

      {/* Site Notes & Access */}
      {(property.access_notes || property.seasonal_notes) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-amber-500" /> Site Notes & Access
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {property.access_notes && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Access Notes</p>
                <p className="text-sm">{property.access_notes}</p>
              </div>
            )}
            {property.seasonal_notes && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Seasonal Notes</p>
                <p className="text-sm">{property.seasonal_notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Active Service Plans */}
      {plans.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" /> Active Service Plans
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {plans.map((plan: any) => (
              <div key={plan.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium">{plan.job_title}</p>
                  <p className="text-xs text-muted-foreground">
                    {plan.service_category} · {plan.service_frequency?.replace('-', ' ')}
                    {plan.season_name && ` · ${plan.season_name}`}
                  </p>
                </div>
                <StatusBadge status={plan.status} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Open Requests */}
      {requests.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" /> Open Requests
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {requests.map((req: any) => (
              <div key={req.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium">{req.subject}</p>
                  <p className="text-xs text-muted-foreground">{req.urgency} · {new Date(req.created_at).toLocaleDateString()}</p>
                </div>
                <StatusBadge status={req.status} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Property Documents */}
      {documents.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-500" /> Property Documents
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {documents.map((doc: any) => (
              <a key={doc.id} href={doc.file_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-between py-2 border-b border-border last:border-0 hover:bg-muted/50 rounded px-1 -mx-1 transition-colors">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm truncate">{doc.file_name}</span>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {new Date(doc.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                </span>
              </a>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Property Photos */}
      {photos.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Camera className="h-4 w-4 text-violet-500" /> Property Photos
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate('/portal/photos')}>See all →</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2">
              {photos.map((photo: any) => (
                <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                  <img src={photo.file_url} alt={photo.caption || 'Property photo'} className="w-full h-full object-cover" loading="lazy" />
                  <span className="absolute top-1 left-1 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-black/60 text-white">{photo.photo_tag}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Service History */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <History className="h-4 w-4 text-cyan-500" /> Recent Service History
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate('/portal/visits')}>See all →</Button>
          </div>
        </CardHeader>
        <CardContent>
          {visits.length === 0 ? (
            <p className="text-xs text-muted-foreground py-3 text-center">No visits recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {visits.map((v: any) => (
                <div key={v.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-medium">{v.visit_number}</span>
                      <StatusBadge status={v.visit_status} />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span>{v.visit_type}</span>
                      {v.snow_depth && <span className="flex items-center gap-0.5"><Snowflake className="h-3 w-3" /> {v.snow_depth}</span>}
                    </div>
                    {v.service_summary && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{v.service_summary}</p>}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {(() => { const m = v.service_date?.match(/^(\d{4})-(\d{2})-(\d{2})/); const d = m ? new Date(+m[1], +m[2]-1, +m[3]) : new Date(v.service_date); return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }); })()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
