import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ServicePromoCard } from '@/components/ServicePromoCard';
import { SERVICE_PROMOS } from '@/lib/servicePromos';
import {
  Shield, Mail, Lock, Eye, EyeOff, ArrowRight, CheckCircle2, ChevronLeft, ChevronRight as ChevronRightIcon,
} from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [loading, setLoading] = useState(false);
  const [promoIndex, setPromoIndex] = useState(0);
  const { toast } = useToast();

  // Auto-rotate promos every 6s
  useEffect(() => {
    const timer = setInterval(() => {
      setPromoIndex((i) => (i + 1) % SERVICE_PROMOS.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast({ title: 'Check your email', description: 'We sent you a password reset link.' });
        setMode('login');
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast({ title: 'Account created', description: 'Check your email to verify your account.' });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'apple' | 'microsoft') => {
    if (provider === 'microsoft') {
      toast({ title: 'Coming soon', description: 'Sign in with Microsoft will be available shortly.' });
      return;
    }
    const { error } = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin,
    });
    if (error) {
      toast({ title: 'Error', description: String(error), variant: 'destructive' });
    }
  };

  const currentPromo = SERVICE_PROMOS[promoIndex];
  const PromoIcon = currentPromo.icon;

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left — Form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-[420px]">
          {/* Brand */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground tracking-tight">Praetoria Ops</span>
            </div>
            <p className="text-muted-foreground text-sm mt-1">
              {mode === 'forgot'
                ? 'Enter your email to reset your password'
                : mode === 'signup'
                  ? 'Request access to the operations platform'
                  : 'Sign in to your operations platform'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-foreground text-sm font-medium">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email" type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@praetoriagroup.com" required className="pl-10 h-11"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-foreground text-sm font-medium">Password</Label>
                  {mode === 'login' && (
                    <button type="button" onClick={() => setMode('forgot')}
                      className="text-xs text-primary hover:text-primary/80 font-medium transition-colors">
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password" type={showPassword ? 'text' : 'password'} value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••" required minLength={6} className="pl-10 pr-10 h-11"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            <Button type="submit" className="w-full h-11 text-sm font-semibold" disabled={loading}>
              {loading ? 'Please wait…' : mode === 'forgot' ? 'Send Reset Link' : mode === 'signup' ? 'Request Access' : 'Sign In'}
              {!loading && <ArrowRight className="w-4 h-4 ml-1" />}
            </Button>
          </form>

          {/* Social login */}
          {mode !== 'forgot' && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-background px-3 text-muted-foreground uppercase tracking-wider">or continue with</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <button type="button" onClick={() => handleSocialLogin('google')}
                  className="flex items-center justify-center gap-2 h-10 rounded-md border border-border bg-card hover:bg-muted transition-colors text-sm font-medium text-foreground">
                  <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  Google
                </button>
                <button type="button" onClick={() => handleSocialLogin('apple')}
                  className="flex items-center justify-center gap-2 h-10 rounded-md border border-border bg-card hover:bg-muted transition-colors text-sm font-medium text-foreground">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                  Apple
                </button>
                <button type="button" onClick={() => handleSocialLogin('microsoft')}
                  className="flex items-center justify-center gap-2 h-10 rounded-md border border-border bg-card hover:bg-muted transition-colors text-sm font-medium text-foreground">
                  <svg className="w-4 h-4" viewBox="0 0 24 24"><rect x="1" y="1" width="10" height="10" fill="#F25022"/><rect x="13" y="1" width="10" height="10" fill="#7FBA00"/><rect x="1" y="13" width="10" height="10" fill="#00A4EF"/><rect x="13" y="13" width="10" height="10" fill="#FFB900"/></svg>
                  Microsoft
                </button>
              </div>
            </>
          )}

          {/* Mode toggle */}
          <div className="mt-6 text-center text-sm text-muted-foreground">
            {mode === 'forgot' ? (
              <button onClick={() => setMode('login')} className="text-primary hover:text-primary/80 font-medium transition-colors">Back to sign in</button>
            ) : mode === 'signup' ? (
              <>Already have an account?{' '}
                <button onClick={() => setMode('login')} className="text-primary hover:text-primary/80 font-medium transition-colors">Sign in</button>
              </>
            ) : (
              <>Don&apos;t have an account?{' '}
                <button onClick={() => setMode('signup')} className="text-primary hover:text-primary/80 font-medium transition-colors">Request access</button>
              </>
            )}
          </div>

          <p className="mt-8 text-center text-xs text-muted-foreground/60">
            Protected by Praetoria Group &middot; Secure login
          </p>
        </div>
      </div>

      {/* Right — Branded service promo panel (desktop only) */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[540px] bg-sidebar text-sidebar-foreground flex-col justify-between p-10 xl:p-14 relative overflow-hidden">
        {/* Decorative bg */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'radial-gradient(circle at 25% 25%, hsl(var(--sidebar-primary)) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }} />

        <div className="relative z-10 flex flex-col h-full">
          {/* Header */}
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-sidebar-primary mb-1">
              Praetoria Group
            </p>
            <h2 className="text-xl font-bold text-sidebar-accent-foreground leading-tight">
              Residential & Commercial Services
            </h2>
            <p className="text-sidebar-foreground/60 text-sm mt-1.5 leading-relaxed">
              One trusted team for year-round property care — snow, landscaping, junk removal, maintenance, and more.
            </p>
          </div>

          {/* Rotating promo card */}
          <div className="flex-1 flex flex-col justify-center">
            <div
              key={currentPromo.id}
              className="rounded-xl border border-sidebar-border bg-sidebar-accent/60 p-6 animate-fade-in"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${currentPromo.accentClass}`}>
                  <PromoIcon className={`w-5.5 h-5.5 ${currentPromo.iconColorClass}`} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-sidebar-accent-foreground leading-tight">
                    {currentPromo.title}
                  </h3>
                  <p className="text-xs text-sidebar-foreground/70">{currentPromo.subtitle}</p>
                </div>
              </div>
              <p className="text-[11px] font-medium text-sidebar-primary mb-3">{currentPromo.audience}</p>
              <ul className="space-y-2">
                {currentPromo.highlights.map((h) => (
                  <li key={h} className="text-sm text-sidebar-foreground/80 flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-sidebar-primary mt-0.5 shrink-0" />
                    {h}
                  </li>
                ))}
              </ul>
            </div>

            {/* Pagination dots + arrows */}
            <div className="flex items-center justify-center gap-3 mt-5">
              <button
                onClick={() => setPromoIndex((i) => (i - 1 + SERVICE_PROMOS.length) % SERVICE_PROMOS.length)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex gap-1.5">
                {SERVICE_PROMOS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPromoIndex(i)}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      i === promoIndex
                        ? 'bg-sidebar-primary w-4'
                        : 'bg-sidebar-foreground/25 hover:bg-sidebar-foreground/40'
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={() => setPromoIndex((i) => (i + 1) % SERVICE_PROMOS.length)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
              >
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 flex items-center gap-2 text-xs text-sidebar-foreground/40">
            <Shield className="w-3.5 h-3.5" />
            <span>Serving Regina & surrounding areas · 306-737-6269</span>
          </div>
        </div>
      </div>
    </div>
  );
}
