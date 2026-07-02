import { useMemo, useState } from 'react';
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
import { usePmLeases, useSavePmLease, usePmTenants, usePmProperties, usePmUnits, type PmLeaseStatus } from '@/hooks/usePropertyManagement';
import { toast } from 'sonner';

const STATUSES: PmLeaseStatus[] = ['draft', 'active', 'ended', 'terminated'];

export default function PMLeasesList() {
  const { data: leases = [], isLoading } = usePmLeases();
  const { data: tenants = [] } = usePmTenants();
  const { data: properties = [] } = usePmProperties();
  const { data: allUnits = [] } = usePmUnits();
  const save = useSavePmLease();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ status: 'draft', rent_due_day: 1, monthly_rent: 0, deposit_amount: 0 });

  const unitsForProperty = useMemo(
    () => allUnits.filter(u => u.property_id === form.property_id),
    [allUnits, form.property_id],
  );
  const tenantMap = Object.fromEntries(tenants.map(t => [t.id, t]));
  const propMap = Object.fromEntries(properties.map(p => [p.id, p]));

  const submit = async () => {
    if (!form.tenant_id || !form.property_id || !form.start_date) return toast.error('Tenant, property, and start date are required');
    try {
      await save.mutateAsync({ ...form, unit_id: form.unit_id || null });
      toast.success('Lease saved');
      setOpen(false);
      setForm({ status: 'draft', rent_due_day: 1, monthly_rent: 0, deposit_amount: 0 });
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="p-6 space-y-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Leases</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />New Lease</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Lease</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Tenant *</Label>
                <Select value={form.tenant_id ?? ''} onValueChange={(v) => setForm({ ...form, tenant_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select tenant" /></SelectTrigger>
                  <SelectContent>{tenants.map(t => <SelectItem key={t.id} value={t.id}>{t.first_name} {t.last_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Property *</Label>
                <Select value={form.property_id ?? ''} onValueChange={(v) => setForm({ ...form, property_id: v, unit_id: null })}>
                  <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                  <SelectContent>{properties.map(p => <SelectItem key={p.id} value={p.id}>{p.property_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Unit (optional)</Label>
                <Select value={form.unit_id ?? 'none'} onValueChange={(v) => setForm({ ...form, unit_id: v === 'none' ? null : v })}>
                  <SelectTrigger><SelectValue placeholder="Whole property" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Whole property —</SelectItem>
                    {unitsForProperty.map(u => <SelectItem key={u.id} value={u.id}>{u.unit_label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Start date *</Label><Input type="date" value={form.start_date ?? ''} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
                <div><Label>End date</Label><Input type="date" value={form.end_date ?? ''} onChange={(e) => setForm({ ...form, end_date: e.target.value || null })} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Monthly rent</Label><Input type="number" step="0.01" value={form.monthly_rent ?? 0} onChange={(e) => setForm({ ...form, monthly_rent: Number(e.target.value) })} /></div>
                <div><Label>Deposit</Label><Input type="number" step="0.01" value={form.deposit_amount ?? 0} onChange={(e) => setForm({ ...form, deposit_amount: Number(e.target.value) })} /></div>
                <div><Label>Rent due day</Label><Input type="number" min={1} max={31} value={form.rent_due_day ?? 1} onChange={(e) => setForm({ ...form, rent_due_day: Number(e.target.value) })} /></div>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Notes</Label><Textarea value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={submit} disabled={save.isPending}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">All leases</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? 'Loading…' : leases.length === 0 ? <p className="text-sm text-muted-foreground">No leases yet.</p> : (
            <div className="divide-y">
              {leases.map(l => {
                const tenant = tenantMap[l.tenant_id];
                const prop = propMap[l.property_id];
                return (
                  <Link key={l.id} to={`/property-management/leases/${l.id}`} className="flex items-center justify-between py-3 hover:bg-muted/40 px-2 rounded">
                    <div>
                      <div className="font-medium">{tenant ? `${tenant.first_name} ${tenant.last_name ?? ''}` : '—'} · {prop?.property_name ?? '—'}</div>
                      <div className="text-xs text-muted-foreground">{l.start_date} → {l.end_date ?? '—'} · ${l.monthly_rent}/mo · due day {l.rent_due_day}</div>
                    </div>
                    <Badge variant={l.status === 'active' ? 'default' : 'outline'}>{l.status}</Badge>
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
