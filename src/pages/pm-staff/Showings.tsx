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
import { Plus } from 'lucide-react';
import { useShowings, useProspects, useCreateRecord, useUpdateRecord } from '@/hooks/pm-staff/usePMStaffData';
import { formatStatusLabel } from '@/lib/statusLabel';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

const STATUSES = ['scheduled', 'completed', 'no_show', 'cancelled', 'rescheduled'];
const TYPES = ['in_person', 'virtual', 'self_guided'];
const CONFIRMATIONS = ['unconfirmed', 'confirmed', 'declined'];
const INTEREST_LEVELS = ['high', 'medium', 'low', 'none'];

const emptyForm = () => ({
  prospect_id: '',
  scheduled_at: '',
  duration_minutes: '30',
  showing_type: 'in_person',
  meeting_location: '',
  status: 'scheduled',
  confirmation_status: 'unconfirmed',
  notes: '',
  no_show: false,
  interest_level: '',
  feedback_rating: '',
  feedback_notes: '',
});

type FormShape = ReturnType<typeof emptyForm>;

function Row({ children, cols = 2 }: { children: React.ReactNode; cols?: 1 | 2 | 3 }) {
  const cls = cols === 1 ? '' : cols === 3 ? 'grid grid-cols-1 sm:grid-cols-3 gap-3' : 'grid grid-cols-1 sm:grid-cols-2 gap-3';
  return <div className={cls}>{children}</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}

export default function Showings() {
  const { user } = useAuth();
  const { data = [] } = useShowings();
  const { data: prospects = [] } = useProspects();
  const createMut = useCreateRecord('pm_showings', ['pm_showings']);
  const updateMut = useUpdateRecord('pm_showings', ['pm_showings']);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormShape>(emptyForm());
  const set = (p: Partial<FormShape>) => setForm(prev => ({ ...prev, ...p }));

  const submit = async () => {
    if (!form.scheduled_at) return toast.error('Date & time required');
    try {
      const payload: any = {
        prospect_id: form.prospect_id || null,
        scheduled_at: new Date(form.scheduled_at).toISOString(),
        duration_minutes: form.duration_minutes === '' ? 30 : Number(form.duration_minutes),
        showing_type: form.showing_type,
        meeting_location: form.meeting_location || null,
        status: form.status,
        confirmation_status: form.confirmation_status,
        confirmed_at: form.confirmation_status === 'confirmed' ? new Date().toISOString() : null,
        notes: form.notes || null,
        no_show: form.no_show,
        interest_level: form.interest_level || null,
        feedback_rating: form.feedback_rating === '' ? null : Number(form.feedback_rating),
        feedback_notes: form.feedback_notes || null,
        assigned_to: user?.id,
        created_by: user?.id,
      };
      await createMut.mutateAsync(payload);
      toast.success('Showing scheduled');
      setOpen(false);
      setForm(emptyForm());
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
        {data.map((s: any) => (
          <Card key={s.id}>
            <CardContent className="p-3 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{s.prospect?.name ?? 'Prospect TBD'}</p>
                <p className="text-xs text-muted-foreground">{format(new Date(s.scheduled_at), 'PPP p')} · {s.duration_minutes ?? 30} min</p>
                <p className="text-[11px] text-muted-foreground">{formatStatusLabel(s.showing_type ?? 'in_person')}{s.meeting_location ? ` · ${s.meeting_location}` : ''}</p>
                {s.confirmation_status && s.confirmation_status !== 'unconfirmed' && (
                  <Badge variant="outline" className="text-[10px] mt-1">{formatStatusLabel(s.confirmation_status)}</Badge>
                )}
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Schedule showing</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Field label="Prospect">
              <Select value={form.prospect_id || undefined} onValueChange={v => set({ prospect_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select prospect (optional)" /></SelectTrigger>
                <SelectContent>{prospects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Row>
              <Field label="Date & time *"><Input type="datetime-local" value={form.scheduled_at} onChange={e => set({ scheduled_at: e.target.value })} /></Field>
              <Field label="Duration (min)"><Input type="number" value={form.duration_minutes} onChange={e => set({ duration_minutes: e.target.value })} /></Field>
            </Row>
            <Row>
              <Field label="Type">
                <Select value={form.showing_type} onValueChange={v => set({ showing_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{formatStatusLabel(t)}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Confirmation">
                <Select value={form.confirmation_status} onValueChange={v => set({ confirmation_status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CONFIRMATIONS.map(c => <SelectItem key={c} value={c}>{formatStatusLabel(c)}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </Row>
            <Field label="Meeting location / instructions">
              <Input placeholder="e.g. Meet at front lobby, call on arrival" value={form.meeting_location} onChange={e => set({ meeting_location: e.target.value })} />
            </Field>
            <Field label="Notes"><Textarea value={form.notes} onChange={e => set({ notes: e.target.value })} /></Field>

            <div className="border-t pt-3 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground">After the showing (optional)</p>
              <div className="flex items-center gap-2">
                <Checkbox id="noshow" checked={form.no_show} onCheckedChange={c => set({ no_show: !!c })} />
                <Label htmlFor="noshow" className="text-xs">No-show</Label>
              </div>
              <Row>
                <Field label="Interest level">
                  <Select value={form.interest_level || undefined} onValueChange={v => set({ interest_level: v })}>
                    <SelectTrigger><SelectValue placeholder="Not rated" /></SelectTrigger>
                    <SelectContent>{INTEREST_LEVELS.map(i => <SelectItem key={i} value={i}>{formatStatusLabel(i)}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Rating (1-5)">
                  <Input type="number" min="1" max="5" value={form.feedback_rating} onChange={e => set({ feedback_rating: e.target.value })} />
                </Field>
              </Row>
              <Field label="Feedback notes"><Textarea rows={2} value={form.feedback_notes} onChange={e => set({ feedback_notes: e.target.value })} /></Field>
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
