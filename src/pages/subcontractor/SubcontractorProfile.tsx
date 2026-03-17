import { useSubcontractorProfile } from '@/hooks/useSubcontractor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Mail, Phone, MapPin } from 'lucide-react';

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">{value || '—'}</span>
    </div>
  );
}

export default function SubcontractorProfile() {
  const { data: profile, isLoading } = useSubcontractorProfile();
  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  if (!profile) return <div className="p-8 text-center text-muted-foreground">Profile not found.</div>;

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <h1 className="text-lg font-bold text-foreground">My Profile</h1>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><User className="h-4 w-4" /> Contact Info</CardTitle></CardHeader>
        <CardContent>
          <InfoRow label="Contact Name" value={profile.contact_name} />
          <InfoRow label="Email" value={profile.email} />
          <InfoRow label="Phone" value={profile.phone} />
          <InfoRow label="Status" value={<span className="capitalize">{profile.status}</span>} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><MapPin className="h-4 w-4" /> Service Info</CardTitle></CardHeader>
        <CardContent>
          <InfoRow label="Service Area" value={profile.service_area_summary} />
          <InfoRow label="Onboarding" value={<span className="capitalize">{profile.onboarding_status}</span>} />
        </CardContent>
      </Card>
    </div>
  );
}
