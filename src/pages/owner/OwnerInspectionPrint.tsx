import { useParams } from 'react-router-dom';
import { InspectionPrintView } from '@/components/property-management/inspections/InspectionPrintView';

export default function OwnerInspectionPrint() {
  const { id } = useParams();
  if (!id) return null;
  return <InspectionPrintView id={id} mode="owner" backHref="/owner/inspections" />;
}
