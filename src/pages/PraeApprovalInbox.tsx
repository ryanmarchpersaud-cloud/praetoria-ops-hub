// Phase 1G — mobile-first approval inbox.
//
// One screen, thumb-sized targets, five sections. Everything is read under the
// signed-in user's own row-level security; no content is fetched for anyone
// who is not an owner or admin.
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  useDeletePraeApproval, useDeletePraeApprovals, usePraeApprovals, type PraeApprovalRow,
} from '@/hooks/usePraeLive';
import { AlertTriangle, ChevronRight, Clock, Mail, Trash2 } from 'lucide-react';

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

/** Cleared by the "Clear old items" button. */
const CLEARABLE_STATES = ['expired', 'invalidated', 'rejected', 'approved'];

function when(iso: string | null | undefined) {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return 'never';
  return new Date(iso).toLocaleString('en-CA');
}

function isNeverExpires(iso: string | null | undefined) {
  return !iso || !Number.isFinite(new Date(iso).getTime());
}

function ApprovalCard({ a, onDelete }: { a: PraeApprovalRow; onDelete: (a: PraeApprovalRow) => void }) {
  const extra = a as unknown as { action_type?: string; urgent?: boolean; viewed_at?: string | null };
  const binding = (a.content_binding ?? {}) as { to?: string[]; subject?: string };
  const unread = a.state === 'pending' && !extra.viewed_at;
  const expiring =
    a.state === 'pending' &&
    !isNeverExpires(a.expires_at) &&
    new Date(a.expires_at).getTime() - Date.now() < 5 * 60_000;
  return (
    <Card
      className={`relative p-4 transition-transform active:scale-[0.99] ${
        unread ? 'border-primary/60 bg-primary/[0.03]' : ''
      }`}
    >
      <Link to={`/prae/approvals/${a.id}`} className="block">
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
              {a.state === 'pending' && !isNeverExpires(a.expires_at) && (
                <span className={expiring ? 'font-medium text-destructive' : ''}>
                  {' '}· expires {when(a.expires_at)}
                </span>
              )}
            </p>
          </div>
          <ChevronRight className="mr-8 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        </div>
      </Link>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label="Delete this approval"
        className="absolute right-2 top-2 h-8 w-8 text-muted-foreground hover:text-destructive"
        onClick={() => onDelete(a)}
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </Button>
    </Card>
  );
}

export default function PraeApprovalInbox() {
  const approvals = usePraeApprovals(true);
  const rows = useMemo(() => approvals.data ?? [], [approvals.data]);
  const { toast } = useToast();
  const deleteOne = useDeletePraeApproval();
  const deleteMany = useDeletePraeApprovals();
  const [pendingDelete, setPendingDelete] = useState<PraeApprovalRow | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const clearableCount = rows.filter((r) => CLEARABLE_STATES.includes(r.state)).length;

  async function runDelete(id: string) {
    try {
      const res = await deleteOne.mutateAsync(id);
      if (!res?.ok) {
        toast({ title: 'Could not delete', description: res?.reason ?? 'unknown', variant: 'destructive' });
        return;
      }
      toast({ title: 'Deleted' });
    } catch (error) {
      toast({ title: 'Could not delete', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setPendingDelete(null);
    }
  }

  async function runClear() {
    try {
      const res = await deleteMany.mutateAsync(CLEARABLE_STATES);
      if (!res?.ok) {
        toast({ title: 'Could not clear', description: res?.reason ?? 'unknown', variant: 'destructive' });
        return;
      }
      toast({ title: `Cleared ${res.deleted ?? 0} item(s)` });
    } catch (error) {
      toast({ title: 'Could not clear', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setConfirmClear(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-4 pb-24">
      <header className="space-y-2">
        <h1 className="text-xl font-bold">Approvals</h1>
        <p className="text-sm text-muted-foreground">
          Everything Prae has prepared. Nothing sends until you approve it here. Items no longer expire.
        </p>
        {clearableCount > 0 && (
          <Button variant="outline" size="sm" onClick={() => setConfirmClear(true)}>
            <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
            Clear old items ({clearableCount})
          </Button>
        )}
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
                <ApprovalCard key={a.id} a={a} onDelete={setPendingDelete} />
              ))}
            </section>
          );
        })}

      {!approvals.isLoading && !approvals.isError && rows.length === 0 && (
        <p className="py-10 text-center text-sm text-muted-foreground">Nothing waiting on you.</p>
      )}

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => { if (!o) setPendingDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this approval?</AlertDialogTitle>
            <AlertDialogDescription>
              The item and its audit trail are removed permanently. Nothing is sent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => pendingDelete && runDelete(pendingDelete.id)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear old items?</AlertDialogTitle>
            <AlertDialogDescription>
              Deletes every expired, invalidated, rejected and already-approved item. Items still
              waiting on you are kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={runClear}>Clear</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
