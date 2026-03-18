import { useState } from 'react';
import { SettingsLayout } from '@/components/SettingsLayout';
import { IntegrationActivityLog } from '@/components/IntegrationActivityLog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Database, Mail, MessageSquare, CreditCard, Webhook, Globe, CloudSun, CheckCircle2, AlertCircle, Clock, Loader2, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type IntegrationStatus = 'connected' | 'configured' | 'not_configured' | 'coming_soon' | 'checking';

interface Integration {
  id: string;
  name: string;
  icon: typeof Database;
  status: IntegrationStatus;
  purpose: string;
  configNotes: string;
  lastChecked: string | null;
  canTest: boolean;
  testFn?: () => Promise<{ ok: boolean; message: string }>;
  hasCustomAction?: boolean;
}

const statusStyles: Record<IntegrationStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof CheckCircle2 }> = {
  connected: { label: 'Connected', variant: 'default', icon: CheckCircle2 },
  configured: { label: 'Configured', variant: 'outline', icon: CheckCircle2 },
  not_configured: { label: 'Not Configured', variant: 'destructive', icon: AlertCircle },
  coming_soon: { label: 'Coming Soon', variant: 'secondary', icon: Clock },
  checking: { label: 'Checking…', variant: 'secondary', icon: Loader2 },
};

async function testSupabase(): Promise<{ ok: boolean; message: string }> {
  try {
    const { count, error } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    if (error) return { ok: false, message: error.message };
    return { ok: true, message: `Connected — ${count} profiles found` };
  } catch (e: any) {
    return { ok: false, message: e.message };
  }
}

async function testN8n(): Promise<{ ok: boolean; message: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('n8n-webhook', {
      body: { event: 'health_check', payload: {} },
    });
    if (error) return { ok: false, message: error.message };
    return { ok: true, message: 'Edge function reachable' };
  } catch (e: any) {
    return { ok: false, message: e.message };
  }
}

async function testResend(): Promise<{ ok: boolean; message: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: { action: 'health' },
    });
    if (error) return { ok: false, message: error.message };
    if (data?.resend_configured) return { ok: true, message: 'Resend API key configured and edge function reachable' };
    return { ok: false, message: 'RESEND_API_KEY not configured' };
  } catch (e: any) {
    return { ok: false, message: e.message };
  }
}

async function testStripe(): Promise<{ ok: boolean; message: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('create-checkout', {
      body: { action: 'health' },
    });
    if (error) return { ok: false, message: error.message };
    if (data?.stripe_configured) {
      const mode = data.livemode ? 'Live' : 'Test';
      return { ok: true, message: `Connected to ${data.account_name || 'Stripe'} (${mode} mode)` };
    }
    return { ok: false, message: 'STRIPE_SECRET_KEY not configured' };
  } catch (e: any) {
    return { ok: false, message: e.message };
  }
}

async function testTwilio(): Promise<{ ok: boolean; message: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('send-sms', {
      body: { action: 'health' },
    });
    if (error) return { ok: false, message: error.message };
    if (data?.twilio_configured && data?.phone_configured) {
      return { ok: true, message: 'Twilio connector linked and phone number configured' };
    }
    if (data?.twilio_configured) {
      return { ok: true, message: 'Twilio connector linked (TWILIO_PHONE_NUMBER not yet set)' };
    }
    return { ok: false, message: 'Twilio connector not configured' };
  } catch (e: any) {
    return { ok: false, message: e.message };
  }
}

const integrations: Integration[] = [
  {
    id: 'supabase',
    name: 'Supabase Backend',
    icon: Database,
    status: 'connected',
    purpose: 'Core backend — authentication, database, storage, edge functions, and realtime.',
    configNotes: 'Auto-provisioned via Lovable Cloud. Project ID and keys are configured.',
    lastChecked: null,
    canTest: true,
    testFn: testSupabase,
  },
  {
    id: 'resend',
    name: 'Resend',
    icon: Mail,
    status: 'configured',
    purpose: 'Transactional email delivery — request confirmations, ops notifications, and system emails.',
    configNotes: 'Sender: noreply@praetoriagroup.ca. Edge function: send-email. Supports test, request confirmation, and ops notification flows.',
    lastChecked: null,
    canTest: true,
    testFn: testResend,
    hasCustomAction: true,
  },
  {
    id: 'twilio',
    name: 'Twilio',
    icon: MessageSquare,
    status: 'configured',
    purpose: 'Transactional SMS — admin test messages, request confirmations, and ops alerts.',
    configNotes: 'Connected via Twilio connector. Edge function: send-sms. Supports test, request confirmation, and ops alert flows. Rate-limited to 5 SMS/phone/hour.',
    lastChecked: null,
    canTest: true,
    testFn: testTwilio,
    hasCustomAction: true,
  },
  {
    id: 'stripe',
    name: 'Stripe Payments',
    icon: CreditCard,
    status: 'configured',
    purpose: 'Online payments — customer checkout sessions, invoice payment links, and admin test payments.',
    configNotes: 'Account: Praetoria Snow & Ice. Edge function: create-checkout. Supports test checkout, service payments with internal metadata. Test mode active.',
    lastChecked: null,
    canTest: true,
    testFn: testStripe,
    hasCustomAction: true,
  },
  {
    id: 'n8n',
    name: 'n8n / Agents',
    icon: Webhook,
    status: 'configured',
    purpose: 'Workflow automation — triggers on lead, quote, job, and visit lifecycle events.',
    configNotes: 'Edge function endpoint active. Webhook URL configured in n8n workspace.',
    lastChecked: null,
    canTest: true,
    testFn: testN8n,
  },
  {
    id: 'ionos',
    name: 'IONOS Email',
    icon: Globe,
    status: 'not_configured',
    purpose: 'Business email hosting — team mailboxes for @praetoriagroup.ca and @praetoriasnowandice.ca. DNS managed externally.',
    configNotes: 'Domains: praetoriagroup.ca, praetoriasnowandice.ca. Requires IONOS API key for mailbox provisioning.',
    lastChecked: null,
    canTest: false,
  },
];

const operationalIntegrations: Integration[] = [
  {
    id: 'weather',
    name: 'Weather Intelligence',
    icon: CloudSun,
    status: 'coming_soon',
    purpose: 'Operational weather data — forecasts, snow event triggers, dispatch support, and weather-driven automations.',
    configNotes: 'Provider: Environment & Climate Change Canada (ECCC) GeoMet API. Future: OpenWeatherMap or Tomorrow.io for enhanced forecasting. Will power snow dispatch triggers, safety alerts, and schedule adjustments.',
    lastChecked: null,
    canTest: false,
  },
];

export default function ConnectedAppsPage() {
  const [testResults, setTestResults] = useState<Record<string, { status: IntegrationStatus; message: string }>>({});
  const [testing, setTesting] = useState<string | null>(null);
  const [testEmailTo, setTestEmailTo] = useState('');
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [testSmsTo, setTestSmsTo] = useState('');
  const [sendingTestSms, setSendingTestSms] = useState(false);
  const [launchingStripeTest, setLaunchingStripeTest] = useState(false);

  const handleTest = async (integration: Integration) => {
    if (!integration.testFn) return;
    setTesting(integration.id);
    try {
      const result = await integration.testFn();
      setTestResults(prev => ({
        ...prev,
        [integration.id]: { status: result.ok ? 'connected' : 'not_configured', message: result.message },
      }));
      if (result.ok) toast.success(`${integration.name}: ${result.message}`);
      else toast.error(`${integration.name}: ${result.message}`);
    } catch {
      setTestResults(prev => ({
        ...prev,
        [integration.id]: { status: 'not_configured', message: 'Test failed unexpectedly' },
      }));
    } finally {
      setTesting(null);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmailTo) { toast.error('Enter an email address'); return; }
    setSendingTestEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: { action: 'test', to: testEmailTo },
      });
      if (error) toast.error(`Send failed: ${error.message}`);
      else if (data?.ok) { toast.success(`Test email sent to ${testEmailTo}`); setTestEmailTo(''); }
      else toast.error(`Send failed: ${data?.error || 'Unknown error'}`);
    } catch (e: any) { toast.error(e.message); }
    finally { setSendingTestEmail(false); }
  };

  const handleSendTestSms = async () => {
    if (!testSmsTo) { toast.error('Enter a phone number (E.164 format, e.g. +14165551234)'); return; }
    setSendingTestSms(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: { action: 'test', to: testSmsTo },
      });
      if (error) toast.error(`Send failed: ${error.message}`);
      else if (data?.ok) { toast.success(`Test SMS sent to ${testSmsTo}`); setTestSmsTo(''); }
      else toast.error(`Send failed: ${data?.error || 'Unknown error'}`);
    } catch (e: any) { toast.error(e.message); }
    finally { setSendingTestSms(false); }
  };

  const handleStripeTestCheckout = async () => {
    setLaunchingStripeTest(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { action: 'test_checkout' },
      });
      if (error) { toast.error(`Stripe test failed: ${error.message}`); return; }
      if (data?.ok && data?.url) {
        window.open(data.url, '_blank');
        toast.success('Stripe test checkout opened in new tab');
      } else {
        toast.error(`Stripe test failed: ${data?.error || 'Unknown error'}`);
      }
    } catch (e: any) { toast.error(e.message); }
    finally { setLaunchingStripeTest(false); }
  };

  const renderCard = (app: Integration) => {
    const testResult = testResults[app.id];
    const currentStatus = testing === app.id ? 'checking' : (testResult?.status ?? app.status);
    const style = statusStyles[currentStatus];
    const StatusIcon = style.icon;
    const isTesting = testing === app.id;

    return (
      <Card key={app.id} className={currentStatus === 'coming_soon' ? 'opacity-60' : ''}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <app.icon className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">{app.name}</CardTitle>
            </div>
            <Badge variant={style.variant} className="gap-1">
              <StatusIcon className={`h-3 w-3 ${isTesting ? 'animate-spin' : ''}`} />
              {style.label}
            </Badge>
          </div>
          <CardDescription>{app.purpose}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Configuration</p>
            <p className="text-sm text-foreground">{app.configNotes}</p>
          </div>

          {testResult?.message && (
            <div className="text-xs px-2 py-1.5 rounded bg-muted">
              <span className="font-medium">Last test:</span> {testResult.message}
            </div>
          )}

          {/* Resend send-test-email inline form */}
          {app.id === 'resend' && (
            <div className="flex gap-2">
              <Input placeholder="admin@example.com" value={testEmailTo} onChange={(e) => setTestEmailTo(e.target.value)} className="h-8 text-sm" type="email" />
              <Button variant="default" size="sm" disabled={sendingTestEmail || !testEmailTo} onClick={handleSendTestEmail}>
                {sendingTestEmail ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
                Send
              </Button>
            </div>
          )}

          {/* Twilio send-test-sms inline form */}
          {app.id === 'twilio' && (
            <div className="flex gap-2">
              <Input placeholder="+14165551234" value={testSmsTo} onChange={(e) => setTestSmsTo(e.target.value)} className="h-8 text-sm" type="tel" />
              <Button variant="default" size="sm" disabled={sendingTestSms || !testSmsTo} onClick={handleSendTestSms}>
                {sendingTestSms ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <MessageSquare className="h-3.5 w-3.5 mr-1.5" />}
                Send
              </Button>
            </div>
          )}

          {/* Stripe test checkout button */}
          {app.id === 'stripe' && (
            <Button variant="default" size="sm" disabled={launchingStripeTest} onClick={handleStripeTestCheckout}>
              {launchingStripeTest ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5 mr-1.5" />}
              Test Checkout ($1.00 CAD)
            </Button>
          )}

          <div className="flex gap-2">
            {app.canTest && (
              <Button variant="outline" size="sm" disabled={isTesting} onClick={() => handleTest(app)}>
                {isTesting ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
                Test Connection
              </Button>
            )}
            {currentStatus === 'coming_soon' && (
              <Button variant="ghost" size="sm" disabled>Coming Soon</Button>
            )}
            {!app.canTest && currentStatus !== 'coming_soon' && (
              <Button variant="outline" size="sm" disabled>Configure</Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <SettingsLayout>
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold">Connected Apps</h1>
          <p className="text-sm text-muted-foreground">
            Integration status and configuration for all platform services. Live checks available where supported.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Core Infrastructure</h2>
          <div className="grid gap-4 md:grid-cols-2">{integrations.map(renderCard)}</div>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Operational Data &amp; Services</h2>
          <div className="grid gap-4 md:grid-cols-2">{operationalIntegrations.map(renderCard)}</div>
        </div>

        <IntegrationActivityLog />
      </div>
    </SettingsLayout>
  );
}
