import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { useMyTenantContext, useCreateMaintenanceRequest } from '@/hooks/useTenantPortal';

const CATEGORIES = [
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'heating_cooling', label: 'Heating / Cooling' },
  { value: 'appliance', label: 'Appliance' },
  { value: 'lock_door', label: 'Lock / Door' },
  { value: 'general', label: 'General' },
  { value: 'other', label: 'Other' },
];

export default function TenantMaintenanceNew() {
  const nav = useNavigate();
  const { data: ctx, isLoading } = useMyTenantContext();
  const create = useCreateMaintenanceRequest();
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'general',
    priority: 'normal' as 'low' | 'normal' | 'urgent',
    contact_notes: '',
    permission_to_enter: false,
    preferred_contact_time: '',
  });
  const [files, setFiles] = useState<File[]>([]);

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  if (!ctx?.tenant || !ctx.activeLease) {
    return (
      <div className="p-6">
        <Card><CardContent className="p-6 text-sm text-muted-foreground">
          You need an active lease to submit a maintenance request. Please contact your property manager.
        </CardContent></Card>
      </div>
    );
  }

  const submit = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    try {
      await create.mutateAsync({
        tenant_id: ctx.tenant.id,
        property_id: ctx.activeLease.property_id,
        unit_id: ctx.activeLease.unit_id,
        lease_id: ctx.activeLease.id,
        title: form.title.trim(),
        description: form.description || undefined,
        category: form.category,
        priority: form.priority,
        contact_notes: form.contact_notes || undefined,
        permission_to_enter: form.permission_to_enter,
        preferred_contact_time: form.preferred_contact_time || undefined,
        files,
      });
      toast.success('Request submitted');
      nav('/tenant/maintenance');
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to submit');
    }
  };

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">New Maintenance Request</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Title *</Label>
            <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Kitchen faucet leaking" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea rows={4} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe the issue in detail…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v: any) => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Photos / files (optional)</Label>
            <Input type="file" accept="image/*,application/pdf" multiple onChange={e => setFiles(Array.from(e.target.files ?? []))} />
            {files.length > 0 && <p className="text-xs text-muted-foreground mt-1">{files.length} file(s) selected</p>}
          </div>
          <div>
            <Label>Contact / access notes</Label>
            <Textarea rows={2} value={form.contact_notes} onChange={e => setForm({ ...form, contact_notes: e.target.value })} placeholder="e.g. Key under mat, dog inside" />
          </div>
          <div>
            <Label>Preferred contact time</Label>
            <Input value={form.preferred_contact_time} onChange={e => setForm({ ...form, preferred_contact_time: e.target.value })} placeholder="e.g. Weekdays after 5pm" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={form.permission_to_enter} onCheckedChange={(v) => setForm({ ...form, permission_to_enter: !!v })} />
            <span>Permission to enter if I am not home</span>
          </label>

          <Button onClick={submit} disabled={create.isPending} className="w-full bg-emerald-700 hover:bg-emerald-800 font-bold">
            {create.isPending ? 'Submitting…' : 'Submit Request'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
