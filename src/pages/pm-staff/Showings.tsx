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
import { useShowings, useProspects, useCreateRecord, useUpdateRecord } from '@/hooks/pm-staff/usePMStaffData';
import { formatStatusLabel } from '@/lib/statusLabel';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

const STATUSES = ['scheduled', 'completed', 'no_show', 'cancelled', 'rescheduled'];
const TYPES = ['in_person', 'virtual', 'self_guided'];

export default function Showings() {
  const { user } = useAuth();
  const { data = [] } = useShowings();
  const { data: prospects = [] } = useProspects();
  const createMut = useCreateRecord('pm_showings', ['pm_showings']);
  const updateMut = useUpdateRecord('pm_showings', ['pm_showings']);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ prospect_id: '', scheduled_at: '', showing_type: 'in_person', status: 'scheduled', notes: '' });

  const submit = async () => {
    if (!form.scheduled_at) return toast.error('Date & time required');
    try {
      await createMut.mutateAsync({
        ...form,
        prospect_id: form.prospect_id || null,
        scheduled_at: new Date(form.scheduled_at).toISOString(),
        assigned_to: user?.id,
        created_by: user?.id,
      });
      toast.success('Showing scheduled');
      setOpen(false);
      setForm({ prospect_id: '', scheduled_at: '', showing_type: 'in_person', status: 'scheduled', notes: '' });
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Showings</h2>
        <Button size="sm" onClick={() => setOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="h-4 w-4 mr-1" /> Schedule
        </Button>
      </div>
      {data.length === 0 && <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No showings scheduled.</CardContent></Card>}
      <div className="space-y-2">
        {data.map(s => (
          <Card key={s.id}>
            <CardContent className="p-3 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{s.prospect?.name ?? 'Prospect TBD'}</p>
                <p className="text-xs text-muted-foreground">{format(new Date(s.scheduled_at), 'PPP p')}</p>
                <p className="text-[11px] text-muted-foreground">{formatStatusLabel(s.showing_type ?? 'in_person')}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge variant="outline" className="text-[10px]">{formatStatusLabel(s.status)}</Badge>
                <Select value={s.status} onValueChange={v => updateMut.mutate({ id: s.id, patch: { status: v } })}>
                  <SelectTrigger className="h-7 text-xs w-[130px]"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(x => <SelectItem key={x} value={x}>{formatStatusLabel(x)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Schedule showing</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Prospect</Label>
              <Select value={form.prospect_id} onValueChange={v => setForm({ ...form, prospect_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select prospect (optional)" /></SelectTrigger>
                <SelectContent>{prospects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Date & time *</Label><Input type="datetime-local" value={form.scheduled_at} onChange={e => setForm({ ...form, scheduled_at: e.target.value })} /></div>
            <div>
              <Label>Type</Label>
              <Select value={form.showing_type} onValueChange={v => setForm({ ...form, showing_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{formatStatusLabel(t)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
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
