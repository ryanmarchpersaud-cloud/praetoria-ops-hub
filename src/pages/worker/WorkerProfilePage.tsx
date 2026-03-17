import { useWorkerProfile } from '@/hooks/useWorkerProfile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { User, Mail, Phone, Briefcase, Users, Shield } from 'lucide-react';

const statusColors: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  seasonal: 'bg-amber-500/10 text-amber-700 border-amber-200',
  'on-call': 'bg-blue-500/10 text-blue-700 border-blue-200',
  inactive: 'bg-muted text-muted-foreground border-border',
};

export default function WorkerProfilePage() {
  const { data: profile, isLoading } = useWorkerProfile();

  if (isLoading) {
    return (
      <div className="px-4 pt-3 pb-4 space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="px-4 pt-3 pb-4 space-y-4">
        <h1 className="text-lg font-bold">My Profile</h1>
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <User className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm font-medium">No profile set up yet</p>
            <p className="text-xs mt-1">Your administrator will set up your worker profile.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-4 pt-3 pb-4 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">My Profile</h1>
        <Badge variant="outline" className={statusColors[profile.employment_status] ?? ''}>
          {profile.employment_status}
        </Badge>
      </div>

      {/* Identity card */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="h-7 w-7 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-base font-semibold text-foreground">{profile.full_name || '—'}</p>
              {profile.role_title && <p className="text-sm text-muted-foreground">{profile.role_title}</p>}
              {profile.employee_id && <p className="text-xs text-muted-foreground font-mono">ID: {profile.employee_id}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 pt-2 border-t">
            <InfoRow icon={Briefcase} label="Team" value={profile.team} />
            <InfoRow icon={Mail} label="Work Email" value={profile.work_email} />
            <InfoRow icon={Phone} label="Phone" value={profile.phone} />
            <InfoRow icon={Users} label="Supervisor" value={profile.supervisor_name} />
            <InfoRow icon={Shield} label="Branch" value={profile.branch_location} />
          </div>
        </CardContent>
      </Card>

      {/* License summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Driver's License</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Class</span>
            <span className="font-medium">{profile.driver_license_class || '—'}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Expiry</span>
            <span className="font-medium">{profile.driver_license_expiry || '—'}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Verified</span>
            <Badge variant={profile.license_verified ? 'default' : 'secondary'} className="text-xs">
              {profile.license_verified ? 'Verified' : 'Pending'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Equipment permissions */}
      {profile.equipment_permissions && profile.equipment_permissions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Equipment Permissions</CardTitle>
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

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-xs text-muted-foreground w-20 shrink-0">{label}</span>
      <span className="text-sm text-foreground truncate">{value || '—'}</span>
    </div>
  );
}
