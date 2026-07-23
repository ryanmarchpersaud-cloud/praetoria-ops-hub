import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Search, ClipboardCheck, MoreHorizontal, Pencil } from 'lucide-react';
import { useOperationalTasks, TASK_STATUSES, useUpdateTask, useAssignableUsers } from '@/hooks/useOperationalTasks';
import { TaskFormDialog } from '@/components/tasks/TaskFormDialog';
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

function AssigneesCell({ task, directory }: { task: any; directory: Map<string, { label: string; assignee_type: string }> }) {
  const links: { user_id: string }[] = task.operational_task_assignees || [];
  const ids = links.length ? links.map(l => l.user_id) : (task.assigned_to ? [task.assigned_to] : []);
  if (ids.length === 0) return <span className="text-xs text-muted-foreground">Unassigned</span>;

  const labelFor = (uid: string) => directory.get(uid)?.label || 'Unknown';
  const first = labelFor(ids[0]);
  const firstName = first.split(' ')[0];
  const extra = ids.length - 1;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="text-xs text-left hover:underline focus:outline-none focus:ring-1 focus:ring-primary rounded px-1 -mx-1">
          <span className="font-medium">{firstName}</span>
          {extra > 0 && <span className="text-muted-foreground"> +{extra} more</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground px-1 pb-1">Assigned ({ids.length})</p>
        <ul className="space-y-1">
          {ids.map(uid => {
            const info = directory.get(uid);
            return (
              <li key={uid} className="text-xs px-1 py-0.5">
                <span className="font-medium">{info?.label || 'Unknown'}</span>
                {info?.assignee_type && (
                  <span className="ml-1 text-[10px] text-muted-foreground capitalize">· {info.assignee_type}</span>
                )}
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

export default function TasksPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const { data: tasks = [], isLoading } = useOperationalTasks({ status: statusFilter && statusFilter !== 'all' ? statusFilter : undefined });
  const { data: directoryList = [] } = useAssignableUsers();
  const updateTask = useUpdateTask();
  const { toast } = useToast();

  const directory = new Map(directoryList.map(d => [d.user_id, { label: d.label, assignee_type: d.assignee_type }]));

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

  const openCreate = () => { setEditingTask(null); setFormOpen(true); };
  const openEdit = (t: any) => { setEditingTask(t); setFormOpen(true); };

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
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> New Task</Button>
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
                <TableHead>Assignees</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Receipt</TableHead>
                <TableHead className="w-40">Actions</TableHead>
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
                      <AssigneesCell task={t} directory={directory} />
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn('text-[10px] capitalize', priorityColor[t.priority])}>{t.priority}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn('text-[10px]', statusColor[t.status])}>{t.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{t.due_date ? format(new Date(t.due_date), 'MMM d, yyyy') : '—'}</TableCell>
                    <TableCell className="text-xs">{t.receipt_required ? '✓ Required' : '—'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Select value={t.status} onValueChange={(v) => handleStatusChange(t.id, v)}>
                          <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {TASK_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openEdit(t)}>
                              <Pencil className="h-3.5 w-3.5 mr-2" /> Edit Task
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <TaskFormDialog
        open={formOpen}
        onOpenChange={(v) => { setFormOpen(v); if (!v) setEditingTask(null); }}
        task={editingTask}
      />
    </div>
  );
}
