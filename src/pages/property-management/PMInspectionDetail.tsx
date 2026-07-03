import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InspectionEditor } from '@/components/property-management/inspections/InspectionEditor';

export default function PMInspectionDetail() {
  const { id } = useParams();
  if (!id) return null;
  return (
    <div className="p-4 md:p-6 space-y-4">
      <Button asChild variant="ghost" size="sm">
        <Link to="/property-management/inspections"><ArrowLeft className="h-4 w-4 mr-1" /> Back to inspections</Link>
      </Button>
      <InspectionEditor id={id} mode="admin" />
    </div>
  );
}
