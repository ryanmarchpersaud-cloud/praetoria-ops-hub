import { useWorkerProfile, useWorkerCertifications } from '@/hooks/useWorkerProfile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Briefcase, Calendar, DollarSign, MapPin, Award, Users } from 'lucide-react';
import { format } from 'date-fns';

export default function WorkerEmploymentPage() {
  const { data: profile, isLoading } = useWorkerProfile();

  if (isLoading) {
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

      {/* Employment Summary */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Employment Summary</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Row icon={Calendar} label="Hire Date" value={profile.hire_date ? format(new Date(profile.hire_date), 'MMM d, yyyy') : undefined} />
          <Row icon={Briefcase} label="Type" value={profile.employment_type} />
          <Row icon={Briefcase} label="Status" value={profile.employment_status} />
        </CardContent>
      </Card>

      {/* Position & Reporting */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Position & Reporting</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Row icon={Award} label="Role Title" value={profile.role_title} />
          <Row icon={Users} label="Supervisor" value={profile.supervisor_name} />
          {profile.manager_name && <Row icon={Users} label="Manager" value={profile.manager_name} />}
          <Row icon={MapPin} label="Branch" value={profile.branch_location} />
        </CardContent>
      </Card>

      {/* Compensation Summary */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Compensation</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Row icon={DollarSign} label="Pay Type" value={profile.pay_type} />
          {profile.hourly_rate && (
            <Row icon={DollarSign} label="Rate" value={`$${Number(profile.hourly_rate).toFixed(2)}/hr`} />
          )}
        </CardContent>
      </Card>

      {/* Authorized Work Types */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Authorized Work Types</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1.5">
            {profile.primary_service_category && (
              <Badge variant="default" className="text-xs">{profile.primary_service_category}</Badge>
            )}
            {profile.secondary_service_category && (
              <Badge variant="secondary" className="text-xs">{profile.secondary_service_category}</Badge>
            )}
            {!profile.primary_service_category && (
              <p className="text-xs text-muted-foreground">No service categories assigned.</p>
            )}
          </div>
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
