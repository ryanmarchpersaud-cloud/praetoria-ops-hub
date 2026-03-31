import { Link } from 'react-router-dom';
import { useMyAssignments } from '@/hooks/useTraining';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, ChevronRight, Clock, AlertTriangle } from 'lucide-react';
import { format, isPast } from 'date-fns';

const statusColors: Record<string, string> = {
  not_started: 'bg-muted text-muted-foreground',
  in_progress: 'bg-blue-500/10 text-blue-700',
  passed: 'bg-emerald-500/10 text-emerald-700',
  failed: 'bg-destructive/10 text-destructive',
  expired: 'bg-amber-500/10 text-amber-700',
};

export default function SubcontractorTrainingPage() {
  const { data: assignments = [], isLoading } = useMyAssignments();

  if (isLoading) {
    return (
      <div className="px-4 pt-3 pb-4 space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  const active = assignments.filter((a: any) => a.status !== 'passed' && a.status !== 'expired');
  const completed = assignments.filter((a: any) => a.status === 'passed');

  return (
    <div className="px-4 pt-3 pb-4 space-y-4 animate-fade-in">
      <h1 className="text-lg font-bold">Training & Compliance</h1>

      {active.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Required Training</p>
          {active.map((a: any) => {
            const course = a.training_courses;
            const isOverdue = a.due_date && isPast(new Date(a.due_date));
            return (
              <Link key={a.id} to={`/subcontractor/training/${a.id}`}>
                <Card className="active:shadow-sm transition-shadow">
                  <CardContent className="p-4 flex items-start gap-3">
                    <BookOpen className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{course?.title || 'Training'}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className={`text-[10px] capitalize ${statusColors[a.status] || ''}`}>
                          {a.status?.replace('_', ' ')}
                        </Badge>
                        {course?.is_mandatory && <Badge variant="destructive" className="text-[10px]">Required</Badge>}
                      </div>
                      {a.due_date && (
                        <p className={`text-xs mt-1 ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                          <Clock className="h-3 w-3 inline mr-1" />
                          {isOverdue ? 'Overdue' : 'Due'}: {format(new Date(a.due_date), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {completed.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Completed</p>
          {completed.map((a: any) => (
            <Card key={a.id} className="opacity-75">
              <CardContent className="p-3 flex items-center gap-3">
                <BookOpen className="h-4 w-4 text-emerald-600 shrink-0" />
                <p className="text-sm text-foreground flex-1">{(a as any).training_courses?.title || 'Training'}</p>
                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700">✓ Passed</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {assignments.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No training assigned yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
