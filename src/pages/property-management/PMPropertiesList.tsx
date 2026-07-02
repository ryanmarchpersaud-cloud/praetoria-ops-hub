import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { usePmProperties, useSavePmProperty, usePmOwners, type PmPropertyType } from '@/hooks/usePropertyManagement';
import { toast } from 'sonner';

const PROPERTY_TYPES: { value: PmPropertyType; label: string }[] = [
  { value: 'single_family', label: 'Single family' },
  { value: 'duplex', label: 'Duplex' },
  { value: 'multi_unit', label: 'Multi-unit' },
  { value: 'condo', label: 'Condo' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'other', label: 'Other' },
];

export default function PMPropertiesList() {
  const { data: properties = [], isLoading } = usePmProperties();
  const { data: owners = [] } = usePmOwners();
  const save = useSavePmProperty();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ property_name: '', property_type: 'single_family', is_active: true });

  const submit = async () => {
    if (!form.property_name?.trim()) return toast.error('Property name is required');
    try {
      await save.mutateAsync(form);
      toast.success('Property saved');
      setOpen(false);
      setForm({ property_name: '', property_type: 'single_family', is_active: true });
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="p-6 space-y-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Managed Properties</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />New Property</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Managed Property</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Property name *</Label><Input value={form.property_name} onChange={(e) => setForm({ ...form, property_name: e.target.value })} /></div>
              <div><Label>Address</Label><Input value={form.address_line_1 ?? ''} onChange={(e) => setForm({ ...form, address_line_1: e.target.value })} /></div>
              <div className="grid grid-cols-3 gap-2">
                <div><Label>City</Label><Input value={form.city ?? ''} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
                <div><Label>Province</Label><Input value={form.province ?? ''} onChange={(e) => setForm({ ...form, province: e.target.value })} /></div>
                <div><Label>Postal</Label><Input value={form.postal_code ?? ''} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Type</Label>
                  <Select value={form.property_type} onValueChange={(v) => setForm({ ...form, property_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PROPERTY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Primary owner</Label>
                  <Select value={form.primary_owner_id ?? 'none'} onValueChange={(v) => setForm({ ...form, primary_owner_id: v === 'none' ? null : v })}>
                    <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— None —</SelectItem>
                      {owners.map(o => <SelectItem key={o.id} value={o.id}>{o.owner_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Notes</Label><Textarea value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={submit} disabled={save.isPending}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">All properties</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? 'Loading…' : properties.length === 0 ? (
            <p className="text-sm text-muted-foreground">No managed properties yet.</p>
          ) : (
            <div className="divide-y">
              {properties.map((p) => {
                const owner = owners.find(o => o.id === p.primary_owner_id);
                return (
                  <Link key={p.id} to={`/property-management/properties/${p.id}`} className="flex items-center justify-between py-3 hover:bg-muted/40 px-2 rounded">
                    <div>
                      <div className="font-medium">{p.property_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {[p.address_line_1, p.city, p.province].filter(Boolean).join(', ') || '—'}
                        {owner ? ` · Owner: ${owner.owner_name}` : ''}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline">{p.property_type.replace('_', ' ')}</Badge>
                      {!p.is_active && <Badge variant="secondary">Inactive</Badge>}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
