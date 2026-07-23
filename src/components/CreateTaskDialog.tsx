import { useState } from 'react';
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
import { useCreateTask, TASK_CATEGORIES, TASK_PRIORITIES } from '@/hooks/useOperationalTasks';
import { useCustomers } from '@/hooks/useCustomers';
import { useProperties } from '@/hooks/useProperties';
import { useEmployees } from '@/hooks/useEmployees';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** If provided, pre-fills assignee_type and hides the toggle */
  defaultAssigneeType?: 'worker' | 'subcontractor';
  /** If provided, pre-fills assigned_to */
  defaultAssignedTo?: string;
}

const INITIAL = {
  task_title: '',
  task_category: '' as string,
  task_description: '',
  assignee_type: 'worker' as 'worker' | 'subcontractor',
  assigned_to: '',
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

export function CreateTaskDialog({ open, onOpenChange, defaultAssigneeType, defaultAssignedTo }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const createTask = useCreateTask();
  const { data: customers = [] } = useCustomers();
  const { data: properties = [] } = useProperties();
  const { data: workers = [] } = useEmployees();
  const { data: subcontractors = [] } = useQuery({
    queryKey: ['subcontractors_list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('subcontractors').select('id, user_id, company_name, contact_name').order('contact_name');
      if (error) throw error;
      return data ?? [];
    },
  });

  const [form, setForm] = useState({
    ...INITIAL,
    assignee_type: defaultAssigneeType || 'worker',
    assigned_to: defaultAssignedTo || '',
  });

  const reset = () => setForm({
    ...INITIAL,
    assignee_type: defaultAssigneeType || 'worker',
    assigned_to: defaultAssignedTo || '',
  });

  const set = (key: string, value: any) => setForm(f => ({ ...f, [key]: value }));

  const handleSubmit = async () => {
    if (!form.task_title.trim()) {
      toast({ title: 'Task title is required', variant: 'destructive' });
      return;
    }
    try {
      await createTask.mutateAsync({
        task_title: form.task_title.trim(),
        task_category: (form.task_category || 'Other') as any,
        task_description: form.task_description || null,
        assignee_type: form.assignee_type,
        assigned_to: form.assigned_to || null,
        customer_id: form.customer_id && form.customer_id !== 'none' ? form.customer_id : null,
        customer_name_text: form.customer_name_text.trim() || null,
        property_id: form.property_id && form.property_id !== 'none' ? form.property_id : null,
        property_name_text: form.property_name_text.trim() || null,
        address: form.address || null,
        city: form.city || null,
        province: form.province || null,
        postal_code: form.postal_code || null,

        priority: (form.priority || 'medium') as any,
        status: form.assigned_to ? 'Assigned' as any : 'New' as any,
        due_date: form.due_date || null,
        due_time: form.due_time || null,
        materials_parts_list: form.materials_parts_list || null,
        budget_limit: form.budget_limit ? parseFloat(form.budget_limit) : null,
        receipt_required: form.receipt_required,
        photos_required: form.photos_required,
        follow_up_required: form.follow_up_required,
        notes: form.notes || null,
        created_by: user?.id || null,
      });
      toast({ title: 'Task created successfully' });
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Error creating task', description: e.message, variant: 'destructive' });
    }
  };

  const assigneeList = form.assignee_type === 'worker'
    ? workers.map((w: any) => ({ id: w.user_id, label: w.full_name || w.email || 'Worker' }))
    : subcontractors.map((s: any) => ({ id: s.user_id, label: s.contact_name || s.company_name || 'Subcontractor' }));

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-md max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>New Task</DialogTitle>
          <DialogDescription>Create a lightweight operational task.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] px-6">
          <div className="space-y-3 pb-4">
            {/* Title */}
            <div>
              <Label>Task Title *</Label>
              <Input placeholder="e.g. Pick up salt bags from Home Depot" value={form.task_title} onChange={e => set('task_title', e.target.value)} />
            </div>

            {/* Category */}
            <div>
              <Label>Category</Label>
              <Select value={form.task_category} onValueChange={v => set('task_category', v)}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {TASK_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Assignee Type toggle (hidden when defaulted) */}
            {!defaultAssigneeType && (
              <div>
                <Label>Assign To</Label>
                <Select value={form.assignee_type} onValueChange={v => { set('assignee_type', v); set('assigned_to', ''); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="worker">Worker</SelectItem>
                    <SelectItem value="subcontractor">Subcontractor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Assignee */}
            {!defaultAssignedTo && (
              <div>
                <Label>{form.assignee_type === 'worker' ? 'Worker' : 'Subcontractor'}</Label>
                <Select value={form.assigned_to} onValueChange={v => set('assigned_to', v)}>
                  <SelectTrigger><SelectValue placeholder="Select person" /></SelectTrigger>
                  <SelectContent>
                    {assigneeList.map((a: any) => (
                      <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Priority */}
            <div>
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={v => set('priority', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITIES.map(p => <SelectItem key={p} value={p} className="capitalize">{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Due date/time */}
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} /></div>
              <div><Label>Due Time</Label><Input type="time" value={form.due_time} onChange={e => set('due_time', e.target.value)} /></div>
            </div>

            {/* Customer (optional) */}
            <div>
              <Label>Customer (optional)</Label>
              <Select value={form.customer_id} onValueChange={v => set('customer_id', v)}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {customers.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}{c.company_name ? ` (${c.company_name})` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Property (optional) */}
            <div>
              <Label>Property (optional)</Label>
              <Select value={form.property_id} onValueChange={v => set('property_id', v)}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {(properties || []).map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.property_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Address */}
            <div>
              <Label>Address / Location</Label>
              <Input placeholder="Store address or location" value={form.address} onChange={e => set('address', e.target.value)} />
            </div>

            {/* Description */}
            <div>
              <Label>Task Description</Label>
              <Textarea rows={2} placeholder="Detailed instructions…" value={form.task_description} onChange={e => set('task_description', e.target.value)} />
            </div>

            {/* Materials */}
            <div>
              <Label>Materials / Parts to Buy</Label>
              <Textarea rows={2} placeholder="List items needed…" value={form.materials_parts_list} onChange={e => set('materials_parts_list', e.target.value)} />
            </div>

            {/* Budget */}
            <div>
              <Label>Budget / Spending Limit ($)</Label>
              <Input type="number" step="0.01" min="0" placeholder="0.00" value={form.budget_limit} onChange={e => set('budget_limit', e.target.value)} />
            </div>

            {/* Toggles */}
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

            {/* Notes */}
            <div>
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>
          </div>
        </ScrollArea>
        <DialogFooter className="px-6 pb-6 pt-2">
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createTask.isPending}>{createTask.isPending ? 'Creating…' : 'Create Task'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
