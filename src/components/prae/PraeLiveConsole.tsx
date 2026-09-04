// Prae live console — owner-only controlled pilot (Phase 1F).
//
// Uses the signed-in user's own permissions (RLS) for every read. No AI call:
// summaries are extractive and drafts are template-based. Sending happens only
// through the secured approval transaction, and the browser sends nothing but
// the approval id at execution time.
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { CheckCircle2, Loader2, ShieldCheck, XCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  buildEmailBinding,
  buildReplyDraft,
  summarizeThread,
} from '@/lib/praeCompose';
import {
  assessPraeRisk,
  derivePraeLiveState,
  hasCriticalRisk,
  isPraeActionAllowed,
  PRAE_LIVE_STATE_LABEL,
  type PraeLiveState,
} from '@/lib/praeRisk';
import {
  usePraeActivity,
  usePraeApprovals,
  usePraeAudit,
  usePraeRelatedRecords,
  useCreatePraeApproval,
  useDecidePraeApproval,
  useExecutePraeApproval,
  type PraeLiveMessage,
} from '@/hooks/usePraeLive';

const STATE_ORDER: PraeLiveState[] = [
  'idle',
  'reviewing',
  'thinking',
  'preparing_draft',
  'waiting_for_approval',
  'approved',
  'sending',
  'complete',
];

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
  const [busy, setBusy] = useState<'reviewing' | 'thinking' | null>(null);
  const [errored, setErrored] = useState(false);

  const activity = usePraeActivity(true);
  const approvals = usePraeApprovals(true);
  const audit = usePraeAudit(approvalId);
  const related = usePraeRelatedRecords(selected?.from_address ?? null);
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

  const recipientKnown = (related.data?.customers?.length ?? 0) > 0;
  const risks = useMemo(
    () =>
      assessPraeRisk({
        inboundText: thread.map((m) => m.body_text ?? '').join('\n'),
        draftBody: body,
        draftSubject: subject,
        recipient: selected?.from_address ?? '',
        recipientKnown,
        fromLocked: true,
        aiUsed: false,
      }),
    [thread, body, subject, selected, recipientKnown],
  );

  const state = derivePraeLiveState({
    hasSelection: !!selected,
    hasDraft: !!body,
    approvalState: currentApproval?.state,
    executionState: currentApproval?.execution_state,
    busy,
    lastError: errored,
  });

  // Poll while an approval is live so Sending → Complete is reflected honestly.
  useEffect(() => {
    if (!approvalId) return;
    const t = window.setInterval(() => {
      approvals.refetch();
      audit.refetch();
    }, 4000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approvalId]);

  const pick = (m: PraeLiveMessage) => {
    setSelected(m);
    setApprovalId(null);
    setNonce(null);
    setErrored(false);
    setSubject('');
    setBody('');
    setBusy('reviewing');
    window.setTimeout(() => setBusy(null), 400);
  };

  const prepareDraft = () => {
    if (!selected) return;
    setBusy('thinking');
    window.setTimeout(() => {
      const draft = buildReplyDraft({ senderName: selected.from_name, subject: selected.subject });
      setSubject(draft.subject);
      setBody(draft.body);
      setBusy(null);
    }, 300);
  };

  const submitForApproval = async () => {
    if (!selected?.from_address) return;
    if (!isPraeActionAllowed('email_reply')) return;
    const built = buildEmailBinding({
      from: fromAddress,
      to: selected.from_address,
      subject,
      body,
    });
    if (!built.ok) {
      toast.error(built.error);
      return;
    }

    try {
      const res = await createApproval.mutateAsync({ binding: built.binding, division });
      setApprovalId(res.approval_id);
      setNonce(res.nonce);
      setErrored(false);
      toast.success('Approval request created — review the exact message below.');
    } catch (e) {
      setErrored(true);
      toast.error(e instanceof Error ? e.message : 'Could not create the approval');
    }
  };

  const runDecision = async (decision: 'approved' | 'rejected') => {
    if (!approvalId || !nonce) return;
    try {
      const res = await decide.mutateAsync({ approvalId, nonce, decision });
      setNonce(null);
      if (!res?.ok) {
        setErrored(true);
        toast.error(`Rejected by the approval guard: ${res?.reason ?? 'unknown'}`);
      } else toast.success(decision === 'approved' ? 'Approved.' : 'Rejected.');
    } catch (e) {
      setErrored(true);
      toast.error(e instanceof Error ? e.message : 'Decision failed');
    }
  };

  /** Editing must invalidate the pending approval before the draft can change. */
  const editDraft = async () => {
    if (approvalId && nonce) {
      try {
        await decide.mutateAsync({ approvalId, nonce, decision: 'rejected' });
        toast.success('Previous approval invalidated — edit and request a new one.');
      } catch {
        toast.error('Could not invalidate the previous approval.');
        return;
      }
    }
    setApprovalId(null);
    setNonce(null);
    setErrored(false);
  };

  const runExecute = async () => {
    if (!approvalId) return;
    try {
      const res = await execute.mutateAsync(approvalId);
      if (res?.error) {
        setErrored(true);
        toast.error(`${res.error}${res.reason ? ` (${res.reason})` : ''}`);
      } else toast.success('Message sent using the approved content.');
    } catch (e) {
      setErrored(true);
      toast.error(e instanceof Error ? e.message : 'Execution failed');
    }
  };

  const rel = related.data;

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground flex gap-2">
        <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
        <span>
          Owner-only controlled pilot. Reads use your own permissions.{' '}
          {aiEnabled
            ? 'AI processing is enabled.'
            : 'AI processing is off — summaries and drafts are generated locally with fixed rules, and no message content is sent to any model.'}
        </span>
      </div>

      {/* Genuine live state */}
      <div className="flex flex-wrap gap-1.5" role="status" aria-live="polite">
        {STATE_ORDER.map((s) => (
          <span
            key={s}
            className={cn(
              'rounded-full border px-2 py-0.5 text-[11px] transition-opacity',
              state === s ? 'opacity-100 font-semibold border-primary text-primary' : 'opacity-40',
            )}
          >
            {PRAE_LIVE_STATE_LABEL[s]}
          </span>
        ))}
        {state === 'needs_attention' && (
          <span className="rounded-full border border-destructive px-2 py-0.5 text-[11px] font-semibold text-destructive">
            {PRAE_LIVE_STATE_LABEL.needs_attention}
          </span>
        )}
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

          {/* Related operational records, read under the caller's own permissions */}
          <div className="rounded-md border border-border bg-muted/20 p-2 text-[11px]">
            <p className="font-semibold uppercase tracking-wide text-muted-foreground">Related records</p>
            {related.isLoading ? (
              <p className="text-muted-foreground">Looking up…</p>
            ) : related.isError ? (
              <p className="text-destructive">Lookup not permitted for your role.</p>
            ) : rel && recipientKnown ? (
              <ul className="mt-1 space-y-0.5 text-muted-foreground">
                <li>Customer: {rel.customers.map((c) => c.name).join(', ')}</li>
                <li>
                  {rel.properties.length} propert{rel.properties.length === 1 ? 'y' : 'ies'} ·{' '}
                  {rel.quotes.length} quote(s) · {rel.invoices.length} invoice(s) · {rel.jobs.length} job(s) ·{' '}
                  {rel.visits.length} visit(s)
                </li>
              </ul>
            ) : (
              <p className="text-muted-foreground">No matching customer record.</p>
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Proposed reply (action: email_reply)
            </p>
            <p className="text-[11px] text-muted-foreground">
              From {fromAddress} (locked) · To {selected.from_address} (from the selected thread) · Cc none
            </p>
            {!body && !approvalId && (
              <Button size="sm" variant="outline" onClick={prepareDraft} disabled={busy === 'thinking'}>
                {busy === 'thinking' && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
                Prepare reply draft
              </Button>
            )}
            {(body || approvalId) && (
              <>
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
              </>
            )}

            {/* Risk flags */}
            {body && (
              <ul className="space-y-1">
                {risks.map((f) => (
                  <li
                    key={f.id}
                    className={cn(
                      'flex items-start gap-1.5 text-[11px]',
                      f.severity === 'critical'
                        ? 'text-destructive'
                        : f.severity === 'warning'
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-muted-foreground',
                    )}
                  >
                    {f.severity === 'info' ? (
                      <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                    ) : (
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                    )}
                    {f.label}
                  </li>
                ))}
              </ul>
            )}

            {!approvalId && body && (
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
                  {PRAE_LIVE_STATE_LABEL[state]}
                </Badge>
                {currentApproval && (
                  <span className="text-[10px] text-muted-foreground">
                    hash {currentApproval.content_hash.slice(0, 12)}…
                  </span>
                )}
              </div>
              <pre className="whitespace-pre-wrap break-words rounded border border-border bg-background p-2 text-[11px]">
                {`From: ${fromAddress}\nTo: ${selected.from_address}\nCc: (none)\nSubject: ${subject}\n\n${body}`}
              </pre>
              {hasCriticalRisk(risks) && (
                <p className="text-[11px] font-semibold text-destructive">
                  Critical risk flag present — approve only if you are certain.
                </p>
              )}
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
                    <Button size="sm" variant="outline" onClick={editDraft} disabled={decide.isPending}>
                      Edit (invalidates this approval)
                    </Button>
                  </>
                )}
                {state === 'approved' && (
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
