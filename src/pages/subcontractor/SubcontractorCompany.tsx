import { useSubcontractorProfile } from '@/hooks/useSubcontractor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2 } from 'lucide-react';

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">{value || '—'}</span>
    </div>
  );
}

export default function SubcontractorCompany() {
  const { data: profile, isLoading } = useSubcontractorProfile();
  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  if (!profile) return <div className="p-8 text-center text-muted-foreground">Company info not found.</div>;

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <h1 className="text-lg font-bold text-foreground">Company Details</h1>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Building2 className="h-4 w-4" /> Company Info</CardTitle></CardHeader>
        <CardContent>
          <InfoRow label="Company Name" value={profile.company_name} />
          <InfoRow label="Operating Name" value={profile.operating_name} />
          <InfoRow label="Business Number" value={profile.business_number} />
          <InfoRow label="Mailing Address" value={profile.mailing_address} />
          <InfoRow label="Primary Contact" value={profile.contact_name} />
          <InfoRow label="Email" value={profile.email} />
          <InfoRow label="Phone" value={profile.phone} />
        </CardContent>
      </Card>
    </div>
  );
}
