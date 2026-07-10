import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Undo2, ClipboardCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUpdateJob } from '@/hooks/useJobs';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

interface Props {
  job: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReinstateJobDialog({ job, open, onOpenChange }: Props) {
  const { toast } = useToast();
  const updateJob = useUpdateJob();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [reason, setReason] = useState('');
  const [step, setStep] = useState<'confirm' | 'visits'>('confirm');

  useEffect(() => {
    if (open) { setReason(''); setStep('confirm'); }
  }, [open]);

  const restoredStatus = useMemo(() => {
    const prior = job?.status_before_cancellation as string | undefined;
    if (prior && prior !== 'Cancelled' && prior !== 'Completed' && prior !== 'Closed') return prior;
    return 'Scheduled';
  }, [job]);

  // Count cancelled future visits for the post-reinstate prompt
  const { data: cancelledVisits = [] } = useQuery({
    queryKey: ['job_cancelled_visits', job?.id],
    queryFn: async () => {
      if (!job?.id) return [] as any[];
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from('visits')
        .select('id, visit_number, service_date')
        .eq('job_id', job.id)
        .eq('visit_status', 'Cancelled')
        .gte('service_date', today);
      return data || [];
    },
    enabled: open && !!job?.id,
  });

  const handleReinstate = async () => {
    if (!job?.id) return;
    try {
      await updateJob.mutateAsync({
        id: job.id,
        status: restoredStatus,
        reinstatement_reason: reason || null,
      });
      try {
        const { data: ures } = await supabase.auth.getUser();
        await (supabase as any).from('activities').insert({
          user_id: ures?.user?.id ?? null,
          workflow_name: 'job_reinstated',
          action_name: `Reinstated Job ${job.job_number}`,
          record_type: 'job',
          record_id: job.id,
          status: 'success',
          payload_summary: {
            job_number: job.job_number,
            restored_status: restoredStatus,
            reason: reason || null,
          },
        });
      } catch { /* non-fatal */ }
      toast({ title: 'Job reinstated', description: `${job.job_number} restored to ${restoredStatus}.` });
      qc.invalidateQueries({ queryKey: ['jobs'] });
      qc.invalidateQueries({ queryKey: ['job', job.id] });
      qc.invalidateQueries({ queryKey: ['job_visits', job.id] });

      if (cancelledVisits.length > 0) {
        setStep('visits');
      } else {
        onOpenChange(false);
      }
    } catch (err: any) {
      toast({ title: 'Reinstate failed', description: err.message, variant: 'destructive' });
    }
  };

  if (!job) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {step === 'confirm' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Undo2 className="h-4 w-4" /> Reinstate this job?
              </DialogTitle>
              <DialogDescription>
                Restores the existing job — no new job is created and pricing is unchanged.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-sm">
              <div className="rounded-md border p-3 space-y-1 bg-muted/30">
                <p className="font-medium">{job.job_title}</p>
                <p className="text-xs text-muted-foreground">{job.job_number}</p>
                <p className="text-xs">
                  <span className="text-muted-foreground">Currently:</span>{' '}
                  <span className="font-semibold text-destructive">Cancelled</span>
                </p>
                {job.cancellation_reason && (
                  <p className="text-xs text-muted-foreground">Reason: {job.cancellation_reason}</p>
                )}
                <p className="text-xs">
                  <span className="text-muted-foreground">Will restore to:</span>{' '}
                  <span className="font-semibold">{restoredStatus}</span>
                </p>
              </div>

              <div>
                <Label className="text-xs">Reason for reinstatement (optional)</Label>
                <Textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Job was cancelled by mistake"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleReinstate} disabled={updateJob.isPending}>
                <Undo2 className="h-4 w-4 mr-1" /> Reinstate Job
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'visits' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4" /> Review cancelled visits?
              </DialogTitle>
              <DialogDescription>
                This job has {cancelledVisits.length} cancelled future visit{cancelledVisits.length > 1 ? 's' : ''}. They were not automatically restored.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Keep Visits Cancelled</Button>
              <Button onClick={() => { onOpenChange(false); navigate(`/jobs/${job.id}`); }}>
                Review Cancelled Visits
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
