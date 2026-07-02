import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { useApplications, useProspects, useCreateRecord, useUpdateRecord } from '@/hooks/pm-staff/usePMStaffData';
import { formatStatusLabel } from '@/lib/statusLabel';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

const STATUSES = ['started', 'submitted', 'under_review', 'approved', 'declined', 'withdrawn'];

export default function Applications() {
  const { user } = useAuth();
  const { data = [] } = useApplications();
  const { data: prospects = [] } = useProspects();
  const createMut = useCreateRecord('pm_applications', ['pm_applications']);
  const updateMut = useUpdateRecord('pm_applications', ['pm_applications']);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ prospect_id: '', status: 'started', desired_move_in: '', notes: '' });

  const submit = async () => {
    try {
      await createMut.mutateAsync({
        prospect_id: form.prospect_id || null,
        status: form.status,
        desired_move_in: form.desired_move_in || null,
        notes: form.notes,
        submitted_at: form.status === 'submitted' ? new Date().toISOString() : null,
        created_by: user?.id,
      });
      toast.success('Application created');
      setOpen(false);
      setForm({ prospect_id: '', status: 'started', desired_move_in: '', notes: '' });
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Applications</h2>
        <Button size="sm" onClick={() => setOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="h-4 w-4 mr-1" /> New
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Tracking only. Credit checks, background checks, and application fees are not collected here.</p>
      {data.length === 0 && <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No applications yet.</CardContent></Card>}
      <div className="space-y-2">
        {data.map(a => (
          <Card key={a.id}>
            <CardContent className="p-3 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{a.prospect?.name ?? 'Applicant'}</p>
                <p className="text-xs text-muted-foreground">{a.desired_move_in ? `Move-in ${a.desired_move_in}` : '—'}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge variant="outline" className="text-[10px]">{formatStatusLabel(a.status)}</Badge>
                <Select value={a.status} onValueChange={v => updateMut.mutate({ id: a.id, patch: { status: v, submitted_at: v === 'submitted' && !a.submitted_at ? new Date().toISOString() : a.submitted_at } })}>
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
          <DialogHeader><DialogTitle>New application</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Prospect</Label>
              <Select value={form.prospect_id} onValueChange={v => setForm({ ...form, prospect_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select prospect (optional)" /></SelectTrigger>
                <SelectContent>{prospects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Desired move-in</Label><Input type="date" value={form.desired_move_in} onChange={e => setForm({ ...form, desired_move_in: e.target.value })} /></div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{formatStatusLabel(s)}</SelectItem>)}</SelectContent>
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
