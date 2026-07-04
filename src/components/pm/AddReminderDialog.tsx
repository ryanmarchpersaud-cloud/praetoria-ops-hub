import { useState, useMemo } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Bell, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import type { PMCalendarEvent } from '@/hooks/pm/usePMCalendar';
import {
  REMINDER_LEAD_TIMES,
  useCreatePMReminder,
  useRemindersForEvent,
} from '@/hooks/pm/usePMReminders';
import { useUserRole } from '@/hooks/useUserRole';

type Props = {
  event: PMCalendarEvent | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  actionUrl?: string;
};

function labelForEventType(t: string) {
  return t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function isUuid(v: string | null | undefined): boolean {
  return !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

export function AddReminderDialog({ event, open, onOpenChange, actionUrl }: Props) {
  const [lead, setLead] = useState<number>(60);
  const { isAdmin, roles } = useUserRole();
  const portal: 'admin' | 'pm_staff' = isAdmin || roles.includes('property_manager') ? 'admin' : 'pm_staff';

  const createMut = useCreatePMReminder();
  const { data: existing = [] } = useRemindersForEvent(event?.event_id);

  const alreadyTakenLeads = useMemo(
    () => new Set(existing.filter((r) => r.status === 'pending').map((r) => r.lead_time_minutes)),
    [existing],
  );

  if (!event) return null;

  const eventStart = new Date(event.start_at);
  const remindPreview = new Date(eventStart.getTime() - lead * 60000);
  const isPast = remindPreview.getTime() < Date.now();
  const dup = alreadyTakenLeads.has(lead);

  const handleCreate = async () => {
    try {
      const res = await createMut.mutateAsync({
        recipient_portal: portal,
        event_source: event.source,
        event_type: event.event_type,
        event_ref: event.event_id,
        related_id: isUuid(event.related_id) ? event.related_id : null,
        property_id: isUuid(event.property_id) ? event.property_id : null,
        unit_id: isUuid(event.unit_id) ? event.unit_id : null,
        tenant_id: isUuid(event.tenant_id) ? event.tenant_id : null,
        owner_id: isUuid(event.owner_id) ? event.owner_id : null,
        event_start_at: event.start_at,
        lead_time_minutes: lead,
        title: `Reminder: ${labelForEventType(event.event_type)}`,
        message: event.title,
        action_url: actionUrl ?? event.action_url ?? null,
      });
      if (res?.is_duplicate) {
        toast.info('A pending reminder already exists for this lead time.');
      } else {
        toast.success('Reminder added.');
      }
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to create reminder');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" /> Add Reminder
          </DialogTitle>
          <DialogDescription>
            Get an in-app notification before this event. No SMS, email, or push in this phase.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="text-sm">
            <div className="font-medium">{event.title}</div>
            <div className="text-xs text-muted-foreground">
              {labelForEventType(event.event_type)} · {eventStart.toLocaleString()}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Remind me</Label>
            <Select value={String(lead)} onValueChange={(v) => setLead(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {REMINDER_LEAD_TIMES.map((o) => (
                  <SelectItem key={o.minutes} value={String(o.minutes)}>
                    <div className="flex items-center gap-2">
                      {o.label}
                      {alreadyTakenLeads.has(o.minutes) && (
                        <Check className="h-3.5 w-3.5 text-emerald-600" aria-label="Already set" />
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="text-xs text-muted-foreground">
            Will notify at: <span className="font-medium text-foreground">{remindPreview.toLocaleString()}</span>
            {isPast && (
              <span className="ml-1 text-amber-600">
                (in the past — it will fire on next calendar load)
              </span>
            )}
          </div>

          {dup && (
            <div className="rounded border bg-muted/50 px-3 py-2 text-xs">
              You already have a pending reminder for this lead time.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={createMut.isPending}>
            {createMut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Add reminder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
