import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ShieldCheck, Plus, Filter, Send, XCircle, CheckCircle2 } from 'lucide-react';
import {
  useOwnerApprovals, useUpdateOwnerApproval, useSendOwnerApproval,
  useOwnerApprovalActivity,
  APPROVAL_STATUSES, APPROVAL_CATEGORIES, APPROVAL_PRIORITIES,
} from '@/hooks/pm/useOwnerApprovals';
import { OwnerApprovalDialog } from '@/components/pm/OwnerApprovalDialog';
import { MessageOwnerFromApprovalButton } from '@/components/pm/MessageOwnerFromApprovalButton';
import { formatStatusLabel } from '@/lib/statusLabel';
import { toast } from 'sonner';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-800 border-slate-200',
  sent_to_owner: 'bg-blue-100 text-blue-800 border-blue-200',
  owner_reviewing: 'bg-blue-100 text-blue-800 border-blue-200',
  approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  declined: 'bg-rose-100 text-rose-800 border-rose-200',
  more_info_requested: 'bg-amber-100 text-amber-800 border-amber-200',
  cancelled: 'bg-slate-100 text-slate-600 border-slate-200',
  expired: 'bg-slate-100 text-slate-600 border-slate-200',
  completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
};

function money(n: any) {
  const v = n == null ? null : Number(n);
  return v == null || !Number.isFinite(v) ? '—' : `$${v.toFixed(2)}`;
}

export default function PMOwnerApprovalsList() {
  const { data = [], isLoading } = useOwnerApprovals();
  const update = useUpdateOwnerApproval();
  const send = useSendOwnerApproval();

  const [openCreate, setOpenCreate] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('all');
  const [category, setCategory] = useState<string>('all');
  const [priority, setPriority] = useState<string>('all');
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    return data.filter((a: any) => {
      if (status !== 'all' && a.status !== status) return false;
      if (category !== 'all' && a.category !== category) return false;
      if (priority !== 'all' && a.priority !== priority) return false;
      if (q) {
        const s = q.toLowerCase();
        const hay = [a.title, a.summary, a.property?.property_name, a.owner?.owner_name, a.owner?.company_name]
          .filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [data, status, category, priority, q]);

  const detail = data.find((a: any) => a.id === detailId);

  return (
    <div className="p-4 max-w-5xl mx-auto pb-24 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-emerald-600" />
            Owner Approvals
          </h1>
          <p className="text-sm text-muted-foreground">Request property owner sign-off on repairs, expenses, estimates, renewals, and move-outs.</p>
        </div>
        <Button onClick={() => setOpenCreate(true)}>
          <Plus className="h-4 w-4 mr-1" /> New Approval
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Filter className="h-4 w-4" /> Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <Input placeholder="Search title, owner, property…" value={q} onChange={e => setQ(e.target.value)} />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {APPROVAL_STATUSES.map(s => <SelectItem key={s} value={s}>{formatStatusLabel(s)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {APPROVAL_CATEGORIES.map(c => <SelectItem key={c} value={c}>{formatStatusLabel(c)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              {APPROVAL_PRIORITIES.map(p => <SelectItem key={p} value={p}>{formatStatusLabel(p)}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Loading…</CardContent></Card>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No approval requests match your filters.</CardContent></Card>
      ) : (
        filtered.map((a: any) => (
          <Card key={a.id} className="cursor-pointer hover:shadow-md transition" onClick={() => setDetailId(a.id)}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="text-base truncate">{a.title}</CardTitle>
                  <p className="text-xs text-muted-foreground truncate">
                    {a.owner?.company_name || a.owner?.owner_name} · {a.property?.property_name}
                    {a.unit?.unit_label ? ` · ${a.unit.unit_label}` : ''}
                  </p>
                </div>
                <Badge className={STATUS_COLORS[a.status] || 'bg-slate-100'} variant="outline">
                  {formatStatusLabel(a.status)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="text-sm grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div><span className="text-muted-foreground">Category: </span>{formatStatusLabel(a.category)}</div>
              <div><span className="text-muted-foreground">Priority: </span>{formatStatusLabel(a.priority)}</div>
              <div><span className="text-muted-foreground">Amount: </span>{money(a.requested_amount)}</div>
              <div><span className="text-muted-foreground">Due: </span>{a.due_date ?? '—'}</div>
            </CardContent>
          </Card>
        ))
      )}

      <OwnerApprovalDialog open={openCreate} onOpenChange={setOpenCreate} />

      <Dialog open={!!detailId} onOpenChange={o => { if (!o) setDetailId(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{detail?.title}</DialogTitle></DialogHeader>
          {detail && (
            <ApprovalDetail
              approval={detail}
              onSend={async () => {
                try { await send.mutateAsync(detail.id); toast.success('Sent to owner'); } catch (e: any) { toast.error(e.message); }
              }}
              onCancel={async () => {
                try {
                  await update.mutateAsync({ id: detail.id, patch: { status: 'cancelled' }, activityMessage: 'Approval cancelled by staff.', activityOwnerVisible: true });
                  toast.success('Cancelled');
                } catch (e: any) { toast.error(e.message); }
              }}
              onComplete={async () => {
                try {
                  await update.mutateAsync({ id: detail.id, patch: { status: 'completed' }, activityMessage: 'Marked completed.', activityOwnerVisible: true });
                  toast.success('Marked completed');
                } catch (e: any) { toast.error(e.message); }
              }}
              onEditNotes={async (adminNotes: string, ownerNote: string) => {
                try {
                  await update.mutateAsync({
                    id: detail.id,
                    patch: { admin_notes: adminNotes || null, owner_visible_note: ownerNote || null },
                    activityMessage: 'Notes updated.',
                    activityOwnerVisible: false,
                  });
                  toast.success('Saved');
                } catch (e: any) { toast.error(e.message); }
              }}
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailId(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ApprovalDetail({
  approval, onSend, onCancel, onComplete, onEditNotes,
}: {
  approval: any;
  onSend: () => void;
  onCancel: () => void;
  onComplete: () => void;
  onEditNotes: (a: string, o: string) => void;
}) {
  const [adminNotes, setAdminNotes] = useState(approval.admin_notes ?? '');
  const [ownerNote, setOwnerNote] = useState(approval.owner_visible_note ?? '');
  const { data: activity = [] } = useOwnerApprovalActivity(approval.id);
  const canSend = approval.status === 'draft';
  const canCancel = !['cancelled', 'completed', 'declined'].includes(approval.status);
  const canComplete = ['approved'].includes(approval.status);

  return (
    <div className="space-y-4 text-sm">
      <div className="grid grid-cols-2 gap-3">
        <div><span className="text-muted-foreground">Status: </span><span className="font-medium">{formatStatusLabel(approval.status)}</span></div>
        <div><span className="text-muted-foreground">Category: </span>{formatStatusLabel(approval.category)}</div>
        <div><span className="text-muted-foreground">Priority: </span>{formatStatusLabel(approval.priority)}</div>
        <div><span className="text-muted-foreground">Amount: </span>{money(approval.requested_amount)}</div>
        <div><span className="text-muted-foreground">Due: </span>{approval.due_date ?? '—'}</div>
        <div><span className="text-muted-foreground">Sent: </span>{approval.sent_at ? new Date(approval.sent_at).toLocaleString() : '—'}</div>
        <div><span className="text-muted-foreground">Owner viewed: </span>{approval.owner_viewed_at ? new Date(approval.owner_viewed_at).toLocaleString() : '—'}</div>
        <div><span className="text-muted-foreground">Decision: </span>{approval.decided_at ? new Date(approval.decided_at).toLocaleString() : '—'}</div>
      </div>

      {approval.summary && (
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Summary (owner-visible)</p>
          <p className="whitespace-pre-wrap bg-muted rounded p-2">{approval.summary}</p>
        </div>
      )}

      {approval.owner_response_note && (
        <div className="border-l-4 border-emerald-500 pl-3">
          <p className="text-[11px] uppercase tracking-wide text-emerald-800 font-semibold">Owner reply</p>
          <p className="whitespace-pre-wrap">{approval.owner_response_note}</p>
        </div>
      )}

      <div>
        <label className="text-xs font-medium">Owner-visible note</label>
        <Textarea rows={2} value={ownerNote} onChange={e => setOwnerNote(e.target.value)} />
      </div>
      <div>
        <label className="text-xs font-medium">Admin-only note</label>
        <Textarea rows={2} value={adminNotes} onChange={e => setAdminNotes(e.target.value)} />
      </div>
      <Button variant="outline" size="sm" onClick={() => onEditNotes(adminNotes, ownerNote)}>Save notes</Button>

      <div className="flex flex-wrap gap-2 pt-2 border-t">
        {canSend && <Button size="sm" onClick={onSend}><Send className="h-3 w-3 mr-1" /> Send to owner</Button>}
        {canComplete && <Button size="sm" variant="outline" onClick={onComplete}><CheckCircle2 className="h-3 w-3 mr-1" /> Mark completed</Button>}
        <MessageOwnerFromApprovalButton approval={{ id: approval.id, title: approval.title, owner_id: approval.owner_id, property_id: approval.property_id, unit_id: approval.unit_id }} />
        {canCancel && <Button size="sm" variant="outline" className="text-rose-700 border-rose-200 hover:bg-rose-50" onClick={onCancel}><XCircle className="h-3 w-3 mr-1" /> Cancel</Button>}
      </div>

      <div>
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Activity</p>
        {activity.length === 0 ? (
          <p className="text-xs text-muted-foreground">No events yet.</p>
        ) : (
          <ol className="space-y-2 border-l-2 border-emerald-200 pl-3">
            {activity.map((e: any) => (
              <li key={e.id} className="text-xs">
                <p className="font-medium">
                  {e.message || formatStatusLabel(e.event_type)}
                  {!e.is_owner_visible && <span className="ml-2 text-[10px] text-muted-foreground">(internal)</span>}
                </p>
                <p className="text-muted-foreground">{new Date(e.created_at).toLocaleString()}</p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
