import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { XCircle, EyeOff, Eye, CalendarDays } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useUpdateVisit } from '@/hooks/useVisits';
import { useToast } from '@/hooks/use-toast';

interface Props {
  visit: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancelled?: () => void;
}

type Mode = 'hide' | 'keep_visible';

/**
 * Confirmation dialog for cancelling a visit.
 * Additive: does NOT change quote/invoice/job/Job Cost Tracker values.
 * Recommended default action: cancel + hide from active schedules and
 * worker/subcontractor portals; record is preserved for admin history
 * and can be reinstated.
 */
export function CancelVisitDialog({ visit, open, onOpenChange, onCancelled }: Props) {
  const { toast } = useToast();
  const updateVisit = useUpdateVisit();
  const [mode, setMode] = useState<Mode>('hide');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) {
      setMode('hide');
      setReason('');
    }
  }, [open]);

  if (!visit) return null;

  const customer = visit.customers;
  const customerLabel = customer
    ? (customer.company_name || `${customer.first_name ?? ''} ${customer.last_name ?? ''}`.trim())
    : (visit.jobs?.job_title || visit.visit_number);
  const workers = (visit.crew_names ?? []).concat(visit.worker_profiles?.full_name ? [visit.worker_profiles.full_name] : []);
  const subs = visit.subcontractor_names ?? [];
  const assignmentSummary = [...new Set([...workers, ...subs])].filter(Boolean).join(', ') || 'Unassigned';

  const handleConfirm = async () => {
    try {
      const now = new Date().toISOString();
      const { data: ures } = await supabase.auth.getUser();
      await updateVisit.mutateAsync({
        id: visit.id,
        visit_status: 'Cancelled',
        cancellation_reason: reason.trim() || null,
        cancelled_at: now,
        cancelled_by: ures?.user?.id ?? null,
        hidden_from_schedule: mode === 'hide',
      });

      // Activity log — best effort
      try {
        await (supabase as any).from('activities').insert({
          user_id: ures?.user?.id ?? null,
          workflow_name: 'visit_cancelled',
          action_name:
            mode === 'hide'
              ? `Cancelled and hid Visit ${visit.visit_number} from active schedules`
              : `Cancelled Visit ${visit.visit_number} (kept visible)`,
          record_type: 'visit',
          record_id: visit.id,
          status: 'completed',
          payload_summary: {
            visit_number: visit.visit_number,
            service_date: visit.service_date,
            hidden: mode === 'hide',
            reason: reason.trim() || null,
          },
        });
      } catch { /* non-critical */ }

      toast({
        title: 'Visit cancelled',
        description:
          mode === 'hide'
            ? `${visit.visit_number} hidden from active schedules.`
            : `${visit.visit_number} cancelled and kept visible.`,
      });
      onCancelled?.();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Cancel failed', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-destructive" /> Cancel this visit?
          </DialogTitle>
          <DialogDescription>
            The visit record, photos, notes and time entries are preserved.
            Quotes, invoices, job value and Job Cost Tracker totals are unchanged.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="rounded-md border p-3 bg-muted/30 space-y-1">
            <p className="font-medium">{customerLabel}</p>
            <p className="text-xs text-muted-foreground">
              {visit.visit_number}
              {visit.jobs?.job_number && ` · ${visit.jobs.job_number}`}
              {visit.jobs?.job_title && ` — ${visit.jobs.job_title}`}
            </p>
            <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {visit.service_date
                ? format(parseISO(visit.service_date + 'T12:00:00'), 'EEE, MMM d, yyyy')
                : '—'}
            </p>
            <p className="text-xs text-muted-foreground">Assigned: {assignmentSummary}</p>
          </div>

          <div>
            <Label className="text-xs font-semibold">Choose an action</Label>
            <RadioGroup value={mode} onValueChange={(v: Mode) => setMode(v)} className="mt-2 space-y-2">
              <label htmlFor="mode-hide" className="flex items-start gap-2 rounded-md border p-2.5 cursor-pointer hover:bg-muted/40 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                <RadioGroupItem value="hide" id="mode-hide" className="mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-semibold inline-flex items-center gap-1.5">
                    <EyeOff className="h-3.5 w-3.5" /> Cancel and Hide from Schedule
                    <span className="text-[10px] font-normal text-primary uppercase tracking-wider">Recommended</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Removes from worker/subcontractor portals, Today's Route, and active counts.
                    Admin can still find it under "Show Cancelled".
                  </p>
                </div>
              </label>
              <label htmlFor="mode-visible" className="flex items-start gap-2 rounded-md border p-2.5 cursor-pointer hover:bg-muted/40 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                <RadioGroupItem value="keep_visible" id="mode-visible" className="mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-semibold inline-flex items-center gap-1.5">
                    <Eye className="h-3.5 w-3.5" /> Cancel but Keep Visible
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Shown in admin Schedule with a red "Cancelled" badge. Still hidden
                    from worker and subcontractor portals.
                  </p>
                </div>
              </label>
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="cancel-reason" className="text-xs">Cancellation reason (optional)</Label>
            <Textarea
              id="cancel-reason"
              rows={2}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Customer rescheduled, weather delay, duplicate visit"
              maxLength={500}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Keep Visit Active
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={updateVisit.isPending}>
            <XCircle className="h-4 w-4 mr-1" />
            {mode === 'hide' ? 'Cancel and Hide' : 'Cancel Visit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
