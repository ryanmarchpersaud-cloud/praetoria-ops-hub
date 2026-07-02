import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePmUnits, usePmProperties } from '@/hooks/usePropertyManagement';

export default function PMUnitsList() {
  const { data: units = [], isLoading } = usePmUnits();
  const { data: props = [] } = usePmProperties();
  const propMap = Object.fromEntries(props.map(p => [p.id, p]));

  return (
    <div className="p-6 space-y-4 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold">Units</h1>
      <p className="text-sm text-muted-foreground">Add units from inside a property.</p>
      <Card>
        <CardHeader><CardTitle className="text-base">All units</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? 'Loading…' : units.length === 0 ? <p className="text-sm text-muted-foreground">No units yet.</p> : (
            <div className="divide-y">
              {units.map(u => {
                const p = propMap[u.property_id];
                return (
                  <Link key={u.id} to={p ? `/property-management/properties/${p.id}` : '#'} className="flex items-center justify-between py-2 px-2 hover:bg-muted/40 rounded">
                    <div>
                      <div className="font-medium">{u.unit_label} <span className="text-muted-foreground text-xs">· {p?.property_name ?? '—'}</span></div>
                      <div className="text-xs text-muted-foreground">{u.bedrooms ?? '—'} bd / {u.bathrooms ?? '—'} ba · Rent: {u.rent_amount ? `$${u.rent_amount}` : '—'}</div>
                    </div>
                    <Badge variant={u.status === 'occupied' ? 'default' : 'outline'}>{u.status}</Badge>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
