import { useState } from 'react';
import { useWorkerProfile } from '@/hooks/useWorkerProfile';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AvatarUpload } from '@/components/AvatarUpload';
import { WorkerEditProfileDialog } from '@/components/worker/WorkerEditProfileDialog';
import {
  User, Mail, Phone, Briefcase, Users, MapPin, Award,
  Pencil, Calendar, Heart,
} from 'lucide-react';

const statusColors: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  seasonal: 'bg-amber-500/10 text-amber-700 border-amber-200',
  'on-call': 'bg-blue-500/10 text-blue-700 border-blue-200',
  inactive: 'bg-muted text-muted-foreground border-border',
};

export default function WorkerProfilePage() {
  const { user } = useAuth();
  const { data: profile, isLoading } = useWorkerProfile();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const initials = displayName
    .split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  const handleAvatarUploaded = async (url: string) => {
    if (!user) return;
    await supabase.from('worker_profiles').update({ profile_photo_url: url }).eq('user_id', user.id);
    queryClient.invalidateQueries({ queryKey: ['worker_profile'] });
  };

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
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={statusColors[profile.employment_status] ?? ''}>
            {profile.employment_status}
          </Badge>
          <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
          </Button>
        </div>
      </div>

      {/* Profile Summary Card */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-4">
            <AvatarUpload
              currentUrl={profile.profile_photo_url}
              initials={initials}
              onUploaded={handleAvatarUploaded}
              size="lg"
            />
            <div className="min-w-0">
              <p className="text-base font-semibold text-foreground">{profile.full_name || '—'}</p>
              {profile.role_title && <p className="text-sm text-muted-foreground">{profile.role_title}</p>}
              {profile.employee_id && <p className="text-xs text-muted-foreground font-mono">ID: {profile.employee_id}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Role & Team Card (read-only) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Role & Team</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <InfoRow icon={Briefcase} label="Role" value={profile.role_title} />
          <InfoRow icon={Users} label="Team" value={profile.team} />
          <InfoRow icon={MapPin} label="Branch" value={profile.branch_location} />
          <InfoRow icon={Users} label="Supervisor" value={profile.supervisor_name} />
          {profile.manager_name && (
            <InfoRow icon={Users} label="Manager" value={profile.manager_name} />
          )}
        </CardContent>
      </Card>

      {/* Contact Info Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <InfoRow icon={Mail} label="Work Email" value={profile.work_email} />
          <InfoRow icon={Phone} label="Phone" value={profile.phone} />
          {profile.address_line_1 && (
            <InfoRow icon={MapPin} label="Address" value={[profile.address_line_1, profile.address_city, profile.address_province, profile.address_postal_code].filter(Boolean).join(', ')} />
          )}
        </CardContent>
      </Card>

      {/* Personal Info Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <InfoRow icon={Calendar} label="Date of Birth" value={profile.date_of_birth} />
          <InfoRow icon={User} label="Gender" value={profile.gender} />
          <InfoRow icon={User} label="Ethnicity" value={profile.ethnicity} />
          <InfoRow icon={User} label="Religion" value={profile.religion} />
        </CardContent>
      </Card>

      {/* Emergency Contact Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Heart className="h-4 w-4" /> Emergency Contact
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <InfoRow icon={User} label="Name" value={profile.emergency_contact_name} />
          <InfoRow icon={Phone} label="Phone" value={profile.emergency_contact_phone} />
          <InfoRow icon={Users} label="Relationship" value={profile.emergency_contact_relationship} />
        </CardContent>
      </Card>

      {/* Authorized Service Lines Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Award className="h-4 w-4" /> Authorized Service Lines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1.5">
            {profile.primary_service_category && (
              <Badge variant="default" className="text-xs">{profile.primary_service_category}</Badge>
            )}
            {profile.secondary_service_category && (
              <Badge variant="secondary" className="text-xs">{profile.secondary_service_category}</Badge>
            )}
            {!profile.primary_service_category && !profile.secondary_service_category && (
              <p className="text-xs text-muted-foreground">No service lines assigned yet.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit dialog */}
      {editOpen && (
        <WorkerEditProfileDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          profile={profile}
        />
      )}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-xs text-muted-foreground w-24 shrink-0">{label}</span>
      <span className="text-sm text-foreground truncate">{value || '—'}</span>
    </div>
  );
}
