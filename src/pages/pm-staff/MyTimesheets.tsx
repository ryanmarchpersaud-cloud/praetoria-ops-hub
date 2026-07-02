import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTimesheets } from '@/hooks/useTimesheets';
import { CalendarClock } from 'lucide-react';
import { format } from 'date-fns';

function hoursBetween(a: string, b?: string | null) {
  if (!b) return null;
  return ((new Date(b).getTime() - new Date(a).getTime()) / 3_600_000).toFixed(2);
}

export default function PMStaffMyTimesheetsPage() {
  const { data = [], isLoading } = useTimesheets();

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <CalendarClock className="h-5 w-5 text-emerald-700" />
        <h2 className="text-lg font-semibold">My Timesheets</h2>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : data.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No time entries yet.</CardContent></Card>
      ) : (
        data.map((t: any) => {
          const hrs = hoursBetween(t.clock_in, t.clock_out);
          return (
            <Card key={t.id}>
              <CardContent className="p-3 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{format(new Date(t.clock_in), 'EEE MMM d, yyyy')}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(t.clock_in), 'p')} – {t.clock_out ? format(new Date(t.clock_out), 'p') : 'in progress'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-semibold">{hrs ? `${hrs} h` : '—'}</p>
                  <Badge variant={t.status === 'approved' ? 'default' : t.status === 'rejected' ? 'destructive' : 'secondary'} className="text-[10px]">
                    {t.status ?? 'pending'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
