import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SettingsLayout } from '@/components/SettingsLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Eye, MousePointerClick, Palette, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

type PortalSettingsType = {
  id?: string;
  show_requests: boolean;
  show_quotes: boolean;
  show_invoices: boolean;
  show_jobs: boolean;
  show_visits: boolean;
  show_properties: boolean;
  show_comm_history: boolean;
  show_documents: boolean;
  allow_submit_requests: boolean;
  allow_approve_quotes: boolean;
  allow_decline_quotes: boolean;
  allow_pay_invoices: boolean;
  allow_update_contact: boolean;
  allow_manage_addresses: boolean;
  allow_reschedule: boolean;
  allow_cancel_requests: boolean;
  welcome_message: string;
  support_text: string;
  footer_note: string;
  login_instructions: string;
  invitation_required: boolean;
  self_signup_allowed: boolean;
  inactive_client_blocked: boolean;
  multi_property_enabled: boolean;
};

const DEFAULTS: PortalSettingsType = {
  show_requests: true, show_quotes: true, show_invoices: true, show_jobs: false,
  show_visits: true, show_properties: true, show_comm_history: false, show_documents: false,
  allow_submit_requests: true, allow_approve_quotes: true, allow_decline_quotes: true,
  allow_pay_invoices: false, allow_update_contact: true, allow_manage_addresses: true,
  allow_reschedule: false, allow_cancel_requests: true,
  welcome_message: 'Welcome to your Praetoria Group client portal.',
  support_text: 'Need help? Email ops@praetoriagroup.ca or call (780) 555-0100.',
  footer_note: '', login_instructions: 'Log in with the email address associated with your account.',
  invitation_required: true, self_signup_allowed: false,
  inactive_client_blocked: true, multi_property_enabled: true,
};

export default function PortalSettingsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<PortalSettingsType>(DEFAULTS);
  const [dirty, setDirty] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ['portal_settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('portal_settings').select('*').limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => { if (settings) setForm({ ...DEFAULTS, ...settings }); }, [settings]);

  const set = (key: keyof PortalSettingsType, val: any) => { setForm(prev => ({ ...prev, [key]: val })); setDirty(true); };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { id, ...payload } = form as any;
      if (settings?.id) {
        const { error } = await supabase.from('portal_settings').update(payload).eq('id', settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('portal_settings').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success('Portal settings saved'); setDirty(false); queryClient.invalidateQueries({ queryKey: ['portal_settings'] }); },
    onError: () => toast.error('Failed to save'),
  });

  const SwitchRow = ({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) => (
    <div className="flex items-center justify-between py-2">
      <div><p className="text-sm font-medium">{label}</p><p className="text-xs text-muted-foreground">{desc}</p></div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );

  return (
    <SettingsLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Portal Settings</h1>
            <p className="text-sm text-muted-foreground">Control what customers can see and do in the client portal.</p>
          </div>
          <Button disabled={!dirty || saveMutation.isPending} onClick={() => saveMutation.mutate()}>
            {saveMutation.isPending ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>

        {/* Visibility Controls */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2"><Eye className="h-5 w-5 text-primary" /><CardTitle className="text-base">Portal Visibility</CardTitle></div>
            <CardDescription>What sections customers can see in the portal</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            <SwitchRow label="Requests" desc="Customers can view their service requests" checked={form.show_requests} onChange={v => set('show_requests', v)} />
            <Separator />
            <SwitchRow label="Quotes" desc="Customers can view and review quotes" checked={form.show_quotes} onChange={v => set('show_quotes', v)} />
            <Separator />
            <SwitchRow label="Invoices" desc="Customers can view their invoices" checked={form.show_invoices} onChange={v => set('show_invoices', v)} />
            <Separator />
            <SwitchRow label="Jobs" desc="Customers can view active jobs" checked={form.show_jobs} onChange={v => set('show_jobs', v)} />
            <Separator />
            <SwitchRow label="Visit history" desc="Customers can view past visit records" checked={form.show_visits} onChange={v => set('show_visits', v)} />
            <Separator />
            <SwitchRow label="Properties" desc="Customers can view their service addresses" checked={form.show_properties} onChange={v => set('show_properties', v)} />
            <Separator />
            <SwitchRow label="Communication history" desc="Customers can view message history" checked={form.show_comm_history} onChange={v => set('show_comm_history', v)} />
            <Separator />
            <SwitchRow label="Documents" desc="Customers can view shared documents" checked={form.show_documents} onChange={v => set('show_documents', v)} />
          </CardContent>
        </Card>

        {/* Action Controls */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2"><MousePointerClick className="h-5 w-5 text-primary" /><CardTitle className="text-base">Customer Actions</CardTitle></div>
            <CardDescription>What actions customers can perform in the portal</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            <SwitchRow label="Submit requests" desc="Customers can submit new service requests" checked={form.allow_submit_requests} onChange={v => set('allow_submit_requests', v)} />
            <Separator />
            <SwitchRow label="Approve quotes" desc="Customers can approve quotes" checked={form.allow_approve_quotes} onChange={v => set('allow_approve_quotes', v)} />
            <Separator />
            <SwitchRow label="Decline quotes" desc="Customers can decline quotes" checked={form.allow_decline_quotes} onChange={v => set('allow_decline_quotes', v)} />
            <Separator />
            <SwitchRow label="Pay invoices" desc="Customers can make payments online" checked={form.allow_pay_invoices} onChange={v => set('allow_pay_invoices', v)} />
            <Separator />
            <SwitchRow label="Update contact info" desc="Customers can edit their profile" checked={form.allow_update_contact} onChange={v => set('allow_update_contact', v)} />
            <Separator />
            <SwitchRow label="Manage addresses" desc="Customers can add/edit service addresses" checked={form.allow_manage_addresses} onChange={v => set('allow_manage_addresses', v)} />
            <Separator />
            <SwitchRow label="Reschedule" desc="Customers can request rescheduling" checked={form.allow_reschedule} onChange={v => set('allow_reschedule', v)} />
            <Separator />
            <SwitchRow label="Cancel requests" desc="Customers can cancel their own requests" checked={form.allow_cancel_requests} onChange={v => set('allow_cancel_requests', v)} />
          </CardContent>
        </Card>

        {/* Branding */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2"><Palette className="h-5 w-5 text-primary" /><CardTitle className="text-base">Branding &amp; Experience</CardTitle></div>
            <CardDescription>Customize the portal appearance and messaging</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div><Label className="text-sm">Welcome message</Label><Textarea value={form.welcome_message} onChange={e => set('welcome_message', e.target.value)} rows={2} /></div>
            <div><Label className="text-sm">Support / help text</Label><Textarea value={form.support_text} onChange={e => set('support_text', e.target.value)} rows={2} /></div>
            <div><Label className="text-sm">Footer note</Label><Input value={form.footer_note} onChange={e => set('footer_note', e.target.value)} placeholder="Optional footer message" /></div>
            <div><Label className="text-sm">Login instructions</Label><Textarea value={form.login_instructions} onChange={e => set('login_instructions', e.target.value)} rows={2} /></div>
          </CardContent>
        </Card>

        {/* Access Rules */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /><CardTitle className="text-base">Access Rules</CardTitle></div>
            <CardDescription>Portal access control and client management</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            <SwitchRow label="Invitation required" desc="Clients must be invited to access the portal" checked={form.invitation_required} onChange={v => set('invitation_required', v)} />
            <Separator />
            <SwitchRow label="Self-signup allowed" desc="Allow new clients to register themselves" checked={form.self_signup_allowed} onChange={v => set('self_signup_allowed', v)} />
            <Separator />
            <SwitchRow label="Block inactive clients" desc="Prevent inactive clients from accessing the portal" checked={form.inactive_client_blocked} onChange={v => set('inactive_client_blocked', v)} />
            <Separator />
            <SwitchRow label="Multi-property support" desc="Allow clients to manage multiple service addresses" checked={form.multi_property_enabled} onChange={v => set('multi_property_enabled', v)} />
          </CardContent>
        </Card>

        {dirty && (
          <div className="flex items-center gap-2 text-sm text-amber-600">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            Unsaved changes
          </div>
        )}
      </div>
    </SettingsLayout>
  );
}
