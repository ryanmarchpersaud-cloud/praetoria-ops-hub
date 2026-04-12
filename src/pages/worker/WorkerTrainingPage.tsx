import { useWorkerProfile, useWorkerCertifications } from '@/hooks/useWorkerProfile';
import { useWorkerTrainingRecords } from '@/hooks/useWorkerTaxDocs';
import { useMyAssignments } from '@/hooks/useTraining';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldCheck, Car, AlertTriangle, Award, Wrench, BookOpen, Video, ExternalLink } from 'lucide-react';
import { format, isPast, addDays, isBefore } from 'date-fns';
import { Link } from 'react-router-dom';

const statusColors: Record<string, string> = {
  valid: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  completed: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  passed: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  expired: 'bg-destructive/10 text-destructive border-destructive/20',
  failed: 'bg-destructive/10 text-destructive border-destructive/20',
  pending: 'bg-amber-500/10 text-amber-700 border-amber-200',
  not_started: 'bg-muted text-muted-foreground',
  in_progress: 'bg-blue-500/10 text-blue-700 border-blue-200',
  revoked: 'bg-muted text-muted-foreground border-border',
};

const typeLabels: Record<string, string> = {
  whmis: 'WHMIS', first_aid: 'First Aid', equipment_cert: 'Equipment Cert',
  ppe_ack: 'PPE Acknowledgement', handbook: 'Handbook / Policy',
  toolbox_talk: 'Toolbox Talk', other: 'Other',
};

export default function WorkerTrainingPage() {
  const { data: profile, isLoading: pLoading } = useWorkerProfile();
  const { data: certs = [], isLoading: cLoading } = useWorkerCertifications();
  const { data: trainingRecords = [], isLoading: tLoading } = useWorkerTrainingRecords();
  const { data: courseAssignments = [], isLoading: aLoading } = useMyAssignments();

  if (pLoading || cLoading || tLoading || aLoading) {
    return (
      <div className="px-4 pt-3 pb-4 space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-36 w-full rounded-xl" />
        <Skeleton className="h-36 w-full rounded-xl" />
      </div>
    );
  }

  const expiringSoon = certs.filter(c =>
    c.expiry_date && !isPast(new Date(c.expiry_date)) &&
    isBefore(new Date(c.expiry_date), addDays(new Date(), 60))
  );
  const expired = certs.filter(c => c.status === 'expired' || (c.expiry_date && isPast(new Date(c.expiry_date))));
  const pendingTraining = trainingRecords.filter((t: any) => t.status === 'pending');
  const activeCourses = (courseAssignments as any[]).filter(a => a.status !== 'passed' && a.status !== 'expired');

  const alertCount = expired.length + expiringSoon.length + pendingTraining.length + activeCourses.length;

  return (
    <div className="px-4 pt-3 pb-4 space-y-4 animate-fade-in">
      <h1 className="text-lg font-bold">Training & Certifications</h1>

      {/* Alerts */}
      {alertCount > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Attention Required</p>
              {expired.length > 0 && <p className="text-xs text-destructive mt-0.5">{expired.length} expired certification(s)</p>}
              {expiringSoon.length > 0 && <p className="text-xs text-amber-700 mt-0.5">{expiringSoon.length} expiring within 60 days</p>}
              {pendingTraining.length > 0 && <p className="text-xs text-amber-700 mt-0.5">{pendingTraining.length} pending training assignment(s)</p>}
              {activeCourses.length > 0 && <p className="text-xs text-blue-700 mt-0.5">{activeCourses.length} active course(s) to complete</p>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assigned Training Records */}
      {trainingRecords.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BookOpen className="h-4 w-4" /> Assigned Training
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              {trainingRecords.map((t: any) => (
                <div key={t.id} className="flex items-start justify-between gap-2 py-2 border-b last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{t.training_name}</p>
                    <p className="text-xs text-muted-foreground">{typeLabels[t.training_type] || t.training_type}</p>
                    {t.expiry_date && (
                      <p className="text-xs text-muted-foreground mt-0.5">Due: {format(new Date(t.expiry_date), 'MMM d, yyyy')}</p>
                    )}
                    {t.file_url && (
                      <a href={t.file_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-primary flex items-center gap-1 mt-1 hover:underline">
                        <ExternalLink className="h-3 w-3" /> View Material
                      </a>
                    )}
                    {t.notes && <p className="text-[11px] text-muted-foreground mt-0.5">{t.notes}</p>}
                  </div>
                  <Badge variant="outline" className={`text-[10px] shrink-0 ${statusColors[t.status] ?? ''}`}>
                    {t.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Course Assignments */}
      {(courseAssignments as any[]).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Video className="h-4 w-4" /> Courses
              </CardTitle>
              <Link to="/worker/courses" className="text-xs text-primary hover:underline">View All</Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              {(courseAssignments as any[]).slice(0, 5).map((a: any) => (
                <Link key={a.id} to="/worker/courses" className="flex items-start justify-between gap-2 py-2 border-b last:border-0 hover:bg-muted/50 rounded -mx-1 px-1 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{a.training_courses?.title || 'Course'}</p>
                    {a.due_date && (
                      <p className={`text-xs mt-0.5 ${isPast(new Date(a.due_date)) && a.status !== 'passed' ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                        Due: {format(new Date(a.due_date), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className={`text-[10px] shrink-0 ${statusColors[a.status] ?? ''}`}>
                    {a.status?.replace('_', ' ')}
                  </Badge>
                </Link>
              ))}
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

      {/* Certifications */}
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
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${statusColors[effectiveStatus ?? 'pending'] ?? ''}`}>
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
