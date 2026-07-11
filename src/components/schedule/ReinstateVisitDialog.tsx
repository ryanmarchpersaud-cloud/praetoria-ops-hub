import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, CalendarDays, Undo2, Briefcase } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUpdateVisit } from '@/hooks/useVisits';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

interface Props {
  visit: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReinstated?: () => void;
}

export function ReinstateVisitDialog({ visit, open, onOpenChange, onReinstated }: Props) {
  const { toast } = useToast();
  const updateVisit = useUpdateVisit();
  const qc = useQueryClient();

  const originalDate = visit?.service_date as string | undefined;
  const isPast = !!originalDate && originalDate < new Date().toISOString().slice(0, 10);

  const [newDate, setNewDate] = useState<string>(originalDate || '');
  const [reason, setReason] = useState('');
  const [confirmAnyway, setConfirmAnyway] = useState(false);

  useEffect(() => {
    if (open) {
      setNewDate(originalDate || '');
      setReason('');
      setConfirmAnyway(false);
    }
  }, [open, originalDate]);

  // Load parent job to check if cancelled
  const parentJob = visit?.jobs;
  const parentJobCancelled = parentJob?.status === 'Cancelled';

  // Conflict detection: other non-cancelled visits on same job on target date
  const { data: conflicts = [] } = useQuery({
    queryKey: ['reinstate_conflicts', visit?.id, newDate, visit?.job_id],
    queryFn: async () => {
      if (!visit?.id || !newDate) return [] as any[];
      const query = supabase
        .from('visits')
        .select('id, visit_number, visit_status, service_date, job_id')
        .eq('service_date', newDate)
        .neq('id', visit.id)
        .neq('visit_status', 'Cancelled');
      if (visit.job_id) query.eq('job_id', visit.job_id);
      const { data } = await query;
      return data || [];
    },
    enabled: open && !!newDate && !!visit?.id,
  });

  const restoredStatus = useMemo(() => {
    const prior = visit?.status_before_cancellation as string | undefined;
    if (prior && prior !== 'Cancelled' && prior !== 'Completed') return prior;
    return 'Scheduled';
  }, [visit]);

  const hasConflicts = conflicts.length > 0;
  const needsConfirm = hasConflicts && !confirmAnyway;

  const canSubmit = !!newDate && !parentJobCancelled && !needsConfirm && !updateVisit.isPending;

  const handleReinstate = async () => {
    if (!visit?.id || !canSubmit) return;
    try {
      await updateVisit.mutateAsync({
        id: visit.id,
        visit_status: restoredStatus,
        service_date: newDate,
        reinstatement_reason: reason || null,
        // Un-hide and un-archive on reinstate so the visit re-enters
        // active operational views.
        hidden_from_schedule: false,
        archived_at: null,
        archived_by: null,
        reinstated_at: new Date().toISOString(),
      });

      // Activity log (best-effort)
      try {
        const { data: ures } = await supabase.auth.getUser();
        await (supabase as any).from('activities').insert({
          user_id: ures?.user?.id ?? null,
          workflow_name: 'visit_reinstated',
          action_name: `Reinstated Visit ${visit.visit_number}`,
          record_type: 'visit',
          record_id: visit.id,
          status: 'success',
          payload_summary: {
            visit_number: visit.visit_number,
            original_date: originalDate,
            new_date: newDate,
            restored_status: restoredStatus,
            reason: reason || null,
          },
        });
      } catch { /* non-fatal */ }

      toast({ title: 'Visit reinstated', description: `${visit.visit_number} restored to ${restoredStatus}.` });
      qc.invalidateQueries({ queryKey: ['visits'] });
      qc.invalidateQueries({ queryKey: ['visit', visit.id] });
      onReinstated?.();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Reinstate failed', description: err.message, variant: 'destructive' });
    }
  };

  if (!visit) return null;

  const customer = visit.customers;
  const customerLabel = customer
    ? (customer.company_name || `${customer.first_name ?? ''} ${customer.last_name ?? ''}`.trim())
    : (visit.jobs?.job_title || visit.visit_number);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Undo2 className="h-4 w-4" /> Reinstate this visit?
          </DialogTitle>
          <DialogDescription>
            Restores the existing visit record — no new visit is created and pricing is unchanged.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="rounded-md border p-3 space-y-1 bg-muted/30">
            <p className="font-medium">{customerLabel}</p>
            <p className="text-xs text-muted-foreground">
              {visit.visit_number}
              {visit.jobs?.job_title && ` · ${visit.jobs.job_title}`}
            </p>
            <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              Original date: {originalDate ? format(parseISO(originalDate + 'T12:00:00'), 'EEE, MMM d, yyyy') : '—'}
            </p>
            <p className="text-xs">
              <span className="text-muted-foreground">Currently:</span>{' '}
              <span className="font-semibold text-destructive">Cancelled</span>
            </p>
            {visit.cancellation_reason && (
              <p className="text-xs text-muted-foreground">Reason: {visit.cancellation_reason}</p>
            )}
            <p className="text-xs">
              <span className="text-muted-foreground">Will restore to:</span>{' '}
              <span className="font-semibold">{restoredStatus}</span>
            </p>
          </div>

          {parentJobCancelled && (
            <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 text-xs space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-amber-800 dark:text-amber-300">
                  This visit belongs to a cancelled job. Reinstate the job before restoring this visit.
                </p>
              </div>
              {parentJob?.id && (
                <Button asChild size="sm" variant="outline" className="w-full">
                  <Link to={`/jobs/${parentJob.id}`} onClick={() => onOpenChange(false)}>
                    <Briefcase className="h-3.5 w-3.5 mr-1" /> Open Cancelled Job
                  </Link>
                </Button>
              )}
            </div>
          )}

          {!parentJobCancelled && (
            <>
              {isPast && (
                <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-2 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>The original scheduled date is in the past. Reinstate on that date or pick a new one.</span>
                </div>
              )}

              <div>
                <Label className="text-xs">Scheduled date</Label>
                <Input
                  type="date"
                  value={newDate}
                  onChange={(e) => { setNewDate(e.target.value); setConfirmAnyway(false); }}
                />
              </div>

              {hasConflicts && (
                <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 text-xs space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-amber-800 dark:text-amber-300">
                      <p className="font-semibold">Conflict on this date</p>
                      <p>The same job already has {conflicts.length} active visit{conflicts.length > 1 ? 's' : ''} on this date:</p>
                      <ul className="mt-1 list-disc pl-4">
                        {conflicts.map((c: any) => (
                          <li key={c.id}>{c.visit_number} — {c.visit_status}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-amber-900 dark:text-amber-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmAnyway}
                      onChange={(e) => setConfirmAnyway(e.target.checked)}
                    />
                    Reinstate anyway
                  </label>
                </div>
              )}

              <div>
                <Label className="text-xs">Reason for reinstatement (optional)</Label>
                <Textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Visit was cancelled by mistake"
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleReinstate} disabled={!canSubmit}>
            <Undo2 className="h-4 w-4 mr-1" /> Reinstate Visit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
