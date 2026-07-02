import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useInspections, useSaveRow, useDeleteRow } from '@/hooks/useTenantProfile';

const TYPES = ['move-in', 'move-out', 'periodic', 'other'];
const STATUSES = ['draft', 'scheduled', 'completed', 'shared'];

export function InspectionAdminPanel({ tenantId, propertyId, unitId, leaseId }:
  { tenantId: string; propertyId?: string | null; unitId?: string | null; leaseId?: string | null }) {
  const { data = [] } = useInspections(tenantId);
  const save = useSaveRow('pm_tenant_inspections', 'inspections');
  const del = useDeleteRow('pm_tenant_inspections', 'inspections');
  const [openId, setOpenId] = useState<string | null>(null);

  const create = async () => {
    try {
      await save.mutateAsync({
        tenant_id: tenantId,
        property_id: propertyId ?? null,
        unit_id: unitId ?? null,
        lease_id: leaseId ?? null,
        inspection_type: 'move-in',
        inspection_date: new Date().toISOString().slice(0, 10),
        status: 'draft',
        tenant_visible: false,
      });
      toast.success('Inspection created');
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Move-In / Move-Out Inspections</CardTitle>
        <Button size="sm" onClick={create}><Plus className="h-4 w-4 mr-1" />New inspection</Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {data.length === 0 && <p className="text-sm text-muted-foreground">No inspections yet.</p>}
        {data.map((r: any) => (
          <div key={r.id} className="border rounded">
            <button className="w-full flex items-center gap-2 p-3 text-left" onClick={() => setOpenId(openId === r.id ? null : r.id)}>
              <Badge variant="outline">{r.inspection_type}</Badge>
              <span className="text-sm font-medium">{r.inspection_date ?? 'unscheduled'}</span>
              <Badge className="ml-1" variant={r.status === 'shared' ? 'default' : 'secondary'}>{r.status}</Badge>
              {r.tenant_visible && <Badge className="bg-emerald-100 text-emerald-800">Tenant visible</Badge>}
              <span className="ml-auto">{openId === r.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</span>
            </button>
            {openId === r.id && (
              <InspectionEditor row={r} onDelete={() => del.mutate(r.id)} onSave={patch => save.mutateAsync({ id: r.id, ...patch }).then(() => toast.success('Saved')).catch((e: any) => toast.error(e.message))} />
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function InspectionEditor({ row, onSave, onDelete }: { row: any; onSave: (patch: any) => any; onDelete: () => void }) {
  const [form, setForm] = useState<any>({
    inspection_type: row.inspection_type,
    inspection_date: row.inspection_date ?? '',
    status: row.status,
    general_notes: row.general_notes ?? '',
    checklist: (row.checklist as any[]) ?? [],
    keys_checklist: (row.keys_checklist as any[]) ?? [],
    meter_readings: row.meter_readings ?? {},
    tenant_visible: !!row.tenant_visible,
  });
  const update = (patch: any) => setForm({ ...form, ...patch });

  return (
    <div className="p-3 border-t space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div><Label>Type</Label>
          <Select value={form.inspection_type} onValueChange={v => update({ inspection_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Date</Label><Input type="date" value={form.inspection_date} onChange={e => update({ inspection_date: e.target.value })} /></div>
        <div><Label>Status</Label>
          <Select value={form.status} onValueChange={v => update({ status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div><Label>General condition notes</Label><Textarea rows={3} value={form.general_notes} onChange={e => update({ general_notes: e.target.value })} /></div>

      <ChecklistEditor label="Room / area checklist" items={form.checklist} onChange={v => update({ checklist: v })} placeholder="e.g. Living room walls" />
      <ChecklistEditor label="Keys / remotes / opener checklist" items={form.keys_checklist} onChange={v => update({ keys_checklist: v })} placeholder="e.g. Front door key" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div><Label>Water reading</Label><Input value={form.meter_readings.water ?? ''} onChange={e => update({ meter_readings: { ...form.meter_readings, water: e.target.value } })} /></div>
        <div><Label>Electric reading</Label><Input value={form.meter_readings.electric ?? ''} onChange={e => update({ meter_readings: { ...form.meter_readings, electric: e.target.value } })} /></div>
        <div><Label>Gas reading</Label><Input value={form.meter_readings.gas ?? ''} onChange={e => update({ meter_readings: { ...form.meter_readings, gas: e.target.value } })} /></div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={form.tenant_visible} onCheckedChange={v => update({ tenant_visible: !!v })} />
        Tenant-visible (only shown to tenant when status = shared)
      </label>

      <div className="flex justify-between">
        <Button variant="destructive" size="sm" onClick={onDelete}><Trash2 className="h-4 w-4 mr-1" />Delete</Button>
        <Button size="sm" onClick={() => onSave(form)}>Save inspection</Button>
      </div>
    </div>
  );
}

function ChecklistEditor({ label, items, onChange, placeholder }: { label: string; items: any[]; onChange: (v: any[]) => void; placeholder: string }) {
  const [text, setText] = useState('');
  return (
    <div>
      <Label>{label}</Label>
      <ul className="mt-1 space-y-1">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-2 text-sm">
            <Checkbox checked={!!it.checked} onCheckedChange={v => {
              const next = [...items]; next[i] = { ...it, checked: !!v }; onChange(next);
            }} />
            <Input className="h-8" value={it.label ?? ''} onChange={e => {
              const next = [...items]; next[i] = { ...it, label: e.target.value }; onChange(next);
            }} />
            <Input className="h-8 w-40" placeholder="Condition / note" value={it.note ?? ''} onChange={e => {
              const next = [...items]; next[i] = { ...it, note: e.target.value }; onChange(next);
            }} />
            <Button size="icon" variant="ghost" onClick={() => onChange(items.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2 mt-2">
        <Input className="h-8" placeholder={placeholder} value={text} onChange={e => setText(e.target.value)} />
        <Button size="sm" variant="outline" onClick={() => { if (text.trim()) { onChange([...items, { label: text.trim(), checked: false, note: '' }]); setText(''); } }}>Add</Button>
      </div>
    </div>
  );
}
