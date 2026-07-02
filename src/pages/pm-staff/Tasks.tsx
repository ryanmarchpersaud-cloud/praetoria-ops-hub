import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { useStaffTasks, useCreateRecord, useUpdateRecord } from '@/hooks/pm-staff/usePMStaffData';
import { formatStatusLabel } from '@/lib/statusLabel';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

const STATUSES = ['open', 'in_progress', 'completed', 'cancelled'];
const PRIORITIES = ['low', 'normal', 'high', 'urgent'];

export default function Tasks() {
  const { user } = useAuth();
  const { data = [] } = useStaffTasks(false);
  const createMut = useCreateRecord('pm_staff_tasks', ['pm_staff_tasks']);
  const updateMut = useUpdateRecord('pm_staff_tasks', ['pm_staff_tasks']);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ title: '', description: '', priority: 'normal', status: 'open', due_date: '' });

  const submit = async () => {
    if (!form.title.trim()) return toast.error('Title required');
    try {
      await createMut.mutateAsync({
        ...form,
        due_date: form.due_date || null,
        assigned_to: user?.id,
        created_by: user?.id,
      });
      toast.success('Task created');
      setOpen(false);
      setForm({ title: '', description: '', priority: 'normal', status: 'open', due_date: '' });
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Tasks</h2>
        <Button size="sm" onClick={() => setOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="h-4 w-4 mr-1" /> New
        </Button>
      </div>
      {data.length === 0 && <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No tasks.</CardContent></Card>}
      <div className="space-y-2">
        {data.map(t => (
          <Card key={t.id}>
            <CardContent className="p-3 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{t.title}</p>
                {t.description && <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>}
                {t.due_date && <p className="text-[11px] text-muted-foreground mt-1">Due {t.due_date}</p>}
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <Badge variant="outline" className="text-[10px]">{formatStatusLabel(t.priority ?? 'normal')}</Badge>
                <Select value={t.status} onValueChange={v => updateMut.mutate({ id: t.id, patch: { status: v } })}>
                  <SelectTrigger className="h-7 text-xs w-[130px]"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{formatStatusLabel(s)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New task</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{formatStatusLabel(p)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Due date</Label><Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={submit} disabled={createMut.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
