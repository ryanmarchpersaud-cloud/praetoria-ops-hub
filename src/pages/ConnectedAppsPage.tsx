import { useState, useEffect } from 'react';
import { SettingsLayout } from '@/components/SettingsLayout';
import { IntegrationActivityLog } from '@/components/IntegrationActivityLog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Database, Mail, MessageSquare, CreditCard, Webhook, Globe, CloudSun,
  CheckCircle2, AlertCircle, Clock, Loader2, Send, Zap, Settings, RefreshCw,
  Shield, FileText, Users, MapPin, Calendar, BarChart3,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type AppStatus = 'connected' | 'configured' | 'test_mode' | 'not_configured' | 'pending';

interface ConnectedApp {
  id: string;
  name: string;
  category: string;
  icon: typeof Database;
  purpose: string;
  linkedModules: string[];
  status: AppStatus;
  enabled: boolean;
  environment: string;
  notes: string;
  canTest: boolean;
  testFn?: () => Promise<{ ok: boolean; message: string }>;
}

const statusStyles: Record<AppStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  connected: { label: 'Connected', variant: 'default' },
  configured: { label: 'Configured', variant: 'outline' },
  test_mode: { label: 'Test Mode', variant: 'secondary' },
  not_configured: { label: 'Not Configured', variant: 'destructive' },
  pending: { label: 'Pending', variant: 'secondary' },
};

// Test functions
async function testSupabase() {
  try {
    const { count, error } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    return error ? { ok: false, message: error.message } : { ok: true, message: `Connected — ${count} profiles` };
  } catch (e: any) { return { ok: false, message: e.message }; }
}
async function testResend() {
  try {
    const { data, error } = await supabase.functions.invoke('send-email', { body: { action: 'health' } });
    if (error) return { ok: false, message: error.message };
    return data?.resend_configured ? { ok: true, message: 'Resend configured' } : { ok: false, message: 'Not configured' };
  } catch (e: any) { return { ok: false, message: e.message }; }
}
async function testTwilio() {
  try {
    const { data, error } = await supabase.functions.invoke('send-sms', { body: { action: 'health' } });
    if (error) return { ok: false, message: error.message };
    return data?.twilio_configured ? { ok: true, message: 'Twilio linked' } : { ok: false, message: 'Not configured' };
  } catch (e: any) { return { ok: false, message: e.message }; }
}
async function testStripe() {
  try {
    const { data, error } = await supabase.functions.invoke('create-checkout', { body: { action: 'health' } });
    if (error) return { ok: false, message: error.message };
    return data?.stripe_configured ? { ok: true, message: `${data.account_name || 'Stripe'} (${data.livemode ? 'Live' : 'Test'})` } : { ok: false, message: 'Not configured' };
  } catch (e: any) { return { ok: false, message: e.message }; }
}
async function testN8n() {
  try {
    const { data, error } = await supabase.functions.invoke('n8n-webhook', { body: { action: 'test_handoff' } });
    if (error) return { ok: false, message: error.message };
    return data?.success ? { ok: true, message: 'Handoff OK' } : { ok: false, message: data?.message || 'Failed' };
  } catch (e: any) { return { ok: false, message: e.message }; }
}

const APPS: ConnectedApp[] = [
  { id: 'supabase', name: 'Lovable Cloud Backend', category: 'Infrastructure', icon: Database, purpose: 'Core backend — auth, database, storage, edge functions, realtime.', linkedModules: ['All Modules'], status: 'connected', enabled: true, environment: 'production', notes: 'Auto-provisioned.', canTest: true, testFn: testSupabase },
  { id: 'resend', name: 'Resend (Email)', category: 'Communication', icon: Mail, purpose: 'Transactional email — confirmations, notifications, system emails.', linkedModules: ['Emails & Texts', 'Quotes', 'Invoices', 'Requests'], status: 'configured', enabled: true, environment: 'production', notes: 'Sender: noreply@praetoriagroup.ca', canTest: true, testFn: testResend },
  { id: 'twilio', name: 'Twilio (SMS)', category: 'Communication', icon: MessageSquare, purpose: 'Transactional SMS — alerts, confirmations, ops notifications.', linkedModules: ['Emails & Texts', 'Requests', 'Automations'], status: 'configured', enabled: true, environment: 'production', notes: 'Via Twilio connector. Rate-limited 5/phone/hour.', canTest: true, testFn: testTwilio },
  { id: 'stripe', name: 'Stripe Payments', category: 'Payments', icon: CreditCard, purpose: 'Online payments — checkout sessions, invoice links.', linkedModules: ['Payments', 'Invoices', 'Portal'], status: 'test_mode', enabled: true, environment: 'test', notes: 'Account: Praetoria Snow & Ice. Test mode.', canTest: true, testFn: testStripe },
  { id: 'n8n', name: 'n8n / Automation', category: 'Automation', icon: Webhook, purpose: 'Workflow automation — lifecycle event triggers.', linkedModules: ['Automations', 'Leads', 'Quotes', 'Jobs'], status: 'configured', enabled: true, environment: 'production', notes: 'Edge function endpoint active.', canTest: true, testFn: testN8n },
  { id: 'ionos', name: 'IONOS Email Hosting', category: 'Communication', icon: Globe, purpose: 'Business email — @praetoriagroup.ca, @praetoriasnowandice.ca.', linkedModules: ['Company Settings'], status: 'not_configured', enabled: false, environment: 'n/a', notes: 'Requires IONOS API key.', canTest: false },
  { id: 'weather', name: 'Weather Intelligence', category: 'Operations', icon: CloudSun, purpose: 'Weather forecasts, snow triggers, dispatch support.', linkedModules: ['Schedule', 'Dashboard'], status: 'pending', enabled: false, environment: 'n/a', notes: 'ECCC GeoMet API planned.', canTest: false },
  { id: 'maps', name: 'Maps / Routing', category: 'Operations', icon: MapPin, purpose: 'Route optimization, territory mapping.', linkedModules: ['Route Optimization', 'Schedule'], status: 'not_configured', enabled: false, environment: 'n/a', notes: 'Google Maps / Mapbox planned.', canTest: false },
  { id: 'calendar', name: 'Calendar Sync', category: 'Operations', icon: Calendar, purpose: 'Sync with Google Calendar, Outlook, iCal.', linkedModules: ['Schedule', 'Jobs'], status: 'not_configured', enabled: false, environment: 'n/a', notes: 'CalDAV / Google Calendar API planned.', canTest: false },
  { id: 'accounting', name: 'Accounting Export', category: 'Financial', icon: FileText, purpose: 'Export to QuickBooks, Xero, or CSV.', linkedModules: ['Invoices', 'Expenses'], status: 'not_configured', enabled: false, environment: 'n/a', notes: 'QuickBooks Online / Xero planned.', canTest: false },
  { id: 'analytics', name: 'Analytics & Reporting', category: 'Internal', icon: BarChart3, purpose: 'Business intelligence dashboards and KPI tracking.', linkedModules: ['Dashboard', 'All Modules'], status: 'pending', enabled: false, environment: 'n/a', notes: 'Internal analytics engine planned.', canTest: false },
];

const CATEGORIES = [...new Set(APPS.map(a => a.category))];

// n8n synthetic tests
const N8N_TESTS = [
  { key: 'test_handoff', label: 'Stripe Test Checkout', event: 'stripe.test_checkout_created', icon: CreditCard },
  { key: 'test_stripe_service', label: 'Stripe Service Checkout', event: 'stripe.service_checkout_created', icon: CreditCard },
  { key: 'test_email_request_confirm', label: 'Email Request Confirm', event: 'email.request_confirmation', icon: Mail },
  { key: 'test_email_ops', label: 'Email Ops Notification', event: 'email.ops_notification', icon: Mail },
  { key: 'test_sms_request_confirm', label: 'SMS Request Confirm', event: 'sms.request_confirmation', icon: MessageSquare },
  { key: 'test_sms_ops_alert', label: 'SMS Ops Alert', event: 'sms.ops_alert', icon: MessageSquare },
];

export default function ConnectedAppsPage() {
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; message: string }>>({});
  const [catFilter, setCatFilter] = useState('all');
  const [detailApp, setDetailApp] = useState<ConnectedApp | null>(null);
  const [testEmailTo, setTestEmailTo] = useState('');
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [testSmsTo, setTestSmsTo] = useState('');
  const [sendingTestSms, setSendingTestSms] = useState(false);
  const [launchingStripe, setLaunchingStripe] = useState(false);
  const [n8nTesting, setN8nTesting] = useState<Record<string, boolean>>({});
  const [n8nResults, setN8nResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [lastActivityMap, setLastActivityMap] = useState<Record<string, string>>({});

  useEffect(() => {
    supabase.from('integration_logs').select('provider, created_at').order('created_at', { ascending: false }).limit(100)
      .then(({ data }) => {
        const map: Record<string, string> = {};
        (data ?? []).forEach((r: any) => { if (!map[r.provider]) map[r.provider] = r.created_at; });
        setLastActivityMap(map);
      });
  }, []);

  const handleTest = async (app: ConnectedApp) => {
    if (!app.testFn) return;
    setTesting(app.id);
    try {
      const r = await app.testFn();
      setTestResults(p => ({ ...p, [app.id]: r }));
      r.ok ? toast.success(`${app.name}: ${r.message}`) : toast.error(`${app.name}: ${r.message}`);
    } finally { setTesting(null); }
  };

  const handleTestAll = async () => {
    const testable = APPS.filter(a => a.canTest);
    for (const app of testable) {
      await handleTest(app);
      await new Promise(r => setTimeout(r, 500));
    }
    toast.info('All connection tests complete');
  };

  const handleSendTestEmail = async () => {
    if (!testEmailTo) { toast.error('Enter an email address'); return; }
    setSendingTestEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-email', { body: { action: 'test', to: testEmailTo } });
      if (error) toast.error(`Send failed: ${error.message}`);
      else if (data?.ok) { toast.success(`Test email sent to ${testEmailTo}`); setTestEmailTo(''); }
      else toast.error(`Send failed: ${data?.error || 'Unknown error'}`);
    } catch (e: any) { toast.error(e.message); }
    finally { setSendingTestEmail(false); }
  };

  const handleSendTestSms = async () => {
    if (!testSmsTo) { toast.error('Enter phone (E.164)'); return; }
    setSendingTestSms(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-sms', { body: { action: 'test', to: testSmsTo } });
      if (error) toast.error(`Send failed: ${error.message}`);
      else if (data?.ok) { toast.success(`Test SMS sent to ${testSmsTo}`); setTestSmsTo(''); }
      else toast.error(`Send failed: ${data?.error || 'Unknown error'}`);
    } catch (e: any) { toast.error(e.message); }
    finally { setSendingTestSms(false); }
  };

  const handleStripeTest = async () => {
    setLaunchingStripe(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', { body: { action: 'test_checkout' } });
      if (error) { toast.error(`Stripe test failed: ${error.message}`); return; }
      if (data?.ok && data?.url) { window.open(data.url, '_blank'); toast.success('Stripe checkout opened'); }
      else toast.error(`Failed: ${data?.error || 'Unknown'}`);
    } catch (e: any) { toast.error(e.message); }
    finally { setLaunchingStripe(false); }
  };

  const handleN8nTest = async (key: string) => {
    setN8nTesting(p => ({ ...p, [key]: true }));
    try {
      const { data, error } = await supabase.functions.invoke('n8n-webhook', { body: { action: key } });
      if (error) { setN8nResults(p => ({ ...p, [key]: { success: false, message: error.message } })); toast.error(error.message); }
      else if (data?.success) { setN8nResults(p => ({ ...p, [key]: { success: true, message: data.message } })); toast.success(data.message); }
      else { setN8nResults(p => ({ ...p, [key]: { success: false, message: data?.message || 'Failed' } })); toast.error(data?.message || 'Failed'); }
    } catch (e: any) { setN8nResults(p => ({ ...p, [key]: { success: false, message: e.message } })); }
    finally { setN8nTesting(p => ({ ...p, [key]: false })); }
  };

  const filtered = APPS.filter(a => catFilter === 'all' || a.category === catFilter);
  const connectedCount = APPS.filter(a => ['connected', 'configured', 'test_mode'].includes(a.status)).length;

  return (
    <SettingsLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Connected Apps</h1>
            <p className="text-sm text-muted-foreground">Integration status, live connection tests, and configuration for all platform services.</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleTestAll}><RefreshCw className="h-4 w-4 mr-1" />Test All</Button>
        </div>

        {/* Summary */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card><CardContent className="pt-4"><p className="text-3xl font-bold">{APPS.length}</p><p className="text-xs text-muted-foreground">Total Apps</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-3xl font-bold text-green-600">{connectedCount}</p><p className="text-xs text-muted-foreground">Active</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-3xl font-bold text-orange-500">{APPS.filter(a => a.status === 'pending').length}</p><p className="text-xs text-muted-foreground">Pending</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-3xl font-bold text-destructive">{APPS.filter(a => a.status === 'not_configured').length}</p><p className="text-xs text-muted-foreground">Not Configured</p></CardContent></Card>
        </div>

        {/* Filter */}
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* App cards */}
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map(app => {
            const isTesting = testing === app.id;
            const result = testResults[app.id];
            const effectiveStatus = isTesting ? 'pending' : (result ? (result.ok ? 'connected' : 'not_configured') : app.status);
            const sc = statusStyles[effectiveStatus as AppStatus] || statusStyles.not_configured;
            const lastAct = lastActivityMap[app.id];

            return (
              <Card key={app.id} className={!app.enabled ? 'opacity-60' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <app.icon className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">{app.name}</CardTitle>
                    </div>
                    <Badge variant={sc.variant}>{isTesting ? 'Checking…' : sc.label}</Badge>
                  </div>
                  <CardDescription className="text-xs">{app.purpose}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex flex-wrap gap-1">
                    {app.linkedModules.map(m => <Badge key={m} variant="secondary" className="text-[10px]">{m}</Badge>)}
                  </div>
                  {lastAct && <p className="text-xs text-muted-foreground">Last activity: {new Date(lastAct).toLocaleDateString()}</p>}
                  {result && <div className={`text-xs px-2 py-1 rounded ${result.ok ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>{result.message}</div>}

                  {/* Inline test forms */}
                  {app.id === 'resend' && (
                    <div className="flex gap-2">
                      <Input placeholder="admin@example.com" value={testEmailTo} onChange={e => setTestEmailTo(e.target.value)} className="h-8 text-sm" type="email" />
                      <Button variant="default" size="sm" disabled={sendingTestEmail || !testEmailTo} onClick={handleSendTestEmail}>
                        {sendingTestEmail ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1" />}Send
                      </Button>
                    </div>
                  )}
                  {app.id === 'twilio' && (
                    <div className="flex gap-2">
                      <Input placeholder="+14165551234" value={testSmsTo} onChange={e => setTestSmsTo(e.target.value)} className="h-8 text-sm" type="tel" />
                      <Button variant="default" size="sm" disabled={sendingTestSms || !testSmsTo} onClick={handleSendTestSms}>
                        {sendingTestSms ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <MessageSquare className="h-3.5 w-3.5 mr-1" />}Send
                      </Button>
                    </div>
                  )}
                  {app.id === 'stripe' && (
                    <Button variant="default" size="sm" disabled={launchingStripe} onClick={handleStripeTest}>
                      {launchingStripe ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <CreditCard className="h-3.5 w-3.5 mr-1" />}Test Checkout ($1.00)
                    </Button>
                  )}
                  {app.id === 'n8n' && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase text-muted-foreground">Synthetic Branch Tests</p>
                      <div className="grid grid-cols-2 gap-2">
                        {N8N_TESTS.map(def => {
                          const Icon = def.icon;
                          const busy = !!n8nTesting[def.key];
                          return (
                            <Button key={def.key} variant="outline" size="sm" className="justify-start text-xs h-8" disabled={busy} onClick={() => handleN8nTest(def.key)}>
                              {busy ? <Loader2 className="h-3 w-3 mr-1 animate-spin shrink-0" /> : <Icon className="h-3 w-3 mr-1 shrink-0" />}
                              <span className="truncate">{def.label}</span>
                            </Button>
                          );
                        })}
                      </div>
                      {N8N_TESTS.map(def => {
                        const r = n8nResults[def.key];
                        if (!r) return null;
                        return (
                          <div key={def.key} className={`text-xs px-2 py-1 rounded ${r.success ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                            <span className="font-medium">{r.success ? '✓' : '✗'} {def.event}:</span> {r.message}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    {app.canTest && (
                      <Button variant="outline" size="sm" disabled={isTesting} onClick={() => handleTest(app)}>
                        {isTesting ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}Test
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => setDetailApp(app)}>
                      <Settings className="h-3.5 w-3.5 mr-1" />Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <IntegrationActivityLog />

        {/* Detail Dialog */}
        <Dialog open={!!detailApp} onOpenChange={() => setDetailApp(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle className="flex items-center gap-2">{detailApp && <detailApp.icon className="h-5 w-5 text-primary" />}{detailApp?.name}</DialogTitle></DialogHeader>
            {detailApp && (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-muted-foreground">Category:</span> {detailApp.category}</div>
                  <div><span className="text-muted-foreground">Status:</span> <Badge variant={statusStyles[detailApp.status].variant} className="ml-1">{statusStyles[detailApp.status].label}</Badge></div>
                  <div><span className="text-muted-foreground">Enabled:</span> {detailApp.enabled ? 'Yes' : 'No'}</div>
                  <div><span className="text-muted-foreground">Environment:</span> {detailApp.environment}</div>
                </div>
                <div><p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Purpose</p><p>{detailApp.purpose}</p></div>
                <div><p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Linked Modules</p><div className="flex flex-wrap gap-1">{detailApp.linkedModules.map(m => <Badge key={m} variant="outline">{m}</Badge>)}</div></div>
                <div><p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Notes</p><p>{detailApp.notes}</p></div>
              </div>
            )}
            <DialogFooter><Button variant="outline" onClick={() => setDetailApp(null)}>Close</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SettingsLayout>
  );
}
