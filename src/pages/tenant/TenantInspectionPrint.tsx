import { useParams } from 'react-router-dom';
import { InspectionPrintView } from '@/components/property-management/inspections/InspectionPrintView';

export default function TenantInspectionPrint() {
  const { id } = useParams();
  if (!id) return null;
  return <InspectionPrintView id={id} mode="tenant" backHref="/tenant/inspections" />;
}
