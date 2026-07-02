import { Link, useParams } from 'react-router-dom';
import { OwnerLayout } from '@/components/owner/OwnerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MapPin } from 'lucide-react';
import { formatStatusLabel } from '@/lib/statusLabel';
import {
  useOwnerProperty,
  useOwnerUnitsForProperty,
  useOwnerLeasesForProperty,
  useOwnerMaintenanceRequests,
} from '@/hooks/useOwnerPortal';

export default function OwnerPropertyDetail() {
  const { id } = useParams();
  const { data: property } = useOwnerProperty(id);
  const { data: units = [] } = useOwnerUnitsForProperty(id);
  const { data: leases = [] } = useOwnerLeasesForProperty(id);
  const { data: requests = [] } = useOwnerMaintenanceRequests(id);

  const activeLeases = leases.filter((l: any) => (l.status || '').toLowerCase() === 'active');

  return (
    <OwnerLayout>
      <div className="p-4 space-y-4">
        <Button variant="ghost" size="sm" asChild><Link to="/owner/properties"><ArrowLeft className="h-4 w-4 mr-1" />Properties</Link></Button>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{property?.property_name ?? '…'}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p className="flex items-center gap-1 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {[property?.address_line_1, property?.city, property?.province, property?.postal_code].filter(Boolean).join(', ')}
            </p>
            {property?.property_type && (
              <p className="text-xs text-muted-foreground">Type: {property.property_type}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Units ({units.length})</CardTitle></CardHeader>
          <CardContent>
            {units.length === 0 ? (
              <p className="text-sm text-muted-foreground">No units on file.</p>
            ) : (
              <ul className="divide-y">
                {units.map((u: any) => (
                  <li key={u.id} className="py-2 flex items-center justify-between text-sm">
                    <span className="font-medium">{u.unit_label}</span>
                    <span className="text-xs text-muted-foreground">
                      {u.bedrooms ?? '—'} bd · {u.bathrooms ?? '—'} ba · {formatStatusLabel(u.status)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Active leases ({activeLeases.length})</CardTitle></CardHeader>
          <CardContent>
            {activeLeases.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active leases.</p>
            ) : (
              <ul className="divide-y">
                {activeLeases.map((l: any) => (
                  <li key={l.id} className="py-2 flex items-center justify-between text-sm">
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {l.tenant?.first_name} {l.tenant?.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {l.start_date} → {l.end_date ?? 'Ongoing'}
                      </p>
                    </div>
                    <p className="text-sm font-semibold">
                      ${Number(l.monthly_rent ?? 0).toFixed(0)}/{l.rent_frequency ?? 'mo'}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Recent maintenance ({requests.length})</CardTitle></CardHeader>
          <CardContent>
            {requests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No maintenance requests.</p>
            ) : (
              <ul className="divide-y">
                {requests.slice(0, 8).map((r: any) => (
                  <li key={r.id} className="py-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium truncate">{r.title || r.category}</p>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 shrink-0">
                        {formatStatusLabel(r.status)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString()} {r.unit?.unit_label ? `· ${r.unit.unit_label}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </OwnerLayout>
  );
}
