// Prae live console — production pilot.
//
// Uses the signed-in user's own permissions (RLS) for every read. No AI call:
// summaries are extractive and drafts are template-based. Sending happens only
// through the secured approval transaction, and the browser sends nothing but
// the approval id at execution time.
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { CheckCircle2, Loader2, ShieldCheck, XCircle } from 'lucide-react';
import {
  buildEmailBinding,
  buildReplyDraft,
  praeExecutionStatus,
  summarizeThread,
  type PraeExecutionStatus,
} from '@/lib/praeCompose';
import {
  usePraeActivity,
  usePraeApprovals,
  usePraeAudit,
  useCreatePraeApproval,
  useDecidePraeApproval,
  useExecutePraeApproval,
  type PraeLiveMessage,
} from '@/hooks/usePraeLive';

const STATUS_LABEL: Record<PraeExecutionStatus, string> = {
  waiting_for_approval: 'Waiting for approval',
  approved: 'Approved',
  sending: 'Sending',
  complete: 'Complete',
  failed: 'Failed',
};

export default function PraeLiveConsole({
  fromAddress,
  division,
  executionEnabled,
  aiEnabled,
}: {
  fromAddress: string;
  division: string;
  executionEnabled: boolean;
  aiEnabled: boolean;
}) {
  const [selected, setSelected] = useState<PraeLiveMessage | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [nonce, setNonce] = useState<string | null>(null);
  const [approvalId, setApprovalId] = useState<string | null>(null);

  const activity = usePraeActivity(true);
  const approvals = usePraeApprovals(true);
  const audit = usePraeAudit(approvalId);
  const createApproval = useCreatePraeApproval();
  const decide = useDecidePraeApproval();
  const execute = useExecutePraeApproval();

  const thread = useMemo(() => {
    if (!selected) return [];
    return (activity.data ?? []).filter(
      (m) => (m.subject ?? '').replace(/^re:\s*/i, '') === (selected.subject ?? '').replace(/^re:\s*/i, ''),
    );
  }, [activity.data, selected]);

  const summary = useMemo(() => summarizeThread(thread), [thread]);
  const currentApproval = approvals.data?.find((a) => a.id === approvalId) ?? null;
  const status = currentApproval
    ? praeExecutionStatus(currentApproval.state, currentApproval.execution_state)
    : null;

  const pick = (m: PraeLiveMessage) => {
    setSelected(m);
    setApprovalId(null);
    setNonce(null);
    const draft = buildReplyDraft({ senderName: m.from_name, subject: m.subject });
    setSubject(draft.subject);
    setBody(draft.body);
  };

  const submitForApproval = async () => {
    if (!selected?.from_address) return;
    const built = buildEmailBinding({
      from: fromAddress,
      to: selected.from_address,
      subject,
      body,
    });
    if (!('binding' in built)) {
      toast.error((built as { error: string }).error);
      return;
    }

    try {
      const res = await createApproval.mutateAsync({ binding: built.binding, division });
      setApprovalId(res.approval_id);
      setNonce(res.nonce);
      toast.success('Approval request created — review the exact message below.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not create the approval');
    }
  };

  const runDecision = async (decision: 'approved' | 'rejected') => {
    if (!approvalId || !nonce) return;
    try {
      const res = await decide.mutateAsync({ approvalId, nonce, decision });
      setNonce(null);
      if (!res?.ok) toast.error(`Rejected by the approval guard: ${res?.reason ?? 'unknown'}`);
      else toast.success(decision === 'approved' ? 'Approved.' : 'Rejected.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Decision failed');
    }
  };

  const runExecute = async () => {
    if (!approvalId) return;
    try {
      const res = await execute.mutateAsync(approvalId);
      if (res?.error) toast.error(`${res.error}${res.reason ? ` (${res.reason})` : ''}`);
      else toast.success('Message sent using the approved content.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Execution failed');
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground flex gap-2">
        <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
        <span>
          Live production pilot. Reads use your own permissions.{' '}
          {aiEnabled
            ? 'AI processing is enabled.'
            : 'AI processing is off — summaries and drafts are generated locally with fixed rules, and no message content is sent to any model.'}
        </span>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          New communication activity
        </p>
        {activity.isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
        {!activity.isLoading && (activity.data ?? []).length === 0 && (
          <p className="text-xs text-muted-foreground">No permitted messages yet.</p>
        )}
        {(activity.data ?? []).slice(0, 8).map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => pick(m)}
            className={`w-full rounded-md border p-2 text-left text-xs transition-colors hover:bg-accent/40 ${
              selected?.id === m.id ? 'border-primary ring-1 ring-primary/30' : 'border-border'
            }`}
          >
            <span className="font-semibold">{m.subject || '(no subject)'}</span>
            <span className="block text-muted-foreground">
              {m.from_name || m.from_address} · {m.sent_at ? new Date(m.sent_at).toLocaleString() : '—'}
            </span>
          </button>
        ))}
      </div>

      {selected && (
        <div className="space-y-3 rounded-lg border border-border p-3">
          <div>
            <p className="text-xs font-semibold">{summary.headline}</p>
            <ul className="mt-1 list-disc pl-4 text-[11px] text-muted-foreground space-y-0.5">
              {summary.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>

          <Separator />

          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Proposed reply
            </p>
            <p className="text-[11px] text-muted-foreground">
              From {fromAddress} · To {selected.from_address}
            </p>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={!!approvalId}
              aria-label="Reply subject"
              className="text-sm"
            />
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={!!approvalId}
              aria-label="Reply body"
              className="min-h-[140px] text-sm"
            />
            {!approvalId && (
              <Button size="sm" onClick={submitForApproval} disabled={createApproval.isPending}>
                {createApproval.isPending && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
                Request approval
              </Button>
            )}
          </div>

          {approvalId && (
            <div className="space-y-2 rounded-md border border-border bg-muted/30 p-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">
                  {status ? STATUS_LABEL[status] : 'Waiting for approval'}
                </Badge>
                {currentApproval && (
                  <span className="text-[10px] text-muted-foreground">
                    hash {currentApproval.content_hash.slice(0, 12)}…
                  </span>
                )}
              </div>
              <pre className="whitespace-pre-wrap break-words rounded border border-border bg-background p-2 text-[11px]">
                {`To: ${selected.from_address}\nSubject: ${subject}\n\n${body}`}
              </pre>
              <div className="flex flex-wrap gap-2">
                {nonce && (
                  <>
                    <Button size="sm" onClick={() => runDecision('approved')} disabled={decide.isPending}>
                      <CheckCircle2 className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => runDecision('rejected')}
                      disabled={decide.isPending}
                    >
                      <XCircle className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                      Reject
                    </Button>
                  </>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setApprovalId(null);
                    setNonce(null);
                  }}
                >
                  Edit (creates a new approval)
                </Button>
                {status === 'approved' && (
                  <Button size="sm" onClick={runExecute} disabled={!executionEnabled || execute.isPending}>
                    {execute.isPending && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
                    {executionEnabled ? 'Send approved message' : 'Sending not activated'}
                  </Button>
                )}
              </div>
              {(audit.data ?? []).length > 0 && (
                <ul className="space-y-0.5 text-[10px] text-muted-foreground">
                  {(audit.data ?? []).map((a) => (
                    <li key={a.id}>
                      {new Date(a.created_at).toLocaleTimeString()} · {a.event}
                      {a.detail ? ` — ${a.detail}` : ''}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
