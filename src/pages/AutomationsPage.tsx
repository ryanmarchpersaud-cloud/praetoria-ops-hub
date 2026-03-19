import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { SettingsLayout } from '@/components/SettingsLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Zap, Plus, Pencil, Trash2, Search, Loader2, Activity, CheckCircle2, XCircle, Clock, PlayCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const TRIGGER_EVENTS = [
  'request.submitted', 'quote.created', 'quote.approved', 'quote.sent',
  'invoice.created', 'invoice.overdue', 'invoice.paid',
  'job.created', 'job.scheduled', 'job.completed',
  'visit.completed', 'visit.missed',
  'worker.assigned', 'customer.created',
  'expense.added', 'lead.created', 'lead.converted',
];

const ACTION_TYPES = [
  'send_notification', 'send_email', 'send_sms', 'create_task',
  'change_status', 'assign_owner', 'create_reminder', 'create_job_from_quote',
  'escalate', 'log_activity',
];

const CATEGORIES = ['General', 'Billing', 'Operations', 'Communication', 'Compliance', 'Sales'];

type Rule = Record<string, any>;
type Log = Record<string, any>;

export default function AutomationsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', description: '', enabled: true, category: 'General',
    trigger_event: 'request.submitted', actions: '[]', scope: 'all', priority: '0',
  });

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['automation_rules'],
    queryFn: async () => {
      const { data, error } = await supabase.from('automation_rules').select('*').order('priority', { ascending: true }).order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['automation_logs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('automation_logs').select('*').order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      let parsedActions: any[] = [];
      try { parsedActions = JSON.parse(form.actions); } catch { parsedActions = []; }
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        enabled: form.enabled,
        category: form.category,
        trigger_event: form.trigger_event,
        actions: parsedActions,
        scope: form.scope,
        priority: parseInt(form.priority) || 0,
        created_by: user?.id || null,
      };
      if (editingId) {
        const { error } = await supabase.from('automation_rules').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('automation_rules').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? 'Rule updated' : 'Rule created');
      setDialogOpen(false); setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ['automation_rules'] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('automation_rules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Rule deleted');
      queryClient.invalidateQueries({ queryKey: ['automation_rules'] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase.from('automation_rules').update({ enabled }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation_rules'] });
      toast.success('Rule toggled');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const openEdit = (r: Rule) => {
    setEditingId(r.id);
    setForm({
      name: r.name, description: r.description || '', enabled: r.enabled,
      category: r.category || 'General', trigger_event: r.trigger_event,
      actions: JSON.stringify(r.actions || [], null, 2), scope: r.scope || 'all',
      priority: String(r.priority || 0),
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({
      name: '', description: '', enabled: true, category: 'General',
      trigger_event: 'request.submitted', actions: '[]', scope: 'all', priority: '0',
    });
    setDialogOpen(true);
  };

  const activeCount = rules.filter((r: Rule) => r.enabled).length;
  const totalTriggers = rules.reduce((s: number, r: Rule) => s + (r.trigger_count || 0), 0);

  return (
    <SettingsLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Automations</h1>
            <p className="text-sm text-muted-foreground">Configure triggers, actions, and workflow rules</p>
          </div>
          <Button size="sm" onClick={resetForm}>
            <Plus className="h-4 w-4 mr-1" />New Rule
          </Button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total Rules</p>
            <p className="text-2xl font-bold text-foreground">{rules.length}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Active</p>
            <p className="text-2xl font-bold text-green-600">{activeCount}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total Triggers</p>
            <p className="text-2xl font-bold text-foreground">{totalTriggers}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Log Entries</p>
            <p className="text-2xl font-bold text-foreground">{logs.length}</p>
          </CardContent></Card>
        </div>

        <Tabs defaultValue="rules" className="space-y-4">
          <TabsList>
            <TabsTrigger value="rules" className="gap-1.5"><Zap className="h-3.5 w-3.5" />Rules</TabsTrigger>
            <TabsTrigger value="log" className="gap-1.5"><Activity className="h-3.5 w-3.5" />Activity Log</TabsTrigger>
          </TabsList>

          <TabsContent value="rules">
            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : rules.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Zap className="h-10 w-10 text-muted-foreground/40 mb-3" />
                    <p className="font-medium text-foreground">No automation rules</p>
                    <p className="text-sm text-muted-foreground mb-4">Create your first automation rule to streamline operations.</p>
                    <Button size="sm" onClick={resetForm}><Plus className="h-4 w-4 mr-1" />Create Rule</Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Trigger</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Fired</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rules.map((r: Rule) => (
                        <TableRow key={r.id}>
                          <TableCell>
                            <Switch checked={r.enabled} onCheckedChange={v => toggleMutation.mutate({ id: r.id, enabled: v })} />
                          </TableCell>
                          <TableCell>
                            <p className="text-sm font-medium">{r.name}</p>
                            {r.description && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{r.description}</p>}
                          </TableCell>
                          <TableCell><Badge variant="outline" className="text-xs font-mono">{r.trigger_event}</Badge></TableCell>
                          <TableCell><Badge variant="secondary" className="text-xs">{r.category}</Badge></TableCell>
                          <TableCell className="text-right text-sm">{r.trigger_count || 0}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(r.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="log">
            <Card>
              <CardContent className="p-0">
                {logs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Activity className="h-10 w-10 text-muted-foreground/40 mb-3" />
                    <p className="font-medium text-foreground">No activity yet</p>
                    <p className="text-sm text-muted-foreground">Automation activity will appear here as rules fire.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Rule</TableHead>
                        <TableHead>Event</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((l: Log) => (
                        <TableRow key={l.id}>
                          <TableCell>
                            {l.status === 'success' ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : l.status === 'failed' ? (
                              <XCircle className="h-4 w-4 text-destructive" />
                            ) : (
                              <Clock className="h-4 w-4 text-amber-500" />
                            )}
                          </TableCell>
                          <TableCell className="text-sm font-medium">{l.rule_name}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs font-mono">{l.trigger_event}</Badge></TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{l.message || '—'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{format(new Date(l.created_at), 'MMM d, HH:mm')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Rule Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Automation Rule' : 'New Automation Rule'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Rule Name *</Label>
                <Input value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g. Notify admin on new request" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Description</Label>
                <Textarea value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} placeholder="What does this rule do?" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Trigger Event *</Label>
                  <Select value={form.trigger_event} onValueChange={v => setForm(prev => ({ ...prev, trigger_event: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TRIGGER_EVENTS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Category</Label>
                  <Select value={form.category} onValueChange={v => setForm(prev => ({ ...prev, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Scope</Label>
                  <Input value={form.scope} onChange={e => setForm(prev => ({ ...prev, scope: e.target.value }))} placeholder="all" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Priority</Label>
                  <Input type="number" value={form.priority} onChange={e => setForm(prev => ({ ...prev, priority: e.target.value }))} placeholder="0" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Actions (JSON)</Label>
                <Textarea value={form.actions} onChange={e => setForm(prev => ({ ...prev, actions: e.target.value }))} rows={4} className="font-mono text-xs" placeholder='[{"type": "send_notification", "target": "admin"}]' />
                <p className="text-[10px] text-muted-foreground">
                  Available types: {ACTION_TYPES.join(', ')}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch checked={form.enabled} onCheckedChange={v => setForm(prev => ({ ...prev, enabled: v }))} />
                  <Label className="text-sm">Enabled</Label>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.name.trim()}>
                  {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  {editingId ? 'Update Rule' : 'Create Rule'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </SettingsLayout>
  );
}
