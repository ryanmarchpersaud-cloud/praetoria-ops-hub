// Phase 1E — secure approval detail screen (mobile-first).
//
// Displays the EXACT proposed action. Edit / Reject / Approve are visible but
// execution is disabled for this entire phase and clearly labelled.
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, Check, Lock, Pencil, X } from 'lucide-react';
import { PRAE_DISABLED_LABEL } from './praeDemoData';
import type { PraeActivityItem } from './praeActivityDemo';
import { smsSegments } from '../../../supabase/functions/_shared/prae/approvalModel';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-0.5 sm:grid-cols-[110px_1fr] sm:gap-2 py-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-sm break-words">{children}</span>
    </div>
  );
}

export default function PraeApprovalDetail({ item }: { item: PraeActivityItem }) {
  const p = item.proposal;
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive flex gap-2">
        <Lock className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
        <span>
          Sample approval preview. Execution is disabled: approving, rejecting or editing here does
          not send anything and does not change any record.
        </span>
      </div>

      <section className="rounded-lg border border-border bg-card p-3">
        <h3 className="text-sm font-semibold mb-2">Exact proposed action</h3>
        {!p && (
          <p className="text-sm text-muted-foreground">
            No outbound message proposed — this item was escalated for a human decision only.
          </p>
        )}
        {p?.channel === 'email' && (
          <div className="divide-y divide-border">
            <Row label="From">{p.from}</Row>
            <Row label="To">{p.to.join(', ')}</Row>
            {p.cc?.length ? <Row label="Cc">{p.cc.join(', ')}</Row> : null}
            <Row label="Subject">{p.subject}</Row>
            <Row label="Body">
              <span className="block whitespace-pre-wrap font-mono text-[13px] leading-relaxed">
                {p.body}
              </span>
            </Row>
            <Row label="Attachments">
              {p.attachments.length === 0
                ? 'None'
                : p.attachments.map((a) => (
                    <span key={a.filename} className="block">
                      {a.filename} · {a.mimeType} · {(a.sizeBytes / 1024).toFixed(0)} KB ·{' '}
                      <span className="font-mono text-[10px]">
                        {a.storageObjectId}@{a.storageObjectVersion} · sha256 {a.sha256.slice(0, 12)}…
                      </span>{' '}
                      <Badge variant="outline" className="text-[10px]">
                        {PRAE_DISABLED_LABEL}
                      </Badge>
                    </span>
                  ))}
            </Row>
          </div>
        )}
        {p?.channel === 'sms' && (
          <div className="divide-y divide-border">
            <Row label="From">{p.fromNumber}</Row>
            <Row label="To">{p.toNumber}</Row>
            <Row label="Message">
              <span className="block whitespace-pre-wrap font-mono text-[13px] leading-relaxed">
                {p.body}
              </span>
            </Row>
            <Row label="Media">{p.media.length === 0 ? 'None' : p.media.map((m) => m.filename).join(', ')}</Row>
            <Row label="Segments">
              {(() => {
                const s = smsSegments(p.body);
                return `${s.segments} segment(s) · ${s.chars} characters · ${s.units} ${s.encoding} units`;
              })()}
            </Row>
            <Row label="Opt-out">
              {/STOP/i.test(p.body) ? 'Opt-out language present' : 'Missing opt-out language'}
            </Row>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-border bg-card p-3">
        <h3 className="text-sm font-semibold mb-2">Related records</h3>
        {item.relatedRecords.length === 0 ? (
          <p className="text-sm text-muted-foreground">None linked.</p>
        ) : (
          <div className="divide-y divide-border">
            {item.relatedRecords.map((r) => (
              <Row key={r.label + r.value} label={r.label}>
                {r.value}
              </Row>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-border bg-card p-3">
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
          <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden="true" />
          Risk &amp; sensitivity
        </h3>
        {item.risks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No risk flags on this sample item.</p>
        ) : (
          <ul className="list-disc pl-5 text-sm space-y-1">
            {item.risks.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        )}
      </section>

      <Separator />

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button disabled variant="outline" className="gap-1.5 w-full sm:w-auto">
          <Pencil className="h-4 w-4" aria-hidden="true" /> Edit — {PRAE_DISABLED_LABEL}
        </Button>
        <Button disabled variant="outline" className="gap-1.5 w-full sm:w-auto">
          <X className="h-4 w-4" aria-hidden="true" /> Reject — {PRAE_DISABLED_LABEL}
        </Button>
        <Button disabled className="gap-1.5 w-full sm:w-auto">
          <Check className="h-4 w-4" aria-hidden="true" /> Approve — {PRAE_DISABLED_LABEL}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Any edit invalidates a previous approval, approvals are single-use, and an SMS reply can
        never approve anything — it may only return a secure link to this screen.
      </p>
    </div>
  );
}
