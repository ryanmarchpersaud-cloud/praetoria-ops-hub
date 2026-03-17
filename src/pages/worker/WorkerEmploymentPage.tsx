import { useWorkerProfile, useWorkerCertifications } from '@/hooks/useWorkerProfile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Briefcase, Calendar, DollarSign, MapPin, Award, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';

const certStatusColors: Record<string, string> = {
  valid: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  expired: 'bg-destructive/10 text-destructive border-destructive/20',
  pending: 'bg-amber-500/10 text-amber-700 border-amber-200',
  revoked: 'bg-muted text-muted-foreground border-border',
};

export default function WorkerEmploymentPage() {
  const { data: profile, isLoading: pLoading } = useWorkerProfile();
  const { data: certs = [], isLoading: cLoading } = useWorkerCertifications();

  if (pLoading || cLoading) {
    return (
      <div className="px-4 pt-3 pb-4 space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-36 w-full rounded-xl" />
        <Skeleton className="h-36 w-full rounded-xl" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="px-4 pt-3 pb-4 space-y-4">
        <h1 className="text-lg font-bold">My Employment</h1>
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <Briefcase className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm font-medium">No employment record yet</p>
            <p className="text-xs mt-1">Your administrator will set up your employment details.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-4 pt-3 pb-4 space-y-4 animate-fade-in">
      <h1 className="text-lg font-bold">My Employment</h1>

      {/* Employment details */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Employment Details</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Row icon={Calendar} label="Hire Date" value={profile.hire_date ? format(new Date(profile.hire_date), 'MMM d, yyyy') : undefined} />
          <Row icon={Briefcase} label="Type" value={profile.employment_type} />
          <Row icon={Award} label="Service Category" value={profile.primary_service_category} />
          <Row icon={DollarSign} label="Pay Type" value={profile.pay_type} />
          <Row icon={MapPin} label="Branch / Location" value={profile.branch_location} />
        </CardContent>
      </Card>

      {/* Certifications */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> Certifications & Training
          </CardTitle>
        </CardHeader>
        <CardContent>
          {certs.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No certifications on file.</p>
          ) : (
            <div className="space-y-2.5">
              {certs.map(c => (
                <div key={c.id} className="flex items-start justify-between gap-2 py-2 border-b last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{c.cert_name}</p>
                    {c.issuer && <p className="text-xs text-muted-foreground">{c.issuer}</p>}
                    {c.expiry_date && (
                      <p className="text-xs text-muted-foreground">
                        Expires {format(new Date(c.expiry_date), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className={`text-[10px] shrink-0 ${certStatusColors[c.status] ?? ''}`}>
                    {c.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-xs text-muted-foreground w-28 shrink-0">{label}</span>
      <span className="text-sm text-foreground capitalize">{value || '—'}</span>
    </div>
  );
}
