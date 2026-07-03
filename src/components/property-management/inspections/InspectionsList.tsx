import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ClipboardCheck } from 'lucide-react';
import { InspectionFilters, usePmInspections } from '@/hooks/pm/usePmInspections';

interface Props {
  filters: InspectionFilters;
  linkBase?: string; // '/property-management/inspections' or '/pm-staff/inspections'
  emptyLabel?: string;
}

export function InspectionsList({
  filters,
  linkBase = '/property-management/inspections',
  emptyLabel = 'No inspections yet.',
}: Props) {
  const { data = [], isLoading } = usePmInspections(filters);
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (data.length === 0) return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  return (
    <div className="space-y-2">
      {data.map((i: any) => (
        <Card key={i.id}>
          <CardContent className="p-3">
            <Link to={`${linkBase}/${i.id}`} className="flex items-center gap-3">
              <ClipboardCheck className="h-5 w-5 text-emerald-700 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm truncate">{i.title}</p>
                  <Badge variant="secondary" className="text-[10px]">{i.inspection_type.replace(/_/g, ' ')}</Badge>
                  <Badge variant="outline" className="text-[10px]">{i.status.replace(/_/g, ' ')}</Badge>
                  {i.tenant_visible && <Badge className="text-[10px] bg-blue-600">Tenant</Badge>}
                  {i.owner_visible && <Badge className="text-[10px] bg-purple-600">Owner</Badge>}
                </div>
                <p className="text-[11px] text-muted-foreground truncate">
                  {i.scheduled_for ? `Scheduled ${new Date(i.scheduled_for).toLocaleDateString()}` : `Created ${new Date(i.created_at).toLocaleDateString()}`}
                </p>
              </div>
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
