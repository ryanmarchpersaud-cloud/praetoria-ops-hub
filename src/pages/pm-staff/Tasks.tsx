import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2 } from 'lucide-react';
import { useStaffTasks, useProspects, useShowings, useCreateRecord, useUpdateRecord } from '@/hooks/pm-staff/usePMStaffData';
import { formatStatusLabel } from '@/lib/statusLabel';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

const STATUSES = ['open', 'in_progress', 'completed', 'cancelled'];
const PRIORITIES = ['low', 'normal', 'high', 'urgent'];
const CATEGORIES = ['general', 'showing', 'renewal', 'maintenance', 'inspection', 'screening', 'documents', 'other'];

const emptyForm = () => ({
  title: '', description: '', priority: 'normal', status: 'open', due_date: '',
  category: 'general', reminder_at: '',
  linked_prospect_id: '', linked_showing_id: '',
  checklist: [] as Array<{ label: string; done: boolean }>,
});
type FormShape = ReturnType<typeof emptyForm>;

function Row({ children, cols = 2 }: { children: React.ReactNode; cols?: 1 | 2 | 3 }) {
  const cls = cols === 3 ? 'grid grid-cols-1 sm:grid-cols-3 gap-3' : cols === 2 ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : '';
  return <div className={cls}>{children}</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}

export default function Tasks() {
  const { user } = useAuth();
  const { data = [] } = useStaffTasks(false);
  const { data: prospects = [] } = useProspects();
  const { data: showings = [] } = useShowings();
  const createMut = useCreateRecord('pm_staff_tasks', ['pm_staff_tasks']);
  const updateMut = useUpdateRecord('pm_staff_tasks', ['pm_staff_tasks']);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormShape>(emptyForm());
  const set = (p: Partial<FormShape>) => setForm(prev => ({ ...prev, ...p }));

  const addItem = () => set({ checklist: [...form.checklist, { label: '', done: false }] });
  const rmItem = (i: number) => set({ checklist: form.checklist.filter((_, x) => x !== i) });
  const upItem = (i: number, v: string) => set({ checklist: form.checklist.map((c, x) => x === i ? { ...c, label: v } : c) });

  const submit = async () => {
    if (!form.title.trim()) return toast.error('Title required');
    try {
      await createMut.mutateAsync({
        title: form.title.trim(),
        description: form.description || null,
        priority: form.priority,
        status: form.status,
        due_date: form.due_date || null,
        category: form.category,
        reminder_at: form.reminder_at ? new Date(form.reminder_at).toISOString() : null,
        linked_prospect_id: form.linked_prospect_id || null,
        linked_showing_id: form.linked_showing_id || null,
        checklist: form.checklist.filter(c => c.label.trim()),
        assigned_to: user?.id,
        created_by: user?.id,
      });
      toast.success('Task created');
      setOpen(false);
      setForm(emptyForm());
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
        {data.map((t: any) => {
          const list: Array<{ label: string; done: boolean }> = Array.isArray(t.checklist) ? t.checklist : [];
          const done = list.filter(c => c.done).length;
          return (
            <Card key={t.id}>
              <CardContent className="p-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{t.title}</p>
                  {t.description && <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {t.category && <Badge variant="secondary" className="text-[10px]">{formatStatusLabel(t.category)}</Badge>}
                    {list.length > 0 && <Badge variant="outline" className="text-[10px]">{done}/{list.length}</Badge>}
                    {t.due_date && <span className="text-[11px] text-muted-foreground">Due {t.due_date}</span>}
                    {t.reminder_at && <span className="text-[11px] text-muted-foreground">Remind {new Date(t.reminder_at).toLocaleString()}</span>}
                  </div>
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
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New task</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Field label="Title *"><Input value={form.title} onChange={e => set({ title: e.target.value })} /></Field>
            <Field label="Description"><Textarea value={form.description} onChange={e => set({ description: e.target.value })} /></Field>
            <Row cols={3}>
              <Field label="Category">
                <Select value={form.category} onValueChange={v => set({ category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{formatStatusLabel(c)}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Priority">
                <Select value={form.priority} onValueChange={v => set({ priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{formatStatusLabel(p)}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Due date"><Input type="date" value={form.due_date} onChange={e => set({ due_date: e.target.value })} /></Field>
            </Row>
            <Row>
              <Field label="Reminder"><Input type="datetime-local" value={form.reminder_at} onChange={e => set({ reminder_at: e.target.value })} /></Field>
              <Field label="Link to prospect">
                <Select value={form.linked_prospect_id || undefined} onValueChange={v => set({ linked_prospect_id: v })}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>{prospects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </Row>
            <Field label="Link to showing">
              <Select value={form.linked_showing_id || undefined} onValueChange={v => set({ linked_showing_id: v })}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>{showings.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.prospect?.name ?? 'Prospect TBD'} — {new Date(s.scheduled_at).toLocaleString()}
                  </SelectItem>
                ))}</SelectContent>
              </Select>
            </Field>

            <div className="border-t pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Checklist</Label>
                <Button type="button" size="sm" variant="outline" onClick={addItem}><Plus className="h-3 w-3 mr-1" />Add step</Button>
              </div>
              {form.checklist.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Checkbox checked={c.done} onCheckedChange={v => set({ checklist: form.checklist.map((x, ix) => ix === i ? { ...x, done: !!v } : x) })} />
                  <Input value={c.label} onChange={e => upItem(i, e.target.value)} placeholder="Step" />
                  <Button type="button" variant="ghost" size="icon" onClick={() => rmItem(i)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
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
