import { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import {
  CheckCircle2, ChevronRight, CalendarPlus, MapPin, Clock,
  Plus, UserPlus, FileText, Briefcase, ClipboardList, Home,
  Receipt, AlertTriangle, Send,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { differenceInSeconds } from 'date-fns';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

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

/* ─── Quick Book Menu Items ─── */
const QUICK_BOOK_ITEMS = [
  { label: 'New Visit', icon: ClipboardList, to: '/worker/schedule', color: 'text-blue-600' },
  { label: 'New Job', icon: Briefcase, to: '/worker/schedule', color: 'text-indigo-600' },
  { label: 'New Customer', icon: UserPlus, to: '/worker/search', color: 'text-emerald-600' },
  { label: 'New Property', icon: Home, to: '/worker/search', color: 'text-amber-600' },
  { label: 'New Lead', icon: Send, to: '/worker/search', color: 'text-violet-600' },
  { label: 'New Quote', icon: FileText, to: '/worker/search', color: 'text-cyan-600' },
  { label: 'New Invoice', icon: Receipt, to: '/worker/search', color: 'text-rose-600' },
  { label: 'New Request', icon: CalendarPlus, to: '/worker/schedule', color: 'text-orange-600' },
  { label: 'New Incident', icon: AlertTriangle, to: '/worker/incidents/new', color: 'text-red-600' },
];

/* ─── Visit Card Component ─── */
function VisitCardItem({ visit, workerInitials, now, isDragging, dragMoved }: {
  visit: VisitCard;
  workerInitials: string;
  now: Date;
  isDragging: boolean;
  dragMoved: boolean;
}) {
  const isInProgress = visit.visit_status === 'In Progress' || visit.visit_status === 'En Route';
  const isCompleted = visit.visit_status === 'Completed';
  const customerName = visit.customers
    ? `${visit.customers.first_name} ${visit.customers.last_name}`
    : 'Unknown';
  const propertyName = visit.properties?.property_name || '';
  const address = visit.properties?.address_line_1 || '';
  const city = visit.properties?.city || '';
  const serviceCategory = (visit.jobs as any)?.service_category || visit.visit_type || '';

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

  const timeDisplay = visit.arrival_time
    ? new Date(visit.arrival_time).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })
    : 'Anytime';

  return (
    <Link
      to={`/worker/visit/${visit.id}`}
      onClick={(e) => { if (dragMoved || isDragging) e.preventDefault(); }}
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
            {/* Left accent bar */}
            <div
              className={cn(
                'w-1.5 shrink-0 rounded-l-lg',
                isCompleted ? 'bg-emerald-500' : isInProgress ? 'bg-primary animate-pulse' : 'bg-primary'
              )}
            />
            <div className="flex-1 min-w-0 p-3 flex flex-col justify-between gap-2">
              {/* Top section */}
              <div className="space-y-1.5">
                {/* Row 1: Status + Visit # */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {isCompleted && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />}
                    {isInProgress && <div className="h-2 w-2 shrink-0 rounded-full bg-primary animate-pulse" />}
                    <span className={cn(
                      'text-[10px] font-medium',
                      isCompleted ? 'text-emerald-600 dark:text-emerald-400' : isInProgress ? 'text-primary' : 'text-muted-foreground'
                    )}>
                      {visit.visit_status}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono shrink-0">{visit.visit_number}</span>
                </div>

                {/* Row 2: Customer name */}
                <p className={cn(
                  'truncate text-sm font-semibold leading-tight',
                  isCompleted ? 'text-muted-foreground' : 'text-foreground'
                )}>
                  {customerName}
                </p>

                {/* Row 3: Time + Timer */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3 shrink-0" />
                    <span className="text-[11px]">{timeDisplay}</span>
                  </div>
                  {isInProgress && visit.arrival_time && (
                    <span className="shrink-0 whitespace-nowrap text-[10px] font-bold font-mono tabular-nums text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                      {formatTimer(elapsedSeconds)}
                    </span>
                  )}
                  {isCompleted && completionDuration && (
                    <span className="shrink-0 whitespace-nowrap text-[10px] font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                      ✓ {completionDuration}
                    </span>
                  )}
                </div>

                {/* Row 4: Property + address */}
                {(propertyName || address) && (
                  <div className="flex items-start gap-1 text-muted-foreground">
                    <MapPin className="h-3 w-3 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      {propertyName && (
                        <p className="truncate text-[11px] font-medium text-foreground/80">{propertyName}</p>
                      )}
                      <p className="truncate text-[10px]">
                        {address}{address && city ? ', ' : ''}{city}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom section: Service category + initials */}
              <div className="flex items-center justify-between pt-1 border-t border-border/50">
                {serviceCategory ? (
                  <span className="truncate text-[11px] font-medium text-primary">{serviceCategory}</span>
                ) : (
                  <span />
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
}

/* ─── Main Carousel ─── */
export function TodayVisitCarousel({ visits, workerInitials }: TodayVisitCarouselProps) {
  const [now, setNow] = useState(new Date());
  const [isDragging, setIsDragging] = useState(false);
  const [quickBookOpen, setQuickBookOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const dragState = useRef({ isPointerDown: false, startX: 0, startScrollLeft: 0, moved: false });

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const completedCount = visits.filter((v) => v.visit_status === 'Completed').length;

  const sorted = useMemo(() => {
    const order: Record<string, number> = { 'In Progress': 0, 'En Route': 1, Scheduled: 2, Planned: 3, Completed: 4 };
    return [...visits].sort((a, b) => (order[a.visit_status] ?? 3) - (order[b.visit_status] ?? 3));
  }, [visits]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    const container = scrollRef.current;
    if (!container) return;
    dragState.current = { isPointerDown: true, startX: e.clientX, startScrollLeft: container.scrollLeft, moved: false };
    setIsDragging(false);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    const container = scrollRef.current;
    if (!container || !dragState.current.isPointerDown) return;
    const deltaX = e.clientX - dragState.current.startX;
    if (Math.abs(deltaX) > 12) { dragState.current.moved = true; setIsDragging(true); }
    container.scrollLeft = dragState.current.startScrollLeft - deltaX;
  };

  const endDrag = (e?: React.PointerEvent<HTMLDivElement>) => {
    if (e && e.pointerType !== 'mouse') return;
    dragState.current.isPointerDown = false;
    setIsDragging(false);
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
        <Link to="/worker/schedule" className="flex items-center gap-0.5 text-xs font-medium text-primary hover:underline">
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
        {sorted.map((visit) => (
          <VisitCardItem
            key={visit.id}
            visit={visit}
            workerInitials={workerInitials}
            now={now}
            isDragging={isDragging}
            dragMoved={dragState.current.moved}
          />
        ))}

        {/* Quick Book Card */}
        <div className="w-[280px] shrink-0 snap-start">
          <Card
            className="h-full border-2 border-dashed transition-colors hover:border-primary/40 cursor-pointer active:scale-[0.98]"
            onClick={(e) => {
              if (dragState.current.moved || isDragging) { e.preventDefault(); e.stopPropagation(); return; }
              setQuickBookOpen(true);
            }}
          >
            <CardContent className="flex flex-col min-h-[160px] h-full items-center justify-center gap-2 p-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Plus className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm font-semibold text-foreground">Quick Book</p>
              <p className="text-[10px] text-muted-foreground text-center leading-tight">
                Create visits, jobs, customers & more from the field
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Book Dialog */}
      <Dialog open={quickBookOpen} onOpenChange={setQuickBookOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarPlus className="h-5 w-5 text-primary" />
              Quick Book
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-3 py-2">
            {QUICK_BOOK_ITEMS.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                onClick={() => setQuickBookOpen(false)}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-muted/50 hover:bg-muted active:scale-95 transition-all"
              >
                <item.icon className={cn('h-5 w-5', item.color)} />
                <span className="text-[10px] font-medium text-foreground text-center leading-tight">{item.label}</span>
              </Link>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
