import { useWorkerProfile, useWorkerCertifications } from '@/hooks/useWorkerProfile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldCheck, Car, AlertTriangle, Award, Wrench } from 'lucide-react';
import { format, isPast, addDays, isBefore } from 'date-fns';

const statusColors: Record<string, string> = {
  valid: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  expired: 'bg-destructive/10 text-destructive border-destructive/20',
  pending: 'bg-amber-500/10 text-amber-700 border-amber-200',
  revoked: 'bg-muted text-muted-foreground border-border',
};

export default function WorkerTrainingPage() {
  const { data: profile, isLoading: pLoading } = useWorkerProfile();
  const { data: certs = [], isLoading: cLoading } = useWorkerCertifications();

  if (pLoading || cLoading) {
    return (
      <div className="px-4 pt-3 pb-4 space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-36 w-full rounded-xl" />
        <Skeleton className="h-36 w-full rounded-xl" />
      </div>
    );
  }

  // Expiring within 60 days
  const expiringSoon = certs.filter(c =>
    c.expiry_date && !isPast(new Date(c.expiry_date)) &&
    isBefore(new Date(c.expiry_date), addDays(new Date(), 60))
  );

  const expired = certs.filter(c => c.status === 'expired' || (c.expiry_date && isPast(new Date(c.expiry_date))));

  return (
    <div className="px-4 pt-3 pb-4 space-y-4 animate-fade-in">
      <h1 className="text-lg font-bold">Training & Certifications</h1>

      {/* Alerts */}
      {(expiringSoon.length > 0 || expired.length > 0) && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Attention Required</p>
              {expired.length > 0 && (
                <p className="text-xs text-destructive mt-0.5">{expired.length} expired certification(s)</p>
              )}
              {expiringSoon.length > 0 && (
                <p className="text-xs text-amber-700 mt-0.5">{expiringSoon.length} expiring within 60 days</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Driver's License */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Car className="h-4 w-4" /> Driver's License
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <InfoRow label="Class" value={profile?.driver_license_class} />
          <InfoRow label="Expiry" value={profile?.driver_license_expiry ? format(new Date(profile.driver_license_expiry), 'MMM d, yyyy') : undefined} />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Status</span>
            <Badge variant={profile?.license_verified ? 'default' : 'secondary'} className="text-xs">
              {profile?.license_verified ? 'Verified' : 'Pending Verification'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Certifications Grid */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Award className="h-4 w-4" /> Certifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          {certs.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No certifications on file.</p>
          ) : (
            <div className="space-y-2.5">
              {certs.map(c => {
                const isExpired = c.expiry_date && isPast(new Date(c.expiry_date));
                const isExpSoon = c.expiry_date && !isExpired && isBefore(new Date(c.expiry_date), addDays(new Date(), 60));
                const effectiveStatus = isExpired ? 'expired' : c.status;

                return (
                  <div key={c.id} className="flex items-start justify-between gap-2 py-2 border-b last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{c.cert_name}</p>
                      {c.issuer && <p className="text-xs text-muted-foreground">{c.issuer}</p>}
                      {c.expiry_date && (
                        <p className={`text-xs ${isExpired ? 'text-destructive' : isExpSoon ? 'text-amber-600' : 'text-muted-foreground'}`}>
                          {isExpired ? 'Expired' : 'Expires'} {format(new Date(c.expiry_date), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${statusColors[effectiveStatus] ?? ''}`}>
                      {effectiveStatus}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Equipment Permissions */}
      {profile?.equipment_permissions && profile.equipment_permissions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wrench className="h-4 w-4" /> Equipment Authorizations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {profile.equipment_permissions.map((p: string) => (
                <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value || '—'}</span>
    </div>
  );
}
