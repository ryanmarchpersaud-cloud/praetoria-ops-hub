// Phase 1G — mobile-first approval inbox.
//
// One screen, thumb-sized targets, five sections. Everything is read under the
// signed-in user's own row-level security; no content is fetched for anyone
// who is not an owner or admin.
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { usePraeApprovals, type PraeApprovalRow } from '@/hooks/usePraeLive';
import { AlertTriangle, ChevronRight, Clock, Mail } from 'lucide-react';

type Section = {
  key: string;
  title: string;
  match: (a: PraeApprovalRow) => boolean;
};

const SECTIONS: Section[] = [
  { key: 'new', title: 'New', match: (a) => a.state === 'pending' && !(a as unknown as { viewed_at?: string }).viewed_at },
  { key: 'approval', title: 'Needs approval', match: (a) => a.state === 'pending' && !!(a as unknown as { viewed_at?: string }).viewed_at },
  { key: 'approved', title: 'Approved', match: (a) => a.state === 'approved' && a.execution_state !== 'sent' && a.execution_state !== 'failed' },
  { key: 'completed', title: 'Completed', match: (a) => a.execution_state === 'sent' },
  { key: 'attention', title: 'Failed / needs attention', match: (a) => a.execution_state === 'failed' || a.state === 'expired' || a.state === 'invalidated' },
];

function when(iso: string | null | undefined) {
  return iso ? new Date(iso).toLocaleString('en-CA') : '—';
}

function ApprovalCard({ a }: { a: PraeApprovalRow }) {
  const extra = a as unknown as { action_type?: string; urgent?: boolean; viewed_at?: string | null };
  const binding = (a.content_binding ?? {}) as { to?: string[]; subject?: string };
  const unread = a.state === 'pending' && !extra.viewed_at;
  const expiring = a.state === 'pending' && new Date(a.expires_at).getTime() - Date.now() < 5 * 60_000;
  return (
    <Link to={`/prae/approvals/${a.id}`} className="block">
      <Card
        className={`p-4 active:scale-[0.99] transition-transform ${
          unread ? 'border-primary/60 bg-primary/[0.03]' : ''
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 shrink-0">
            {extra.urgent ? (
              <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />
            ) : (
              <Mail className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {unread && <Badge className="text-[10px]">Unread</Badge>}
              {extra.urgent && <Badge variant="destructive" className="text-[10px]">Urgent</Badge>}
              <Badge variant="outline" className="text-[10px]">{extra.action_type ?? a.channel}</Badge>
              <Badge variant="outline" className="text-[10px]">{a.division}</Badge>
            </div>
            <p className="mt-1.5 truncate text-sm font-semibold">
              {binding.subject || '(no subject)'}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              To {binding.to?.join(', ') || '—'}
            </p>
            <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="h-3 w-3" aria-hidden="true" />
              {when(a.created_at)}
              {a.state === 'pending' && (
                <span className={expiring ? 'text-destructive font-medium' : ''}>
                  {' '}· expires {when(a.expires_at)}
                </span>
              )}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        </div>
      </Card>
    </Link>
  );
}

export default function PraeApprovalInbox() {
  const approvals = usePraeApprovals(true);
  const rows = useMemo(() => approvals.data ?? [], [approvals.data]);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-4 pb-24">
      <header>
        <h1 className="text-xl font-bold">Approvals</h1>
        <p className="text-sm text-muted-foreground">
          Everything Prae has prepared. Nothing sends until you approve it here.
        </p>
      </header>

      {approvals.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {approvals.isError && (
        <p className="text-sm text-destructive">This area is limited to owners and admins.</p>
      )}

      {!approvals.isLoading &&
        !approvals.isError &&
        SECTIONS.map((section) => {
          const items = rows.filter(section.match);
          if (items.length === 0) return null;
          return (
            <section key={section.key} className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {section.title} ({items.length})
              </h2>
              {items.map((a) => (
                <ApprovalCard key={a.id} a={a} />
              ))}
            </section>
          );
        })}

      {!approvals.isLoading && !approvals.isError && rows.length === 0 && (
        <p className="py-10 text-center text-sm text-muted-foreground">Nothing waiting on you.</p>
      )}
    </div>
  );
}
