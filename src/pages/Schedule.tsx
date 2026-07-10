import { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, List, MoreHorizontal, CalendarPlus, Briefcase, FileText, CheckSquare, CalendarClock, ArrowRightLeft, Upload, RefreshCw, ClipboardList } from 'lucide-react';
import { useVisits, useUpdateVisit } from '@/hooks/useVisits';
import { useJobs, useUpdateJob } from '@/hooks/useJobs';
import { useToast } from '@/hooks/use-toast';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isToday, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { DraggableItem, DragOverlayItem, MonthDraggableChip } from '@/components/schedule/DraggableItem';
import { DroppableDay } from '@/components/schedule/DroppableDay';
import { StatusBadge } from '@/components/StatusBadge';
import { ScheduleVisitPopover } from '@/components/schedule/ScheduleVisitPopover';
import { DayScheduleDialog } from '@/components/schedule/DayScheduleDialog';

type ViewMode = 'week' | 'month';

export default function Schedule() {
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeItem, setActiveItem] = useState<{ type: 'visit' | 'job'; data: any } | null>(null);
  const [selectedVisit, setSelectedVisit] = useState<any>(null);
  const [dayViewDate, setDayViewDate] = useState<string | null>(null);

  const { data: visits = [] } = useVisits();
  const { data: jobs = [] } = useJobs();
  const updateVisit = useUpdateVisit();
  const updateJob = useUpdateJob();
  const { toast } = useToast();

  const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 8 } });
  const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } });
  const sensors = useSensors(pointerSensor, touchSensor);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  const days = useMemo(() => {
    if (viewMode === 'week') {
      return eachDayOfInterval({ start: weekStart, end: weekEnd });
    }
    const mStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const mEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: mStart, end: mEnd });
  }, [viewMode, currentDate]);

  const navigate = (dir: 'prev' | 'next') => {
    if (viewMode === 'week') {
      setCurrentDate(dir === 'next' ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    } else {
      setCurrentDate(dir === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    }
  };

  const visitsByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    (visits as any[]).forEach(v => {
      const d = v.service_date;
      if (!map[d]) map[d] = [];
      map[d].push(v);
    });
    return map;
  }, [visits]);

  const jobsByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    (jobs as any[]).forEach(j => {
      if (j.scheduled_date) {
        if (!map[j.scheduled_date]) map[j.scheduled_date] = [];
        map[j.scheduled_date].push(j);
      }
    });
    return map;
  }, [jobs]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const itemData = active.data.current;
    if (itemData) {
      setActiveItem({ type: itemData.type, data: itemData.item });
    }
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActiveItem(null);
    const { active, over } = event;
    if (!over) return;

    const droppableId = String(over.id);
    if (!droppableId.startsWith('day-')) return;

    const newDate = droppableId.replace('day-', '');
    const activeData = active.data.current;
    if (!activeData) return;

    const { type, id: itemId, item } = activeData;

    // Check if date actually changed
    const currentItemDate = type === 'visit' ? item.service_date : item.scheduled_date;
    if (currentItemDate === newDate) return;

    try {
      if (type === 'visit') {
        await updateVisit.mutateAsync({ id: itemId, service_date: newDate });
        toast({ title: 'Visit rescheduled', description: `${item.visit_number} moved to ${format(new Date(newDate + 'T12:00:00'), 'MMM d, yyyy')}` });
      } else {
        await updateJob.mutateAsync({ id: itemId, scheduled_date: newDate });
        toast({ title: 'Job rescheduled', description: `${item.job_number} moved to ${format(new Date(newDate + 'T12:00:00'), 'MMM d, yyyy')}` });
      }
    } catch (err: any) {
      toast({ title: 'Reschedule failed', description: err.message, variant: 'destructive' });
    }
  }, [updateVisit, updateJob, toast]);

  const rangeLabel = viewMode === 'week'
    ? `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`
    : format(currentDate, 'MMMM yyyy');

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl md:text-2xl font-bold">Schedule</h1>
        <div className="flex items-center gap-1">
          <Button variant={viewMode === 'week' ? 'default' : 'outline'} size="sm" className="h-8 text-xs px-2.5" onClick={() => setViewMode('week')}>
            <List className="h-3.5 w-3.5 mr-1" /> Week
          </Button>
          <Button variant={viewMode === 'month' ? 'default' : 'outline'} size="sm" className="h-8 text-xs px-2.5" onClick={() => setViewMode('month')}>
            <CalendarIcon className="h-3.5 w-3.5 mr-1" /> Month
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs px-2.5 gap-1">
                <MoreHorizontal className="h-3.5 w-3.5" /> More Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="text-xs text-muted-foreground">Create</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link to="/jobs/new" className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4" /> Job
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/requests" className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" /> Request
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/visits" className="flex items-center gap-2">
                  <CalendarPlus className="h-4 w-4" /> Visit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">Schedule</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link to="/schedule/new-visits" className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4" /> Schedule New Visits
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">Tools</DropdownMenuLabel>
              <DropdownMenuItem disabled className="flex items-center gap-2 opacity-50">
                <ArrowRightLeft className="h-4 w-4" /> Move Visit
              </DropdownMenuItem>
              <DropdownMenuItem disabled className="flex items-center gap-2 opacity-50">
                <Upload className="h-4 w-4" /> Import Jobs
              </DropdownMenuItem>
              <DropdownMenuItem disabled className="flex items-center gap-2 opacity-50">
                <RefreshCw className="h-4 w-4" /> Set Up Calendar Sync
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate('prev')}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center">
          <p className="text-sm font-medium">{rangeLabel}</p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setCurrentDate(new Date())}>Today</Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground text-center">
        Drag items by the grip handle to reschedule
      </p>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {/* Week view */}
        {viewMode === 'week' && (
          <div className="space-y-2">
            {days.map(day => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayVisits = visitsByDate[dateKey] || [];
              const dayJobs = jobsByDate[dateKey] || [];
              const hasItems = dayVisits.length > 0 || dayJobs.length > 0;

              return (
                <DroppableDay key={dateKey} dateKey={dateKey}>
                  <Card className={`overflow-hidden ${isToday(day) ? 'ring-2 ring-primary/40' : ''}`}>
                    <div className={`px-3 py-2 border-b flex items-center justify-between ${isToday(day) ? 'bg-primary/5' : 'bg-muted/30'}`}>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${isToday(day) ? 'text-primary' : ''}`}>
                          {format(day, 'EEE')}
                        </span>
                        <span className={`text-sm ${isToday(day) ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                          {format(day, 'MMM d')}
                        </span>
                        {isToday(day) && <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-medium">TODAY</span>}
                      </div>
                      {hasItems && (
                        <span className="text-[10px] text-muted-foreground">
                          {dayVisits.length > 0 && `${dayVisits.length} visit${dayVisits.length > 1 ? 's' : ''}`}
                          {dayVisits.length > 0 && dayJobs.length > 0 && ' · '}
                          {dayJobs.length > 0 && `${dayJobs.length} job${dayJobs.length > 1 ? 's' : ''}`}
                        </span>
                      )}
                    </div>
                    <CardContent className="p-2 min-h-[48px]">
                      {!hasItems ? (
                        <p className="text-xs text-muted-foreground py-2 text-center">No activity</p>
                      ) : (
                        <div className="space-y-1.5">
                          {dayJobs.map((j: any) => (
                            <DraggableItem key={j.id} id={j.id} type="job" data={j} />
                          ))}
                          {dayVisits.map((v: any) => (
                            <DraggableItem key={v.id} id={v.id} type="visit" data={v} onVisitClick={setSelectedVisit} />
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </DroppableDay>
              );
            })}
          </div>
        )}

        {/* Month view */}
        {viewMode === 'month' && (
          <div>
            <div className="grid grid-cols-7 gap-px mb-1">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                <div key={d} className="text-[10px] font-medium text-muted-foreground text-center py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
              {days.map(day => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const dayVisits = visitsByDate[dateKey] || [];
                const dayJobs = jobsByDate[dateKey] || [];
                const inMonth = day.getMonth() === currentDate.getMonth();

                return (
                  <DroppableDay
                    key={dateKey}
                    dateKey={dateKey}
                    className={`min-h-[60px] md:min-h-[80px] p-1 ${inMonth ? 'bg-card' : 'bg-muted/30'} ${isToday(day) ? 'ring-2 ring-inset ring-primary/40' : ''}`}
                  >
                    <button
                      type="button"
                      onClick={() => setDayViewDate(dateKey)}
                      aria-label={`View all ${dayVisits.length + dayJobs.length} items scheduled for ${format(day, 'MMMM d, yyyy')}`}
                      className={`text-[10px] font-medium mb-0.5 rounded px-1 -mx-0.5 hover:bg-muted/70 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer ${isToday(day) ? 'text-primary' : inMonth ? '' : 'text-muted-foreground/50'}`}
                    >
                      {format(day, 'd')}
                    </button>
                    {dayVisits.slice(0, 2).map((v: any) => (
                      <MonthDraggableChip key={v.id} id={v.id} type="visit" data={v} onVisitClick={setSelectedVisit} />
                    ))}
                    {dayJobs.slice(0, 1).map((j: any) => (
                      <MonthDraggableChip key={j.id} id={j.id} type="job" data={j} />
                    ))}
                    {(dayVisits.length + dayJobs.length) > 3 && (
                      <button
                        type="button"
                        onClick={() => setDayViewDate(dateKey)}
                        aria-label={`View all ${dayVisits.length + dayJobs.length} items scheduled for ${format(day, 'MMMM d, yyyy')}`}
                        className="w-full text-[9px] text-muted-foreground text-center hover:text-primary hover:bg-muted/70 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                      >
                        +{dayVisits.length + dayJobs.length - 3} more
                      </button>
                    )}
                    {(dayVisits.length + dayJobs.length) <= 3 && (
                      <button
                        type="button"
                        onClick={() => setDayViewDate(dateKey)}
                        aria-label={`View schedule for ${format(day, 'MMMM d, yyyy')}`}
                        tabIndex={-1}
                        className="block w-full flex-1 min-h-[8px] cursor-pointer"
                      />
                    )}
                  </DroppableDay>
                );
              })}
            </div>
          </div>
        )}

        <DragOverlay>
          {activeItem && (
            <DragOverlayItem type={activeItem.type} data={activeItem.data} />
          )}
        </DragOverlay>
      </DndContext>

      <ScheduleVisitPopover
        visit={selectedVisit}
        open={!!selectedVisit}
        onOpenChange={(open) => { if (!open) setSelectedVisit(null); }}
      />

      <DayScheduleDialog
        dateKey={dayViewDate}
        visits={dayViewDate ? (visitsByDate[dayViewDate] || []) : []}
        jobs={dayViewDate ? (jobsByDate[dayViewDate] || []) : []}
        open={!!dayViewDate}
        onOpenChange={(open) => { if (!open) setDayViewDate(null); }}
        onVisitClick={(v) => { setDayViewDate(null); setSelectedVisit(v); }}
      />
    </div>
  );
}
