import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, ClipboardCheck } from 'lucide-react';
import { useOperationalTasks, TASK_STATUSES, useUpdateTask } from '@/hooks/useOperationalTasks';
import { CreateTaskDialog } from '@/components/CreateTaskDialog';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

const priorityColor: Record<string, string> = {
  low: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  high: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

const statusColor: Record<string, string> = {
  New: 'bg-slate-100 text-slate-700',
  Assigned: 'bg-blue-100 text-blue-700',
  'In Progress': 'bg-violet-100 text-violet-700',
  Waiting: 'bg-amber-100 text-amber-700',
  Completed: 'bg-emerald-100 text-emerald-700',
  Cancelled: 'bg-red-100 text-red-700',
};

export default function TasksPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const { data: tasks = [], isLoading } = useOperationalTasks({ status: statusFilter || undefined });
  const updateTask = useUpdateTask();
  const { toast } = useToast();

  const filtered = tasks.filter((t: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return t.task_title?.toLowerCase().includes(s) ||
      t.task_category?.toLowerCase().includes(s) ||
      t.task_description?.toLowerCase().includes(s);
  });

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateTask.mutateAsync({ id, status: status as any });
      toast({ title: `Task marked as ${status}` });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-primary" />
            Operational Tasks
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Lightweight tasks for errands, pickups, inspections & more</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1" /> New Task</Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search tasks…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {TASK_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assignee Type</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Receipt</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No tasks found</TableCell></TableRow>
              ) : (
                filtered.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{t.task_title}</p>
                        {t.customers && (
                          <p className="text-xs text-muted-foreground">{t.customers.first_name} {t.customers.last_name}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{t.task_category}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn('text-[10px] capitalize', priorityColor[t.priority])}>{t.priority}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn('text-[10px]', statusColor[t.status])}>{t.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs capitalize">{t.assignee_type}</TableCell>
                    <TableCell className="text-xs">{t.due_date ? format(new Date(t.due_date), 'MMM d, yyyy') : '—'}</TableCell>
                    <TableCell className="text-xs">{t.receipt_required ? '✓ Required' : '—'}</TableCell>
                    <TableCell>
                      <Select value={t.status} onValueChange={(v) => handleStatusChange(t.id, v)}>
                        <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TASK_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CreateTaskDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
