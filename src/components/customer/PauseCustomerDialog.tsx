import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { PauseCircle, PlayCircle, Loader2, CalendarX } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface Props {
  mode: 'pause' | 'unpause';
  customerId: string;
  customerName: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onDone?: () => void;
}

const AUTO_TAG = '[Auto: Customer paused]';

export function PauseCustomerDialog({ mode, customerId, customerName, open, onOpenChange, onDone }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [affectedCount, setAffectedCount] = useState<number | null>(null);
  const [reinstateCount, setReinstateCount] = useState<number | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!open) { setReason(''); setAffectedCount(null); setReinstateCount(null); return; }
    (async () => {
      if (mode === 'pause') {
        const { count } = await supabase
          .from('visits')
          .select('id', { count: 'exact', head: true })
          .eq('customer_id', customerId)
          .gte('service_date', today)
          .not('visit_status', 'in', '(Completed,Cancelled,Skipped)');
        setAffectedCount(count ?? 0);
      } else {
        const { count } = await supabase
          .from('visits')
          .select('id', { count: 'exact', head: true })
          .eq('customer_id', customerId)
          .eq('visit_status', 'Cancelled')
          .gte('service_date', today)
          .ilike('cancellation_reason', `${AUTO_TAG}%`);
        setReinstateCount(count ?? 0);
      }
    })();
  }, [open, mode, customerId, today]);

  const handlePause = async () => {
    setBusy(true);
    try {
      const { data: ures } = await supabase.auth.getUser();
      const uid = ures?.user?.id ?? null;
      const now = new Date().toISOString();
      const fullReason = `${AUTO_TAG} ${reason.trim() || 'Customer paused by admin'}`;

      // 1) Update customer
      const { error: cErr } = await supabase
        .from('customers')
        .update({ customer_status: 'Paused', pause_reason: reason.trim() || null })
        .eq('id', customerId);
      if (cErr) throw cErr;

      // 2) Fetch future non-terminal visits
      const { data: futureVisits, error: vErr } = await supabase
        .from('visits')
        .select('id, visit_number, service_date')
        .eq('customer_id', customerId)
        .gte('service_date', today)
        .not('visit_status', 'in', '(Completed,Cancelled,Skipped)');
      if (vErr) throw vErr;

      const ids = (futureVisits ?? []).map(v => v.id);
      if (ids.length > 0) {
        const { error: uErr } = await supabase
          .from('visits')
          .update({
            visit_status: 'Cancelled',
            cancelled_at: now,
            cancelled_by: uid,
            cancellation_reason: fullReason,
            hidden_from_schedule: true,
          })
          .in('id', ids);
        if (uErr) throw uErr;
      }

      // 3) Activity log (best effort)
      try {
        await (supabase as any).from('activities').insert({
          user_id: uid,
          workflow_name: 'customer_paused',
          action_name: `Paused customer ${customerName} and cancelled ${ids.length} upcoming visit(s)`,
          record_type: 'customer',
          record_id: customerId,
          status: 'completed',
          payload_summary: { cancelled_visit_count: ids.length, reason: reason.trim() || null },
        });
      } catch { /* non-critical */ }

      toast({
        title: 'Customer paused',
        description: `${ids.length} upcoming visit(s) cancelled and hidden. Invoices left unchanged.`,
      });
      qc.invalidateQueries({ queryKey: ['customer', customerId] });
      qc.invalidateQueries({ queryKey: ['visits'] });
      onDone?.();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Pause failed', description: e?.message || 'Try again', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const handleUnpause = async () => {
    setBusy(true);
    try {
      const { data: ures } = await supabase.auth.getUser();
      const uid = ures?.user?.id ?? null;
      const now = new Date().toISOString();

      const { error: cErr } = await supabase
        .from('customers')
        .update({ customer_status: 'Active', pause_reason: null })
        .eq('id', customerId);
      if (cErr) throw cErr;

      // Find future auto-cancelled visits
      const { data: cancelled, error: qErr } = await supabase
        .from('visits')
        .select('id, visit_number')
        .eq('customer_id', customerId)
        .eq('visit_status', 'Cancelled')
        .gte('service_date', today)
        .ilike('cancellation_reason', `${AUTO_TAG}%`);
      if (qErr) throw qErr;

      const ids = (cancelled ?? []).map(v => v.id);
      if (ids.length > 0) {
        const { error: uErr } = await supabase
          .from('visits')
          .update({
            visit_status: 'Scheduled',
            cancelled_at: null,
            cancelled_by: null,
            cancellation_reason: null,
            hidden_from_schedule: false,
            reinstated_at: now,
            reinstated_by: uid,
          } as any)
          .in('id', ids);
        if (uErr) throw uErr;
      }

      try {
        await (supabase as any).from('activities').insert({
          user_id: uid,
          workflow_name: 'customer_unpaused',
          action_name: `Unpaused customer ${customerName} and reinstated ${ids.length} visit(s)`,
          record_type: 'customer',
          record_id: customerId,
          status: 'completed',
          payload_summary: { reinstated_visit_count: ids.length },
        });
      } catch { /* non-critical */ }

      toast({
        title: 'Customer reactivated',
        description: `${ids.length} future visit(s) reinstated. Please review the schedule for conflicts.`,
      });
      qc.invalidateQueries({ queryKey: ['customer', customerId] });
      qc.invalidateQueries({ queryKey: ['visits'] });
      onDone?.();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Unpause failed', description: e?.message || 'Try again', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  if (mode === 'pause') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PauseCircle className="h-4 w-4 text-amber-600" /> Pause {customerName}?
            </DialogTitle>
            <DialogDescription>
              Marks the customer as <strong>Paused</strong> and cancels their upcoming visits.
              Invoices (draft, sent, or paid), quotes, jobs, and past visits are <strong>not</strong> touched.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <div className="rounded-md border p-3 bg-amber-50/50 text-amber-900 flex items-start gap-2">
              <CalendarX className="h-4 w-4 mt-0.5 shrink-0" />
              <div className="text-xs">
                <strong>{affectedCount ?? '…'}</strong> upcoming visit(s) will be cancelled and hidden from the schedule
                and from worker/subcontractor portals. Records are preserved and can be reinstated when you unpause.
              </div>
            </div>

            <div>
              <Label htmlFor="pause-reason" className="text-xs">Pause reason (optional)</Label>
              <Textarea
                id="pause-reason"
                rows={3}
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="e.g. Customer travelling until September, seasonal hold, payment dispute…"
                maxLength={500}
              />
              <p className="text-[11px] text-muted-foreground mt-1">Saved to customer file and each cancelled visit for audit.</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Keep Active</Button>
            <Button onClick={handlePause} disabled={busy} className="bg-amber-600 hover:bg-amber-700 text-white">
              {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <PauseCircle className="h-4 w-4 mr-1" />}
              Pause Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlayCircle className="h-4 w-4 text-emerald-600" /> Reactivate {customerName}?
          </DialogTitle>
          <DialogDescription>
            Sets the customer back to <strong>Active</strong> and reinstates any future visits that were auto-cancelled by the pause.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border p-3 bg-emerald-50/60 text-emerald-900 text-xs">
          <strong>{reinstateCount ?? '…'}</strong> future visit(s) will be brought back to <strong>Scheduled</strong> and shown again on the schedule and worker/subcontractor portals.
          Please review for conflicts afterwards.
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={handleUnpause} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <PlayCircle className="h-4 w-4 mr-1" />}
            Reactivate Customer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
