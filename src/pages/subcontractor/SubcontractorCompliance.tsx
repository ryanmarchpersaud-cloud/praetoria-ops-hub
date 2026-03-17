import { useSubcontractorProfile } from '@/hooks/useSubcontractor';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { ShieldCheck } from 'lucide-react';

function StatusChip({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    signed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    expired: 'bg-destructive/10 text-destructive',
    missing: 'bg-muted text-muted-foreground',
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${colors[status] || 'bg-muted text-muted-foreground'}`}>{status}</span>;
}

export default function SubcontractorCompliance() {
  const { data: profile, isLoading } = useSubcontractorProfile();
  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  if (!profile) return <div className="p-8 text-center text-muted-foreground">Profile not found.</div>;

  const items = [
    { label: 'Insurance', status: profile.insurance_status, expiry: profile.insurance_expiry },
    { label: 'WCB / Workers Comp', status: profile.wcb_status, expiry: profile.wcb_expiry },
    { label: 'Business License', status: profile.business_license_status, expiry: profile.business_license_expiry },
    { label: 'Signed Agreement', status: profile.agreement_signed_status },
    { label: 'Safety Documentation', status: profile.safety_doc_status },
  ];

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <h1 className="text-lg font-bold text-foreground">Compliance</h1>
      <Card>
        <CardContent className="p-4 space-y-0">
          {items.map(item => (
            <div key={item.label} className="flex items-center justify-between py-3 border-b border-border last:border-0">
              <div>
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                {item.expiry && <p className="text-[10px] text-muted-foreground">Expires: {format(new Date(item.expiry), 'MMM d, yyyy')}</p>}
              </div>
              <StatusChip status={item.status} />
            </div>
          ))}
        </CardContent>
      </Card>
      <div className="rounded-lg border border-dashed border-muted-foreground/20 p-4 text-center">
        <ShieldCheck className="h-6 w-6 mx-auto text-muted-foreground/40 mb-2" />
        <p className="text-xs text-muted-foreground">Document upload workflow coming soon. Contact admin to submit updated compliance documents.</p>
      </div>
    </div>
  );
}
