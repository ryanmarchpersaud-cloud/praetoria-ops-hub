// Phase 1F — real Prae activity: approvals, decisions, execution receipts and
// the append-only audit trail. Read-only, caller-scoped (RLS). No credentials,
// no SMTP transcripts and no raw MIME ever reach this screen.
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { usePraeApprovals, usePraeAudit } from '@/hooks/usePraeLive';
import { derivePraeLiveState, PRAE_LIVE_STATE_LABEL } from '@/lib/praeRisk';

function when(iso: string | null) {
  return iso ? new Date(iso).toLocaleString('en-CA') : '—';
}

function AuditTrail({ approvalId }: { approvalId: string }) {
  const audit = usePraeAudit(approvalId);
  if (audit.isLoading) return <p className="text-[11px] text-muted-foreground">Loading audit…</p>;
  const rows = audit.data ?? [];
  if (rows.length === 0) return <p className="text-[11px] text-muted-foreground">No audit entries.</p>;
  return (
    <ul className="space-y-0.5 text-[11px] text-muted-foreground">
      {rows.map((a) => (
        <li key={a.id}>
          {when(a.created_at)} · {a.event}
          {a.actor_role ? ` · ${a.actor_role}` : ''}
          {a.detail ? ` — ${a.detail}` : ''}
        </li>
      ))}
    </ul>
  );
}

export default function PraeLiveActivity() {
  const approvals = usePraeApprovals(true);
  const [open, setOpen] = useState<string | null>(null);

  if (approvals.isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (approvals.isError) return <p className="text-sm text-destructive">Not permitted for your role.</p>;
  const rows = approvals.data ?? [];
  if (rows.length === 0) return <p className="text-sm text-muted-foreground py-6 text-center">No live activity yet.</p>;

  return (
    <div className="space-y-2">
      {rows.map((a) => {
        const binding = (a.content_binding ?? {}) as Record<string, unknown>;
        const to = Array.isArray(binding.to) ? (binding.to as string[]).join(', ') : '—';
        const state = derivePraeLiveState({
          hasSelection: true,
          hasDraft: true,
          approvalState: a.state,
          executionState: a.execution_state,
        });
        const receipt = (a.execution_receipt ?? null) as { summary?: string; sent_copy_status?: string } | null;
        return (
          <div key={a.id} className="rounded-lg border border-border bg-card p-3 text-sm">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="text-[10px]">{PRAE_LIVE_STATE_LABEL[state]}</Badge>
              <Badge variant="outline" className="text-[10px]">{a.channel}</Badge>
              <Badge variant="outline" className="text-[10px]">{a.division}</Badge>
              <Badge variant="outline" className="text-[10px]">AI: not used</Badge>
            </div>
            <div className="mt-2 space-y-0.5 text-[12px]">
              <p><span className="text-muted-foreground">Detected / used: </span>inbound thread + permitted customer records</p>
              <p className="break-words"><span className="text-muted-foreground">Prepared: </span>{String(binding.subject ?? '—')} → {to}</p>
              <p><span className="text-muted-foreground">Created: </span>{when(a.created_at)} · <span className="text-muted-foreground">expires </span>{when(a.expires_at)}</p>
              <p><span className="text-muted-foreground">Provider result: </span>{receipt?.summary ?? (a.execution_state ?? 'not executed')}{receipt?.sent_copy_status ? ` · sent copy: ${receipt.sent_copy_status}` : ''}</p>
              <p className="text-muted-foreground">Content hash {a.content_hash.slice(0, 16)}…</p>
            </div>
            <button
              type="button"
              className="mt-2 text-[11px] font-medium text-primary underline underline-offset-2"
              onClick={() => setOpen(open === a.id ? null : a.id)}
            >
              {open === a.id ? 'Hide audit trail' : 'Show audit trail'}
            </button>
            {open === a.id && (
              <div className="mt-2">
                <AuditTrail approvalId={a.id} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
