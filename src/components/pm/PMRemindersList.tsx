import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, X, ChevronRight, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { usePMReminders, useCancelPMReminder } from '@/hooks/pm/usePMReminders';

function fmt(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

function leadLabel(mins: number) {
  if (mins === 0) return 'At event time';
  if (mins < 60) return `${mins} min before`;
  if (mins < 60 * 24) return `${mins / 60} hr before`;
  const days = mins / (60 * 24);
  return days === 1 ? '1 day before' : days === 7 ? '1 week before' : `${days} days before`;
}

export function PMRemindersList() {
  const { data: reminders = [], isLoading } = usePMReminders({ includeAll: false });
  const cancelMut = useCancelPMReminder();

  const handleCancel = async (id: string) => {
    try {
      await cancelMut.mutateAsync(id);
      toast.success('Reminder cancelled');
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to cancel reminder');
    }
  };

  if (isLoading) {
    return (
      <Card><CardContent className="p-8 flex items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading reminders…
      </CardContent></Card>
    );
  }

  if (!reminders.length) {
    return (
      <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
        <Bell className="h-8 w-8 mx-auto mb-2 opacity-40" />
        No pending reminders. Add one from a calendar event.
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-2">
      {reminders.map((r) => (
        <Card key={r.id}>
          <CardContent className="p-3 flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg border flex items-center justify-center bg-primary/5 text-primary">
              <Bell className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium truncate">{r.message}</p>
                <Badge variant="outline" className="text-[10px]">{leadLabel(r.lead_time_minutes)}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Event: {fmt(r.event_start_at)} · Notify at {fmt(r.remind_at)}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {r.action_url && (
                <Button asChild variant="ghost" size="sm">
                  <Link to={r.action_url}>Open <ChevronRight className="h-3.5 w-3.5 ml-1" /></Link>
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => handleCancel(r.id)} disabled={cancelMut.isPending}>
                <X className="h-3.5 w-3.5 mr-1" /> Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
