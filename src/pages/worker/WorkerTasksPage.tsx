import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMyTasks, useUpdateTask, TASK_STATUSES } from '@/hooks/useOperationalTasks';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  ClipboardCheck, MapPin, CalendarDays, ChevronRight, DollarSign,
  Camera, Receipt, AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

const priorityColor: Record<string, string> = {
  low: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  high: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

const statusBorder: Record<string, string> = {
  New: 'border-l-slate-400',
  Assigned: 'border-l-blue-500',
  'In Progress': 'border-l-violet-500',
  Waiting: 'border-l-amber-500',
  Completed: 'border-l-emerald-500',
  Cancelled: 'border-l-red-400',
};

export default function WorkerTasksPage() {
  const { user } = useAuth();
  const { data: tasks = [], isLoading } = useMyTasks(user?.id);
  const updateTask = useUpdateTask();
  const { toast } = useToast();
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [newStatus, setNewStatus] = useState('');

  const openDetail = (task: any) => {
    setSelectedTask(task);
    setCompletionNotes(task.completion_notes || '');
    setNewStatus(task.status);
  };

  const handleUpdate = async () => {
    if (!selectedTask) return;
    try {
      await updateTask.mutateAsync({
        id: selectedTask.id,
        status: newStatus as any,
        completion_notes: completionNotes || null,
      });
      toast({ title: `Task updated to ${newStatus}` });
      setSelectedTask(null);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-3 px-4 pt-6 pb-4">
      <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
        <ClipboardCheck className="h-5 w-5 text-primary" />
        My Tasks
      </h1>

      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Loading…</p>
      ) : tasks.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <ClipboardCheck className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No active tasks assigned to you</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {tasks.map((t: any) => (
            <button key={t.id} onClick={() => openDetail(t)} className="w-full text-left">
              <Card className={cn('border-l-4 active:shadow-sm transition-shadow', statusBorder[t.status])}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-medium text-foreground truncate">{t.task_title}</p>
                      <Badge variant="secondary" className={cn('text-[9px] capitalize shrink-0', priorityColor[t.priority])}>{t.priority}</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{t.task_category}</p>
                    {t.due_date && (
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <CalendarDays className="h-3 w-3" /> Due {format(new Date(t.due_date), 'MMM d')}
                      </p>
                    )}
                    {t.address && (
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {t.address}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      {t.receipt_required && <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded dark:bg-amber-900/30 dark:text-amber-300">Receipt Required</span>}
                      {t.photos_required && <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded dark:bg-blue-900/30 dark:text-blue-300">Photos Required</span>}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      )}

      {/* Task Detail Dialog */}
      <Dialog open={!!selectedTask} onOpenChange={(v) => { if (!v) setSelectedTask(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">{selectedTask?.task_title}</DialogTitle>
            <DialogDescription>{selectedTask?.task_category}</DialogDescription>
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-3 text-sm">
              {selectedTask.task_description && (
                <div>
                  <Label className="text-muted-foreground text-xs">Description</Label>
                  <p className="text-sm">{selectedTask.task_description}</p>
                </div>
              )}
              {selectedTask.materials_parts_list && (
                <div>
                  <Label className="text-muted-foreground text-xs">Materials / Parts</Label>
                  <p className="text-sm whitespace-pre-wrap">{selectedTask.materials_parts_list}</p>
                </div>
              )}
              {selectedTask.budget_limit && (
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                  <span>Budget: ${Number(selectedTask.budget_limit).toFixed(2)}</span>
                </div>
              )}
              {selectedTask.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>{selectedTask.address}{selectedTask.city ? `, ${selectedTask.city}` : ''}</span>
                </div>
              )}
              {selectedTask.notes && (
                <div>
                  <Label className="text-muted-foreground text-xs">Notes</Label>
                  <p className="text-sm">{selectedTask.notes}</p>
                </div>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                {selectedTask.receipt_required && (
                  <Badge variant="outline" className="gap-1"><Receipt className="h-3 w-3" /> Receipt Required</Badge>
                )}
                {selectedTask.photos_required && (
                  <Badge variant="outline" className="gap-1"><Camera className="h-3 w-3" /> Photos Required</Badge>
                )}
                {selectedTask.follow_up_required && (
                  <Badge variant="outline" className="gap-1"><AlertTriangle className="h-3 w-3" /> Follow-up</Badge>
                )}
              </div>

              <div>
                <Label>Update Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TASK_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Completion Notes</Label>
                <Textarea rows={3} placeholder="Add your notes, what was done, amounts spent…" value={completionNotes} onChange={e => setCompletionNotes(e.target.value)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedTask(null)}>Close</Button>
            <Button onClick={handleUpdate} disabled={updateTask.isPending}>{updateTask.isPending ? 'Saving…' : 'Update Task'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
