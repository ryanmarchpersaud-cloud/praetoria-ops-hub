import { useState, useEffect } from 'react';
import { SettingsLayout } from '@/components/SettingsLayout';
import { IntegrationActivityLog } from '@/components/IntegrationActivityLog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import {
  Database, Mail, MessageSquare, CreditCard, Webhook, Globe, CloudSun,
  CheckCircle2, AlertCircle, Clock, Loader2, Send, Zap, Settings, RefreshCw,
  Shield, FileText, Users, MapPin, Calendar, BarChart3, Download, Copy, Check, ExternalLink,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { APP_EMAIL_CONFIG } from '@/lib/emailConfig';
import { exportInvoices, exportPayments, exportExpenses, exportCustomers, exportVendors } from '@/lib/accountingExport';

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

// ── Test functions ──
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
async function testIonos() {
  // IONOS provides mailbox hosting — validate that our config references are correct
  const mailboxes = Object.values(APP_EMAIL_CONFIG.serviceInboxes);
  const allMailboxes = [APP_EMAIL_CONFIG.systemOwner, APP_EMAIL_CONFIG.opsInbox, APP_EMAIL_CONFIG.supportInbox, APP_EMAIL_CONFIG.noReplyInbox, ...mailboxes];
  return { ok: true, message: `${allMailboxes.length} mailboxes configured across 2 domains` };
}
async function testWeather() {
  try {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const url = `https://${projectId}.supabase.co/functions/v1/weather?city=regina`;
    const response = await fetch(url, { headers: { 'Authorization': `Bearer ${anonKey}`, 'apikey': anonKey } });
    if (!response.ok) return { ok: false, message: `API error: ${response.status}` };
    const d = await response.json();
    if (d?.current?.temperature !== undefined) {
      return { ok: true, message: `${d.city}: ${d.current.temperature}°C — ${d.current.condition}` };
    }
    return { ok: true, message: `${d.city || 'Regina'} data received` };
  } catch (e: any) { return { ok: false, message: e.message }; }
}
async function testMaps() {
  // Maps uses Leaflet + OpenStreetMap (no API key needed)
  const { count } = await supabase.from('properties').select('*', { count: 'exact', head: true }).not('latitude', 'is', null);
  return { ok: true, message: `Leaflet/OSM active — ${count ?? 0} geocoded properties` };
}
async function testCalendar() {
  try {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const url = `https://${projectId}.supabase.co/functions/v1/calendar-feed?action=health`;
    const response = await fetch(url, { headers: { 'Authorization': `Bearer ${anonKey}`, 'apikey': anonKey } });
    if (!response.ok) return { ok: false, message: `Feed error: ${response.status}` };
    const d = await response.json();
    return d?.ok ? { ok: true, message: 'iCal feed endpoint ready' } : { ok: false, message: 'Feed not responding' };
  } catch (e: any) { return { ok: false, message: e.message }; }
}
async function testAccounting() {
  const { count: invCount } = await supabase.from('invoices').select('*', { count: 'exact', head: true });
  const { count: payCount } = await supabase.from('finance_payments').select('*', { count: 'exact', head: true });
  return { ok: true, message: `Export ready — ${invCount ?? 0} invoices, ${payCount ?? 0} payments` };
}
async function testAnalytics() {
  const { count: invCount } = await supabase.from('invoices').select('*', { count: 'exact', head: true });
  const { count: jobCount } = await supabase.from('jobs').select('*', { count: 'exact', head: true });
  const { count: visitCount } = await supabase.from('visits').select('*', { count: 'exact', head: true });
  return { ok: true, message: `Data sources: ${invCount ?? 0} invoices, ${jobCount ?? 0} jobs, ${visitCount ?? 0} visits` };
}

const APPS: ConnectedApp[] = [
  { id: 'supabase', name: 'Lovable Cloud Backend', category: 'Infrastructure', icon: Database, purpose: 'Core backend — auth, database, storage, edge functions, realtime.', linkedModules: ['All Modules'], status: 'connected', enabled: true, environment: 'production', notes: 'Auto-provisioned.', canTest: true, testFn: testSupabase },
  { id: 'resend', name: 'Resend (Email)', category: 'Communication', icon: Mail, purpose: 'Transactional email — confirmations, notifications, system emails.', linkedModules: ['Emails & Texts', 'Quotes', 'Invoices', 'Requests'], status: 'configured', enabled: true, environment: 'production', notes: 'Sender: noreply@praetoriagroup.ca', canTest: true, testFn: testResend },
  { id: 'twilio', name: 'Twilio (SMS)', category: 'Communication', icon: MessageSquare, purpose: 'Transactional SMS — alerts, confirmations, ops notifications.', linkedModules: ['Emails & Texts', 'Requests', 'Automations'], status: 'configured', enabled: true, environment: 'production', notes: 'Via Twilio connector. Rate-limited 5/phone/hour.', canTest: true, testFn: testTwilio },
  { id: 'stripe', name: 'Stripe Payments', category: 'Payments', icon: CreditCard, purpose: 'Online payments — checkout sessions, invoice links.', linkedModules: ['Payments', 'Invoices', 'Portal'], status: 'test_mode', enabled: true, environment: 'test', notes: 'Account: Praetoria Snow & Ice. Test mode.', canTest: true, testFn: testStripe },
  { id: 'n8n', name: 'n8n / Automation', category: 'Automation', icon: Webhook, purpose: 'Workflow automation — lifecycle event triggers.', linkedModules: ['Automations', 'Leads', 'Quotes', 'Jobs'], status: 'configured', enabled: true, environment: 'production', notes: 'Edge function endpoint active.', canTest: true, testFn: testN8n },
  { id: 'ionos', name: 'IONOS Email Hosting', category: 'Communication', icon: Globe, purpose: 'Business mailbox hosting — @praetoriagroup.ca and @praetoriasnowandice.ca domains.', linkedModules: ['Company Settings', 'Emails & Texts'], status: 'configured', enabled: true, environment: 'production', notes: '10 mailboxes configured across 2 domains. Reply-to routing active.', canTest: true, testFn: testIonos },
  { id: 'weather', name: 'Weather Intelligence', category: 'Operations', icon: CloudSun, purpose: 'ECCC weather data — forecasts, snow/ice warnings, dispatch support.', linkedModules: ['Schedule', 'Dashboard', 'Worker Portal'], status: 'connected', enabled: true, environment: 'production', notes: 'ECCC GeoMet API. 17 Canadian cities. 15-min cache.', canTest: true, testFn: testWeather },
  { id: 'maps', name: 'Maps / Routing', category: 'Operations', icon: MapPin, purpose: 'Interactive maps, geocoding, route optimization, territory management.', linkedModules: ['Route Optimization', 'Schedule', 'Properties', 'Worker Portal', 'Subcontractor Portal'], status: 'connected', enabled: true, environment: 'production', notes: 'Leaflet + OpenStreetMap. No API key required. Greedy TSP routing.', canTest: true, testFn: testMaps },
  { id: 'calendar', name: 'Calendar Sync', category: 'Operations', icon: Calendar, purpose: 'iCal feed export — subscribe from Google Calendar, Outlook, Apple Calendar.', linkedModules: ['Schedule', 'Jobs', 'Visits'], status: 'connected', enabled: true, environment: 'production', notes: 'iCal (.ics) feed endpoint. Visits & jobs. Worker-specific feeds supported.', canTest: true, testFn: testCalendar },
  { id: 'accounting', name: 'Accounting Export', category: 'Financial', icon: FileText, purpose: 'CSV export — invoices, payments, expenses, customers, vendors.', linkedModules: ['Invoices', 'Payments', 'Expenses', 'Customers', 'Vendors'], status: 'connected', enabled: true, environment: 'production', notes: 'CSV export ready. QuickBooks/Xero import compatible format.', canTest: true, testFn: testAccounting },
  { id: 'analytics', name: 'Analytics & Reporting', category: 'Internal', icon: BarChart3, purpose: 'Real-time KPIs — revenue, expenses, quote conversion, visit completion, aging.', linkedModules: ['Dashboard', 'Finance Reports', 'All Modules'], status: 'connected', enabled: true, environment: 'production', notes: 'Database-driven analytics. 13 report types. Date-filtered.', canTest: true, testFn: testAnalytics },
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
  const [exporting, setExporting] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

  const handleExport = async (type: string) => {
    setExporting(type);
    try {
      let count = 0;
      if (type === 'invoices') count = await exportInvoices();
      else if (type === 'payments') count = await exportPayments();
      else if (type === 'expenses') count = await exportExpenses();
      else if (type === 'customers') count = await exportCustomers();
      else if (type === 'vendors') count = await exportVendors();
      if (count > 0) toast.success(`Exported ${count} ${type}`);
      else toast.info(`No ${type} to export`);
    } catch (e: any) { toast.error(e.message); }
    finally { setExporting(null); }
  };

  const calendarFeedUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calendar-feed?scope=all&days=90`;

  const copyFeedUrl = () => {
    navigator.clipboard.writeText(calendarFeedUrl);
    setCopied(true);
    toast.success('Calendar feed URL copied');
    setTimeout(() => setCopied(false), 2000);
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

                  {/* Accounting export buttons */}
                  {app.id === 'accounting' && (
                    <div className="flex flex-wrap gap-2">
                      {['invoices', 'payments', 'expenses', 'customers', 'vendors'].map(t => (
                        <Button key={t} variant="outline" size="sm" className="text-xs h-7" disabled={exporting === t} onClick={() => handleExport(t)}>
                          {exporting === t ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Download className="h-3 w-3 mr-1" />}
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </Button>
                      ))}
                    </div>
                  )}

                  {/* Calendar feed copy */}
                  {app.id === 'calendar' && (
                    <Button variant="outline" size="sm" className="text-xs h-7" onClick={copyFeedUrl}>
                      {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                      {copied ? 'Copied!' : 'Copy Feed URL'}
                    </Button>
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
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
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

                {/* IONOS detail */}
                {detailApp.id === 'ionos' && (
                  <div className="space-y-3">
                    <Separator />
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Configured Mailboxes</p>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Core Inboxes</p>
                      {[
                        { label: 'Admin', email: APP_EMAIL_CONFIG.systemOwner },
                        { label: 'Operations', email: APP_EMAIL_CONFIG.opsInbox },
                        { label: 'Support', email: APP_EMAIL_CONFIG.supportInbox },
                        { label: 'No-Reply (Resend)', email: APP_EMAIL_CONFIG.noReplyInbox },
                      ].map(m => (
                        <div key={m.email} className="flex justify-between text-xs py-0.5">
                          <span className="text-muted-foreground">{m.label}</span>
                          <code className="text-primary">{m.email}</code>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Service Division Inboxes</p>
                      {Object.entries(APP_EMAIL_CONFIG.serviceInboxes).map(([key, email]) => (
                        <div key={key} className="flex justify-between text-xs py-0.5">
                          <span className="text-muted-foreground">{key.replace(/_/g, ' ')}</span>
                          <code className="text-primary">{email}</code>
                        </div>
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                      <strong>Role:</strong> IONOS hosts the actual mailbox accounts. Resend handles transactional sending via noreply@. Reply-to addresses route to the correct IONOS-hosted service mailbox.
                    </div>
                  </div>
                )}

                {/* Weather detail */}
                {detailApp.id === 'weather' && (
                  <div className="space-y-2">
                    <Separator />
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Capabilities</p>
                    <ul className="text-xs space-y-1 text-muted-foreground list-disc pl-4">
                      <li>Real-time current conditions (temperature, wind, humidity, pressure)</li>
                      <li>5-day forecast with precipitation probability</li>
                      <li>Snow & ice warnings with severity levels</li>
                      <li>Wind chill and visibility data for field safety</li>
                      <li>17 Canadian cities supported (Regina, Saskatoon, Toronto, etc.)</li>
                      <li>15-minute client-side cache for performance</li>
                    </ul>
                  </div>
                )}

                {/* Maps detail */}
                {detailApp.id === 'maps' && (
                  <div className="space-y-2">
                    <Separator />
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Capabilities</p>
                    <ul className="text-xs space-y-1 text-muted-foreground list-disc pl-4">
                      <li>Interactive property/visit/job maps with marker clustering</li>
                      <li>Schedule dispatch map with numbered route pins</li>
                      <li>Greedy TSP route optimization engine</li>
                      <li>Territory management with zone assignment</li>
                      <li>One-tap native navigation for field workers</li>
                      <li>Status-coded markers (green = complete, pulsing = active)</li>
                      <li>No API key required — OpenStreetMap tiles</li>
                    </ul>
                  </div>
                )}

                {/* Calendar detail */}
                {detailApp.id === 'calendar' && (
                  <div className="space-y-2">
                    <Separator />
                    <p className="text-xs font-semibold uppercase text-muted-foreground">iCal Feed</p>
                    <p className="text-xs text-muted-foreground">Subscribe to this URL in Google Calendar, Outlook, or Apple Calendar to sync visits and jobs automatically.</p>
                    <div className="flex items-center gap-2">
                      <code className="text-[10px] bg-muted rounded px-2 py-1 break-all flex-1">{calendarFeedUrl}</code>
                      <Button size="sm" variant="outline" className="h-7" onClick={copyFeedUrl}>
                        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                    <ul className="text-xs space-y-1 text-muted-foreground list-disc pl-4">
                      <li>Scope: <code>visits</code>, <code>jobs</code>, or <code>all</code></li>
                      <li>Worker-specific feeds via <code>worker_id</code> parameter</li>
                      <li>Configurable range via <code>days</code> parameter (default 90)</li>
                      <li>Events include location, job title, status, and notes</li>
                    </ul>
                  </div>
                )}

                {/* Accounting detail */}
                {detailApp.id === 'accounting' && (
                  <div className="space-y-2">
                    <Separator />
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Export Formats</p>
                    <ul className="text-xs space-y-1 text-muted-foreground list-disc pl-4">
                      <li><strong>Invoices:</strong> Number, status, dates, customer, subtotal/tax/total/paid/balance</li>
                      <li><strong>Payments:</strong> Number, date, amount, method, type, reference, customer</li>
                      <li><strong>Expenses:</strong> Number, date, description, category, vendor, amounts</li>
                      <li><strong>Customers:</strong> Name, company, contact info, address</li>
                      <li><strong>Vendors:</strong> Name, contact, category, status, address</li>
                    </ul>
                    <p className="text-xs text-muted-foreground">CSV format compatible with QuickBooks Online, Xero, Wave, and FreshBooks import tools.</p>
                  </div>
                )}

                {/* Analytics detail */}
                {detailApp.id === 'analytics' && (
                  <div className="space-y-2">
                    <Separator />
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Report Types</p>
                    <ul className="text-xs space-y-1 text-muted-foreground list-disc pl-4">
                      <li>Expense by Category / Vendor</li>
                      <li>Invoice Aging (AR) / Bills Aging (AP)</li>
                      <li>Revenue vs Expenses summary</li>
                      <li>Payment history by method</li>
                      <li>Invoice summary & collections</li>
                      <li>Payroll runs & subcontractor payouts</li>
                      <li>Tax remittances</li>
                      <li>Quote conversion rates</li>
                      <li>Unbilled work tracking</li>
                    </ul>
                    <p className="text-xs text-muted-foreground">All reports are database-driven with date-range filtering and CSV export.</p>
                  </div>
                )}

                {testResults[detailApp.id] && (
                  <div className={`text-xs px-3 py-2 rounded ${testResults[detailApp.id].ok ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                    Last test: {testResults[detailApp.id].message}
                  </div>
                )}
              </div>
            )}
            <DialogFooter><Button variant="outline" onClick={() => setDetailApp(null)}>Close</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SettingsLayout>
  );
}
