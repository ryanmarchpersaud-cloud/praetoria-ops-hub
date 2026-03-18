import { useState } from 'react';
import { SettingsLayout } from '@/components/SettingsLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Database, Mail, MessageSquare, CreditCard, Webhook, Globe, CloudSun, CheckCircle2, AlertCircle, Clock, Loader2 } from 'lucide-react';
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

const integrations: Integration[] = [
  {
    id: 'supabase',
    name: 'Lovable Cloud',
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
    status: 'not_configured',
    purpose: 'Transactional email delivery — quote notifications, invoice emails, and welcome messages.',
    configNotes: 'Requires RESEND_API_KEY secret. Domain verification needed for custom sender.',
    lastChecked: null,
    canTest: false,
  },
  {
    id: 'twilio',
    name: 'Twilio',
    icon: MessageSquare,
    status: 'not_configured',
    purpose: 'SMS notifications — visit confirmations, schedule changes, and crew alerts.',
    configNotes: 'Requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER secrets.',
    lastChecked: null,
    canTest: false,
  },
  {
    id: 'stripe',
    name: 'Stripe Payments',
    icon: CreditCard,
    status: 'coming_soon',
    purpose: 'Online payments — customer autopay, invoice payment links, and payment reconciliation.',
    configNotes: 'Will require Stripe publishable + secret keys. Webhook endpoint to be configured.',
    lastChecked: null,
    canTest: false,
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
    purpose: 'Business email hosting — team mailboxes @praetoriagroup.com and domain DNS.',
    configNotes: 'Requires IONOS API key for mailbox provisioning. DNS records managed externally.',
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

  return (
    <SettingsLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold">Connected Apps</h1>
          <p className="text-sm text-muted-foreground">
            Integration status and configuration for all platform services. Live checks available where supported.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {integrations.map((app) => {
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
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Configuration
                    </p>
                    <p className="text-sm text-foreground">{app.configNotes}</p>
                  </div>

                  {testResult?.message && (
                    <div className="text-xs px-2 py-1.5 rounded bg-muted">
                      <span className="font-medium">Last test:</span> {testResult.message}
                    </div>
                  )}

                  <div className="flex gap-2">
                    {app.canTest && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isTesting}
                        onClick={() => handleTest(app)}
                      >
                        {isTesting ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
                        Test Connection
                      </Button>
                    )}
                    {currentStatus === 'coming_soon' && (
                      <Button variant="ghost" size="sm" disabled>
                        Coming Soon
                      </Button>
                    )}
                    {!app.canTest && currentStatus !== 'coming_soon' && (
                      <Button variant="outline" size="sm" disabled>
                        Configure
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </SettingsLayout>
  );
}
