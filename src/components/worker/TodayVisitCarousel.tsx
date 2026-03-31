import { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, ChevronRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { differenceInSeconds } from 'date-fns';

interface VisitCard {
  id: string;
  visit_number: string;
  visit_status: string;
  visit_type: string | null;
  service_date: string;
  arrival_time: string | null;
  completion_time: string | null;
  service_summary: string | null;
  properties: { property_name: string; address_line_1: string | null; city: string | null } | null;
  customers: { first_name: string; last_name: string; phone: string | null } | null;
  jobs: { assigned_to: string | null; service_category: string | null } | null;
  assigned_worker_name?: string | null;
}

interface TodayVisitCarouselProps {
  visits: VisitCard[];
  workerInitials: string;
}

function formatTimer(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function TodayVisitCarousel({ visits, workerInitials }: TodayVisitCarouselProps) {
  const [now, setNow] = useState(new Date());
  const [isDragging, setIsDragging] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const dragState = useRef({
    isPointerDown: false,
    startX: 0,
    startScrollLeft: 0,
    moved: false,
  });

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const completedCount = visits.filter((v) => v.visit_status === 'Completed').length;

  const sorted = useMemo(() => {
    const order: Record<string, number> = {
      'In Progress': 0,
      'En Route': 1,
      Scheduled: 2,
      Planned: 3,
      Completed: 4,
    };
    return [...visits].sort((a, b) => (order[a.visit_status] ?? 3) - (order[b.visit_status] ?? 3));
  }, [visits]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const container = scrollRef.current;
    if (!container) return;

    dragState.current = {
      isPointerDown: true,
      startX: event.clientX,
      startScrollLeft: container.scrollLeft,
      moved: false,
    };

    setIsDragging(false);
    container.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const container = scrollRef.current;
    if (!container || !dragState.current.isPointerDown) return;

    const deltaX = event.clientX - dragState.current.startX;
    if (Math.abs(deltaX) > 6) {
      dragState.current.moved = true;
      setIsDragging(true);
    }

    container.scrollLeft = dragState.current.startScrollLeft - deltaX;
  };

  const endDrag = (event?: React.PointerEvent<HTMLDivElement>) => {
    const container = scrollRef.current;
    if (event && container) {
      try {
        container.releasePointerCapture?.(event.pointerId);
      } catch {
        // ignore release errors
      }
    }

    dragState.current.isPointerDown = false;
    window.setTimeout(() => setIsDragging(false), 0);
  };

  if (visits.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-base font-bold text-foreground">
            {visits.length} visit{visits.length !== 1 ? 's' : ''} today
          </p>
          {completedCount > 0 && (
            <p className="text-xs text-muted-foreground">
              {completedCount} visit{completedCount !== 1 ? 's' : ''} complete
            </p>
          )}
        </div>
        <Link
          to="/worker/schedule"
          className="flex items-center gap-0.5 text-xs font-medium text-primary hover:underline"
        >
          View all <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div
        ref={scrollRef}
        className={cn(
          'scrollbar-hide -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory overscroll-x-contain touch-pan-x select-none',
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={endDrag}
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {sorted.map((visit) => {
          const isInProgress = visit.visit_status === 'In Progress' || visit.visit_status === 'En Route';
          const isCompleted = visit.visit_status === 'Completed';
          const customerName = visit.customers
            ? `${visit.customers.first_name} ${visit.customers.last_name}`
            : 'Unknown';
          const address = visit.properties?.address_line_1 || '';
          const propertyName = visit.properties?.property_name || '';
          const serviceCategory = (visit.jobs as any)?.service_category || visit.visit_type || '';
          const displayAddress = [propertyName, address].filter(Boolean).join(' • ');

          let elapsedSeconds = 0;
          if (isInProgress && visit.arrival_time) {
            elapsedSeconds = Math.max(0, differenceInSeconds(now, new Date(visit.arrival_time)));
          }

          let completionDuration = '';
          if (isCompleted && visit.arrival_time && visit.completion_time) {
            const dur = differenceInSeconds(new Date(visit.completion_time), new Date(visit.arrival_time));
            const h = Math.floor(dur / 3600);
            const m = Math.floor((dur % 3600) / 60);
            const s = dur % 60;
            completionDuration = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
          }

          return (
            <Link
              key={visit.id}
              to={isDragging ? '#' : `/worker/visit/${visit.id}`}
              onClick={(event) => {
                if (dragState.current.moved || isDragging) {
                  event.preventDefault();
                }
              }}
              className="w-[280px] shrink-0 snap-start"
            >
              <Card
                className={cn(
                  'h-full overflow-hidden transition-shadow active:shadow-md',
                  isInProgress && 'ring-2 ring-primary/30',
                  isCompleted && 'opacity-80'
                )}
              >
                <CardContent className="p-0">
                  <div className="flex h-full">
                    <div
                      className={cn(
                        'w-1 shrink-0 rounded-l-lg',
                        isCompleted ? 'bg-emerald-500' : isInProgress ? 'bg-primary animate-pulse' : 'bg-primary'
                      )}
                    />
                    <div className="flex-1 space-y-1.5 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            {isCompleted && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />}
                            <p
                              className={cn(
                                'truncate text-sm font-semibold',
                                isCompleted ? 'text-muted-foreground' : 'text-foreground'
                              )}
                            >
                              {customerName}
                            </p>
                          </div>
                        </div>
                        {isInProgress && visit.arrival_time && (
                          <span className="whitespace-nowrap text-xs font-bold font-mono tabular-nums text-primary">
                            {formatTimer(elapsedSeconds)}
                          </span>
                        )}
                        {isCompleted && completionDuration && (
                          <div className="flex items-center gap-1">
                            <span className="whitespace-nowrap text-[11px] font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                              {completionDuration}
                            </span>
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                          </div>
                        )}
                      </div>

                      <p className="text-[11px] text-muted-foreground">
                        {visit.arrival_time
                          ? new Date(visit.arrival_time).toLocaleTimeString('en-CA', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Anytime'}
                      </p>

                      {displayAddress && <p className="truncate text-[11px] text-muted-foreground">{displayAddress}</p>}

                      <div className="flex items-center justify-between pt-0.5">
                        {serviceCategory && (
                          <span className="truncate text-[11px] font-medium text-primary">{serviceCategory}</span>
                        )}
                        <div className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                          <span className="text-[10px] font-bold text-muted-foreground">{workerInitials}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}

        <Link
          to={isDragging ? '#' : '/worker/schedule'}
          onClick={(event) => {
            if (dragState.current.moved || isDragging) {
              event.preventDefault();
            }
          }}
          className="w-[280px] shrink-0 snap-start"
        >
          <Card className="h-full border-2 border-dashed transition-colors hover:border-primary/40">
            <CardContent className="flex min-h-[120px] h-full items-center justify-center p-0">
              <div className="flex items-center gap-2 text-primary">
                <Plus className="h-5 w-5" />
                <span className="text-sm font-semibold">View Schedule</span>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
