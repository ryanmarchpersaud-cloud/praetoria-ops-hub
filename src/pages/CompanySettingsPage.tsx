import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SettingsLayout } from '@/components/SettingsLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Building2, Palette, Settings, FileText, MapPinned, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type CompanySettings = Record<string, any>;

function Field({ label, field, type = 'text', placeholder = '', value, onChange }: {
  label: string; field: string; type?: string; placeholder?: string;
  value: string; onChange: (field: string, value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {type === 'textarea' ? (
        <Textarea value={value} onChange={e => onChange(field, e.target.value)} placeholder={placeholder} rows={3} />
      ) : (
        <Input type={type} value={value} onChange={e => onChange(field, e.target.value)} placeholder={placeholder} />
      )}
    </div>
  );
}

function Toggle({ label, field, desc, checked, onChange }: {
  label: string; field: string; desc?: string;
  checked: boolean; onChange: (field: string, value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={v => onChange(field, v)} />
    </div>
  );
}

const TIMEZONES = [
  'America/Edmonton', 'America/Vancouver', 'America/Toronto', 'America/Winnipeg',
  'America/Halifax', 'America/St_Johns', 'America/New_York', 'America/Chicago',
  'America/Denver', 'America/Los_Angeles', 'UTC',
];
const CURRENCIES = ['CAD', 'USD'];
const DATE_FORMATS = ['YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY'];
const PAYMENT_TERMS = ['Due on Receipt', 'Net 7', 'Net 15', 'Net 30', 'Net 45', 'Net 60'];

export default function CompanySettingsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CompanySettings>({});
  const [dirty, setDirty] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['company_settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('company_settings').select('*').limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (data) { setForm(data); setDirty(false); }
  }, [data]);

  const update = (key: string, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { id, created_at, updated_at, ...payload } = form;
      if (id) {
        const { error } = await supabase.from('company_settings').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('company_settings').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Company settings saved');
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ['company_settings'] });
    },
    onError: (err: any) => toast.error(err.message || 'Failed to save'),
  });

  const Field = ({ label, field, type = 'text', placeholder = '' }: { label: string; field: string; type?: string; placeholder?: string }) => (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {type === 'textarea' ? (
        <Textarea value={form[field] || ''} onChange={e => update(field, e.target.value)} placeholder={placeholder} rows={3} />
      ) : (
        <Input type={type} value={form[field] || ''} onChange={e => update(field, e.target.value)} placeholder={placeholder} />
      )}
    </div>
  );

  const Toggle = ({ label, field, desc }: { label: string; field: string; desc?: string }) => (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
      </div>
      <Switch checked={!!form[field]} onCheckedChange={v => update(field, v)} />
    </div>
  );

  if (isLoading) return <SettingsLayout><div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div></SettingsLayout>;

  return (
    <SettingsLayout>
      <div className="space-y-6 animate-fade-in max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Company Settings</h1>
            <p className="text-sm text-muted-foreground">Manage your organization profile, branding, and operational defaults</p>
          </div>
          <Button onClick={() => saveMutation.mutate()} disabled={!dirty || saveMutation.isPending}>
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Changes
          </Button>
        </div>

        {dirty && (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700">
            You have unsaved changes.
          </div>
        )}

        <Tabs defaultValue="identity" className="space-y-4">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="identity" className="gap-1.5"><Building2 className="h-3.5 w-3.5" />Identity</TabsTrigger>
            <TabsTrigger value="brand" className="gap-1.5"><Palette className="h-3.5 w-3.5" />Brand</TabsTrigger>
            <TabsTrigger value="operations" className="gap-1.5"><Settings className="h-3.5 w-3.5" />Operations</TabsTrigger>
            <TabsTrigger value="documents" className="gap-1.5"><FileText className="h-3.5 w-3.5" />Documents</TabsTrigger>
            <TabsTrigger value="regions" className="gap-1.5"><MapPinned className="h-3.5 w-3.5" />Regions</TabsTrigger>
          </TabsList>

          <TabsContent value="identity">
            <Card>
              <CardHeader><CardTitle className="text-base">Business Identity</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Legal Company Name" field="legal_name" placeholder="Praetoria Group Inc." />
                  <Field label="Operating Name" field="operating_name" placeholder="Praetoria Snow & Ice" />
                  <Field label="Display Name" field="display_name" placeholder="Praetoria" />
                  <Field label="Business Number" field="business_number" placeholder="123456789RC0001" />
                  <Field label="GST Number" field="gst_number" placeholder="123456789RT0001" />
                  <Field label="PST Number" field="pst_number" />
                </div>
                <Field label="Company Description" field="description" type="textarea" placeholder="A brief description of your company..." />
                <Separator />
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Contact</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Phone" field="phone" type="tel" placeholder="+1 (780) 555-0100" />
                  <Field label="Email" field="email" type="email" placeholder="info@praetoriagroup.ca" />
                  <Field label="Website" field="website" type="url" placeholder="https://praetoriagroup.ca" />
                  <Field label="Support Email" field="support_email" type="email" />
                  <Field label="Billing Email" field="billing_email" type="email" />
                </div>
                <Separator />
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Addresses</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Physical Address" field="physical_address" type="textarea" placeholder="123 Main St, Edmonton, AB T5A 0A1" />
                  <Field label="Mailing Address" field="mailing_address" type="textarea" placeholder="Same as physical or PO Box..." />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="brand">
            <Card>
              <CardHeader><CardTitle className="text-base">Brand & Presentation</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Primary Brand Color</Label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={form.primary_color || '#1e3a5f'} onChange={e => update('primary_color', e.target.value)} className="h-10 w-10 rounded border cursor-pointer" />
                      <Input value={form.primary_color || ''} onChange={e => update('primary_color', e.target.value)} className="flex-1" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Secondary Color</Label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={form.secondary_color || '#2563eb'} onChange={e => update('secondary_color', e.target.value)} className="h-10 w-10 rounded border cursor-pointer" />
                      <Input value={form.secondary_color || ''} onChange={e => update('secondary_color', e.target.value)} className="flex-1" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Accent Color</Label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={form.accent_color || '#f59e0b'} onChange={e => update('accent_color', e.target.value)} className="h-10 w-10 rounded border cursor-pointer" />
                      <Input value={form.accent_color || ''} onChange={e => update('accent_color', e.target.value)} className="flex-1" />
                    </div>
                  </div>
                </div>
                <Separator />
                <Field label="Invoice Header Name" field="invoice_header_name" placeholder="Praetoria Snow & Ice Management" />
                <Field label="Quote Footer Text" field="quote_footer_text" type="textarea" placeholder="Thank you for choosing Praetoria..." />
                <Field label="Default Email Signature" field="email_signature" type="textarea" placeholder="Best regards,\nPraetoria Group" />
                <Field label="Internal Brand Notes" field="brand_notes" type="textarea" placeholder="Guidelines for logo use, voice & tone..." />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="operations">
            <Card>
              <CardHeader><CardTitle className="text-base">Business Operations Defaults</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Default Timezone</Label>
                    <Select value={form.default_timezone || 'America/Edmonton'} onValueChange={v => update('default_timezone', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{TIMEZONES.map(t => <SelectItem key={t} value={t}>{t.replace('America/', '').replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Currency</Label>
                    <Select value={form.currency || 'CAD'} onValueChange={v => update('currency', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Date Format</Label>
                    <Select value={form.date_format || 'YYYY-MM-DD'} onValueChange={v => update('date_format', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{DATE_FORMATS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <Separator />
                <Field label="Default Service Area / Region" field="default_service_area" placeholder="Greater Edmonton Area" />
                <Field label="Operating Hours" field="operating_hours" placeholder="7:00 AM - 6:00 PM" />
                <Toggle label="After-Hours Service" field="after_hours_enabled" desc="Allow scheduling outside operating hours" />
                <Toggle label="Weekend Service" field="weekend_service_enabled" desc="Enable weekend service availability" />
                <Toggle label="Emergency Service" field="emergency_service_enabled" desc="Enable emergency/urgent service requests" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents">
            <Card>
              <CardHeader><CardTitle className="text-base">Document & Financial Defaults</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Numbering Prefixes</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Field label="Quote Prefix" field="quote_prefix" placeholder="PQ" />
                  <Field label="Invoice Prefix" field="invoice_prefix" placeholder="INV" />
                  <Field label="Request Prefix" field="request_prefix" placeholder="SR" />
                  <Field label="Job Prefix" field="job_prefix" placeholder="PJ" />
                </div>
                <Separator />
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Payment Defaults</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Default Payment Terms</Label>
                    <Select value={form.default_payment_terms || 'Net 30'} onValueChange={v => update('default_payment_terms', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{PAYMENT_TERMS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <Field label="Default Due Days" field="default_due_days" type="number" placeholder="30" />
                </div>
                <Toggle label="Deposit Required by Default" field="deposit_required" desc="Require deposits on new quotes" />
                <Toggle label="Tax Enabled by Default" field="default_tax_enabled" desc="Apply tax to new items by default" />
                <Field label="Default Tax Rate" field="default_tax_rate" type="number" placeholder="0.05" />
                <Toggle label="Internal Notes Visible by Default" field="internal_notes_visible_default" desc="Show internal notes to staff on new records" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="regions">
            <Card>
              <CardHeader><CardTitle className="text-base">Multi-Location & Service Area</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <Field label="Default Service Area" field="default_service_area" placeholder="Greater Edmonton Area" />
                <div className="rounded-lg border border-dashed border-muted-foreground/20 p-6 text-center">
                  <MapPinned className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">Multi-location and dispatch region management is planned for a future update.</p>
                  <p className="text-xs text-muted-foreground mt-1">You can currently set your primary service area above.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </SettingsLayout>
  );
}
