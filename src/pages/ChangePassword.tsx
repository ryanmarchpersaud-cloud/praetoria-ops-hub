import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ShieldAlert, KeyRound } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const TEMP_PASSWORD = 'Praetoria2026!';

export default function ChangePassword() {
  const navigate = useNavigate();
  const {
    user,
    loading,
    mustChangePassword,
    mustChangePasswordChecked,
    clearMustChangePassword,
    signOut,
  } = useAuth();

  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading || !mustChangePasswordChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!mustChangePassword) return <Navigate to="/" replace />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (pw.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (pw === TEMP_PASSWORD) {
      setError('You cannot reuse the temporary password. Please choose a new one.');
      return;
    }
    if (pw !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    const { error: updateErr } = await supabase.auth.updateUser({ password: pw });
    if (updateErr) {
      setError(updateErr.message);
      setSubmitting(false);
      return;
    }

    const { error: profileErr } = await supabase
      .from('profiles')
      .update({ must_change_password: false })
      .eq('user_id', user!.id);

    if (profileErr) {
      setError(`Password updated, but failed to clear flag: ${profileErr.message}`);
      setSubmitting(false);
      return;
    }

    clearMustChangePassword();
    toast.success('Password updated successfully');
    navigate('/', { replace: true });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            <CardTitle>Set a new password</CardTitle>
          </div>
          <CardDescription>
            For security, you must change your temporary password before continuing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Alert>
              <ShieldAlert className="h-4 w-4" />
              <AlertDescription>
                Choose a strong password (minimum 8 characters). You will not be able to access
                the app until your password is changed.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="pw">New password</Label>
              <Input
                id="pw"
                type="password"
                autoComplete="new-password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                required
                minLength={8}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm new password</Label>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Update password & continue
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={async () => { await signOut(); navigate('/login', { replace: true }); }}
              >
                Sign out
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
