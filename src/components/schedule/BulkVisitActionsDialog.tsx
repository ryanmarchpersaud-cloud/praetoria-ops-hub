import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { XCircle, Archive, EyeOff, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

type Mode = 'hide' | 'keep_visible';
type Action = 'cancel' | 'archive';

interface Props {
  action: Action;
  visits: any[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone?: () => void;
}

/**
 * Bulk cancel or archive selected visits. Preserves records, does NOT touch
 * invoices, job totals, or job costing. Cancelled/archived visits are hidden
 * from worker/subcontractor portals per existing rules.
 */
export function BulkVisitActionsDialog({ action, visits, open, onOpenChange, onDone }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [mode, setMode] = useState<Mode>('hide');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) { setMode('hide'); setReason(''); }
  }, [open]);

  const count = visits.length;
  if (!count) return null;

  const handleConfirm = async () => {
    setBusy(true);
    try {
      const now = new Date().toISOString();
      const { data: ures } = await supabase.auth.getUser();
      const uid = ures?.user?.id ?? null;
      const ids = visits.map(v => v.id);

      let updates: any;
      if (action === 'cancel') {
        updates = {
          visit_status: 'Cancelled',
          cancellation_reason: reason.trim() || null,
          cancelled_at: now,
          cancelled_by: uid,
          hidden_from_schedule: mode === 'hide',
        };
      } else {
        updates = {
          archived_at: now,
          archived_by: uid,
        };
      }

      const { error } = await (supabase as any).from('visits').update(updates).in('id', ids);
      if (error) throw error;

      // Best-effort activity log
      try {
        await (supabase as any).from('activities').insert(
          visits.map(v => ({
            user_id: uid,
            workflow_name: action === 'cancel' ? 'visit_cancelled' : 'visit_archived',
            action_name:
              action === 'cancel'
                ? (mode === 'hide'
                    ? `Bulk cancelled and hid Visit ${v.visit_number}`
                    : `Bulk cancelled Visit ${v.visit_number} (kept visible)`)
                : `Bulk archived Visit ${v.visit_number}`,
            record_type: 'visit',
            record_id: v.id,
            status: 'completed',
            payload_summary: {
              visit_number: v.visit_number,
              service_date: v.service_date,
              bulk: true,
              count,
              reason: action === 'cancel' ? (reason.trim() || null) : null,
            },
          }))
        );
      } catch { /* non-critical */ }

      qc.invalidateQueries({ queryKey: ['visits'] });
      qc.invalidateQueries({ queryKey: ['job_visits'] });
      qc.invalidateQueries({ queryKey: ['property_visits'] });

      toast({
        title: action === 'cancel' ? `${count} visit${count > 1 ? 's' : ''} cancelled` : `${count} visit${count > 1 ? 's' : ''} archived`,
        description: action === 'cancel'
          ? (mode === 'hide' ? 'Hidden from active schedules.' : 'Kept visible in admin schedule.')
          : 'Moved to archive. Toggle "Show archived" to view them.',
      });
      onDone?.();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Bulk action failed', description: err.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const isCancel = action === 'cancel';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isCancel
              ? <><XCircle className="h-4 w-4 text-destructive" /> Cancel {count} visit{count > 1 ? 's' : ''}?</>
              : <><Archive className="h-4 w-4 text-muted-foreground" /> Archive {count} visit{count > 1 ? 's' : ''}?</>}
          </DialogTitle>
          <DialogDescription>
            {isCancel
              ? 'Visit records, photos, notes and time entries are preserved. Quotes, invoices, job value and Job Cost Tracker totals are unchanged.'
              : 'Archived visits are hidden from active lists and worker/subcontractor portals. They can be reinstated at any time.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="rounded-md border p-3 bg-muted/30 max-h-40 overflow-auto">
            <p className="text-xs font-semibold mb-1">Selected visits</p>
            <ul className="text-xs text-muted-foreground space-y-0.5">
              {visits.slice(0, 20).map(v => (
                <li key={v.id}>
                  {v.visit_number} · {v.service_date || '—'} · {v.customers ? `${v.customers.first_name ?? ''} ${v.customers.last_name ?? ''}`.trim() || v.customers.company_name : '—'}
                </li>
              ))}
              {visits.length > 20 && <li>+ {visits.length - 20} more…</li>}
            </ul>
          </div>

          {isCancel && (
            <>
              <div>
                <Label className="text-xs font-semibold">Choose an action</Label>
                <RadioGroup value={mode} onValueChange={(v: Mode) => setMode(v)} className="mt-2 space-y-2">
                  <label htmlFor="bulk-mode-hide" className="flex items-start gap-2 rounded-md border p-2.5 cursor-pointer hover:bg-muted/40 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                    <RadioGroupItem value="hide" id="bulk-mode-hide" className="mt-0.5" />
                    <div className="flex-1">
                      <div className="text-sm font-semibold inline-flex items-center gap-1.5">
                        <EyeOff className="h-3.5 w-3.5" /> Cancel and Hide from Schedule
                        <span className="text-[10px] font-normal text-primary uppercase tracking-wider">Recommended</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Removes from worker/subcontractor portals, Today's Route, and active counts.
                      </p>
                    </div>
                  </label>
                  <label htmlFor="bulk-mode-visible" className="flex items-start gap-2 rounded-md border p-2.5 cursor-pointer hover:bg-muted/40 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                    <RadioGroupItem value="keep_visible" id="bulk-mode-visible" className="mt-0.5" />
                    <div className="flex-1">
                      <div className="text-sm font-semibold inline-flex items-center gap-1.5">
                        <Eye className="h-3.5 w-3.5" /> Cancel but Keep Visible
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Shown in admin Schedule with a red "Cancelled" badge.
                      </p>
                    </div>
                  </label>
                </RadioGroup>
              </div>

              <div>
                <Label htmlFor="bulk-cancel-reason" className="text-xs">Cancellation reason (optional, applied to all)</Label>
                <Textarea
                  id="bulk-cancel-reason"
                  rows={2}
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="e.g. Customer paused service, weather closure, duplicate visits"
                  maxLength={500}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Keep as is
          </Button>
          <Button
            variant={isCancel ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={busy}
          >
            {isCancel
              ? <><XCircle className="h-4 w-4 mr-1" />{mode === 'hide' ? `Cancel & Hide (${count})` : `Cancel (${count})`}</>
              : <><Archive className="h-4 w-4 mr-1" /> Archive ({count})</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
