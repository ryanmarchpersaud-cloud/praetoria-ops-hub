import { useMemo, useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { MessageSquare, Plus, Send, Filter, StickyNote } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatStatusLabel } from '@/lib/statusLabel';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import {
  useTenantThreads,
  useTenantThreadMessages,
  useCreateTenantThread,
  useStaffTenantReply,
  useUpdateTenantThread,
  type TenantThread,
  type TenantThreadStatus,
  type TenantThreadCategory,
} from '@/hooks/pm/useTenantMessages';

const STATUSES: TenantThreadStatus[] = ['open', 'waiting_on_tenant', 'waiting_on_praetoria', 'resolved', 'closed'];
const CATEGORIES: TenantThreadCategory[] = ['general', 'lease', 'maintenance', 'notice', 'document', 'renewal', 'move_in', 'move_out', 'payment_question', 'access', 'safety', 'other'];

const statusColor = (s: string) => {
  switch (s) {
    case 'open': return 'bg-blue-100 text-blue-800';
    case 'waiting_on_tenant': return 'bg-amber-100 text-amber-800';
    case 'waiting_on_praetoria': return 'bg-purple-100 text-purple-800';
    case 'resolved': return 'bg-emerald-100 text-emerald-800';
    case 'closed': return 'bg-slate-100 text-slate-600';
    default: return 'bg-slate-100 text-slate-700';
  }
};

function useTenantsLite() {
  return useQuery({
    queryKey: ['pm-tenants-lite'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pm_tenants' as any)
        .select('id, first_name, last_name, business_name, tenant_type')
        .order('first_name');
      if (error) throw error;
      return ((data as any[]) || []) as Array<{ id: string; first_name: string; last_name: string | null; business_name: string | null; tenant_type: string }>;
    },
  });
}

const tenantLabel = (t: { first_name: string; last_name: string | null; business_name: string | null; tenant_type: string }) =>
  (t.tenant_type === 'business' && t.business_name)
    ? t.business_name
    : [t.first_name, t.last_name].filter(Boolean).join(' ');

function useTenantLeaseContext(tenant_id: string | null) {
  return useQuery({
    queryKey: ['pm-tenant-lease-ctx', tenant_id],
    enabled: !!tenant_id,
    queryFn: async () => {
      const { data: leases, error } = await supabase
        .from('pm_leases' as any)
        .select('id, unit_id, status, created_at')
        .eq('tenant_id', tenant_id as string)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const active = ((leases as any[]) || []).find(l => l.status === 'active') || ((leases as any[]) || [])[0];
      if (!active) return { lease_id: null, unit_id: null, property_id: null };
      const { data: u } = await supabase
        .from('pm_units' as any).select('id, property_id').eq('id', active.unit_id).maybeSingle();
      return { lease_id: active.id, unit_id: (u as any)?.id ?? null, property_id: (u as any)?.property_id ?? null };
    },
  });
}

export default function PMTenantMessagesList() {
  const [statusFilter, setStatusFilter] = useState<TenantThreadStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<TenantThreadCategory | 'all'>('all');
  const [tenantFilter, setTenantFilter] = useState<string>('all');
  const [q, setQ] = useState('');
  const [openThread, setOpenThread] = useState<TenantThread | null>(null);
  const [openCreate, setOpenCreate] = useState(false);

  const { data: threads = [], isLoading } = useTenantThreads({
    status: statusFilter,
    category: categoryFilter,
    tenant_id: tenantFilter === 'all' ? undefined : tenantFilter,
  });
  const { data: tenants = [] } = useTenantsLite();
  const tenantMap = useMemo(() => new Map(tenants.map(t => [t.id, t])), [tenants]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return threads;
    return threads.filter(t => t.subject.toLowerCase().includes(needle));
  }, [threads, q]);

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-4 max-w-6xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><MessageSquare className="h-6 w-6 text-slate-700" /> Tenant Messages</h1>
            <p className="text-sm text-muted-foreground">Secure conversations with tenants.</p>
          </div>
          <Button onClick={() => setOpenCreate(true)}><Plus className="h-4 w-4 mr-1" /> New thread</Button>
        </div>

        <Card>
          <CardContent className="p-3 flex flex-wrap gap-2 items-center">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search subject…" value={q} onChange={e => setQ(e.target.value)} className="max-w-xs" />
            <Select value={statusFilter} onValueChange={v => setStatusFilter(v as any)}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUSES.map(s => <SelectItem key={s} value={s}>{formatStatusLabel(s)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={v => setCategoryFilter(v as any)}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{formatStatusLabel(c)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={tenantFilter} onValueChange={setTenantFilter}>
              <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tenants</SelectItem>
                {tenants.map(t => <SelectItem key={t.id} value={t.id}>{tenantLabel(t)}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && filtered.length === 0 && (
          <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No tenant threads yet. Start a new one to reach a tenant.</CardContent></Card>
        )}

        <div className="space-y-2">
          {filtered.map(t => {
            const tenant = tenantMap.get(t.tenant_id);
            return (
              <Card key={t.id} className="hover:shadow-md transition cursor-pointer" onClick={() => setOpenThread(t)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">{t.subject}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {tenant ? tenantLabel(tenant) : 'Tenant'}
                        {' · '}{formatStatusLabel(t.category)}
                        {t.last_message_at ? ` · Updated ${formatDistanceToNow(new Date(t.last_message_at), { addSuffix: true })}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge className={statusColor(t.status)} variant="secondary">{formatStatusLabel(t.status)}</Badge>
                      {t.priority !== 'normal' && <Badge variant="outline" className="text-[10px]">{formatStatusLabel(t.priority)}</Badge>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <ThreadDialog thread={openThread} onClose={() => setOpenThread(null)} tenants={tenants} />
        <CreateThreadDialog open={openCreate} onOpenChange={setOpenCreate} tenants={tenants} />
      </div>
    </AppLayout>
  );
}

function ThreadDialog({ thread, onClose, tenants }: { thread: TenantThread | null; onClose: () => void; tenants: Array<{ id: string; first_name: string; last_name: string | null; business_name: string | null; tenant_type: string }> }) {
  const { data: messages = [], isLoading } = useTenantThreadMessages(thread?.id);
  const reply = useStaffTenantReply();
  const update = useUpdateTenantThread();
  const [body, setBody] = useState('');
  const [internal, setInternal] = useState(false);

  if (!thread) return null;
  const tenant = tenants.find(t => t.id === thread.tenant_id);

  const send = async () => {
    if (!body.trim()) return;
    try {
      await reply.mutateAsync({ thread_id: thread.id, body, is_tenant_visible: !internal });
      setBody('');
      setInternal(false);
      toast.success(internal ? 'Internal note saved' : 'Reply sent');
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base">{thread.subject}</DialogTitle>
          <p className="text-xs text-muted-foreground">
            {tenant ? tenantLabel(tenant) : 'Tenant'} · {formatStatusLabel(thread.category)}
          </p>
        </DialogHeader>

        <div className="flex flex-wrap gap-2 items-center pb-2 border-b">
          <Select value={thread.status} onValueChange={v => update.mutate({ id: thread.id, patch: { status: v as TenantThreadStatus } })}>
            <SelectTrigger className="h-8 text-xs w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{formatStatusLabel(s)}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={thread.priority} onValueChange={v => update.mutate({ id: thread.id, patch: { priority: v as any } })}>
            <SelectTrigger className="h-8 text-xs w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>{['low', 'normal', 'high', 'urgent'].map(p => <SelectItem key={p} value={p}>{formatStatusLabel(p)}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 py-3">
          {isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
          {messages.map(m => {
            const isTenant = m.sender_type === 'tenant';
            const isInternal = !m.is_tenant_visible;
            return (
              <div key={m.id} className={`flex ${isTenant ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[80%] rounded-lg p-3 text-sm ${isInternal ? 'bg-amber-50 border border-amber-200' : isTenant ? 'bg-slate-100' : 'bg-blue-50 border border-blue-200'}`}>
                  {isInternal && <p className="text-[10px] font-semibold text-amber-700 flex items-center gap-1 mb-1"><StickyNote className="h-3 w-3" /> Internal note (tenant cannot see)</p>}
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {formatStatusLabel(m.sender_type)} · {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                    {m.read_at && !isInternal && ' · Read'}
                  </p>
                </div>
              </div>
            );
          })}
          {messages.length === 0 && !isLoading && <p className="text-xs text-muted-foreground text-center">No messages yet.</p>}
        </div>

        <div className="border-t pt-3 space-y-2">
          <Textarea rows={3} value={body} onChange={e => setBody(e.target.value)} placeholder={internal ? 'Internal note — tenant will not see this…' : 'Reply to tenant…'} className={internal ? 'bg-amber-50' : ''} />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox id="int" checked={internal} onCheckedChange={c => setInternal(!!c)} />
              <Label htmlFor="int" className="text-xs">Internal note (hidden from tenant)</Label>
            </div>
            <Button size="sm" onClick={send} disabled={reply.isPending || !body.trim()}>
              <Send className="h-4 w-4 mr-1" /> {internal ? 'Save note' : 'Send reply'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreateThreadDialog({ open, onOpenChange, tenants }: { open: boolean; onOpenChange: (v: boolean) => void; tenants: Array<{ id: string; first_name: string; last_name: string | null; business_name: string | null; tenant_type: string }> }) {
  const [tenantId, setTenantId] = useState('');
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<TenantThreadCategory>('general');
  const [body, setBody] = useState('');
  const { data: ctx } = useTenantLeaseContext(tenantId || null);
  const create = useCreateTenantThread();

  const submit = async () => {
    if (!tenantId) return toast.error('Select tenant');
    if (!subject.trim()) return toast.error('Subject required');
    if (!body.trim()) return toast.error('Message required');
    try {
      await create.mutateAsync({
        tenant_id: tenantId,
        lease_id: ctx?.lease_id ?? null,
        unit_id: ctx?.unit_id ?? null,
        property_id: ctx?.property_id ?? null,
        subject, category, first_message: body,
      });
      toast.success('Thread started');
      onOpenChange(false);
      setTenantId(''); setSubject(''); setBody(''); setCategory('general');
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>New tenant message thread</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Tenant *</Label>
            <Select value={tenantId} onValueChange={setTenantId}>
              <SelectTrigger><SelectValue placeholder="Select tenant" /></SelectTrigger>
              <SelectContent>{tenants.map(t => <SelectItem key={t.id} value={t.id}>{tenantLabel(t)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Category</Label>
              <Select value={category} onValueChange={v => setCategory(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{formatStatusLabel(c)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Subject *</Label>
              <Input value={subject} onChange={e => setSubject(e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Message to tenant *</Label>
            <Textarea rows={5} value={body} onChange={e => setBody(e.target.value)} placeholder="Tenant-visible message…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={create.isPending}>Send</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
