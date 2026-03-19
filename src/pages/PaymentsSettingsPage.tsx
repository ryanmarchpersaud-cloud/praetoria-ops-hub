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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Save, Loader2, CreditCard, Banknote, Receipt, ArrowRight, Plug } from 'lucide-react';
import { toast } from 'sonner';

type PaymentSettings = Record<string, any>;

const TERMS_OPTIONS = ['Due on Receipt', 'Net 7', 'Net 15', 'Net 30', 'Net 45', 'Net 60', 'Custom'];

export default function PaymentsSettingsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<PaymentSettings>({});
  const [dirty, setDirty] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['payment_settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('payment_settings').select('*').limit(1).maybeSingle();
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
        const { error } = await supabase.from('payment_settings').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('payment_settings').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Payment settings saved');
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ['payment_settings'] });
    },
    onError: (err: any) => toast.error(err.message || 'Failed to save'),
  });

  const Toggle = ({ label, field, desc }: { label: string; field: string; desc?: string }) => (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
      </div>
      <Switch checked={!!form[field]} onCheckedChange={v => update(field, v)} />
    </div>
  );

  const Field = ({ label, field, type = 'text', placeholder = '' }: { label: string; field: string; type?: string; placeholder?: string }) => (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {type === 'textarea' ? (
        <Textarea value={form[field] || ''} onChange={e => update(field, e.target.value)} placeholder={placeholder} rows={3} />
      ) : (
        <Input type={type} value={form[field] ?? ''} onChange={e => update(field, e.target.value)} placeholder={placeholder} />
      )}
    </div>
  );

  if (isLoading) return <SettingsLayout><div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div></SettingsLayout>;

  return (
    <SettingsLayout>
      <div className="space-y-6 animate-fade-in max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Payments</h1>
            <p className="text-sm text-muted-foreground">Configure payment methods, terms, taxes, and billing defaults</p>
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

        {/* Payment Methods */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Banknote className="h-4 w-4" />Payment Methods</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4 space-y-3">
                <Toggle label="Cash" field="cash_enabled" />
                {form.cash_enabled && <Field label="Cash Instructions" field="cash_instructions" type="textarea" placeholder="Exact change preferred..." />}
              </div>
              <div className="border rounded-lg p-4 space-y-3">
                <Toggle label="E-Transfer" field="etransfer_enabled" />
                {form.etransfer_enabled && <Field label="E-Transfer Instructions" field="etransfer_instructions" type="textarea" placeholder="Send to billing@praetoriagroup.ca..." />}
              </div>
              <div className="border rounded-lg p-4 space-y-3">
                <Toggle label="Credit Card" field="credit_card_enabled" />
                {form.credit_card_enabled && <Field label="Credit Card Instructions" field="credit_card_instructions" type="textarea" placeholder="Processed via Stripe..." />}
              </div>
              <div className="border rounded-lg p-4 space-y-3">
                <Toggle label="Cheque" field="cheque_enabled" />
                {form.cheque_enabled && <Field label="Cheque Instructions" field="cheque_instructions" type="textarea" placeholder="Make payable to Praetoria Group Inc..." />}
              </div>
            </div>
            <Separator />
            <div className="border rounded-lg p-4 space-y-3">
              <Toggle label={form.other_method_name || 'Other Payment Method'} field="other_method_enabled" />
              {form.other_method_enabled && (
                <>
                  <Field label="Method Name" field="other_method_name" placeholder="e.g. Bitcoin, Wire Transfer" />
                  <Field label="Instructions" field="other_method_instructions" type="textarea" />
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payment Terms */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Receipt className="h-4 w-4" />Payment Terms & Deposits</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Default Payment Terms</Label>
                <Select value={form.default_payment_terms || 'Net 30'} onValueChange={v => update('default_payment_terms', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TERMS_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {form.default_payment_terms === 'Custom' && (
                <Field label="Custom Terms (Days)" field="custom_terms_days" type="number" placeholder="30" />
              )}
            </div>
            <Separator />
            <Toggle label="Late Fee" field="late_fee_enabled" desc="Charge a fee on overdue invoices" />
            {form.late_fee_enabled && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Late Fee Type</Label>
                  <Select value={form.late_fee_type || 'percentage'} onValueChange={v => update('late_fee_type', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="flat">Flat Amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Field label={form.late_fee_type === 'percentage' ? 'Late Fee (%)' : 'Late Fee ($)'} field="late_fee_value" type="number" />
              </div>
            )}
            <Separator />
            <Toggle label="Deposit Required" field="deposit_required" desc="Require an upfront deposit on new quotes/jobs" />
            {form.deposit_required && (
              <Field label="Default Deposit (%)" field="default_deposit_percentage" type="number" placeholder="50" />
            )}
            <Toggle label="Partial Payment Allowed" field="partial_payment_allowed" desc="Allow customers to pay invoices in installments" />
          </CardContent>
        </Card>

        {/* Tax Settings */}
        <Card>
          <CardHeader><CardTitle className="text-base">Tax Settings</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Toggle label="Tax Enabled" field="tax_enabled" desc="Apply tax to taxable items by default" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Tax Label 1" field="tax_label_1" placeholder="GST" />
              <Field label="Tax Rate 1" field="tax_rate_1" type="number" placeholder="0.05" />
              <Field label="Tax Label 2 (optional)" field="tax_label_2" placeholder="PST" />
              <Field label="Tax Rate 2 (optional)" field="tax_rate_2" type="number" placeholder="0" />
            </div>
          </CardContent>
        </Card>

        {/* Invoice & Collection Settings */}
        <Card>
          <CardHeader><CardTitle className="text-base">Invoice & Collection</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Toggle label="Auto-Mark Invoices as Sent" field="auto_mark_sent" desc="Automatically set invoice status to Sent when emailed" />
            <Toggle label="Manual Reminders Only" field="manual_reminders_only" desc="Only send payment reminders when triggered manually" />
            <Field label="Overdue Reminder Schedule (days)" field="overdue_reminder_days" placeholder="7,14,30" />
            <Field label="Invoice Footer / Payment Instructions" field="invoice_footer_text" type="textarea" placeholder="Payment instructions shown on invoices..." />
          </CardContent>
        </Card>

        {/* Provider Readiness */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Plug className="h-4 w-4" />Payment Provider</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Stripe</p>
                  <p className="text-xs text-muted-foreground">Online card payments and checkout sessions</p>
                </div>
              </div>
              <Badge variant="outline">
                {form.stripe_mode === 'live' ? 'Live' : 'Test Mode'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Stripe connection is managed in Settings → Connected Apps. Current mode: <span className="font-medium">{form.stripe_mode === 'live' ? 'Live' : 'Test'}</span>.
            </p>
          </CardContent>
        </Card>
      </div>
    </SettingsLayout>
  );
}
