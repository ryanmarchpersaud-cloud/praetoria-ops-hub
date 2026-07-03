import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  usePmProperty, useSavePmProperty, useDeletePmProperty,
  usePmOwners, usePmUnits, useSavePmUnit, useDeletePmUnit,
  type PmUnitStatus,
} from '@/hooks/usePropertyManagement';
import { PMDocumentsSection } from '@/components/property-management/PMDocumentsSection';

const UNIT_STATUSES: PmUnitStatus[] = ['vacant', 'occupied', 'pending', 'inactive'];

export default function PMPropertyDetail() {
  const { id } = useParams();
  const { data } = usePmProperty(id);
  const { data: owners = [] } = usePmOwners();
  const { data: units = [] } = usePmUnits(id);
  const save = useSavePmProperty();
  const del = useDeletePmProperty();
  const saveUnit = useSavePmUnit();
  const delUnit = useDeletePmUnit();

  const [form, setForm] = useState<any>({});
  useEffect(() => { if (data) setForm(data); }, [data]);
  const [unitOpen, setUnitOpen] = useState(false);
  const [unitForm, setUnitForm] = useState<any>({ status: 'vacant' });

  if (!data) return <div className="p-6">Loading…</div>;

  const submit = async () => {
    try { await save.mutateAsync({ ...form, id }); toast.success('Saved'); }
    catch (e: any) { toast.error(e.message); }
  };
  const remove = async () => {
    if (!confirm('Delete this property (and all its units)?')) return;
    try { await del.mutateAsync(id!); toast.success('Deleted'); window.history.back(); }
    catch (e: any) { toast.error(e.message); }
  };
  const addUnit = async () => {
    if (!unitForm.unit_label?.trim()) return toast.error('Unit label required');
    try {
      await saveUnit.mutateAsync({ ...unitForm, property_id: id });
      toast.success('Unit added');
      setUnitOpen(false);
      setUnitForm({ status: 'vacant' });
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="p-6 space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild><Link to="/property-management/properties"><ArrowLeft className="h-4 w-4 mr-1" />Back</Link></Button>
        <div className="ml-auto flex gap-2">
          <Button variant="destructive" size="sm" onClick={remove}><Trash2 className="h-4 w-4 mr-1" />Delete</Button>
          <Button onClick={submit} disabled={save.isPending}>Save</Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>{form.property_name}</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><Label>Property name</Label><Input value={form.property_name ?? ''} onChange={(e) => setForm({ ...form, property_name: e.target.value })} /></div>
          <div>
            <Label>Primary owner</Label>
            <Select value={form.primary_owner_id ?? 'none'} onValueChange={(v) => setForm({ ...form, primary_owner_id: v === 'none' ? null : v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— None —</SelectItem>
                {owners.map(o => <SelectItem key={o.id} value={o.id}>{o.owner_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2"><Label>Address</Label><Input value={form.address_line_1 ?? ''} onChange={(e) => setForm({ ...form, address_line_1: e.target.value })} /></div>
          <div><Label>City</Label><Input value={form.city ?? ''} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
          <div><Label>Province</Label><Input value={form.province ?? ''} onChange={(e) => setForm({ ...form, province: e.target.value })} /></div>
          <div><Label>Postal</Label><Input value={form.postal_code ?? ''} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} /></div>
          <div>
            <Label>Type</Label>
            <Select value={form.property_type} onValueChange={(v) => setForm({ ...form, property_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['single_family','duplex','multi_unit','condo','commercial','other'].map(t => <SelectItem key={t} value={t}>{t.replace('_',' ')}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2"><Label>Notes</Label><Textarea value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <div className="flex items-center gap-2"><Switch checked={!!form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>Active</Label></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Units ({units.length})</CardTitle>
          <Dialog open={unitOpen} onOpenChange={setUnitOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Unit</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Unit</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Unit label *</Label><Input value={unitForm.unit_label ?? ''} onChange={(e) => setUnitForm({ ...unitForm, unit_label: e.target.value })} placeholder="e.g. Unit 1, Basement" /></div>
                <div className="grid grid-cols-3 gap-2">
                  <div><Label>Bedrooms</Label><Input type="number" step="0.5" value={unitForm.bedrooms ?? ''} onChange={(e) => setUnitForm({ ...unitForm, bedrooms: e.target.value ? Number(e.target.value) : null })} /></div>
                  <div><Label>Bathrooms</Label><Input type="number" step="0.5" value={unitForm.bathrooms ?? ''} onChange={(e) => setUnitForm({ ...unitForm, bathrooms: e.target.value ? Number(e.target.value) : null })} /></div>
                  <div><Label>Rent $</Label><Input type="number" step="0.01" value={unitForm.rent_amount ?? ''} onChange={(e) => setUnitForm({ ...unitForm, rent_amount: e.target.value ? Number(e.target.value) : null })} /></div>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={unitForm.status} onValueChange={(v) => setUnitForm({ ...unitForm, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{UNIT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Notes</Label><Textarea value={unitForm.notes ?? ''} onChange={(e) => setUnitForm({ ...unitForm, notes: e.target.value })} /></div>
              </div>
              <DialogFooter><Button onClick={addUnit} disabled={saveUnit.isPending}>Add</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {units.length === 0 ? <p className="text-sm text-muted-foreground">No units yet.</p> : (
            <div className="divide-y">
              {units.map(u => (
                <div key={u.id} className="flex items-center justify-between py-2">
                  <div>
                    <div className="font-medium">{u.unit_label}</div>
                    <div className="text-xs text-muted-foreground">
                      {u.bedrooms ?? '—'} bd / {u.bathrooms ?? '—'} ba · Rent: {u.rent_amount ? `$${u.rent_amount}` : '—'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={u.status === 'occupied' ? 'default' : 'outline'}>{u.status}</Badge>
                    <Button size="icon" variant="ghost" onClick={async () => { if (confirm('Delete unit?')) { await delUnit.mutateAsync(u.id); toast.success('Deleted'); } }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <PMDocumentsSection
        filters={{ property_id: id }}
        uploadDefaults={{ property_id: id }}
      />
    </div>
  );
}
