import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ArrowLeft, MessageSquare, Plus, Send } from 'lucide-react';
import { formatStatusLabel } from '@/lib/statusLabel';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import {
  useTenantOwnThreads,
  useTenantThreadMessages,
  useTenantReply,
  useTenantOpenThread,
  useTenantMarkThreadRead,
  type TenantThread,
  type TenantThreadCategory,
} from '@/hooks/pm/useTenantMessages';

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

export default function TenantMessages() {
  const { data: threads = [], isLoading } = useTenantOwnThreads();
  const [openThread, setOpenThread] = useState<TenantThread | null>(null);
  const [openNew, setOpenNew] = useState(false);
  const [params, setParams] = useSearchParams();

  // Support ?new=1&subject=...&category=...&maintenance=<id>
  useEffect(() => {
    if (params.get('new') === '1') setOpenNew(true);
  }, [params]);

  const prefill = useMemo(() => ({
    subject: params.get('subject') ?? '',
    category: (params.get('category') as TenantThreadCategory) ?? 'general',
    related_maintenance_request_id: params.get('maintenance') || null,
  }), [params]);

  const clearNewParams = () => {
    const next = new URLSearchParams(params);
    ['new', 'subject', 'category', 'maintenance'].forEach(k => next.delete(k));
    setParams(next, { replace: true });
  };

  return (
    <div className="p-4 space-y-3 pb-24">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link to="/tenant"><ArrowLeft className="h-4 w-4 mr-1" /> Home</Link>
        </Button>
      </div>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2"><MessageSquare className="h-5 w-5 text-emerald-700" /> Messages</h2>
        <Button size="sm" onClick={() => setOpenNew(true)} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-1" /> New
        </Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!isLoading && threads.length === 0 && (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No messages yet. Tap New to start a conversation with Praetoria Group.</CardContent></Card>
      )}
      <div className="space-y-2">
        {threads.map(t => (
          <Card key={t.id} className="cursor-pointer hover:shadow-md transition" onClick={() => setOpenThread(t)}>
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{t.subject}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {formatStatusLabel(t.category)}
                    {t.last_tenant_visible_message_at ? ` · ${formatDistanceToNow(new Date(t.last_tenant_visible_message_at), { addSuffix: true })}` : ''}
                  </p>
                </div>
                <Badge className={statusColor(t.status)} variant="secondary">{formatStatusLabel(t.status)}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <TenantThreadDialog thread={openThread} onClose={() => setOpenThread(null)} />
      <NewTenantThreadDialog
        open={openNew}
        onOpenChange={(v) => { setOpenNew(v); if (!v) clearNewParams(); }}
        prefill={prefill}
      />
    </div>
  );
}

function TenantThreadDialog({ thread, onClose }: { thread: TenantThread | null; onClose: () => void }) {
  const { data: messages = [], isLoading } = useTenantThreadMessages(thread?.id, { tenantVisibleOnly: true });
  const reply = useTenantReply();
  const markRead = useTenantMarkThreadRead();
  const [body, setBody] = useState('');

  useEffect(() => { if (thread?.id) markRead.mutate(thread.id); /* eslint-disable-next-line */ }, [thread?.id]);

  if (!thread) return null;
  const closed = thread.status === 'closed';

  const send = async () => {
    if (!body.trim()) return;
    try {
      await reply.mutateAsync({ thread_id: thread.id, body });
      setBody('');
      toast.success('Reply sent');
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base">{thread.subject}</DialogTitle>
          <p className="text-xs text-muted-foreground">{formatStatusLabel(thread.category)} · <Badge className={statusColor(thread.status)} variant="secondary">{formatStatusLabel(thread.status)}</Badge></p>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-2 py-3">
          {isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
          {messages.map(m => {
            const mine = m.sender_type === 'tenant';
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-lg p-3 text-sm ${mine ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {mine ? 'You' : 'Praetoria Group'} · {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })}
          {messages.length === 0 && !isLoading && <p className="text-xs text-muted-foreground text-center">No messages yet.</p>}
        </div>
        {closed ? (
          <p className="text-xs text-muted-foreground text-center border-t pt-3">This thread is closed. Contact Praetoria to reopen.</p>
        ) : (
          <div className="border-t pt-3 space-y-2">
            <Textarea rows={3} value={body} onChange={e => setBody(e.target.value)} placeholder="Reply…" />
            <div className="flex justify-end">
              <Button size="sm" onClick={send} disabled={reply.isPending || !body.trim()} className="bg-emerald-600 hover:bg-emerald-700">
                <Send className="h-4 w-4 mr-1" /> Send
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function NewTenantThreadDialog({
  open, onOpenChange, prefill,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  prefill: { subject: string; category: TenantThreadCategory; related_maintenance_request_id: string | null };
}) {
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<TenantThreadCategory>('general');
  const [body, setBody] = useState('');
  const mut = useTenantOpenThread();

  useEffect(() => {
    if (open) {
      setSubject(prefill.subject);
      setCategory(prefill.category);
    }
  }, [open, prefill.subject, prefill.category]);

  const submit = async () => {
    if (!subject.trim()) return toast.error('Subject required');
    if (!body.trim()) return toast.error('Message required');
    try {
      await mut.mutateAsync({
        subject, body, category,
        related_maintenance_request_id: prefill.related_maintenance_request_id,
      });
      toast.success('Message sent');
      onOpenChange(false);
      setSubject(''); setBody(''); setCategory('general');
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>New message to Praetoria</DialogTitle></DialogHeader>
        <div className="space-y-3">
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
          <div>
            <Label className="text-xs">Message *</Label>
            <Textarea rows={5} value={body} onChange={e => setBody(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={mut.isPending} className="bg-emerald-600 hover:bg-emerald-700">Send</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
