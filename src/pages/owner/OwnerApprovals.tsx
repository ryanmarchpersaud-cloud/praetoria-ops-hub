import { useEffect, useState } from 'react';
import { OwnerLayout } from '@/components/owner/OwnerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ShieldCheck, Check, XCircle, HelpCircle, Mail } from 'lucide-react';
import {
  useMyOwnerApprovals, useOwnerRespondToApproval,
  useOwnerApprovalActivity, useOwnerMarkApprovalViewed,
} from '@/hooks/pm/useOwnerApprovals';
import { formatStatusLabel } from '@/lib/statusLabel';
import { toast } from 'sonner';

const STATUS_COLORS: Record<string, string> = {
  sent_to_owner: 'bg-blue-100 text-blue-900 border-blue-200',
  owner_reviewing: 'bg-blue-100 text-blue-900 border-blue-200',
  approved: 'bg-emerald-100 text-emerald-900 border-emerald-200',
  declined: 'bg-rose-100 text-rose-900 border-rose-200',
  more_info_requested: 'bg-amber-100 text-amber-900 border-amber-200',
  completed: 'bg-emerald-100 text-emerald-900 border-emerald-200',
  expired: 'bg-slate-100 text-slate-700 border-slate-200',
};

function money(n: any) {
  const v = n == null ? null : Number(n);
  return v == null || !Number.isFinite(v) ? '—' : `$${v.toFixed(2)}`;
}

export default function OwnerApprovals() {
  const { data = [], isLoading } = useMyOwnerApprovals();
  const [openId, setOpenId] = useState<string | null>(null);
  const opened = data.find((a: any) => a.id === openId);

  return (
    <OwnerLayout>
      <div className="p-4 space-y-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-700" /> Approvals
          </h1>
          <p className="text-sm text-muted-foreground">
            Approve, decline, or request more information on requests from Praetoria Group.
          </p>
        </div>

        {isLoading ? (
          <Card><CardContent className="p-6 text-sm text-muted-foreground text-center">Loading…</CardContent></Card>
        ) : data.length === 0 ? (
          <Card><CardContent className="p-6 text-sm text-muted-foreground text-center">
            No approval requests at the moment.
          </CardContent></Card>
        ) : (
          data.map((a: any) => (
            <Card key={a.id} className="cursor-pointer hover:shadow-md transition" onClick={() => setOpenId(a.id)}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-base truncate">{a.title}</CardTitle>
                    <p className="text-xs text-muted-foreground truncate">
                      {a.property?.property_name}{a.unit?.unit_label ? ` · ${a.unit.unit_label}` : ''} · {formatStatusLabel(a.category)}
                    </p>
                  </div>
                  <Badge className={STATUS_COLORS[a.status] || 'bg-slate-100'} variant="outline">
                    {formatStatusLabel(a.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="text-sm grid grid-cols-3 gap-2">
                <div><span className="text-muted-foreground">Amount </span>{money(a.requested_amount)}</div>
                <div><span className="text-muted-foreground">Priority </span>{formatStatusLabel(a.priority)}</div>
                <div><span className="text-muted-foreground">Due </span>{a.due_date ?? '—'}</div>
              </CardContent>
            </Card>
          ))
        )}

        <p className="text-[11px] text-muted-foreground italic border-l-2 border-emerald-300 pl-2">
          This is a communication and tracking workflow. Final agreements are confirmed in writing by Praetoria Group.
        </p>

        <Button asChild variant="outline" className="w-full">
          <a href="mailto:ops@praetoriagroup.ca">
            <Mail className="h-4 w-4 mr-2" /> Contact Praetoria (ops@praetoriagroup.ca)
          </a>
        </Button>
      </div>

      <Dialog open={!!openId} onOpenChange={o => { if (!o) setOpenId(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{opened?.title}</DialogTitle></DialogHeader>
          {opened && <OwnerApprovalDetail approval={opened} onClose={() => setOpenId(null)} />}
        </DialogContent>
      </Dialog>
    </OwnerLayout>
  );
}

function OwnerApprovalDetail({ approval, onClose }: { approval: any; onClose: () => void }) {
  const [note, setNote] = useState('');
  const respond = useOwnerRespondToApproval();
  const markViewed = useOwnerMarkApprovalViewed();
  const { data: activity = [] } = useOwnerApprovalActivity(approval.id, { ownerOnly: true });

  useEffect(() => {
    if (!approval.owner_viewed_at) markViewed.mutate(approval.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approval.id]);

  const canRespond = ['sent_to_owner', 'owner_reviewing', 'more_info_requested'].includes(approval.status);

  const submit = async (response: 'approved' | 'declined' | 'more_info') => {
    try {
      await respond.mutateAsync({ id: approval.id, response, note: note.trim() || undefined });
      toast.success('Response sent to Praetoria Group.');
      onClose();
    } catch (e: any) { toast.error(e.message || 'Could not send response'); }
  };

  return (
    <div className="space-y-3 text-sm">
      <div className="grid grid-cols-2 gap-2">
        <div><span className="text-muted-foreground">Property </span>{approval.property?.property_name ?? '—'}</div>
        <div><span className="text-muted-foreground">Unit </span>{approval.unit?.unit_label ?? '—'}</div>
        <div><span className="text-muted-foreground">Category </span>{formatStatusLabel(approval.category)}</div>
        <div><span className="text-muted-foreground">Priority </span>{formatStatusLabel(approval.priority)}</div>
        <div><span className="text-muted-foreground">Amount </span>{money(approval.requested_amount)}</div>
        <div><span className="text-muted-foreground">Due </span>{approval.due_date ?? '—'}</div>
      </div>

      {approval.summary && (
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Summary</p>
          <p className="whitespace-pre-wrap bg-muted rounded p-2">{approval.summary}</p>
        </div>
      )}
      {approval.owner_visible_note && (
        <div>
          <p className="text-[11px] uppercase tracking-wide text-emerald-800 font-semibold mb-1">Note from Praetoria</p>
          <p className="whitespace-pre-wrap">{approval.owner_visible_note}</p>
        </div>
      )}

      {approval.owner_response && (
        <div className="rounded-md bg-emerald-50 border border-emerald-200 p-3 text-emerald-900">
          <p className="text-[11px] uppercase tracking-wide font-semibold mb-0.5">Your response</p>
          <p className="text-sm">You said: <span className="capitalize font-medium">{approval.owner_response.replace('_', ' ')}</span></p>
          {approval.owner_response_note && <p className="text-xs mt-1 whitespace-pre-wrap">{approval.owner_response_note}</p>}
        </div>
      )}

      {canRespond && (
        <div className="space-y-2">
          <label className="text-xs font-medium">Add a note (optional)</label>
          <Textarea rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="Add any context for Praetoria Group…" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Button size="sm" className="bg-emerald-700 hover:bg-emerald-800" onClick={() => submit('approved')}>
              <Check className="h-3 w-3 mr-1" /> Approve
            </Button>
            <Button size="sm" variant="outline" onClick={() => submit('more_info')}>
              <HelpCircle className="h-3 w-3 mr-1" /> Request more info
            </Button>
            <Button size="sm" variant="outline" className="border-rose-300 text-rose-700 hover:bg-rose-50" onClick={() => submit('declined')}>
              <XCircle className="h-3 w-3 mr-1" /> Decline
            </Button>
          </div>
        </div>
      )}

      <div>
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Activity</p>
        {activity.length === 0 ? (
          <p className="text-xs text-muted-foreground">No events yet.</p>
        ) : (
          <ol className="space-y-2 border-l-2 border-emerald-200 pl-3">
            {activity.map((e: any) => (
              <li key={e.id} className="text-xs">
                <p className="font-medium">{e.message || formatStatusLabel(e.event_type)}</p>
                <p className="text-muted-foreground">{new Date(e.created_at).toLocaleString()}</p>
              </li>
            ))}
          </ol>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Close</Button>
      </DialogFooter>
    </div>
  );
}
