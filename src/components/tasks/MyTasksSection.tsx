import { Link } from 'react-router-dom';
import { format, isBefore, isToday, parseISO, startOfDay } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useMyTasks } from '@/hooks/useOperationalTasks';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ClipboardCheck, CalendarDays, MapPin, ChevronRight, AlertOctagon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { missingRequirements } from '@/components/tasks/TaskRequirementsPanel';

type Bucket = 'overdue' | 'today' | 'upcoming';

interface Props {
  /** Route to the full task page — worker or subcontractor */
  tasksHref: string;
  limit?: number;
}

const priorityColor: Record<string, string> = {
  low: 'bg-slate-100 text-slate-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-amber-100 text-amber-700',
  urgent: 'bg-red-100 text-red-700',
};

function bucketFor(t: any): Bucket {
  if (!t.due_date) return 'upcoming';
  const d = startOfDay(parseISO(t.due_date));
  const today = startOfDay(new Date());
  if (isToday(d)) return 'today';
  if (isBefore(d, today)) return 'overdue';
  return 'upcoming';
}

export function MyTasksSection({ tasksHref, limit = 5 }: Props) {
  const { user } = useAuth();
  const { data: tasks = [], isLoading } = useMyTasks(user?.id);

  if (isLoading) return null;

  const withBucket = tasks.map((t: any) => ({ ...t, __bucket: bucketFor(t) }));
  const order: Bucket[] = ['overdue', 'today', 'upcoming'];
  withBucket.sort((a: any, b: any) => {
    const ba = order.indexOf(a.__bucket);
    const bb = order.indexOf(b.__bucket);
    if (ba !== bb) return ba - bb;
    const da = a.due_date ? new Date(a.due_date).getTime() : Number.POSITIVE_INFINITY;
    const db = b.due_date ? new Date(b.due_date).getTime() : Number.POSITIVE_INFINITY;
    return da - db;
  });
  const shown = withBucket.slice(0, limit);

  return (
    <section className="space-y-2 px-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-primary" />
          My Tasks
          {tasks.length > 0 && <Badge variant="secondary" className="text-[10px]">{tasks.length}</Badge>}
        </h2>
        <Link to={tasksHref} className="text-xs text-primary">View all</Link>
      </div>

      {shown.length === 0 ? (
        <Card>
          <CardContent className="py-4 text-center text-xs text-muted-foreground">
            No active tasks assigned to you
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1.5">
          {shown.map((t: any) => {
            const missing = missingRequirements(t);
            return (
              <Link key={t.id} to={tasksHref} className="block">
                <Card className={cn(
                  'border-l-4',
                  t.__bucket === 'overdue' ? 'border-l-red-500' :
                  t.__bucket === 'today' ? 'border-l-amber-500' : 'border-l-blue-400',
                )}>
                  <CardContent className="p-2.5 flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        {t.__bucket === 'overdue' && <AlertOctagon className="h-3 w-3 text-red-600" />}
                        <p className="text-xs font-medium truncate">{t.task_title}</p>
                        <Badge variant="secondary" className={cn('text-[8px] shrink-0', priorityColor[t.priority])}>{t.priority}</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        {t.due_date && (
                          <span className="flex items-center gap-0.5">
                            <CalendarDays className="h-2.5 w-2.5" />
                            {t.__bucket === 'overdue' ? 'Overdue' : t.__bucket === 'today' ? 'Today' : format(new Date(t.due_date), 'MMM d')}
                          </span>
                        )}
                        {t.address && (
                          <span className="flex items-center gap-0.5 truncate">
                            <MapPin className="h-2.5 w-2.5" />
                            {t.address}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                        {t.receipt_required && (
                          <span className={cn('text-[8px] px-1 py-px rounded',
                            t.receipt_urls?.length ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}>
                            Receipt {t.receipt_urls?.length ? '✓' : ''}
                          </span>
                        )}
                        {t.photos_required && (
                          <span className={cn('text-[8px] px-1 py-px rounded',
                            t.completion_photos?.length ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700')}>
                            Photos {t.completion_photos?.length ? '✓' : ''}
                          </span>
                        )}
                        {t.follow_up_required && (
                          <span className={cn('text-[8px] px-1 py-px rounded',
                            t.follow_up_completed ? 'bg-emerald-100 text-emerald-700' : 'bg-violet-100 text-violet-700')}>
                            Follow-up {t.follow_up_completed ? '✓' : ''}
                          </span>
                        )}
                        {missing.length > 0 && (
                          <span className="text-[8px] text-red-600">{missing.length} pending</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
