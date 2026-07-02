import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useAuthorization } from '@/hooks/useAuthorization';
import { usePMStaffProfile, useUpdatePMStaffProfile } from '@/hooks/usePMStaffProfile';
import { toast } from 'sonner';
import { UserCircle2, ShieldCheck } from 'lucide-react';

export default function PMStaffProfilePage() {
  const { user } = useAuth();
  const { isPropertyManager, isLeasingAgent } = useAuthorization();
  const { data: profile } = usePMStaffProfile();
  const update = useUpdatePMStaffProfile();
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? '');
      setAvatarUrl(profile.avatar_url ?? '');
    }
  }, [profile]);

  const roleLabel = isPropertyManager ? 'Property Manager' : isLeasingAgent ? 'Leasing Agent' : 'PM Staff';
  const initials = (displayName || user?.email || '?').slice(0, 2).toUpperCase();

  const onSave = async () => {
    try {
      await update.mutateAsync({ display_name: displayName || null as any, avatar_url: avatarUrl || null });
      toast.success('Profile updated');
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to update profile');
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <UserCircle2 className="h-5 w-5 text-emerald-700" />
        <h2 className="text-lg font-semibold">My Profile</h2>
      </div>

      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={avatarUrl || undefined} alt={displayName} />
            <AvatarFallback className="bg-emerald-100 text-emerald-800 font-semibold">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-semibold truncate">{displayName || user?.email}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            <div className="flex items-center gap-1 text-xs text-emerald-700 mt-1">
              <ShieldCheck className="h-3.5 w-3.5" /> {roleLabel}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Edit profile</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="displayName">Display name</Label>
            <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="avatarUrl">Avatar image URL</Label>
            <Input id="avatarUrl" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://…" />
            <p className="text-[11px] text-muted-foreground">Paste a public image URL. Uploading from device coming soon.</p>
          </div>
          <Button onClick={onSave} disabled={update.isPending} className="w-full">
            {update.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Privacy</CardTitle></CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <p>Your SIN, banking information, and payroll history are managed by HR and are not shown in this portal.</p>
          <p>Contact HR to update sensitive personal information.</p>
        </CardContent>
      </Card>
    </div>
  );
}
