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
import { useProspects, useCreateRecord, useUpdateRecord } from '@/hooks/pm-staff/usePMStaffData';
import { formatStatusLabel } from '@/lib/statusLabel';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

const STATUSES = ['new', 'contacted', 'showing_scheduled', 'applied', 'approved', 'declined', 'converted', 'closed'];
const SOURCES = ['website', 'referral', 'phone', 'social_media', 'sign', 'walk_in', 'other'];

export default function Prospects() {
  const { user } = useAuth();
  const { data = [], isLoading } = useProspects();
  const createMut = useCreateRecord('pm_prospects', ['pm_prospects']);
  const updateMut = useUpdateRecord('pm_prospects', ['pm_prospects']);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ name: '', email: '', phone: '', status: 'new', source: 'other', notes: '' });

  const submit = async () => {
    if (!form.name?.trim()) return toast.error('Name is required');
    try {
      await createMut.mutateAsync({ ...form, created_by: user?.id, assigned_to: user?.id });
      toast.success('Prospect added');
      setOpen(false);
      setForm({ name: '', email: '', phone: '', status: 'new', source: 'other', notes: '' });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Prospects</h2>
        <Button size="sm" onClick={() => setOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!isLoading && data.length === 0 && (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No prospects yet. Tap Add to create one.</CardContent></Card>
      )}
      <div className="space-y-2">
        {data.map(p => (
          <Card key={p.id}>
            <CardContent className="p-3 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {[p.email, p.phone].filter(Boolean).join(' · ') || 'No contact'}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge variant="outline" className="text-[10px]">{formatStatusLabel(p.status)}</Badge>
                <Select value={p.status} onValueChange={v => updateMut.mutate({ id: p.id, patch: { status: v } })}>
                  <SelectTrigger className="h-7 text-xs w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{formatStatusLabel(s)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New prospect</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Source</Label>
                <Select value={form.source} onValueChange={v => setForm({ ...form, source: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SOURCES.map(s => <SelectItem key={s} value={s}>{formatStatusLabel(s)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{formatStatusLabel(s)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Desired move-in</Label><Input type="date" value={form.desired_move_in ?? ''} onChange={e => setForm({ ...form, desired_move_in: e.target.value || null })} /></div>
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
