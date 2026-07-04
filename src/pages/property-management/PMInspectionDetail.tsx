import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InspectionEditor } from '@/components/property-management/inspections/InspectionEditor';
import { ArchiveInspectionDialog } from '@/components/property-management/inspections/ArchiveInspectionDialog';
import { usePmInspection } from '@/hooks/pm/usePmInspections';

export default function PMInspectionDetail() {
  const { id } = useParams();
  const { data } = usePmInspection(id);
  if (!id) return null;
  const insp: any = data?.inspection;
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Button asChild variant="ghost" size="sm">
          <Link to="/property-management/inspections"><ArrowLeft className="h-4 w-4 mr-1" /> Back to inspections</Link>
        </Button>
        <div className="flex items-center gap-2 flex-wrap">
          {insp && (
            <ArchiveInspectionDialog
              inspectionId={id}
              status={insp.status}
              title={insp.title}
              inspected_at={insp.inspected_at}
              property_id={insp.property_id}
              unit_id={insp.unit_id}
              tenant_id={insp.tenant_id}
              owner_id={insp.owner_id}
              lease_id={insp.lease_id}
            />
          )}
          <Button asChild variant="outline" size="sm">
            <Link to={`/property-management/inspections/${id}/print`} target="_blank" rel="noopener">
              <Printer className="h-4 w-4 mr-1" /> Print / Save PDF
            </Link>
          </Button>
        </div>
      </div>
      <InspectionEditor id={id} mode="admin" />
    </div>
  );
}
