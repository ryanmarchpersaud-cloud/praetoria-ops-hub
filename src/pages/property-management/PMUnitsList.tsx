import { Link, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { usePmUnits, usePmProperties } from '@/hooks/usePropertyManagement';

export default function PMUnitsList() {
  const { data: units = [], isLoading } = usePmUnits();
  const { data: props = [] } = usePmProperties();
  const propMap = Object.fromEntries(props.map(p => [p.id, p]));
  const [params, setParams] = useSearchParams();
  const statusFilter = params.get('status'); // 'occupied' | 'vacant' | null

  const filtered = statusFilter
    ? units.filter((u) => u.status === statusFilter)
    : units;

  const setFilter = (v: string | null) => {
    const next = new URLSearchParams(params);
    if (v) next.set('status', v); else next.delete('status');
    setParams(next, { replace: true });
  };

  return (
    <div className="p-6 space-y-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Units</h1>
          <p className="text-sm text-muted-foreground">Add units from inside a property.</p>
        </div>
        <div className="flex gap-1.5">
          <Button size="sm" variant={!statusFilter ? 'default' : 'outline'} onClick={() => setFilter(null)}>All</Button>
          <Button size="sm" variant={statusFilter === 'occupied' ? 'default' : 'outline'} onClick={() => setFilter('occupied')}>Occupied</Button>
          <Button size="sm" variant={statusFilter === 'vacant' ? 'default' : 'outline'} onClick={() => setFilter('vacant')}>Vacant</Button>
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">
          {statusFilter ? `${statusFilter[0].toUpperCase()}${statusFilter.slice(1)} units` : 'All units'} ({filtered.length})
        </CardTitle></CardHeader>
        <CardContent>
          {isLoading ? 'Loading…' : filtered.length === 0 ? <p className="text-sm text-muted-foreground">No units match.</p> : (
            <div className="divide-y">
              {filtered.map(u => {
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
