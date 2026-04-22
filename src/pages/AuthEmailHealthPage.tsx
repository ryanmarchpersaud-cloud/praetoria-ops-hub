import { useState } from 'react';
import { SettingsLayout } from '@/components/SettingsLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, XCircle, Loader2, Mail, AlertTriangle, PlayCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type CheckStatus = 'idle' | 'running' | 'pass' | 'fail' | 'warn';

interface CheckResult {
  id: string;
  label: string;
  status: CheckStatus;
  detail?: string;
}

const INITIAL_CHECKS: CheckResult[] = [
  { id: 'hook', label: 'Auth email hook reachable', status: 'idle' },
  { id: 'queue', label: 'Email queue function deployed', status: 'idle' },
  { id: 'log', label: 'Recent recovery emails (last 24h)', status: 'idle' },
  { id: 'trigger', label: 'Trigger live password reset', status: 'idle' },
  { id: 'delivery', label: 'Delivery confirmed in send log', status: 'idle' },
];

function StatusIcon({ status }: { status: CheckStatus }) {
  if (status === 'running') return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  if (status === 'pass') return <CheckCircle2 className="h-4 w-4 text-green-600" />;
  if (status === 'fail') return <XCircle className="h-4 w-4 text-destructive" />;
  if (status === 'warn') return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
  return <div className="h-4 w-4 rounded-full border border-muted-foreground/30" />;
}

export default function AuthEmailHealthPage() {
  const [email, setEmail] = useState('');
  const [running, setRunning] = useState(false);
  const [checks, setChecks] = useState<CheckResult[]>(INITIAL_CHECKS);
  const [summary, setSummary] = useState<{ status: CheckStatus; message: string } | null>(null);

  const update = (id: string, patch: Partial<CheckResult>) =>
    setChecks((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  async function runHealthCheck() {
    if (!email || !email.includes('@')) {
      toast.error('Enter a valid email address to test');
      return;
    }

    setRunning(true);
    setSummary(null);
    setChecks(INITIAL_CHECKS.map((c) => ({ ...c, status: 'idle', detail: undefined })));

    let failures = 0;
    let warnings = 0;

    // 1. Hook reachable (preview endpoint)
    update('hook', { status: 'running' });
    try {
      const url = `https://czltgypfgegjmcsczpms.supabase.co/functions/v1/auth-email-hook/preview`;
      const res = await fetch(url, { method: 'OPTIONS' });
      if (res.ok || res.status === 204) {
        update('hook', { status: 'pass', detail: `Function responding (${res.status})` });
      } else {
        update('hook', { status: 'fail', detail: `HTTP ${res.status}` });
        failures++;
      }
    } catch (e: any) {
      update('hook', { status: 'fail', detail: e.message });
      failures++;
    }

    // 2. Queue function deployed
    update('queue', { status: 'running' });
    try {
      const { error } = await supabase.functions.invoke('process-email-queue', {
        body: { action: 'health' },
      });
      // Function exists if we get any response (even an error from inside it)
      if (error && /not found|404/i.test(error.message)) {
        update('queue', { status: 'fail', detail: 'process-email-queue not deployed' });
        failures++;
      } else {
        update('queue', { status: 'pass', detail: 'Dispatcher deployed' });
      }
    } catch (e: any) {
      update('queue', { status: 'warn', detail: e.message });
      warnings++;
    }

    // 3. Recent recovery emails
    update('log', { status: 'running' });
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    try {
      const { data, error } = await supabase
        .from('email_send_log')
        .select('status, created_at')
        .eq('template_name', 'recovery')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) {
        update('log', { status: 'warn', detail: error.message });
        warnings++;
      } else {
        const total = data?.length ?? 0;
        const failed = (data ?? []).filter((d) => d.status === 'failed').length;
        if (total === 0) {
          update('log', { status: 'warn', detail: 'No recovery emails attempted in 24h' });
          warnings++;
        } else if (failed === total) {
          update('log', { status: 'fail', detail: `All ${total} attempts failed` });
          failures++;
        } else {
          update('log', {
            status: failed > 0 ? 'warn' : 'pass',
            detail: `${total - failed}/${total} delivered`,
          });
          if (failed > 0) warnings++;
        }
      }
    } catch (e: any) {
      update('log', { status: 'warn', detail: e.message });
      warnings++;
    }

    // 4. Trigger live recovery email
    update('trigger', { status: 'running' });
    const triggeredAt = new Date();
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        update('trigger', { status: 'fail', detail: error.message });
        failures++;
      } else {
        update('trigger', { status: 'pass', detail: `Reset request sent for ${email}` });
      }
    } catch (e: any) {
      update('trigger', { status: 'fail', detail: e.message });
      failures++;
    }

    // 5. Delivery confirmation — poll send log
    update('delivery', { status: 'running' });
    let confirmed = false;
    for (let i = 0; i < 6; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const { data } = await supabase
        .from('email_send_log')
        .select('status, error_message, created_at')
        .eq('recipient_email', email)
        .eq('template_name', 'recovery')
        .gte('created_at', triggeredAt.toISOString())
        .order('created_at', { ascending: false })
        .limit(1);
      const row = data?.[0];
      if (row) {
        if (row.status === 'sent') {
          update('delivery', { status: 'pass', detail: 'Logged as sent' });
          confirmed = true;
          break;
        }
        if (row.status === 'failed') {
          update('delivery', { status: 'fail', detail: row.error_message || 'Send failed' });
          failures++;
          confirmed = true;
          break;
        }
        if (row.status === 'pending') {
          update('delivery', { status: 'running', detail: 'Pending in queue…' });
        }
      }
    }
    if (!confirmed) {
      update('delivery', {
        status: 'warn',
        detail: 'No log entry within 12s — check Resend dashboard',
      });
      warnings++;
    }

    if (failures > 0) {
      setSummary({
        status: 'fail',
        message: `${failures} critical check${failures > 1 ? 's' : ''} failed. Auth emails are NOT delivering reliably.`,
      });
    } else if (warnings > 0) {
      setSummary({
        status: 'warn',
        message: `Configuration is functional but has ${warnings} warning${warnings > 1 ? 's' : ''} to review.`,
      });
    } else {
      setSummary({ status: 'pass', message: 'All checks passed. Password reset emails are delivering.' });
    }

    setRunning(false);
  }

  return (
    <SettingsLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Auth Email Health Check</h1>
          <p className="text-muted-foreground">
            One-click verification that password reset emails are delivering end-to-end.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Run Health Check
            </CardTitle>
            <CardDescription>
              Triggers a real password reset email and verifies it lands in the send log.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="test-email">Test email address</Label>
              <div className="flex gap-2">
                <Input
                  id="test-email"
                  type="email"
                  placeholder="admin@praetoriagroup.ca"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={running}
                />
                <Button onClick={runHealthCheck} disabled={running}>
                  {running ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <PlayCircle className="h-4 w-4 mr-2" />
                  )}
                  Run Check
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Use a real account email. A live reset link will be sent.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              {checks.map((check) => (
                <div
                  key={check.id}
                  className="flex items-start justify-between gap-3 p-3 rounded-md border bg-card"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <StatusIcon status={check.status} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{check.label}</p>
                      {check.detail && (
                        <p className="text-xs text-muted-foreground mt-0.5">{check.detail}</p>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs uppercase">
                    {check.status === 'idle' ? 'pending' : check.status}
                  </Badge>
                </div>
              ))}
            </div>

            {summary && (
              <Alert
                variant={summary.status === 'fail' ? 'destructive' : 'default'}
                className={
                  summary.status === 'pass'
                    ? 'border-green-600/30 bg-green-500/5'
                    : summary.status === 'warn'
                    ? 'border-yellow-600/30 bg-yellow-500/5'
                    : undefined
                }
              >
                <AlertTitle className="flex items-center gap-2">
                  <StatusIcon status={summary.status} />
                  {summary.status === 'pass'
                    ? 'Healthy'
                    : summary.status === 'warn'
                    ? 'Functional with warnings'
                    : 'Action required'}
                </AlertTitle>
                <AlertDescription>{summary.message}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">What this checks</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p><strong className="text-foreground">Hook reachable</strong> — verifies the <code>auth-email-hook</code> edge function is deployed and accepting requests.</p>
            <p><strong className="text-foreground">Queue deployed</strong> — confirms <code>process-email-queue</code> is live to dispatch queued emails.</p>
            <p><strong className="text-foreground">Recent activity</strong> — scans <code>email_send_log</code> for recovery emails in the last 24 hours.</p>
            <p><strong className="text-foreground">Live trigger</strong> — sends a real password reset and watches for delivery confirmation.</p>
          </CardContent>
        </Card>
      </div>
    </SettingsLayout>
  );
}
