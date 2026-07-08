import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, ArrowRight, AlertTriangle, Mail } from 'lucide-react';
import praetoriaLogo from '@/assets/praetoria-logo-white.png';
import { getPasswordResetRedirectUrl } from '@/lib/platform';

type Status = 'verifying' | 'ready' | 'invalid_link' | 'no_link';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Status>('verifying');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [pendingTokenHash, setPendingTokenHash] = useState('');
  const [manualCodeMode, setManualCodeMode] = useState(false);
  const [resetCode, setResetCode] = useState('');
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    // Listener: if Supabase fires PASSWORD_RECOVERY, we are in a real recovery session.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'PASSWORD_RECOVERY') {
        setStatus('ready');
        setRecoveryEmail(session?.user?.email ?? '');
      }
    });

    // Sign out any pre-existing session FIRST so we don't confuse a normal login
    // with a recovery session. This guarantees we only show the form when the
    // current page-load actually carried a recovery token.
    (async () => {
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      const searchParams = new URLSearchParams(search);
      const code = searchParams.get('code');
      const tokenHash = searchParams.get('token_hash');
      const otpType = searchParams.get('type');
      const mode = searchParams.get('mode');
      const emailFromLink = searchParams.get('email') || '';
      const hasRecoveryHash = hash.includes('type=recovery') || hash.includes('access_token');
      const hasErrorInUrl =
        hash.includes('error=') || hash.includes('error_code=') ||
        search.includes('error=') || search.includes('error_code=');

      if (hasErrorInUrl) {
        // Supabase returned an error in the URL fragment (expired/used token).
        if (mounted) setStatus('invalid_link');
        return;
      }

      // Current robust flow: the link itself carries no one-time token, so
      // email security scanners cannot consume it. The user enters the code
      // from the email, and we verify it only when they submit the form.
      if (mode === 'code') {
        if (!mounted) return;
        setManualCodeMode(true);
        setRecoveryEmail(emailFromLink);
        setResendEmail(emailFromLink);
        setStatus('ready');
        return;
      }

      // Preferred flow: token_hash + type=recovery. Do NOT verify it on page
      // load. Some email security scanners load links immediately; verifying
      // here would consume the reset token before the real user can set a new
      // password. Store it and verify only when the form is submitted.
      if (tokenHash && otpType === 'recovery') {
        if (!mounted) return;
        setPendingTokenHash(tokenHash);
        setStatus('ready');
        return;
      }

      // Legacy PKCE flow: Supabase redirects with ?code=... — exchange it.
      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (!mounted) return;
        if (error || !data?.session) {
          setStatus('invalid_link');
          return;
        }
        setRecoveryEmail(data.session.user?.email ?? '');
        setStatus('ready');
        // Clean the code out of the URL so a refresh doesn't retry it.
        window.history.replaceState({}, '', window.location.pathname);
        return;
      }

      if (!hasRecoveryHash) {
        // The user opened /reset-password without a recovery link in the URL.
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        // If there's a stale logged-in session, sign it out to avoid the
        // "took me straight into the app" behaviour.
        if (session) await supabase.auth.signOut();
        setStatus('no_link');
        return;
      }

      // Wait briefly for the PASSWORD_RECOVERY event (Supabase parses the hash).
      // If it doesn't fire within a few seconds, the token was likely already
      // consumed (e.g., by an email-client link preview).
      setTimeout(async () => {
        if (!mounted) return;
        if (status !== 'ready') {
          const { data: { session } } = await supabase.auth.getSession();
          if (!mounted) return;
          // If a session exists at this point but PASSWORD_RECOVERY never fired,
          // the link was already used. Sign out and show recovery options.
          if (session) {
            setRecoveryEmail(session.user.email ?? '');
            await supabase.auth.signOut();
          }
          setStatus('invalid_link');
        }
      }, 4000);
    })();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: 'Error', description: 'Passwords do not match.', variant: 'destructive' });
      return;
    }
    if (password.length < 8) {
      toast({ title: 'Error', description: 'Password must be at least 8 characters.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      if (pendingTokenHash) {
        const { data, error } = await supabase.auth.verifyOtp({
          type: 'recovery',
          token_hash: pendingTokenHash,
        });
        if (error || !data?.session) {
          setStatus('invalid_link');
          throw new Error('This reset link is invalid or already used. Please request a new reset link.');
        }
        setRecoveryEmail(data.session.user?.email ?? '');
      } else if (manualCodeMode) {
        const email = (recoveryEmail || resendEmail).trim();
        const token = resetCode.trim().replace(/\s+/g, '');
        if (!email) {
          throw new Error('Enter the email address that received the reset code.');
        }
        if (!token) {
          throw new Error('Enter the password reset code from the email.');
        }
        const { data, error } = await supabase.auth.verifyOtp({
          email,
          token,
          type: 'recovery',
        });
        if (error || !data?.session) {
          setStatus('invalid_link');
          throw new Error('This reset code is invalid or already used. Please request a new reset email.');
        }
        setRecoveryEmail(data.session.user?.email ?? email);
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({ title: 'Password updated', description: 'Your password has been changed. Please sign in.' });
      await supabase.auth.signOut();
      window.history.replaceState({}, '', window.location.pathname);
      navigate('/login');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = (resendEmail || recoveryEmail).trim();
    if (!email) {
      toast({ title: 'Email required', description: 'Enter your email to receive a new reset link.', variant: 'destructive' });
      return;
    }
    setResending(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: getPasswordResetRedirectUrl(),
      });
      if (error) throw error;
      toast({
        title: 'Reset link sent',
        description: `Check ${email} (and spam folder) for a new password reset link. Open it on the same device, in your normal browser.`,
      });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-[420px]">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <img src={praetoriaLogo} alt="Praetoria Group" className="w-11 h-11 object-contain dark:invert-0 invert" />
            <span className="text-xl font-bold text-foreground tracking-tight">Praetoria Group</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mt-2">
            {status === 'ready' ? 'Set your new password' : 'Reset your password'}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {status === 'ready' ? 'Choose a strong password to secure your account.' : 'Password reset'}
          </p>
        </div>

        {status === 'verifying' && (
          <p className="text-muted-foreground text-sm">Verifying your reset link… please wait.</p>
        )}

        {status === 'ready' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {recoveryEmail && (
              <p className="text-sm text-muted-foreground">
                Resetting password for <span className="font-medium text-foreground">{recoveryEmail}</span>
              </p>
            )}
            {manualCodeMode && (
              <>
                {!recoveryEmail && (
                  <div className="space-y-1.5">
                    <Label htmlFor="recovery-email" className="text-foreground text-sm font-medium">Email address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="recovery-email"
                        type="email"
                        value={resendEmail}
                        onChange={(e) => setResendEmail(e.target.value)}
                        placeholder="your personal email address"
                        required
                        className="pl-10 h-11"
                      />
                    </div>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="reset-code" className="text-foreground text-sm font-medium">Password reset code</Label>
                  <Input
                    id="reset-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    placeholder="Enter the code from your email"
                    required
                    className="h-11 text-center font-semibold tracking-widest"
                  />
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-foreground text-sm font-medium">New password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password" type={showPassword ? 'text' : 'password'} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" required minLength={8} className="pl-10 pr-10 h-11"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm" className="text-foreground text-sm font-medium">Confirm new password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="confirm" type={showPassword ? 'text' : 'password'} value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••" required minLength={8} className="pl-10 h-11"
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-11 text-sm font-semibold" disabled={loading}>
              {loading ? 'Please wait…' : 'Update Password'}
              {!loading && <ArrowRight className="w-4 h-4 ml-1" />}
            </Button>
          </form>
        )}

        {(status === 'invalid_link' || status === 'no_link') && (
          <div className="space-y-5">
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div className="text-sm text-foreground">
                <p className="font-medium mb-1">
                  {status === 'invalid_link' ? 'This reset link is invalid or already used' : 'No reset link detected'}
                </p>
                <p className="text-muted-foreground">
                  {status === 'invalid_link'
                    ? 'Reset links can only be used once and expire quickly. If your email app previewed the link, it may have used it before you tapped it. Request a new link below.'
                    : 'Open this page from the password reset email link, or request a new link below.'}
                </p>
              </div>
            </div>

            <form onSubmit={handleResend} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="resend" className="text-foreground text-sm font-medium">Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="resend" type="email" value={resendEmail || recoveryEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    placeholder="your personal email address" required className="pl-10 h-11"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full h-11 text-sm font-semibold" disabled={resending}>
                {resending ? 'Sending…' : 'Send a new reset link'}
              </Button>
              <p className="text-xs text-muted-foreground">
                Tip: open the new link in your phone's main browser (Safari/Chrome), not from an email
                preview. Avoid tapping the link more than once.
              </p>
              <Button
                type="button"
                variant="ghost"
                className="w-full h-10 text-sm"
                onClick={() => navigate('/login')}
              >
                Back to sign in
              </Button>
            </form>
          </div>
        )}

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground/60">
          <img src={praetoriaLogo} alt="" className="w-4 h-4 object-contain opacity-40 invert dark:invert-0" />
          <span>Protected by Praetoria Group &middot; Secure login</span>
        </div>
      </div>
    </div>
  );
}
