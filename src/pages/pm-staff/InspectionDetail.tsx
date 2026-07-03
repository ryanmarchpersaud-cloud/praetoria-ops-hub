import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PMStaffLayout } from '@/components/pm-staff/PMStaffLayout';
import { InspectionEditor } from '@/components/property-management/inspections/InspectionEditor';

export default function PMStaffInspectionDetail() {
  const { id } = useParams();
  if (!id) return null;
  return (
    <PMStaffLayout>
      <div className="p-4 space-y-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/pm-staff/inspections"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link>
        </Button>
        <InspectionEditor id={id} mode="staff" />
      </div>
    </PMStaffLayout>
  );
}
