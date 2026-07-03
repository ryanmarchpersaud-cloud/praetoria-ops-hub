import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardCheck } from 'lucide-react';
import { InspectionsList } from '@/components/property-management/inspections/InspectionsList';
import { CreateInspectionDialog } from '@/components/property-management/inspections/CreateInspectionDialog';
import { InspectionFilters, PmInspectionType } from '@/hooks/pm/usePmInspections';

interface Props {
  filters: InspectionFilters;
  defaults?: React.ComponentProps<typeof CreateInspectionDialog>['defaults'];
  defaultType?: PmInspectionType;
  title?: string;
}

export function InspectionsSection({ filters, defaults, defaultType, title = 'Inspections' }: Props) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-emerald-700" /> {title}
        </CardTitle>
        <CreateInspectionDialog defaults={defaults} defaultType={defaultType} />
      </CardHeader>
      <CardContent>
        <InspectionsList filters={filters} />
      </CardContent>
    </Card>
  );
}
