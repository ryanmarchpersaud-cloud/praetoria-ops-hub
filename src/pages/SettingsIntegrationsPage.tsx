import { useState, useEffect } from 'react';
import { SettingsLayout } from '@/components/SettingsLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Mail, MessageSquare, CreditCard, Webhook, Globe, CloudSun, Database, FileText,
  MapPin, Calendar, CheckCircle2, AlertCircle, Clock, Loader2, Settings, Copy, Check,
  RefreshCw, ExternalLink,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type IntStatus = 'connected' | 'configured' | 'test_mode' | 'not_configured' | 'pending' | 'error';

interface IntegrationDef {
  id: string;
  name: string;
  category: string;
  icon: typeof Database;
  description: string;
  status: IntStatus;
  enabled: boolean;
  environment: string;
  configNotes: string;
  lastActivity: string | null;
  canTest: boolean;
  testFn?: () => Promise<{ ok: boolean; message: string }>;
}

const statusConfig: Record<IntStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  connected: { label: 'Connected', variant: 'default' },
  configured: { label: 'Configured', variant: 'outline' },
  test_mode: { label: 'Test Mode', variant: 'secondary' },
  not_configured: { label: 'Not Configured', variant: 'destructive' },
  pending: { label: 'Pending', variant: 'secondary' },
  error: { label: 'Error', variant: 'destructive' },
};

// Test functions
async function testSupabase(): Promise<{ ok: boolean; message: string }> {
  try {
    const { count, error } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    if (error) return { ok: false, message: error.message };
    return { ok: true, message: `Connected — ${count} profiles` };
  } catch (e: any) { return { ok: false, message: e.message }; }
}
async function testResend(): Promise<{ ok: boolean; message: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('send-email', { body: { action: 'health' } });
    if (error) return { ok: false, message: error.message };
    return data?.resend_configured ? { ok: true, message: 'Resend API key configured' } : { ok: false, message: 'RESEND_API_KEY not configured' };
  } catch (e: any) { return { ok: false, message: e.message }; }
}
async function testTwilio(): Promise<{ ok: boolean; message: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('send-sms', { body: { action: 'health' } });
    if (error) return { ok: false, message: error.message };
    if (data?.twilio_configured && data?.phone_configured) return { ok: true, message: 'Twilio linked and phone configured' };
    if (data?.twilio_configured) return { ok: true, message: 'Twilio linked (phone not set)' };
    return { ok: false, message: 'Twilio not configured' };
  } catch (e: any) { return { ok: false, message: e.message }; }
}
async function testStripe(): Promise<{ ok: boolean; message: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('create-checkout', { body: { action: 'health' } });
    if (error) return { ok: false, message: error.message };
    if (data?.stripe_configured) return { ok: true, message: `${data.account_name || 'Stripe'} (${data.livemode ? 'Live' : 'Test'})` };
    return { ok: false, message: 'STRIPE_SECRET_KEY not configured' };
  } catch (e: any) { return { ok: false, message: e.message }; }
}
async function testN8n(): Promise<{ ok: boolean; message: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('n8n-webhook', { body: { action: 'test_handoff' } });
    if (error) return { ok: false, message: error.message };
    return data?.success ? { ok: true, message: data?.message || 'Handoff OK' } : { ok: false, message: data?.message || 'Failed' };
  } catch (e: any) { return { ok: false, message: e.message }; }
}

const INTEGRATIONS: IntegrationDef[] = [
  { id: 'supabase', name: 'Backend (Lovable Cloud)', category: 'Infrastructure', icon: Database, description: 'Core backend — authentication, database, storage, edge functions, and realtime.', status: 'connected', enabled: true, environment: 'production', configNotes: 'Auto-provisioned. Project ID and keys configured.', lastActivity: null, canTest: true, testFn: testSupabase },
  { id: 'resend', name: 'Resend (Email)', category: 'Communication', icon: Mail, description: 'Transactional email delivery — confirmations, notifications, system emails.', status: 'configured', enabled: true, environment: 'production', configNotes: 'Sender: noreply@praetoriagroup.ca. Edge function: send-email.', lastActivity: null, canTest: true, testFn: testResend },
  { id: 'twilio', name: 'Twilio (SMS)', category: 'Communication', icon: MessageSquare, description: 'Transactional SMS — request confirmations, ops alerts, admin tests.', status: 'configured', enabled: true, environment: 'production', configNotes: 'Connected via Twilio connector. Edge function: send-sms.', lastActivity: null, canTest: true, testFn: testTwilio },
  { id: 'stripe', name: 'Stripe Payments', category: 'Payments', icon: CreditCard, description: 'Online payments — checkout sessions, invoice links.', status: 'test_mode', enabled: true, environment: 'test', configNotes: 'Account: Praetoria Snow & Ice. Edge function: create-checkout. Test mode active.', lastActivity: null, canTest: true, testFn: testStripe },
  { id: 'n8n', name: 'n8n / Automation', category: 'Automation', icon: Webhook, description: 'Workflow automation — triggers on lead, quote, job, and visit lifecycle events.', status: 'configured', enabled: true, environment: 'production', configNotes: 'Edge function endpoint active. Webhook URL configured.', lastActivity: null, canTest: true, testFn: testN8n },
  { id: 'ionos', name: 'IONOS Email Hosting', category: 'Communication', icon: Globe, description: 'Business email hosting — @praetoriagroup.ca and @praetoriasnowandice.ca.', status: 'not_configured', enabled: false, environment: 'n/a', configNotes: 'Requires IONOS API key for mailbox provisioning.', lastActivity: null, canTest: false },
  { id: 'weather', name: 'Weather Intelligence', category: 'Operations', icon: CloudSun, description: 'Operational weather data — forecasts, snow triggers, dispatch support.', status: 'pending', enabled: false, environment: 'n/a', configNotes: 'Provider: ECCC GeoMet API. Future: OpenWeatherMap or Tomorrow.io.', lastActivity: null, canTest: false },
  { id: 'maps', name: 'Maps / Routing', category: 'Operations', icon: MapPin, description: 'Route optimization, GPS, territory mapping, and navigation.', status: 'not_configured', enabled: false, environment: 'n/a', configNotes: 'Future: Google Maps Platform or Mapbox for route optimization.', lastActivity: null, canTest: false },
  { id: 'calendar', name: 'Calendar Sync', category: 'Operations', icon: Calendar, description: 'Sync schedules with Google Calendar, Outlook, or iCal.', status: 'not_configured', enabled: false, environment: 'n/a', configNotes: 'Future: Google Calendar API or CalDAV integration.', lastActivity: null, canTest: false },
  { id: 'accounting', name: 'Accounting / Export', category: 'Financial', icon: FileText, description: 'Export invoices/expenses to QuickBooks, Xero, or CSV.', status: 'not_configured', enabled: false, environment: 'n/a', configNotes: 'Future: QuickBooks Online API or Xero integration.', lastActivity: null, canTest: false },
];

const CATEGORIES = [...new Set(INTEGRATIONS.map(i => i.category))];

const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/n8n-webhook`;

const WEBHOOK_ACTIONS = [
  { action: 'create_activity', description: 'Log an activity entry', example: { action: 'create_activity', action_name: 'Email sent', workflow_name: 'n8n', record_type: 'lead', record_id: '<uuid>' } },
  { action: 'update_lead_status', description: "Change a lead's status", example: { action: 'update_lead_status', lead_id: '<uuid>', status: 'Reviewing', internal_notes: 'Auto-triaged' } },
  { action: 'create_quote_draft', description: 'Create a quote with line items', example: { action: 'create_quote_draft', lead_id: '<uuid>', service_category: 'Snow & Ice', scope_of_work: 'Driveway', line_items: [{ item_name: 'Snow removal', quantity: 1, unit_price: 150 }] } },
  { action: 'set_follow_up', description: 'Set a follow-up on a quote', example: { action: 'set_follow_up', quote_id: '<uuid>', follow_up_due_at: '2026-03-20T09:00:00Z' } },
];

export default function SettingsIntegrationsPage() {
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; message: string }>>({});
  const [catFilter, setCatFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [detailInt, setDetailInt] = useState<IntegrationDef | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [lastActivityMap, setLastActivityMap] = useState<Record<string, string>>({});

  useEffect(() => {
    supabase.from('integration_logs').select('provider, created_at').order('created_at', { ascending: false }).limit(100)
      .then(({ data }) => {
        const map: Record<string, string> = {};
        (data ?? []).forEach((r: any) => { if (!map[r.provider]) map[r.provider] = r.created_at; });
        setLastActivityMap(map);
      });
  }, []);

  const handleTest = async (int: IntegrationDef) => {
    if (!int.testFn) return;
    setTesting(int.id);
    try {
      const r = await int.testFn();
      setTestResults(p => ({ ...p, [int.id]: r }));
      r.ok ? toast.success(`${int.name}: ${r.message}`) : toast.error(`${int.name}: ${r.message}`);
    } finally { setTesting(null); }
  };

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const filtered = INTEGRATIONS.filter(i => {
    if (catFilter !== 'all' && i.category !== catFilter) return false;
    if (statusFilter !== 'all' && i.status !== statusFilter) return false;
    return true;
  });

  const connectedCount = INTEGRATIONS.filter(i => ['connected', 'configured', 'test_mode'].includes(i.status)).length;

  return (
    <SettingsLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold">Integrations</h1>
          <p className="text-sm text-muted-foreground">Manage third-party services and system connections for Praetoria Group.</p>
        </div>

        {/* Summary cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card><CardContent className="pt-4"><p className="text-3xl font-bold">{INTEGRATIONS.length}</p><p className="text-xs text-muted-foreground">Total Integrations</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-3xl font-bold text-green-600">{connectedCount}</p><p className="text-xs text-muted-foreground">Active / Configured</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-3xl font-bold text-orange-500">{INTEGRATIONS.filter(i => i.status === 'pending').length}</p><p className="text-xs text-muted-foreground">Pending</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-3xl font-bold text-destructive">{INTEGRATIONS.filter(i => ['not_configured', 'error'].includes(i.status)).length}</p><p className="text-xs text-muted-foreground">Not Configured</p></CardContent></Card>
        </div>

        <Tabs defaultValue="catalog">
          <TabsList>
            <TabsTrigger value="catalog">Integration Catalog</TabsTrigger>
            <TabsTrigger value="webhook">Webhook API</TabsTrigger>
          </TabsList>

          <TabsContent value="catalog" className="space-y-4 mt-4">
            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
              <Select value={catFilter} onValueChange={setCatFilter}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Categories" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {Object.entries(statusConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {filtered.map(int => {
                const isTesting = testing === int.id;
                const result = testResults[int.id];
                const effectiveStatus = isTesting ? 'pending' : (result ? (result.ok ? 'connected' : 'error') : int.status);
                const sc = statusConfig[effectiveStatus];
                const lastAct = lastActivityMap[int.id] || int.lastActivity;

                return (
                  <Card key={int.id} className={!int.enabled ? 'opacity-60' : ''}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <int.icon className="h-5 w-5 text-primary" />
                          <CardTitle className="text-base">{int.name}</CardTitle>
                        </div>
                        <Badge variant={sc.variant}>{isTesting ? 'Checking…' : sc.label}</Badge>
                      </div>
                      <CardDescription className="text-xs">{int.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Category: {int.category}</span>
                        <span>Env: {int.environment}</span>
                      </div>
                      {lastAct && <p className="text-xs text-muted-foreground">Last activity: {new Date(lastAct).toLocaleDateString()}</p>}
                      {result && <div className={`text-xs px-2 py-1 rounded ${result.ok ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>{result.message}</div>}
                      <div className="flex gap-2 pt-1">
                        {int.canTest && (
                          <Button variant="outline" size="sm" disabled={isTesting} onClick={() => handleTest(int)}>
                            {isTesting ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
                            Test
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => setDetailInt(int)}>
                          <Settings className="h-3.5 w-3.5 mr-1" />Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="webhook" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Webhook className="w-4 h-4" />n8n Webhook Endpoint</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Webhook URL</label>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="flex-1 text-xs bg-muted rounded px-3 py-2 break-all font-mono">{webhookUrl}</code>
                    <Button size="icon" variant="outline" className="shrink-0 h-8 w-8" onClick={() => copy(webhookUrl, 'url')}>
                      {copied === 'url' ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Authentication</label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Set <code className="text-xs bg-muted px-1 py-0.5 rounded">x-webhook-secret</code> header with your <code className="text-xs bg-muted px-1 py-0.5 rounded">N8N_WEBHOOK_SECRET</code> value.
                  </p>
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Available Actions</label>
                  {WEBHOOK_ACTIONS.map(wa => (
                    <div key={wa.action} className="rounded-lg border bg-muted/30 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div><p className="text-sm font-medium font-mono">{wa.action}</p><p className="text-xs text-muted-foreground">{wa.description}</p></div>
                        <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => copy(JSON.stringify(wa.example, null, 2), wa.action)}>
                          {copied === wa.action ? <Check className="w-3 h-3 mr-1 text-primary" /> : <Copy className="w-3 h-3 mr-1" />}Copy
                        </Button>
                      </div>
                      <pre className="text-[11px] bg-background rounded p-2 overflow-x-auto font-mono leading-relaxed">{JSON.stringify(wa.example, null, 2)}</pre>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Detail Dialog */}
        <Dialog open={!!detailInt} onOpenChange={() => setDetailInt(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {detailInt && <detailInt.icon className="h-5 w-5 text-primary" />}
                {detailInt?.name}
              </DialogTitle>
            </DialogHeader>
            {detailInt && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Category:</span> {detailInt.category}</div>
                  <div><span className="text-muted-foreground">Status:</span> <Badge variant={statusConfig[detailInt.status].variant} className="ml-1">{statusConfig[detailInt.status].label}</Badge></div>
                  <div><span className="text-muted-foreground">Enabled:</span> {detailInt.enabled ? 'Yes' : 'No'}</div>
                  <div><span className="text-muted-foreground">Environment:</span> {detailInt.environment}</div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Description</p>
                  <p className="text-sm">{detailInt.description}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Configuration Notes</p>
                  <p className="text-sm">{detailInt.configNotes}</p>
                </div>
                {testResults[detailInt.id] && (
                  <div className={`text-sm px-3 py-2 rounded ${testResults[detailInt.id].ok ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                    Last test: {testResults[detailInt.id].message}
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailInt(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SettingsLayout>
  );
}
