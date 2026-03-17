import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSubcontractorProfile } from '@/hooks/useSubcontractor';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MapPin, KeyRound, StickyNote, Calendar } from 'lucide-react';
import { DirectionsButton } from '@/components/DirectionsButton';
import { format } from 'date-fns';

export default function SubcontractorPropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: profile } = useSubcontractorProfile();

  const { data: property, isLoading } = useQuery({
    queryKey: ['subcontractor_property', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch visits at this property assigned to this subcontractor
  const { data: recentVisits = [] } = useQuery({
    queryKey: ['subcontractor_property_visits', id, profile?.id],
    queryFn: async () => {
      if (!id || !profile?.id) return [];
      const { data: assignments } = await supabase
        .from('subcontractor_assignments')
        .select('visit_id')
        .eq('subcontractor_id', profile.id);
      const visitIds = (assignments ?? []).map((a: any) => a.visit_id).filter(Boolean);
      if (visitIds.length === 0) return [];
      const { data, error } = await supabase
        .from('visits')
        .select('id, visit_number, visit_status, visit_type, service_date')
        .eq('property_id', id)
        .in('id', visitIds)
        .order('service_date', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!id && !!profile?.id,
  });

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  if (!property) return <div className="p-8 text-center text-muted-foreground">Property not found.</div>;

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/subcontractor/schedule" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-foreground">{property.property_name}</h1>
          <p className="text-xs text-muted-foreground capitalize">{property.property_type} · {property.status}</p>
        </div>
      </div>

      {/* Address & Directions */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <p className="text-sm text-foreground flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
            {property.address_line_1}{property.city ? `, ${property.city}` : ''}{property.province ? `, ${property.province}` : ''} {property.postal_code}
          </p>
          <DirectionsButton address={property.address_line_1} city={property.city} />
        </CardContent>
      </Card>

      {/* Access Info */}
      {(property.access_notes || property.gate_code) && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Access Info</p>
            {property.gate_code && (
              <p className="text-sm text-foreground flex items-center gap-1.5">
                <KeyRound className="h-4 w-4 text-muted-foreground" /> Gate Code: <span className="font-mono font-medium">{property.gate_code}</span>
              </p>
            )}
            {property.access_notes && (
              <p className="text-sm text-muted-foreground flex items-start gap-1.5">
                <StickyNote className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" /> {property.access_notes}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Seasonal Notes */}
      {property.seasonal_notes && (
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Seasonal Notes</p>
            <p className="text-sm text-muted-foreground">{property.seasonal_notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Recent Assigned Visits */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recent Assigned Visits</p>
          {recentVisits.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No assigned visits at this property.</p>
          ) : (
            <div className="space-y-1.5">
              {recentVisits.map((v: any) => (
                <Link key={v.id} to={`/subcontractor/visit/${v.id}`} className="flex items-center justify-between p-2 rounded-md hover:bg-muted transition-colors">
                  <div>
                    <p className="text-sm font-medium text-foreground">{v.visit_number}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {format(new Date(v.service_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] capitalize">{v.visit_status}</Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
