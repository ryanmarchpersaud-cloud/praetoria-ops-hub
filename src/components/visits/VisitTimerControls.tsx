import { useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  useVisitPauses,
  usePauseVisit,
  useResumeVisit,
  findOpenPause,
  PAUSE_REASONS,
  type PauseReason,
} from '@/hooks/useVisitPauses';

interface VisitTimerControlsProps {
  visitId: string;
  /** Only rendered while the visit is actively In Progress (arrival set, no completion). */
  active: boolean;
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}

/**
 * Pause / Resume controls for the on-site visit timer.
 * Additive: does NOT modify visit arrival_time / completion_time.
 */
export function VisitTimerControls({
  visitId,
  active,
  size = 'lg',
  className,
}: VisitTimerControlsProps) {
  const { toast } = useToast();
  const { data: pauses = [] } = useVisitPauses(visitId);
  const pauseMut = usePauseVisit(visitId);
  const resumeMut = useResumeVisit(visitId);

  const openPause = findOpenPause(pauses);
  const isPaused = !!openPause;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [reason, setReason] = useState<PauseReason>('Break');
  const [note, setNote] = useState('');

  if (!active) return null;

  const handleConfirmPause = async () => {
    try {
      await pauseMut.mutateAsync({ reason, note });
      toast({ title: 'Timer paused', description: `${reason}${note ? ` — ${note}` : ''}` });
      setDialogOpen(false);
      setNote('');
    } catch (e: any) {
      toast({
        title: 'Could not pause',
        description: e?.message ?? 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleResume = async () => {
    if (resumeMut.isPending) return;
    try {
      await resumeMut.mutateAsync();
      toast({ title: 'Timer resumed' });
    } catch (e: any) {
      toast({
        title: 'Could not resume',
        description: e?.message ?? 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      {isPaused ? (
        <Button
          type="button"
          size={size}
          onClick={handleResume}
          disabled={resumeMut.isPending}
          className={
            'w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white ' + (className ?? '')
          }
        >
          <Play className="h-4 w-4" />
          Resume Work
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size={size}
          onClick={() => setDialogOpen(true)}
          disabled={pauseMut.isPending}
          className={
            'w-full gap-2 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/40 ' +
            (className ?? '')
          }
        >
          <Pause className="h-4 w-4" />
          Pause Timer
        </Button>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pause Timer</DialogTitle>
            <DialogDescription>
              Time on site keeps running for the record, but paused minutes are shown
              separately from net worked time.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="pause-reason">Reason</Label>
              <Select value={reason} onValueChange={v => setReason(v as PauseReason)}>
                <SelectTrigger id="pause-reason">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAUSE_REASONS.map(r => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pause-note">Note (optional)</Label>
              <Textarea
                id="pause-note"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="e.g. Hydraulic hose repair, waiting for part, 30-min lunch"
                rows={3}
                maxLength={500}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmPause} disabled={pauseMut.isPending}>
              {pauseMut.isPending ? 'Pausing…' : 'Pause Timer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
