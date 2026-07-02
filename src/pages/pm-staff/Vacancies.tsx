import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useVacantUnits } from '@/hooks/pm-staff/usePMStaffData';
import { DoorOpen } from 'lucide-react';

export default function Vacancies() {
  const { data = [], isLoading } = useVacantUnits();
  return (
    <div className="p-4 space-y-3">
      <h2 className="text-lg font-semibold">Vacant Units</h2>
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!isLoading && data.length === 0 && (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No vacant units.</CardContent></Card>
      )}
      <div className="space-y-2">
        {data.map(u => (
          <Card key={u.id}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                <DoorOpen className="h-5 w-5 text-emerald-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {u.property?.property_name ?? 'Property'} · {u.unit_label ?? 'Unit'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {[u.property?.address_line_1, u.property?.city].filter(Boolean).join(', ')}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {u.bedrooms ? `${u.bedrooms} bd` : ''}{u.bathrooms ? ` · ${u.bathrooms} ba` : ''}
                </p>
              </div>
              {u.rent_amount != null && (
                <Badge variant="outline" className="text-xs">${Number(u.rent_amount).toLocaleString()}/mo</Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
