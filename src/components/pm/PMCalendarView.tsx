import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Calendar as CalendarIcon, ChevronRight, ClipboardCheck, KeyRound,
  CalendarClock, ShieldCheck, Wrench, Home, ListChecks, Loader2,
} from 'lucide-react';
import { usePMCalendar, type PMCalendarEvent } from '@/hooks/pm/usePMCalendar';
import { RescheduleEventDialog, isReschedulable } from '@/components/pm/RescheduleEventDialog';

const TYPE_META: Record<string, { label: string; color: string; icon: any }> = {
  showing:              { label: 'Showing',        color: 'bg-blue-100 text-blue-800 border-blue-200',       icon: Home },
  inspection:           { label: 'Inspection',     color: 'bg-purple-100 text-purple-800 border-purple-200', icon: ClipboardCheck },
  move_in:              { label: 'Move-In',        color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: KeyRound },
  move_out:             { label: 'Move-Out',       color: 'bg-orange-100 text-orange-800 border-orange-200', icon: KeyRound },
  lease_renewal:        { label: 'Lease Renewal',  color: 'bg-amber-100 text-amber-800 border-amber-200',   icon: CalendarClock },
  staff_task:           { label: 'Task',           color: 'bg-slate-100 text-slate-800 border-slate-200',   icon: ListChecks },
  owner_approval_due:   { label: 'Owner Approval', color: 'bg-rose-100 text-rose-800 border-rose-200',      icon: ShieldCheck },
  work_order_appointment:{ label: 'Work Order',    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',icon: Wrench },
  maintenance_follow_up:{ label: 'Maintenance',    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',icon: Wrench },
  general_pm:           { label: 'PM Event',       color: 'bg-slate-100 text-slate-800 border-slate-200',   icon: CalendarIcon },
};

function fmtDate(iso: string, allDay: boolean) {
  const d = new Date(iso);
  const date = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  if (allDay) return date;
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${date} · ${time}`;
}

function bucketOf(iso: string): 'today' | 'week' | 'later' | 'past' {
  const d = new Date(iso);
  const now = new Date();
  const startToday = new Date(now); startToday.setHours(0,0,0,0);
  const endToday = new Date(startToday); endToday.setDate(endToday.getDate()+1);
  const endWeek = new Date(startToday); endWeek.setDate(endWeek.getDate()+7);
  if (d < startToday) return 'past';
  if (d < endToday) return 'today';
  if (d < endWeek) return 'week';
  return 'later';
}

type Props = {
  variant?: 'admin' | 'staff';
  heading?: string;
  subheading?: string;
};

export function PMCalendarView({ variant = 'admin', heading, subheading }: Props) {
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [rescheduleEvent, setRescheduleEvent] = useState<PMCalendarEvent | null>(null);

  const range = useMemo(() => {
    const start = new Date();
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setDate(end.getDate() + 60);
    end.setHours(23, 59, 59, 999);
    return { startISO: start.toISOString(), endISO: end.toISOString() };
  }, []);

  const { data, isLoading, error } = usePMCalendar(range.startISO, range.endISO);

  const filtered = useMemo(() => {
    const rows = data ?? [];
    return rows
      .filter((e) => typeFilter === 'all' || e.event_type === typeFilter)
      .filter((e) => statusFilter === 'all' || (e.status ?? '').toLowerCase() === statusFilter)
      .filter((e) => !search || e.title.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
  }, [data, typeFilter, statusFilter, search]);

  const groups = useMemo(() => {
    const g: Record<string, PMCalendarEvent[]> = { today: [], week: [], later: [], past: [] };
    for (const e of filtered) g[bucketOf(e.start_at)].push(e);
    return g;
  }, [filtered]);

  const countByType = useMemo(() => {
    const c: Record<string, number> = {};
    for (const e of data ?? []) c[e.event_type] = (c[e.event_type] ?? 0) + 1;
    return c;
  }, [data]);

  const renderCard = (e: PMCalendarEvent) => {
    const meta = TYPE_META[e.event_type] ?? TYPE_META.general_pm;
    const Icon = meta.icon;
    return (
      <Card key={e.event_id} className="hover:shadow-sm transition-shadow">
        <CardContent className="p-4 flex items-start gap-3">
          <div className={`h-10 w-10 rounded-lg border flex items-center justify-center ${meta.color}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium text-sm truncate">{e.title}</p>
              <Badge variant="outline" className={`${meta.color} text-[10px]`}>{meta.label}</Badge>
              {e.status && <Badge variant="secondary" className="text-[10px]">{e.status}</Badge>}
              {e.priority && e.priority !== 'normal' && (
                <Badge variant="outline" className="text-[10px]">{e.priority}</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{fmtDate(e.start_at, e.all_day)}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {isReschedulable(e) && (e.status ?? '').toLowerCase() !== 'completed' && (e.status ?? '').toLowerCase() !== 'cancelled' && (
              <Button variant="outline" size="sm" onClick={() => setRescheduleEvent(e)}>
                Reschedule
              </Button>
            )}
            {e.action_url && (
              <Button asChild variant="ghost" size="sm">
                <Link to={e.action_url}>Open <ChevronRight className="h-3.5 w-3.5 ml-1" /></Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const section = (label: string, key: 'today' | 'week' | 'later' | 'past') => {
    const items = groups[key];
    if (!items.length) return null;
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">{label}</h3>
          <span className="text-xs text-muted-foreground">{items.length}</span>
        </div>
        <div className="space-y-2">{items.map(renderCard)}</div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-primary" />
            {heading ?? (variant === 'staff' ? 'My Schedule' : 'PM Calendar')}
          </h1>
          {subheading && <p className="text-sm text-muted-foreground">{subheading}</p>}
        </div>
      </div>

      <Card>
        <CardContent className="p-3 flex flex-wrap gap-2 items-center">
          <Input
            placeholder="Search events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs h-9"
          />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-9 w-[180px]"><SelectValue placeholder="Event type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {Object.entries(TYPE_META).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v.label}{countByType[k] ? ` (${countByType[k]})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="in_progress">In progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm p-6 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading calendar...
        </div>
      ) : error ? (
        <Card><CardContent className="p-6 text-sm text-destructive">Failed to load calendar.</CardContent></Card>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">
          No upcoming PM events match these filters.
        </CardContent></Card>
      ) : (
        <div className="space-y-6">
          {section('Today', 'today')}
          {section('This Week', 'week')}
          {section('Later', 'later')}
          {section('Past 7 Days', 'past')}
        </div>
      )}
    </div>
  );
}
