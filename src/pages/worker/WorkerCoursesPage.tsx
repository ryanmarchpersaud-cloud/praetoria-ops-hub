import { Link } from 'react-router-dom';
import { useMyAssignments, useUpdateAssignmentStatus } from '@/hooks/useTraining';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, Video, FileText, ClipboardCheck, ShieldCheck, ChevronRight, Clock, AlertTriangle } from 'lucide-react';
import { format, isPast } from 'date-fns';

const statusColors: Record<string, string> = {
  not_started: 'bg-muted text-muted-foreground',
  in_progress: 'bg-blue-500/10 text-blue-700 border-blue-200',
  passed: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  failed: 'bg-destructive/10 text-destructive border-destructive/20',
  expired: 'bg-amber-500/10 text-amber-700 border-amber-200',
};

const contentIcons: Record<string, any> = {
  video: Video, document: FileText, quiz: ClipboardCheck, policy: ShieldCheck, mixed: BookOpen,
};

export default function WorkerCoursesPage() {
  const { data: assignments = [], isLoading } = useMyAssignments();

  if (isLoading) {
    return (
      <div className="px-4 pt-3 pb-4 space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-36 w-full rounded-xl" />
        <Skeleton className="h-36 w-full rounded-xl" />
      </div>
    );
  }

  const overdue = assignments.filter((a: any) => a.due_date && isPast(new Date(a.due_date)) && a.status !== 'passed');
  const active = assignments.filter((a: any) => a.status !== 'passed' && a.status !== 'expired');
  const completed = assignments.filter((a: any) => a.status === 'passed');

  return (
    <div className="px-4 pt-3 pb-4 space-y-4 animate-fade-in">
      <h1 className="text-lg font-bold">My Training</h1>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        <Card><CardContent className="p-3 text-center"><p className="text-lg font-bold text-foreground">{active.length}</p><p className="text-[10px] text-muted-foreground">Active</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-lg font-bold text-emerald-600">{completed.length}</p><p className="text-[10px] text-muted-foreground">Completed</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-lg font-bold text-destructive">{overdue.length}</p><p className="text-[10px] text-muted-foreground">Overdue</p></CardContent></Card>
      </div>

      {/* Overdue alert */}
      {overdue.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-destructive">{overdue.length} overdue training assignment(s)</p>
              <p className="text-xs text-muted-foreground">Complete these immediately to remain compliant.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active assignments */}
      {active.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Active Courses</p>
          {active.map((a: any) => {
            const course = a.training_courses;
            const Icon = contentIcons[course?.content_type] || BookOpen;
            const isOverdue = a.due_date && isPast(new Date(a.due_date));
            return (
              <Link key={a.id} to={`/worker/courses/${a.id}`}>
                <Card className="active:shadow-sm transition-shadow">
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{course?.title || 'Training'}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className={`text-[10px] capitalize ${statusColors[a.status] || ''}`}>
                          {a.status?.replace('_', ' ')}
                        </Badge>
                        {course?.is_mandatory && <Badge variant="destructive" className="text-[10px]">Required</Badge>}
                      </div>
                      {a.due_date && (
                        <p className={`text-xs mt-1 flex items-center gap-1 ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                          <Clock className="h-3 w-3" />
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

      {/* Completed */}
      {completed.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Completed</p>
          {completed.map((a: any) => {
            const course = a.training_courses;
            return (
              <Link key={a.id} to={`/worker/courses/${a.id}`}>
                <Card className="opacity-75 hover:opacity-100 transition-opacity">
                  <CardContent className="p-3 flex items-center gap-3">
                    <BookOpen className="h-4 w-4 text-emerald-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{course?.title || 'Training'}</p>
                      {a.score != null && <p className="text-xs text-muted-foreground">Score: {a.score}%</p>}
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700">✓ Passed</Badge>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {assignments.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No training courses assigned yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
