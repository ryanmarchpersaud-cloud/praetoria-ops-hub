import { useMemo, useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  useOwnerThreads,
  useThreadMessages,
  useCreateOwnerThread,
  useStaffReply,
  useUpdateOwnerThread,
  type OwnerThread,
  type OwnerThreadStatus,
  type OwnerThreadCategory,
} from '@/hooks/pm/useOwnerMessages';

const STATUSES: OwnerThreadStatus[] = ['open', 'waiting_on_owner', 'waiting_on_praetoria', 'resolved', 'closed'];
const CATEGORIES: OwnerThreadCategory[] = ['general', 'approval', 'maintenance', 'work_order', 'expense', 'statement', 'lease_renewal', 'move_out', 'document', 'other'];

const statusColor = (s: string) => {
  switch (s) {
    case 'open': return 'bg-blue-100 text-blue-800';
    case 'waiting_on_owner': return 'bg-amber-100 text-amber-800';
    case 'waiting_on_praetoria': return 'bg-purple-100 text-purple-800';
    case 'resolved': return 'bg-emerald-100 text-emerald-800';
    case 'closed': return 'bg-slate-100 text-slate-600';
    default: return 'bg-slate-100 text-slate-700';
  }
};

function useOwnersLite() {
  return useQuery({
    queryKey: ['owners-lite'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pm_property_owners' as any)
        .select('id,owner_name,company_name,is_active')
        .eq('is_active', true)
        .order('owner_name');
      if (error) throw error;
      return ((data as any[]) || []) as Array<{ id: string; owner_name: string; company_name: string | null }>;
    },
  });
}

function usePropertiesForOwner(owner_id: string | null) {
  return useQuery({
    queryKey: ['pm-managed-props-for-owner', owner_id],
    enabled: !!owner_id,
    queryFn: async () => {
      const { data: links, error } = await supabase
        .from('pm_owner_properties' as any)
        .select('property_id')
        .eq('owner_id', owner_id as string);
      if (error) throw error;
      const ids = ((links as any[]) || []).map((r: any) => r.property_id);
      if (ids.length === 0) return [] as Array<{ id: string; name: string }>;
      const { data: mgd, error: mgdErr } = await supabase
        .from('pm_managed_properties' as any)
        .select('id, property_name, address_line_1, city')
        .in('id', ids)
        .eq('is_active', true);
      if (mgdErr) throw mgdErr;
      return ((mgd as any[]) || []).map((r: any) => ({
        id: r.id,
        name: r.property_name || [r.address_line_1, r.city].filter(Boolean).join(', ') || 'Property',
      }));
    },
  });
}

export default function PMOwnerMessagesList() {
  const [statusFilter, setStatusFilter] = useState<OwnerThreadStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<OwnerThreadCategory | 'all'>('all');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [q, setQ] = useState('');
  const [openThread, setOpenThread] = useState<OwnerThread | null>(null);
  const [openCreate, setOpenCreate] = useState(false);

  const { data: threads = [], isLoading } = useOwnerThreads({
    status: statusFilter,
    category: categoryFilter,
    owner_id: ownerFilter === 'all' ? undefined : ownerFilter,
  });
  const { data: owners = [] } = useOwnersLite();
  const ownerMap = useMemo(() => new Map(owners.map(o => [o.id, o])), [owners]);

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
            <h1 className="text-2xl font-bold flex items-center gap-2"><MessageSquare className="h-6 w-6 text-slate-700" /> Owner Messages</h1>
            <p className="text-sm text-muted-foreground">Secure conversations with property owners.</p>
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
            <Select value={ownerFilter} onValueChange={setOwnerFilter}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All owners</SelectItem>
                {owners.map(o => <SelectItem key={o.id} value={o.id}>{o.company_name || o.owner_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && filtered.length === 0 && (
          <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No threads. Start a new one to message an owner.</CardContent></Card>
        )}

        <div className="space-y-2">
          {filtered.map(t => {
            const owner = ownerMap.get(t.owner_id);
            return (
              <Card key={t.id} className="hover:shadow-md transition cursor-pointer" onClick={() => setOpenThread(t)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">{t.subject}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {owner ? (owner.company_name || owner.owner_name) : 'Owner'}
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

        <ThreadDialog
          thread={openThread ? (threads.find(t => t.id === openThread.id) ?? openThread) : null}
          onClose={() => setOpenThread(null)}
          owners={owners}
        />
        <CreateThreadDialog open={openCreate} onOpenChange={setOpenCreate} owners={owners} />
      </div>
    </AppLayout>
  );
}

// ============ Thread conversation dialog (staff view) ============
function ThreadDialog({ thread, onClose, owners }: { thread: OwnerThread | null; onClose: () => void; owners: Array<{ id: string; owner_name: string; company_name: string | null }> }) {
  const { data: messages = [], isLoading } = useThreadMessages(thread?.id);
  const reply = useStaffReply();
  const update = useUpdateOwnerThread();
  const [body, setBody] = useState('');
  const [internal, setInternal] = useState(false);

  if (!thread) return null;
  const owner = owners.find(o => o.id === thread.owner_id);

  const send = async () => {
    if (!body.trim()) return;
    try {
      await reply.mutateAsync({ thread_id: thread.id, body, is_owner_visible: !internal });
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
            {owner ? (owner.company_name || owner.owner_name) : 'Owner'} · {formatStatusLabel(thread.category)}
          </p>
        </DialogHeader>

        <div className="flex flex-wrap gap-2 items-center pb-2 border-b">
          <Select
            value={thread.status}
            onValueChange={async v => {
              try {
                await update.mutateAsync({ id: thread.id, patch: { status: v as OwnerThreadStatus } });
                toast.success(`Status updated to ${formatStatusLabel(v)}`);
              } catch (e: any) {
                toast.error(e?.message || 'Failed to update status');
              }
            }}
          >
            <SelectTrigger className="h-8 text-xs w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{formatStatusLabel(s)}</SelectItem>)}</SelectContent>
          </Select>
          <Select
            value={thread.priority}
            onValueChange={async v => {
              try {
                await update.mutateAsync({ id: thread.id, patch: { priority: v as any } });
                toast.success(`Priority set to ${formatStatusLabel(v)}`);
              } catch (e: any) {
                toast.error(e?.message || 'Failed to update priority');
              }
            }}
          >
            <SelectTrigger className="h-8 text-xs w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>{['low', 'normal', 'high', 'urgent'].map(p => <SelectItem key={p} value={p}>{formatStatusLabel(p)}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 py-3">
          {isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
          {messages.map(m => {
            const isOwner = m.sender_type === 'owner';
            const isInternal = !m.is_owner_visible;
            return (
              <div key={m.id} className={`flex ${isOwner ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[80%] rounded-lg p-3 text-sm ${isInternal ? 'bg-amber-50 border border-amber-200' : isOwner ? 'bg-slate-100' : 'bg-blue-50 border border-blue-200'}`}>
                  {isInternal && <p className="text-[10px] font-semibold text-amber-700 flex items-center gap-1 mb-1"><StickyNote className="h-3 w-3" /> Internal note (owner cannot see)</p>}
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
          <Textarea rows={3} value={body} onChange={e => setBody(e.target.value)} placeholder={internal ? 'Internal note — owner will not see this…' : 'Reply to owner…'} className={internal ? 'bg-amber-50' : ''} />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox id="int" checked={internal} onCheckedChange={c => setInternal(!!c)} />
              <Label htmlFor="int" className="text-xs">Internal note (hidden from owner)</Label>
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

// ============ Create new thread dialog ============
function CreateThreadDialog({ open, onOpenChange, owners }: { open: boolean; onOpenChange: (v: boolean) => void; owners: Array<{ id: string; owner_name: string; company_name: string | null }> }) {
  const [ownerId, setOwnerId] = useState('');
  const [propertyId, setPropertyId] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<OwnerThreadCategory>('general');
  const [body, setBody] = useState('');
  const { data: props = [] } = usePropertiesForOwner(ownerId || null);
  const create = useCreateOwnerThread();

  const submit = async () => {
    if (!ownerId) return toast.error('Select owner');
    if (!subject.trim()) return toast.error('Subject required');
    if (!body.trim()) return toast.error('Message required');
    try {
      await create.mutateAsync({
        owner_id: ownerId,
        property_id: propertyId || null,
        subject, category, first_message: body,
      });
      toast.success('Thread started');
      onOpenChange(false);
      setOwnerId(''); setPropertyId(''); setSubject(''); setBody(''); setCategory('general');
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>New owner message thread</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Owner *</Label>
            <Select value={ownerId} onValueChange={v => { setOwnerId(v); setPropertyId(''); }}>
              <SelectTrigger><SelectValue placeholder="Select owner" /></SelectTrigger>
              <SelectContent>{owners.map(o => <SelectItem key={o.id} value={o.id}>{o.company_name || o.owner_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Property (optional)</Label>
            <Select value={propertyId || undefined} onValueChange={setPropertyId} disabled={!ownerId}>
              <SelectTrigger><SelectValue placeholder={ownerId ? 'Select property' : 'Choose owner first'} /></SelectTrigger>
              <SelectContent>{props.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
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
            <Label className="text-xs">Message to owner *</Label>
            <Textarea rows={5} value={body} onChange={e => setBody(e.target.value)} placeholder="Owner-visible message…" />
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
