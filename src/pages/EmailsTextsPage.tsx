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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, MessageSquare, Plus, Pencil, Trash2, Send, Settings2 } from 'lucide-react';
import { toast } from 'sonner';

type MessagingSettings = {
  id?: string;
  default_sender_name: string;
  default_sender_email: string;
  reply_to_email: string;
  sms_sender_label: string;
  default_signature: string;
  unsubscribe_footer: string;
  email_enabled: boolean;
  sms_enabled: boolean;
  quote_notification: boolean;
  invoice_notification: boolean;
  job_reminder: boolean;
  overdue_reminder: boolean;
  marketing_enabled: boolean;
  internal_notifications: boolean;
};

const MSG_DEFAULTS: MessagingSettings = {
  default_sender_name: 'Praetoria Group',
  default_sender_email: 'noreply@praetoriagroup.ca',
  reply_to_email: 'ops@praetoriagroup.ca',
  sms_sender_label: 'Praetoria',
  default_signature: '',
  unsubscribe_footer: '',
  email_enabled: true,
  sms_enabled: true,
  quote_notification: true,
  invoice_notification: true,
  job_reminder: true,
  overdue_reminder: true,
  marketing_enabled: false,
  internal_notifications: true,
};

type Template = {
  id: string;
  event: string;
  audience: string;
  channel: string;
  subject_template: string;
  body_template: string;
  is_active: boolean;
};

const EVENTS = [
  'welcome_invite', 'quote_sent', 'quote_approved', 'invoice_sent', 'invoice_overdue',
  'booking_confirmed', 'job_reminder', 'job_completed', 'follow_up', 'custom',
];

const EMPTY_TEMPLATE = {
  event: 'custom' as any,
  audience: 'customer' as any,
  channel: 'email' as any,
  subject_template: '',
  body_template: '',
  is_active: true,
};

const MERGE_TAGS = ['{{customer_name}}', '{{service_type}}', '{{invoice_number}}', '{{quote_number}}', '{{job_date}}', '{{amount}}', '{{company_name}}', '{{portal_link}}'];

export default function EmailsTextsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<MessagingSettings>(MSG_DEFAULTS);
  const [dirty, setDirty] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<typeof EMPTY_TEMPLATE & { id?: string }>(EMPTY_TEMPLATE);

  const { data: settings } = useQuery({
    queryKey: ['messaging_settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('messaging_settings').select('*').limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['notification_templates'],
    queryFn: async () => {
      const { data, error } = await supabase.from('notification_templates').select('*').order('event');
      if (error) throw error;
      return data as Template[];
    },
  });

  const { data: recentLogs = [] } = useQuery({
    queryKey: ['integration_logs_recent'],
    queryFn: async () => {
      const { data, error } = await supabase.from('integration_logs').select('*').in('provider', ['resend', 'twilio']).order('created_at', { ascending: false }).limit(20);
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => { if (settings) setForm({ ...MSG_DEFAULTS, ...settings }); }, [settings]);

  const set = (key: keyof MessagingSettings, val: any) => { setForm(prev => ({ ...prev, [key]: val })); setDirty(true); };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { id, ...payload } = form as any;
      if (settings?.id) {
        const { error } = await supabase.from('messaging_settings').update(payload).eq('id', settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('messaging_settings').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success('Messaging settings saved'); setDirty(false); queryClient.invalidateQueries({ queryKey: ['messaging_settings'] }); },
    onError: () => toast.error('Failed to save'),
  });

  const saveTemplateMutation = useMutation({
    mutationFn: async () => {
      const { id, ...payload } = editTemplate;
      if (id) {
        const { error } = await supabase.from('notification_templates').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('notification_templates').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editTemplate.id ? 'Template updated' : 'Template created');
      setTemplateOpen(false);
      setEditTemplate(EMPTY_TEMPLATE);
      queryClient.invalidateQueries({ queryKey: ['notification_templates'] });
    },
    onError: () => toast.error('Failed to save template'),
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notification_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Template deleted'); queryClient.invalidateQueries({ queryKey: ['notification_templates'] }); },
  });

  const SwitchRow = ({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) => (
    <div className="flex items-center justify-between py-2">
      <div><p className="text-sm font-medium">{label}</p><p className="text-xs text-muted-foreground">{desc}</p></div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );

  const statusBadge = (s: string) => {
    const colors: Record<string, string> = { success: 'default', sent: 'default', failed: 'destructive', error: 'destructive', pending: 'secondary' };
    return <Badge variant={(colors[s] || 'secondary') as any} className="text-xs">{s}</Badge>;
  };

  return (
    <SettingsLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Emails &amp; Text Messages</h1>
            <p className="text-sm text-muted-foreground">Sending defaults, templates, and communication rules.</p>
          </div>
          <Button disabled={!dirty || saveMutation.isPending} onClick={() => saveMutation.mutate()}>
            {saveMutation.isPending ? 'Saving…' : 'Save Settings'}
          </Button>
        </div>

        <Tabs defaultValue="settings" className="space-y-4">
          <TabsList>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="templates">Templates ({templates.length})</TabsTrigger>
            <TabsTrigger value="log">Message Log</TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="space-y-6">
            {/* Sending Defaults */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2"><Send className="h-5 w-5 text-primary" /><CardTitle className="text-base">Sending Defaults</CardTitle></div>
                <CardDescription>Sender identity and reply addresses</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><Label className="text-sm">Sender name</Label><Input value={form.default_sender_name} onChange={e => set('default_sender_name', e.target.value)} /></div>
                  <div><Label className="text-sm">Sender email</Label><Input value={form.default_sender_email} onChange={e => set('default_sender_email', e.target.value)} /></div>
                  <div><Label className="text-sm">Reply-to email</Label><Input value={form.reply_to_email} onChange={e => set('reply_to_email', e.target.value)} /></div>
                  <div><Label className="text-sm">SMS sender label</Label><Input value={form.sms_sender_label} onChange={e => set('sms_sender_label', e.target.value)} /></div>
                </div>
                <div><Label className="text-sm">Default email signature</Label><Textarea value={form.default_signature} onChange={e => set('default_signature', e.target.value)} rows={3} placeholder="Signature appended to emails…" /></div>
                <div><Label className="text-sm">Unsubscribe / footer text</Label><Input value={form.unsubscribe_footer} onChange={e => set('unsubscribe_footer', e.target.value)} placeholder="Optional footer for marketing emails" /></div>
              </CardContent>
            </Card>

            {/* Communication Preferences */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2"><Settings2 className="h-5 w-5 text-primary" /><CardTitle className="text-base">Communication Preferences</CardTitle></div>
                <CardDescription>Which channels and notifications are enabled</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                <SwitchRow label="Email enabled" desc="Send emails to customers" checked={form.email_enabled} onChange={v => set('email_enabled', v)} />
                <Separator />
                <SwitchRow label="SMS enabled" desc="Send text messages to customers" checked={form.sms_enabled} onChange={v => set('sms_enabled', v)} />
                <Separator />
                <SwitchRow label="Quote notifications" desc="Notify customers when quotes are sent" checked={form.quote_notification} onChange={v => set('quote_notification', v)} />
                <Separator />
                <SwitchRow label="Invoice notifications" desc="Notify customers when invoices are sent" checked={form.invoice_notification} onChange={v => set('invoice_notification', v)} />
                <Separator />
                <SwitchRow label="Job reminders" desc="Send reminders before scheduled jobs" checked={form.job_reminder} onChange={v => set('job_reminder', v)} />
                <Separator />
                <SwitchRow label="Overdue reminders" desc="Send reminders for overdue invoices" checked={form.overdue_reminder} onChange={v => set('overdue_reminder', v)} />
                <Separator />
                <SwitchRow label="Marketing messages" desc="Enable promotional communications" checked={form.marketing_enabled} onChange={v => set('marketing_enabled', v)} />
                <Separator />
                <SwitchRow label="Internal notifications" desc="Send internal team notifications" checked={form.internal_notifications} onChange={v => set('internal_notifications', v)} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">Manage message templates for automated communications</p>
              <Dialog open={templateOpen} onOpenChange={v => { setTemplateOpen(v); if (!v) setEditTemplate(EMPTY_TEMPLATE); }}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Template</Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader><DialogTitle>{editTemplate.id ? 'Edit Template' : 'New Template'}</DialogTitle></DialogHeader>
                  <ScrollArea className="max-h-[70vh]">
                    <div className="space-y-4 pr-2">
                      <div className="grid gap-4 grid-cols-2">
                        <div>
                          <Label>Event</Label>
                          <Select value={editTemplate.event} onValueChange={v => setEditTemplate(p => ({ ...p, event: v as any }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{EVENTS.map(e => <SelectItem key={e} value={e} className="capitalize">{e.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Channel</Label>
                          <Select value={editTemplate.channel} onValueChange={v => setEditTemplate(p => ({ ...p, channel: v as any }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="sms">SMS</SelectItem>
                              <SelectItem value="in_app">In-App</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label>Audience</Label>
                        <Select value={editTemplate.audience} onValueChange={v => setEditTemplate(p => ({ ...p, audience: v as any }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="customer">Customer</SelectItem>
                            <SelectItem value="staff">Staff</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {editTemplate.channel !== 'sms' && (
                        <div><Label>Subject</Label><Input value={editTemplate.subject_template} onChange={e => setEditTemplate(p => ({ ...p, subject_template: e.target.value }))} placeholder="Email subject line" /></div>
                      )}
                      <div><Label>Body</Label><Textarea value={editTemplate.body_template} onChange={e => setEditTemplate(p => ({ ...p, body_template: e.target.value }))} rows={6} placeholder="Message body…" /></div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Available merge tags:</p>
                        <div className="flex flex-wrap gap-1">
                          {MERGE_TAGS.map(tag => <Badge key={tag} variant="outline" className="text-xs cursor-pointer" onClick={() => setEditTemplate(p => ({ ...p, body_template: p.body_template + ' ' + tag }))}>{tag}</Badge>)}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Active</Label>
                        <Switch checked={editTemplate.is_active} onCheckedChange={v => setEditTemplate(p => ({ ...p, is_active: v }))} />
                      </div>
                      <Button className="w-full" disabled={!editTemplate.body_template || saveTemplateMutation.isPending} onClick={() => saveTemplateMutation.mutate()}>
                        {saveTemplateMutation.isPending ? 'Saving…' : editTemplate.id ? 'Update' : 'Create Template'}
                      </Button>
                    </div>
                  </ScrollArea>
                </DialogContent>
              </Dialog>
            </div>

            {templates.length === 0 ? (
              <Card><CardContent className="text-center py-12 text-muted-foreground">
                <Mail className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No templates yet. Create your first message template.</p>
              </CardContent></Card>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead>Audience</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-20" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.map(t => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium text-sm capitalize">{t.event.replace(/_/g, ' ')}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs capitalize">{t.channel}</Badge></TableCell>
                        <TableCell className="text-sm capitalize">{t.audience}</TableCell>
                        <TableCell className="text-sm text-muted-foreground truncate max-w-[200px]">{t.subject_template || '—'}</TableCell>
                        <TableCell><Badge variant={t.is_active ? 'default' : 'secondary'} className="text-xs">{t.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditTemplate({ ...t }); setTemplateOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteTemplateMutation.mutate(t.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="log" className="space-y-4">
            <p className="text-sm text-muted-foreground">Recent email and SMS delivery activity</p>
            {recentLogs.length === 0 ? (
              <Card><CardContent className="text-center py-12 text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No message activity yet</p>
              </CardContent></Card>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentLogs.map((l: any) => (
                      <TableRow key={l.id}>
                        <TableCell className="text-sm">{l.event_name}</TableCell>
                        <TableCell className="text-sm capitalize">{l.provider}</TableCell>
                        <TableCell className="text-sm text-muted-foreground truncate max-w-[180px]">{l.recipient || '—'}</TableCell>
                        <TableCell>{statusBadge(l.status)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {dirty && (
          <div className="flex items-center gap-2 text-sm text-amber-600">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            Unsaved settings changes
          </div>
        )}
      </div>
    </SettingsLayout>
  );
}
