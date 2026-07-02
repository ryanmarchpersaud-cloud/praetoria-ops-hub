import { useState, type FormEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useWorkerProfile } from '@/hooks/useWorkerProfile';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AvatarUpload } from '@/components/AvatarUpload';
import { LogOut, Mail, HelpCircle, Phone, Lock, Loader2, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { DeleteAccountSection } from '@/components/DeleteAccountSection';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function WorkerSettings() {
  const { user, signOut } = useAuth();
  const { data: workerProfile } = useWorkerProfile();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const displayName = workerProfile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const initials = displayName
    .split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  const handleAvatarUploaded = async (url: string) => {
    if (!user) return;
    await supabase.rpc('update_own_worker_photo', { _url: url });
    queryClient.invalidateQueries({ queryKey: ['worker_profile'] });
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="px-4 pt-3 pb-4 space-y-4 max-w-lg">
      {/* Profile Banner */}
      <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-5 text-primary-foreground">
        <div className="flex items-center gap-4">
          <AvatarUpload
            currentUrl={workerProfile?.profile_photo_url}
            initials={initials}
            onUploaded={handleAvatarUploaded}
            size="lg"
          />
          <div>
            <p className="text-lg font-bold">{displayName}</p>
            <p className="text-xs opacity-80">{workerProfile?.role_title || 'Field Worker'}</p>
            <p className="text-[11px] opacity-60 mt-0.5">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Account Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" /> Login
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </CardContent>
      </Card>

      {/* Password */}
      <WorkerPasswordCard />

      {/* Support */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-primary" /> Support
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Need help? Contact your supervisor or the operations team.
          </p>
          <div className="space-y-1.5">
            <a href="tel:+13067376269" className="flex items-center gap-2 text-xs text-primary hover:underline">
              <Phone className="h-3.5 w-3.5" /> (306) 737-6269
            </a>
            <a href="mailto:ops@praetoriagroup.ca" className="flex items-center gap-2 text-xs text-primary hover:underline">
              <Mail className="h-3.5 w-3.5" /> ops@praetoriagroup.ca
            </a>
          </div>
        </CardContent>
      </Card>

      {/* App Info */}
      <Card>
        <CardContent className="p-4 space-y-1 text-sm text-muted-foreground">
          <p>Praetoria Group v1.0</p>
          <p>Worker Portal</p>
        </CardContent>
      </Card>

      <DeleteAccountSection />

      <Button variant="destructive" className="w-full" onClick={handleLogout}>
        <LogOut className="h-4 w-4 mr-2" /> Sign Out
      </Button>
    </div>
  );
}

function WorkerPasswordCard() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const updatePassword = async (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);
    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'New password must be at least 8 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);
    if (error) {
      const lower = error.message.toLowerCase();
      const text = lower.includes('same_password')
        ? 'Choose a new password that is different from your current password.'
        : error.message || 'Could not update your password. Please sign out, sign back in, and try again.';
      setMessage({ type: 'error', text });
      toast.error(text);
      return;
    }
    setNewPassword('');
    setConfirmPassword('');
    setMessage({ type: 'success', text: 'Password updated successfully.' });
    toast.success('Password updated successfully');
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Lock className="h-4 w-4 text-primary" /> Password
        </CardTitle>
        <CardDescription>Set a new password for your worker login.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={updatePassword} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="worker-new-password">New password</Label>
            <Input
              id="worker-new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="worker-confirm-password">Confirm new password</Label>
            <Input
              id="worker-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>
          <Alert>
            <ShieldCheck className="h-4 w-4" />
            <AlertDescription>Use at least 8 characters. Your login email stays the same.</AlertDescription>
          </Alert>
          {message && (
            <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
              {message.type === 'error' ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Lock className="h-4 w-4 mr-2" />}
            Update password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
