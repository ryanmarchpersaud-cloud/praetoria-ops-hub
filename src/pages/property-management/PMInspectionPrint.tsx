import { useParams } from 'react-router-dom';
import { InspectionPrintView } from '@/components/property-management/inspections/InspectionPrintView';

export default function PMInspectionPrint() {
  const { id } = useParams();
  if (!id) return null;
  return <InspectionPrintView id={id} mode="admin" backHref={`/property-management/inspections/${id}`} />;
}
