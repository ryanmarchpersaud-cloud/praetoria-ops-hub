import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SettingsLayout } from '@/components/SettingsLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Users, UserCheck, Eye, ShieldCheck, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

type ClientHubSettings = {
  id?: string;
  default_customer_types: string[];
  default_tags: string[];
  default_contact_method: string;
  separate_billing_address: boolean;
  vip_flag_enabled: boolean;
  do_not_contact_enabled: boolean;
  require_email: boolean;
  require_phone: boolean;
  require_address: boolean;
  require_postal_code: boolean;
  duplicate_detection_enabled: boolean;
  portal_invitation_auto: boolean;
  comm_history_visible_to: string;
  client_notes_editable_by: string;
  comm_prefs_editable_by: string;
};

const DEFAULTS: ClientHubSettings = {
  default_customer_types: ['Residential', 'Commercial', 'Property Manager', 'HOA / Condo Board', 'Government / Municipal'],
  default_tags: ['VIP', 'Priority', 'Seasonal', 'Recurring', 'New'],
  default_contact_method: 'email',
  separate_billing_address: false,
  vip_flag_enabled: true,
  do_not_contact_enabled: true,
  require_email: true,
  require_phone: true,
  require_address: true,
  require_postal_code: false,
  duplicate_detection_enabled: false,
  portal_invitation_auto: false,
  comm_history_visible_to: 'admin_only',
  client_notes_editable_by: 'admin_manager',
  comm_prefs_editable_by: 'admin_manager',
};

export default function ClientHubPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ClientHubSettings>(DEFAULTS);
  const [dirty, setDirty] = useState(false);
  const [newType, setNewType] = useState('');
  const [newTag, setNewTag] = useState('');

  const { data: settings } = useQuery({
    queryKey: ['client_hub_settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('client_hub_settings').select('*').limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (settings) {
      setForm({
        ...DEFAULTS,
        ...settings,
        default_customer_types: Array.isArray(settings.default_customer_types) ? settings.default_customer_types as string[] : DEFAULTS.default_customer_types,
        default_tags: Array.isArray(settings.default_tags) ? settings.default_tags as string[] : DEFAULTS.default_tags,
      });
    }
  }, [settings]);

  const set = (key: keyof ClientHubSettings, val: any) => { setForm(prev => ({ ...prev, [key]: val })); setDirty(true); };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { id, ...payload } = form as any;
      if (settings?.id) {
        const { error } = await supabase.from('client_hub_settings').update(payload).eq('id', settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('client_hub_settings').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success('Client Hub settings saved'); setDirty(false); queryClient.invalidateQueries({ queryKey: ['client_hub_settings'] }); },
    onError: () => toast.error('Failed to save'),
  });

  const addType = () => {
    if (newType.trim() && !form.default_customer_types.includes(newType.trim())) {
      set('default_customer_types', [...form.default_customer_types, newType.trim()]);
      setNewType('');
    }
  };
  const removeType = (t: string) => set('default_customer_types', form.default_customer_types.filter(x => x !== t));
  const addTag = () => {
    if (newTag.trim() && !form.default_tags.includes(newTag.trim())) {
      set('default_tags', [...form.default_tags, newTag.trim()]);
      setNewTag('');
    }
  };
  const removeTag = (t: string) => set('default_tags', form.default_tags.filter(x => x !== t));

  const SwitchRow = ({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) => (
    <div className="flex items-center justify-between py-2">
      <div><p className="text-sm font-medium">{label}</p><p className="text-xs text-muted-foreground">{desc}</p></div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );

  const VISIBILITY_OPTIONS = [
    { value: 'admin_only', label: 'Admins only' },
    { value: 'admin_manager', label: 'Admins & Managers' },
    { value: 'all_staff', label: 'All staff' },
  ];

  return (
    <SettingsLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Client Hub</h1>
            <p className="text-sm text-muted-foreground">Client profile defaults, relationship settings, and record rules.</p>
          </div>
          <Button disabled={!dirty || saveMutation.isPending} onClick={() => saveMutation.mutate()}>
            {saveMutation.isPending ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>

        {/* Client Profile Defaults */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /><CardTitle className="text-base">Client Profile Defaults</CardTitle></div>
            <CardDescription>Default customer types, tags, and communication preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm">Customer types</Label>
              <div className="flex flex-wrap gap-1.5 mt-1 mb-2">
                {form.default_customer_types.map(t => (
                  <Badge key={t} variant="secondary" className="gap-1">
                    {t}
                    <button onClick={() => removeType(t)} className="ml-0.5 hover:text-destructive"><X className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input value={newType} onChange={e => setNewType(e.target.value)} placeholder="Add customer type…" className="max-w-xs" onKeyDown={e => e.key === 'Enter' && addType()} />
                <Button size="sm" variant="outline" onClick={addType}><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
            <Separator />
            <div>
              <Label className="text-sm">Client tags / segmentation</Label>
              <div className="flex flex-wrap gap-1.5 mt-1 mb-2">
                {form.default_tags.map(t => (
                  <Badge key={t} variant="outline" className="gap-1">
                    {t}
                    <button onClick={() => removeTag(t)} className="ml-0.5 hover:text-destructive"><X className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="Add tag…" className="max-w-xs" onKeyDown={e => e.key === 'Enter' && addTag()} />
                <Button size="sm" variant="outline" onClick={addTag}><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
            <Separator />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-sm">Default contact method</Label>
                <Select value={form.default_contact_method} onValueChange={v => set('default_contact_method', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <SwitchRow label="Separate billing address" desc="Allow a billing address different from service address" checked={form.separate_billing_address} onChange={v => set('separate_billing_address', v)} />
          </CardContent>
        </Card>

        {/* Relationship Settings */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2"><UserCheck className="h-5 w-5 text-primary" /><CardTitle className="text-base">Relationship Settings</CardTitle></div>
            <CardDescription>Customer flags and relationship tracking features</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            <SwitchRow label="VIP / priority client flag" desc="Enable VIP flagging on customer records" checked={form.vip_flag_enabled} onChange={v => set('vip_flag_enabled', v)} />
            <Separator />
            <SwitchRow label="Do-not-contact flag" desc="Allow marking clients as do-not-contact" checked={form.do_not_contact_enabled} onChange={v => set('do_not_contact_enabled', v)} />
          </CardContent>
        </Card>

        {/* Client Record Rules */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /><CardTitle className="text-base">Client Record Rules</CardTitle></div>
            <CardDescription>Required fields and record management</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            <SwitchRow label="Email required" desc="Email is required when creating a client" checked={form.require_email} onChange={v => set('require_email', v)} />
            <Separator />
            <SwitchRow label="Phone required" desc="Phone number is required" checked={form.require_phone} onChange={v => set('require_phone', v)} />
            <Separator />
            <SwitchRow label="Address required" desc="Service address is required" checked={form.require_address} onChange={v => set('require_address', v)} />
            <Separator />
            <SwitchRow label="Postal code required" desc="Postal/zip code is required" checked={form.require_postal_code} onChange={v => set('require_postal_code', v)} />
            <Separator />
            <SwitchRow label="Duplicate detection" desc="Warn when creating clients with similar info" checked={form.duplicate_detection_enabled} onChange={v => set('duplicate_detection_enabled', v)} />
            <Separator />
            <SwitchRow label="Auto-send portal invitation" desc="Automatically invite new clients to the portal" checked={form.portal_invitation_auto} onChange={v => set('portal_invitation_auto', v)} />
          </CardContent>
        </Card>

        {/* Visibility Controls */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2"><Eye className="h-5 w-5 text-primary" /><CardTitle className="text-base">Internal Visibility Controls</CardTitle></div>
            <CardDescription>Who can view and edit client data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { key: 'comm_history_visible_to' as const, label: 'Communication history visible to' },
              { key: 'client_notes_editable_by' as const, label: 'Client notes editable by' },
              { key: 'comm_prefs_editable_by' as const, label: 'Communication preferences editable by' },
            ].map(item => (
              <div key={item.key}>
                <Label className="text-sm">{item.label}</Label>
                <Select value={form[item.key]} onValueChange={v => set(item.key, v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VISIBILITY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
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
