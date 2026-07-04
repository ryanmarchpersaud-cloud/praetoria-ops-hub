import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PMCalendarEvent } from '@/hooks/pm/usePMCalendar';

type Props = {
  event: PMCalendarEvent | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Optional preset target date (e.g. from a drag-drop). Preserves original time of day. */
  presetDate?: Date | null;
};

// Map event_type -> RPC source + optional field selector config
function sourceFor(evt: PMCalendarEvent): { source: string; fieldOptions?: { value: string; label: string }[] } | null {
  switch (evt.event_type) {
    case 'showing':            return { source: 'showing' };
    case 'inspection':         return { source: 'inspection' };
    case 'move_out':           return { source: 'move_out', fieldOptions: [
      { value: 'move_out_date', label: 'Move-out date' },
      { value: 'inspection_date', label: 'Move-out inspection date' },
    ]};
    case 'staff_task':         return { source: 'staff_task', fieldOptions: [
      { value: 'due_date', label: 'Due date' },
      { value: 'reminder_at', label: 'Reminder time' },
    ]};
    case 'owner_approval_due': return { source: 'owner_approval' };
    default: return null;
  }
}

export function isReschedulable(evt: PMCalendarEvent): boolean {
  return sourceFor(evt) !== null;
}

export function RescheduleEventDialog({ event, open, onOpenChange, presetDate }: Props) {
  const qc = useQueryClient();
  const cfg = event ? sourceFor(event) : null;
  const initial = event ? new Date(event.start_at) : new Date();

  const [date, setDate] = useState<Date | undefined>(initial);
  const [time, setTime] = useState<string>(format(initial, 'HH:mm'));
  const [field, setField] = useState<string>(cfg?.fieldOptions?.[0]?.value ?? '');
  const [saving, setSaving] = useState(false);

  // Re-init when event changes or a preset drop-target date is supplied
  useMemo(() => {
    if (!event) return;
    const orig = new Date(event.start_at);
    let d = orig;
    if (presetDate) {
      // Preserve original time-of-day on the new date
      d = new Date(presetDate);
      d.setHours(orig.getHours(), orig.getMinutes(), 0, 0);
    }
    setDate(d);
    setTime(format(d, 'HH:mm'));
    setField(sourceFor(event)?.fieldOptions?.[0]?.value ?? '');
  }, [event?.event_id, presetDate?.getTime()]);

  if (!event || !cfg) return null;

  const newStart = useMemo(() => {
    if (!date) return null;
    const [h, m] = (time || '00:00').split(':').map(Number);
    const d = new Date(date);
    if (event.all_day) {
      d.setHours(0, 0, 0, 0);
    } else {
      d.setHours(h ?? 0, m ?? 0, 0, 0);
    }
    return d;
  }, [date, time, event.all_day]);

  const oldLabel = event.all_day
    ? format(new Date(event.start_at), 'PPP')
    : format(new Date(event.start_at), 'PPP · p');
  const newLabel = newStart
    ? (event.all_day ? format(newStart, 'PPP') : format(newStart, 'PPP · p'))
    : '—';

  const handleSave = async () => {
    if (!newStart) return;
    setSaving(true);
    try {
      const { error } = await (supabase as any).rpc('pm_reschedule_event', {
        p_source: cfg.source,
        p_id: event.related_id ?? event.event_id.split(':')[1],
        p_new_start: newStart.toISOString(),
        p_field: cfg.fieldOptions ? field : null,
      });
      if (error) throw error;
      toast.success('Rescheduled');
      qc.invalidateQueries({ queryKey: ['pm-calendar'] });
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to reschedule');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reschedule {event.event_type.replace(/_/g, ' ')}</DialogTitle>
          <DialogDescription className="truncate">{event.title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {cfg.fieldOptions && (
            <div className="space-y-1.5">
              <Label>Field to update</Label>
              <Select value={field} onValueChange={setField}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {cfg.fieldOptions.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>New date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn('w-full justify-start text-left font-normal', !date && 'text-muted-foreground')}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                  className={cn('p-3 pointer-events-auto')}
                />
              </PopoverContent>
            </Popover>
          </div>

          {!event.all_day && field !== 'due_date' && (
            <div className="space-y-1.5">
              <Label>New time</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          )}

          <div className="rounded-md border bg-muted/40 p-3 text-xs space-y-1">
            <div><span className="text-muted-foreground">From:</span> {oldLabel}</div>
            <div><span className="text-muted-foreground">To:</span> <span className="font-medium">{newLabel}</span></div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !newStart}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Confirm reschedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
