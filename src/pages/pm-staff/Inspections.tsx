import { PMStaffLayout } from '@/components/pm-staff/PMStaffLayout';
import { InspectionsList } from '@/components/property-management/inspections/InspectionsList';
import { ClipboardCheck } from 'lucide-react';

export default function PMStaffInspections() {
  return (
    <PMStaffLayout>
      <div className="p-4 space-y-4">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-emerald-700" /> My Inspections
        </h1>
        <p className="text-xs text-muted-foreground">
          Inspections assigned to you. Start when on site, complete the checklist, upload photos, and submit for review.
        </p>
        <InspectionsList
          filters={{ onlyAssignedToMe: true }}
          linkBase="/pm-staff/inspections"
          emptyLabel="No inspections assigned to you yet."
        />
      </div>
    </PMStaffLayout>
  );
}
