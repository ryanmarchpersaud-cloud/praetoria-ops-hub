import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DndContext, PointerSensor, useSensor, useSensors, useDraggable, useDroppable,
  type DragEndEvent,
} from '@dnd-kit/core';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Calendar as CalendarIcon, ChevronRight, ChevronLeft, ClipboardCheck, KeyRound,
  CalendarClock, ShieldCheck, Wrench, Home, ListChecks, Loader2, GripVertical,
  Bell, Download,
} from 'lucide-react';
import { usePMCalendar, type PMCalendarEvent } from '@/hooks/pm/usePMCalendar';
import { RescheduleEventDialog, isReschedulable } from '@/components/pm/RescheduleEventDialog';
import { AddReminderDialog } from '@/components/pm/AddReminderDialog';
import { PMRemindersList } from '@/components/pm/PMRemindersList';
import { useProcessDueReminders } from '@/hooks/pm/usePMReminders';
import { buildICS, downloadICS } from '@/lib/icsExport';

const TYPE_META: Record<string, { label: string; color: string; icon: any; dot: string }> = {
  showing:               { label: 'Showing',        color: 'bg-blue-100 text-blue-800 border-blue-200',       icon: Home,           dot: 'bg-blue-500' },
  inspection:            { label: 'Inspection',     color: 'bg-purple-100 text-purple-800 border-purple-200', icon: ClipboardCheck, dot: 'bg-purple-500' },
  move_in:               { label: 'Move-In',        color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: KeyRound,    dot: 'bg-emerald-500' },
  move_out:              { label: 'Move-Out',       color: 'bg-orange-100 text-orange-800 border-orange-200', icon: KeyRound,       dot: 'bg-orange-500' },
  lease_renewal:         { label: 'Lease Renewal',  color: 'bg-amber-100 text-amber-800 border-amber-200',   icon: CalendarClock,   dot: 'bg-amber-500' },
  staff_task:            { label: 'Task',           color: 'bg-slate-100 text-slate-800 border-slate-200',   icon: ListChecks,      dot: 'bg-slate-500' },
  owner_approval_due:    { label: 'Owner Approval', color: 'bg-rose-100 text-rose-800 border-rose-200',      icon: ShieldCheck,     dot: 'bg-rose-500' },
  work_order_appointment:{ label: 'Work Order',     color: 'bg-yellow-100 text-yellow-800 border-yellow-200',icon: Wrench,          dot: 'bg-yellow-500' },
  maintenance_follow_up: { label: 'Maintenance',    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',icon: Wrench,          dot: 'bg-yellow-500' },
  general_pm:            { label: 'PM Event',       color: 'bg-slate-100 text-slate-800 border-slate-200',   icon: CalendarIcon,    dot: 'bg-slate-500' },
};

// Known valid PM routes — anything else is coerced to a safe list page.
const VALID_ROUTE_PREFIXES = [
  '/property-management/inspections/',
  '/property-management/work-orders/',
  '/property-management/showings',
  '/property-management/tasks',
  '/property-management/move-ins',
  '/property-management/move-outs',
  '/property-management/lease-renewals',
  '/property-management/owner-approvals',
  '/pm-staff/showings',
  '/pm-staff/tasks',
  '/pm-staff/move-ins',
  '/pm-staff/move-outs',
  '/pm-staff/lease-renewals',
];

const FALLBACK_BY_TYPE: Record<string, string> = {
  showing: '/pm-staff/showings',
  inspection: '/property-management/inspections',
  move_in: '/property-management/move-ins',
  move_out: '/property-management/move-outs',
  lease_renewal: '/property-management/lease-renewals',
  staff_task: '/pm-staff/tasks',
  owner_approval_due: '/property-management/owner-approvals',
  work_order_appointment: '/property-management/maintenance',
  maintenance_follow_up: '/property-management/maintenance',
  general_pm: '/property-management/calendar',
};

function safeActionUrl(e: PMCalendarEvent): string {
  const raw = (e.action_url ?? '').trim();
  if (raw && VALID_ROUTE_PREFIXES.some((p) => raw.startsWith(p))) return raw;
  return FALLBACK_BY_TYPE[e.event_type] ?? '/property-management/calendar';
}

function fmtDate(iso: string, allDay: boolean) {
  const d = new Date(iso);
  const date = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  if (allDay) return date;
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${date} · ${time}`;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate()+n); return x; }
function sameDay(a: Date, b: Date) {
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}

function bucketOf(iso: string): 'today' | 'week' | 'later' | 'past' {
  const d = new Date(iso);
  const now = new Date();
  const st = startOfDay(now);
  const et = addDays(st, 1);
  const ew = addDays(st, 7);
  if (d < st) return 'past';
  if (d < et) return 'today';
  if (d < ew) return 'week';
  return 'later';
}

type Props = {
  variant?: 'admin' | 'staff';
  heading?: string;
  subheading?: string;
};

type ViewMode = 'month' | 'week' | 'list';

// Event types that support drag-to-reschedule in the Month view.
// Must match the types the pm_reschedule_event RPC accepts. Backend still enforces.
const DRAG_ELIGIBLE_TYPES = new Set([
  'showing',
  'inspection',
  'move_out',
  'staff_task',
  'owner_approval_due', // RPC restricts to admin/property_manager
]);

function isDraggableEvent(e: PMCalendarEvent): boolean {
  if (!isReschedulable(e)) return false;
  if (!DRAG_ELIGIBLE_TYPES.has(e.event_type)) return false;
  const s = (e.status ?? '').toLowerCase();
  if (['completed', 'cancelled', 'archived', 'locked'].includes(s)) return false;
  return true;
}

// --- DnD primitives (Month view only) ---
function DraggableChip({ event, children }: { event: PMCalendarEvent; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: event.event_id,
    data: { event },
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`cursor-grab active:cursor-grabbing touch-none ${isDragging ? 'opacity-40' : ''}`}
    >
      {children}
    </div>
  );
}

function DroppableDay({ dayISO, children, className }: { dayISO: string; children: React.ReactNode; className?: string }) {
  const { setNodeRef, isOver } = useDroppable({ id: `day:${dayISO}`, data: { dayISO } });
  return (
    <div ref={setNodeRef} className={`${className ?? ''} ${isOver ? 'ring-2 ring-primary/70 bg-primary/5' : ''}`}>
      {children}
    </div>
  );
}

export function PMCalendarView({ variant = 'admin', heading, subheading }: Props) {
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [rescheduleEvent, setRescheduleEvent] = useState<PMCalendarEvent | null>(null);
  const [presetDropDate, setPresetDropDate] = useState<Date | null>(null);
  const [view, setView] = useState<ViewMode>('month');
  const [cursor, setCursor] = useState<Date>(startOfDay(new Date()));

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (evt: DragEndEvent) => {
    const ev = evt.active?.data?.current?.event as PMCalendarEvent | undefined;
    const dayISO = evt.over?.data?.current?.dayISO as string | undefined;
    if (!ev || !dayISO) return;
    if (!isDraggableEvent(ev)) return;
    const target = new Date(dayISO);
    const orig = new Date(ev.start_at);
    if (sameDay(target, orig)) return; // no-op if dropped on same day
    setRescheduleEvent(ev);
    setPresetDropDate(target);
  };


  // Fetch a range large enough for month/week/list views
  const range = useMemo(() => {
    const start = new Date(cursor);
    start.setDate(1); start.setDate(start.getDate() - 14); start.setHours(0,0,0,0);
    const end = new Date(cursor);
    end.setMonth(end.getMonth() + 2); end.setHours(23,59,59,999);
    return { startISO: start.toISOString(), endISO: end.toISOString() };
  }, [cursor]);

  const { data, isLoading, error } = usePMCalendar(range.startISO, range.endISO);

  const filtered = useMemo(() => {
    const rows = data ?? [];
    return rows
      .filter((e) => typeFilter === 'all' || e.event_type === typeFilter)
      .filter((e) => statusFilter === 'all' || (e.status ?? '').toLowerCase() === statusFilter)
      .filter((e) => !search || e.title.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
  }, [data, typeFilter, statusFilter, search]);

  const countByType = useMemo(() => {
    const c: Record<string, number> = {};
    for (const e of data ?? []) c[e.event_type] = (c[e.event_type] ?? 0) + 1;
    return c;
  }, [data]);

  // Group events by yyyy-mm-dd
  const byDay = useMemo(() => {
    const m = new Map<string, PMCalendarEvent[]>();
    for (const e of filtered) {
      const d = new Date(e.start_at);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(e);
    }
    return m;
  }, [filtered]);

  const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

  const openLink = (e: PMCalendarEvent) => safeActionUrl(e);

  const eventChip = (e: PMCalendarEvent) => {
    const meta = TYPE_META[e.event_type] ?? TYPE_META.general_pm;
    return (
      <Link
        key={e.event_id}
        to={openLink(e)}
        className={`block truncate text-[10px] leading-tight px-1.5 py-0.5 rounded border ${meta.color} hover:opacity-80`}
        title={`${meta.label}: ${e.title}${e.all_day ? '' : ' · ' + fmtTime(e.start_at)}`}
      >
        {!e.all_day && <span className="font-medium">{fmtTime(e.start_at)} </span>}
        {e.title}
      </Link>
    );
  };

  const renderCard = (e: PMCalendarEvent) => {
    const meta = TYPE_META[e.event_type] ?? TYPE_META.general_pm;
    const Icon = meta.icon;
    const status = (e.status ?? '').toLowerCase();
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
            {isReschedulable(e) && status !== 'completed' && status !== 'cancelled' && (
              <Button variant="outline" size="sm" onClick={() => setRescheduleEvent(e)}>
                Reschedule
              </Button>
            )}
            <Button asChild variant="ghost" size="sm">
              <Link to={openLink(e)}>Open <ChevronRight className="h-3.5 w-3.5 ml-1" /></Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // ---- Month View ----
  const monthGrid = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const startWeekday = first.getDay(); // 0=Sun
    const gridStart = addDays(first, -startWeekday);
    const cells: Date[] = [];
    for (let i = 0; i < 42; i++) cells.push(addDays(gridStart, i));
    return cells;
  }, [cursor]);

  const monthLabel = cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const renderMonth = () => (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <Card>
        <CardContent className="p-3">
          <div className="grid grid-cols-7 gap-1 text-[10px] font-semibold text-muted-foreground mb-1">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
              <div key={d} className="px-1 py-1 uppercase">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthGrid.map((d) => {
              const inMonth = d.getMonth() === cursor.getMonth();
              const isToday = sameDay(d, new Date());
              const events = byDay.get(dayKey(d)) ?? [];
              const dayISO = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
              return (
                <DroppableDay
                  key={d.toISOString()}
                  dayISO={dayISO}
                  className={`min-h-[92px] rounded border p-1 flex flex-col gap-0.5 ${inMonth ? 'bg-background' : 'bg-muted/40'} ${isToday ? 'ring-2 ring-primary' : ''}`}
                >
                  <div className={`text-[11px] font-semibold ${inMonth ? 'text-foreground' : 'text-muted-foreground'} ${isToday ? 'text-primary' : ''}`}>
                    {d.getDate()}
                  </div>
                  <div className="flex-1 space-y-0.5 overflow-hidden">
                    {events.slice(0, 3).map((e) =>
                      isDraggableEvent(e) ? (
                        <DraggableChip key={e.event_id} event={e}>{eventChip(e)}</DraggableChip>
                      ) : (
                        eventChip(e)
                      )
                    )}
                    {events.length > 3 && (
                      <div className="text-[10px] text-muted-foreground px-1">+{events.length - 3} more</div>
                    )}
                  </div>
                </DroppableDay>
              );
            })}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
            <GripVertical className="h-3 w-3" />
            Drag eligible events (showings, inspections, move-outs, tasks, owner approvals) to another day to reschedule. Confirmation required.
          </p>
        </CardContent>
      </Card>
    </DndContext>
  );

  // ---- Week View ----
  const weekDays = useMemo(() => {
    const start = addDays(cursor, -cursor.getDay());
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [cursor]);

  const weekLabel = `${weekDays[0].toLocaleDateString(undefined,{month:'short',day:'numeric'})} – ${weekDays[6].toLocaleDateString(undefined,{month:'short',day:'numeric', year:'numeric'})}`;

  const renderWeek = () => (
    <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
      {weekDays.map((d) => {
        const events = byDay.get(dayKey(d)) ?? [];
        const isToday = sameDay(d, new Date());
        return (
          <Card key={d.toISOString()} className={isToday ? 'ring-2 ring-primary' : ''}>
            <CardContent className="p-2 space-y-1">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold">{d.toLocaleDateString(undefined,{weekday:'short'})}</div>
                <div className={`text-xs ${isToday ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                  {d.toLocaleDateString(undefined,{month:'short',day:'numeric'})}
                </div>
              </div>
              <div className="space-y-1 min-h-[40px]">
                {events.length === 0 && <div className="text-[10px] text-muted-foreground italic">No events</div>}
                {events.map(eventChip)}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  // ---- List View ----
  const listGroups = useMemo(() => {
    const g: Record<string, PMCalendarEvent[]> = { today: [], week: [], later: [], past: [] };
    for (const e of filtered) g[bucketOf(e.start_at)].push(e);
    return g;
  }, [filtered]);

  const section = (label: string, key: 'today' | 'week' | 'later' | 'past') => {
    const items = listGroups[key];
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

  const shiftCursor = (dir: -1 | 1) => {
    const c = new Date(cursor);
    if (view === 'month') c.setMonth(c.getMonth() + dir);
    else if (view === 'week') c.setDate(c.getDate() + 7 * dir);
    else c.setDate(c.getDate() + dir);
    setCursor(c);
  };

  const rangeLabel = view === 'month' ? monthLabel : view === 'week' ? weekLabel : 'Upcoming & Recent';

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

      <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <TabsList>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="list">List</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCursor(startOfDay(new Date()))}>Today</Button>
            {view !== 'list' && (
              <>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => shiftCursor(-1)} aria-label="Previous">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-sm font-semibold min-w-[160px] text-center">{rangeLabel}</div>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => shiftCursor(1)} aria-label="Next">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        {isLoading ? (
          <Card className="mt-3"><CardContent className="p-12 flex items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading calendar…
          </CardContent></Card>
        ) : error ? (
          <Card className="mt-3"><CardContent className="p-6 text-sm text-destructive">
            Failed to load calendar events.
          </CardContent></Card>
        ) : (
          <>
            <TabsContent value="month" className="mt-3">{renderMonth()}</TabsContent>
            <TabsContent value="week" className="mt-3">{renderWeek()}</TabsContent>
            <TabsContent value="list" className="mt-3">
              {filtered.length === 0 ? (
                <Card><CardContent className="p-12 text-center text-sm text-muted-foreground">
                  No events match the current filters.
                </CardContent></Card>
              ) : (
                <div className="space-y-6">
                  {section('Today', 'today')}
                  {section('This Week', 'week')}
                  {section('Later', 'later')}
                  {section('Past 7 Days', 'past')}
                </div>
              )}
            </TabsContent>
          </>
        )}
      </Tabs>

      <RescheduleEventDialog
        event={rescheduleEvent}
        open={!!rescheduleEvent}
        presetDate={presetDropDate}
        onOpenChange={(v) => { if (!v) { setRescheduleEvent(null); setPresetDropDate(null); } }}
      />
    </div>
  );
}
