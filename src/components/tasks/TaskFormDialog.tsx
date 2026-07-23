import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  useCreateTask, useUpdateTask, TASK_CATEGORIES, TASK_PRIORITIES,
} from '@/hooks/useOperationalTasks';
import { useCustomers } from '@/hooks/useCustomers';
import { useProperties } from '@/hooks/useProperties';
import { AssigneeMultiSelect, type AssigneeValue } from '@/components/tasks/AssigneeMultiSelect';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** If provided, opens in edit mode with prefilled values (from useOperationalTasks row incl. operational_task_assignees) */
  task?: any | null;
}

const EMPTY = {
  task_title: '',
  task_category: '' as string,
  task_description: '',
  customer_id: '',
  customer_name_text: '',
  property_id: '',
  property_name_text: '',
  address: '',
  city: '',
  province: '',
  postal_code: '',
  priority: 'medium' as string,
  due_date: '',
  due_time: '',
  materials_parts_list: '',
  budget_limit: '',
  receipt_required: false,
  photos_required: false,
  follow_up_required: false,
  notes: '',
};

export function TaskFormDialog({ open, onOpenChange, task }: Props) {
  const isEdit = !!task;
  const { user } = useAuth();
  const { toast } = useToast();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const { data: customers = [] } = useCustomers();
  const { data: properties = [] } = useProperties();

  const [form, setForm] = useState(EMPTY);
  const [assignees, setAssignees] = useState<AssigneeValue[]>([]);

  useEffect(() => {
    if (!open) return;
    if (task) {
      setForm({
        task_title: task.task_title || '',
        task_category: task.task_category || '',
        task_description: task.task_description || '',
        customer_id: task.customer_id || '',
        customer_name_text: task.customer_name_text || '',
        property_id: task.property_id || '',
        property_name_text: task.property_name_text || '',
        address: task.address || '',
        city: task.city || '',
        province: task.province || '',
        postal_code: task.postal_code || '',
        priority: task.priority || 'medium',
        due_date: task.due_date || '',
        due_time: task.due_time || '',
        materials_parts_list: task.materials_parts_list || '',
        budget_limit: task.budget_limit != null ? String(task.budget_limit) : '',
        receipt_required: !!task.receipt_required,
        photos_required: !!task.photos_required,
        follow_up_required: !!task.follow_up_required,
        notes: task.notes || '',
      });
      const links: AssigneeValue[] = (task.operational_task_assignees || []).map((a: any) => ({
        user_id: a.user_id,
        assignee_type: a.assignee_type,
      }));
      // Fallback: legacy single assignment
      if (links.length === 0 && task.assigned_to) {
        links.push({ user_id: task.assigned_to, assignee_type: (task.assignee_type as any) || 'worker' });
      }
      setAssignees(links);
    } else {
      setForm(EMPTY);
      setAssignees([]);
    }
  }, [open, task]);

  const set = (key: string, value: any) => setForm(f => ({ ...f, [key]: value }));

  const buildPayload = () => ({
    task_title: form.task_title.trim(),
    task_category: (form.task_category || 'Other') as any,
    task_description: form.task_description || null,
    customer_id: form.customer_id && form.customer_id !== 'none' ? form.customer_id : null,
    customer_name_text: form.customer_name_text.trim() || null,
    property_id: form.property_id && form.property_id !== 'none' ? form.property_id : null,
    property_name_text: form.property_name_text.trim() || null,
    address: form.address || null,
    city: form.city || null,
    province: form.province || null,
    postal_code: form.postal_code || null,
    priority: (form.priority || 'medium') as any,
    due_date: form.due_date || null,
    due_time: form.due_time || null,
    materials_parts_list: form.materials_parts_list || null,
    budget_limit: form.budget_limit ? parseFloat(form.budget_limit) : null,
    receipt_required: form.receipt_required,
    photos_required: form.photos_required,
    follow_up_required: form.follow_up_required,
    notes: form.notes || null,
  });

  const handleSubmit = async () => {
    if (!form.task_title.trim()) {
      toast({ title: 'Task title is required', variant: 'destructive' });
      return;
    }
    try {
      if (isEdit) {
        await updateTask.mutateAsync({
          id: task.id,
          ...buildPayload(),
          assignees,
        } as any);
        toast({ title: 'Task updated' });
      } else {
        await createTask.mutateAsync({
          ...buildPayload(),
          status: assignees.length ? ('Assigned' as any) : ('New' as any),
          created_by: user?.id || null,
          assignees,
        } as any);
        toast({ title: 'Task created successfully' });
      }
      onOpenChange(false);
    } catch (e: any) {
      toast({
        title: isEdit ? 'Error updating task' : 'Error creating task',
        description: e.message,
        variant: 'destructive',
      });
    }
  };

  const pending = createTask.isPending || updateTask.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>{isEdit ? 'Edit Task' : 'New Task'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update task details, due date and assigned people.' : 'Create a lightweight operational task.'}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] px-6">
          <div className="space-y-3 pb-4">
            <div>
              <Label>Task Title *</Label>
              <Input value={form.task_title} onChange={e => set('task_title', e.target.value)} />
            </div>

            <div>
              <Label>Category</Label>
              <Select value={form.task_category} onValueChange={v => set('task_category', v)}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {TASK_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Assignees</Label>
              <AssigneeMultiSelect value={assignees} onChange={setAssignees} />
              <p className="text-[10px] text-muted-foreground mt-1">
                Add one or more workers/subcontractors. Newly added people get a notification; existing ones aren't re-notified.
              </p>
            </div>

            <div>
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={v => set('priority', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITIES.map(p => (
                    <SelectItem key={p} value={p} className="capitalize">
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Due Date</Label>
                <Input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
              </div>
              <div>
                <Label>Due Time</Label>
                <Input type="time" value={form.due_time} onChange={e => set('due_time', e.target.value)} />
              </div>
            </div>

            <div>
              <Label>Customer (optional)</Label>
              <Select value={form.customer_id} onValueChange={v => set('customer_id', v)}>
                <SelectTrigger><SelectValue placeholder="Select from list" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {customers.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.first_name} {c.last_name}{c.company_name ? ` (${c.company_name})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                className="mt-2"
                placeholder="Or type customer name manually"
                value={form.customer_name_text}
                onChange={e => set('customer_name_text', e.target.value)}
              />
            </div>

            <div>
              <Label>Property (optional)</Label>
              <Select value={form.property_id} onValueChange={v => set('property_id', v)}>
                <SelectTrigger><SelectValue placeholder="Select from list" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {(properties || []).map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.property_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                className="mt-2"
                placeholder="Or type property name manually"
                value={form.property_name_text}
                onChange={e => set('property_name_text', e.target.value)}
              />
            </div>

            <div>
              <Label>Address / Location</Label>
              <Input value={form.address} onChange={e => set('address', e.target.value)} />
            </div>

            <div>
              <Label>Task Description</Label>
              <Textarea rows={2} value={form.task_description} onChange={e => set('task_description', e.target.value)} />
            </div>

            <div>
              <Label>Materials / Parts to Buy</Label>
              <Textarea rows={2} value={form.materials_parts_list} onChange={e => set('materials_parts_list', e.target.value)} />
            </div>

            <div>
              <Label>Budget / Spending Limit ($)</Label>
              <Input type="number" step="0.01" min="0" value={form.budget_limit} onChange={e => set('budget_limit', e.target.value)} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Receipt Required</Label>
                <Switch checked={form.receipt_required} onCheckedChange={v => set('receipt_required', v)} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Photos Required</Label>
                <Switch checked={form.photos_required} onCheckedChange={v => set('photos_required', v)} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Follow-up Required</Label>
                <Switch checked={form.follow_up_required} onCheckedChange={v => set('follow_up_required', v)} />
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>
          </div>
        </ScrollArea>
        <DialogFooter className="px-6 pb-6 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={pending}>
            {pending ? (isEdit ? 'Saving…' : 'Creating…') : (isEdit ? 'Save Changes' : 'Create Task')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
