// Phase 1G — one mobile screen holding everything needed to decide.
//
// Reached from a phone alert link. The link carries no token and no content:
// the approval is loaded only after an authenticated owner/admin session
// exists, and the single-use nonce is minted here, in memory, never in a URL.
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  useDecidePraeApproval,
  useDeletePraeApproval,
  useExecutePraeApproval,
  useIssuePraeNonce,
  usePraeApproval,
  usePraeAudit,
  usePraeRelatedRecords,
  useReopenPraeApproval,
} from '@/hooks/usePraeLive';
import { assessPraeRisk, derivePraeLiveState, hasCriticalRisk, PRAE_LIVE_STATE_LABEL } from '@/lib/praeRisk';
import { AlertTriangle, ArrowLeft, Check, Loader2, Pencil, RotateCcw, Trash2, X } from 'lucide-react';

function when(iso: string | null | undefined) {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return 'never';
  return new Date(iso).toLocaleString('en-CA');
}


function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-0.5 break-words text-sm">{children}</div>
    </div>
  );
}

export default function PraeApprovalDecision() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const approval = usePraeApproval(id);
  const audit = usePraeAudit(id ?? null);
  const issueNonce = useIssuePraeNonce();
  const decide = useDecidePraeApproval();
  const execute = useExecutePraeApproval();
  const reopen = useReopenPraeApproval();
  const removeApproval = useDeletePraeApproval();

  const [busy, setBusy] = useState<'approve' | 'reject' | 'edit' | null>(null);

  const row = approval.data ?? null;
  const binding = (row?.content_binding ?? {}) as {
    from?: string; to?: string[]; cc?: string[]; subject?: string; body?: string; attachments?: unknown[];
  };
  const recipient = binding.to?.[0] ?? null;
  const related = usePraeRelatedRecords(recipient);

  const risks = useMemo(() => {
    if (!row) return [];
    return assessPraeRisk({
      inboundText: '',
      draftBody: binding.body ?? '',
      draftSubject: binding.subject ?? '',
      recipient: recipient ?? '',
      recipientKnown: (related.data?.customers?.length ?? 0) > 0,
      fromLocked: !!binding.from,
      aiUsed: false,
    });
  }, [row, binding.body, binding.subject, binding.from, recipient, related.data]);

  const state = row
    ? derivePraeLiveState({
        hasSelection: true,
        hasDraft: true,
        approvalState: row.state,
        executionState: row.execution_state,
      })
    : 'idle';

  const pending = row?.state === 'pending';

  async function withNonce(decision: 'approved' | 'rejected', label: 'approve' | 'reject' | 'edit') {
    if (!row) return;
    setBusy(label);
    try {
      const issued = await issueNonce.mutateAsync(row.id);
      if (!issued.ok || !issued.nonce) {
        toast({ title: 'Not permitted', description: issued.reason ?? 'unknown', variant: 'destructive' });
        return;
      }
      const result = await decide.mutateAsync({ approvalId: row.id, nonce: issued.nonce, decision });
      if (!result.ok) {
        toast({ title: 'Rejected by the server', description: result.reason ?? 'unknown', variant: 'destructive' });
        return;
      }
      if (decision === 'approved') {
        const exec = await execute.mutateAsync(row.id);
        if (exec?.error) {
          toast({ title: 'Send failed', description: exec.reason ?? exec.error, variant: 'destructive' });
        } else {
          toast({ title: 'Approved and sent' });
        }
      } else if (label === 'edit') {
        toast({
          title: 'Approval invalidated',
          description: 'Edit the draft in the Prae console — a new approval is required.',
        });
        navigate('/prae');
      } else {
        toast({ title: 'Rejected — nothing was sent' });
      }
      await approval.refetch();
      await audit.refetch();
    } catch (error) {
      toast({ title: 'Action failed', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  }

  if (approval.isLoading) {
    return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;
  }
  if (approval.isError || !row) {
    return (
      <div className="p-6 space-y-3">
        <p className="text-sm text-destructive">
          This approval is not available to your account.
        </p>
        <Button variant="outline" onClick={() => navigate('/prae/approvals')}>Back to approvals</Button>
      </div>
    );
  }

  const extra = row as unknown as { action_type?: string; urgent?: boolean };
  const receipt = (row.execution_receipt ?? null) as
    | { summary?: string; provider_status?: string; sent_copy_status?: string; message_id?: string }
    | null;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 p-4 pb-32">
      <button
        onClick={() => navigate('/prae/approvals')}
        className="flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Approvals
      </button>

      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" className="text-[10px]">{PRAE_LIVE_STATE_LABEL[state]}</Badge>
        <Badge variant="outline" className="text-[10px]">{extra.action_type ?? row.channel}</Badge>
        <Badge variant="outline" className="text-[10px]">{row.division}</Badge>
        {extra.urgent && <Badge variant="destructive" className="text-[10px]">Urgent</Badge>}
        <Badge variant="outline" className="text-[10px]">AI: not used</Badge>
      </div>

      <Card className="p-4">
        <h2 className="text-sm font-semibold">Exact message to be sent</h2>
        <Separator className="my-2" />
        <Field label="From">{binding.from ?? '—'}</Field>
        <Field label="To">{binding.to?.join(', ') ?? '—'}</Field>
        <Field label="Cc">{binding.cc?.length ? binding.cc.join(', ') : 'None'}</Field>
        <Field label="Subject">{binding.subject ?? '—'}</Field>
        <Field label="Body">
          <span className="block whitespace-pre-wrap font-mono text-[13px] leading-relaxed">
            {binding.body ?? ''}
          </span>
        </Field>
        <Field label="Attachments">
          {binding.attachments?.length ? `${binding.attachments.length} (blocked)` : 'None'}
        </Field>
        <Field label="Approval window">
          Created {when(row.created_at)} · expires {when(row.expires_at)}
        </Field>
      </Card>

      <Card className="p-4">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden="true" /> Risk &amp; sensitivity
        </h2>
        <ul className="mt-2 space-y-1 text-sm">
          {risks.map((r) => (
            <li
              key={r.id}
              className={r.severity === 'critical' ? 'text-destructive font-medium' : r.severity === 'warning' ? 'text-foreground' : 'text-muted-foreground'}
            >
              • {r.label}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-4">
        <h2 className="text-sm font-semibold">Related records</h2>
        {related.isLoading && <p className="text-sm text-muted-foreground">Looking up…</p>}
        {!related.isLoading && (
          <div className="mt-1 space-y-1 text-sm">
            {(related.data?.customers ?? []).map((c) => (
              <p key={c.id}>Customer: {c.name} · {c.customer_status ?? '—'}</p>
            ))}
            {(related.data?.properties ?? []).map((p) => (
              <p key={p.id}>Property: {p.property_name ?? p.address_line_1}</p>
            ))}
            {(related.data?.quotes ?? []).map((q) => (
              <p key={q.id}>Quote {q.quote_number} · {q.approval_status ?? '—'}</p>
            ))}
            {(related.data?.invoices ?? []).map((i) => (
              <p key={i.id}>Invoice {i.invoice_number} · {i.status} · balance {i.balance_due ?? 0}</p>
            ))}
            {(related.data?.jobs ?? []).map((j) => (
              <p key={j.id}>Job {j.job_number} · {j.status}</p>
            ))}
            {(related.data?.visits ?? []).map((v) => (
              <p key={v.id}>Visit {v.visit_number} · {v.visit_status} · {v.service_date ?? '—'}</p>
            ))}
            {!related.data && <p className="text-muted-foreground">No linked records.</p>}
          </div>
        )}
      </Card>

      <Card className="p-4">
        <h2 className="text-sm font-semibold">Execution</h2>
        <Field label="Status">{row.execution_state}</Field>
        <Field label="Sent at">{when(row.executed_at)}</Field>
        <Field label="Provider result">
          {receipt?.provider_status ?? receipt?.summary ?? '—'}
          {receipt?.sent_copy_status ? ` · sent copy: ${receipt.sent_copy_status}` : ''}
        </Field>
        <Separator className="my-2" />
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Audit trail</h3>
        <ul className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
          {(audit.data ?? []).map((a) => (
            <li key={a.id}>
              {when(a.created_at)} · {a.event}
              {a.actor_role ? ` · ${a.actor_role}` : ''}
              {a.detail ? ` — ${a.detail}` : ''}
            </li>
          ))}
          {(audit.data ?? []).length === 0 && <li>No entries yet.</li>}
        </ul>
      </Card>

      {pending && (
        <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background/95 p-3 backdrop-blur">
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              className="h-12 flex-1 gap-1.5"
              disabled={!!busy}
              onClick={() => withNonce('rejected', 'edit')}
            >
              <Pencil className="h-4 w-4" aria-hidden="true" /> Edit
            </Button>
            <Button
              variant="outline"
              className="h-12 flex-1 gap-1.5"
              disabled={!!busy}
              onClick={() => withNonce('rejected', 'reject')}
            >
              <X className="h-4 w-4" aria-hidden="true" /> Reject
            </Button>
            <Button
              className="h-12 flex-1 gap-1.5"
              disabled={!!busy || hasCriticalRisk(risks)}
              onClick={() => withNonce('approved', 'approve')}
            >
              {busy === 'approve' ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Check className="h-4 w-4" aria-hidden="true" />
              )}
              Approve &amp; send
            </Button>
          </div>
          {hasCriticalRisk(risks) && (
            <p className="mx-auto mt-2 max-w-2xl text-center text-[11px] text-destructive">
              A critical risk flag blocks approval on this screen. Review it in the Prae console.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
