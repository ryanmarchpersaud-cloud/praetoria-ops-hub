import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, CalendarClock, AlertTriangle } from 'lucide-react';
import { usePmLeases, usePmTenants, usePmProperties, usePmUnits } from '@/hooks/usePropertyManagement';
import { usePMStaffUsers } from '@/hooks/pm-staff/usePMStaffData';
import {
  useLeaseRenewals, useCreateLeaseRenewal, useUpdateLeaseRenewal,
  useLeasesEndingSoon, useRenewalActivity, RENEWAL_STATUSES,
} from '@/hooks/pm/useLeaseRenewals';
import { formatStatusLabel } from '@/lib/statusLabel';
import { toast } from 'sonner';

function daysUntil(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr).getTime();
  return Math.round((d - Date.now()) / 86400_000);
}

export default function PMLeaseRenewalsList() {
  const { data: renewals = [] } = useLeaseRenewals();
  const { data: endingSoon = [] } = useLeasesEndingSoon(90);
  const { data: leases = [] } = usePmLeases();
  const { data: tenants = [] } = usePmTenants();
  const { data: properties = [] } = usePmProperties();
  const { data: units = [] } = usePmUnits();
  const { data: staff = [] } = usePMStaffUsers();
  const create = useCreateLeaseRenewal();
  const update = useUpdateLeaseRenewal();

  const [openNew, setOpenNew] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterStaff, setFilterStaff] = useState<string>('all');
  const [filterProperty, setFilterProperty] = useState<string>('all');

  const emptyForm = {
    lease_id: '', tenant_id: '', property_id: '', unit_id: '', assigned_to: '',
    status: 'not_started', current_lease_end_date: '',
    proposed_start_date: '', proposed_end_date: '',
    current_rent: '', proposed_rent: '', rent_frequency: 'monthly',
    admin_notes: '', tenant_visible_note: '', owner_visible_note: '',
    tenant_visible: false, owner_visible: false,
  };
  const [form, setForm] = useState<any>(emptyForm);

  const editing = renewals.find(r => r.id === editId);

  const openForLease = (lease: any) => {
    setForm({
      ...emptyForm,
      lease_id: lease.id,
      tenant_id: lease.tenant_id ?? '',
      property_id: lease.property_id ?? '',
      unit_id: lease.unit_id ?? '',
      current_lease_end_date: lease.end_date ?? '',
      current_rent: lease.monthly_rent ?? '',
      rent_frequency: lease.rent_frequency ?? 'monthly',
    });
    setOpenNew(true);
  };

  const submit = async () => {
    if (!form.lease_id) return toast.error('Lease is required');
    try {
      const payload = {
        ...form,
        unit_id: form.unit_id || null,
        assigned_to: form.assigned_to || null,
        current_rent: form.current_rent ? Number(form.current_rent) : null,
        proposed_rent: form.proposed_rent ? Number(form.proposed_rent) : null,
        current_lease_end_date: form.current_lease_end_date || null,
        proposed_start_date: form.proposed_start_date || null,
        proposed_end_date: form.proposed_end_date || null,
      };
      await create.mutateAsync(payload);
      toast.success('Renewal created');
      setOpenNew(false);
      setForm(emptyForm);
    } catch (e: any) { toast.error(e.message); }
  };

  const filtered = useMemo(() => renewals.filter(r =>
    (filterStatus === 'all' || r.status === filterStatus)
    && (filterStaff === 'all' || r.assigned_to === filterStaff)
    && (filterProperty === 'all' || r.property_id === filterProperty)
  ), [renewals, filterStatus, filterStaff, filterProperty]);

  const staffLabel = (id: string | null) => {
    if (!id) return '—';
    const s = staff.find((x: any) => x.id === id);
    return s?.display_name || s?.email || '—';
  };

  const rentedLeaseIds = new Set(renewals.map(r => r.lease_id));

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarClock className="h-6 w-6 text-emerald-600" />
            Lease Renewals
          </h1>
          <p className="text-sm text-muted-foreground">Track renewals, assign staff, and communicate with tenants.</p>
        </div>
        <Dialog open={openNew} onOpenChange={setOpenNew}>
          <DialogTrigger asChild>
            <Button onClick={() => { setForm(emptyForm); setOpenNew(true); }}>
              <Plus className="mr-2 h-4 w-4" /> New Renewal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>New Lease Renewal</DialogTitle></DialogHeader>
            <RenewalForm form={form} setForm={setForm} leases={leases} tenants={tenants} properties={properties} units={units} staff={staff} isAdmin />
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenNew(false)}>Cancel</Button>
              <Button onClick={submit} disabled={create.isPending}>Create Renewal</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Leases ending soon */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Leases Ending Soon
          </CardTitle>
        </CardHeader>
        <CardContent>
          {endingSoon.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active leases ending in the next 90 days.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property / Unit</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Days Left</TableHead>
                    <TableHead>Rent</TableHead>
                    <TableHead>Renewal</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {endingSoon.map((l: any) => {
                    const d = daysUntil(l.end_date);
                    const hasRenewal = rentedLeaseIds.has(l.id);
                    return (
                      <TableRow key={l.id}>
                        <TableCell className="text-sm">{l.property?.property_name}{l.unit?.unit_label ? ` — ${l.unit.unit_label}` : ''}</TableCell>
                        <TableCell className="text-sm">{l.tenant?.first_name} {l.tenant?.last_name}</TableCell>
                        <TableCell className="text-sm">{l.end_date ?? 'Month-to-month'}</TableCell>
                        <TableCell>
                          {d === null ? <Badge variant="secondary">M2M</Badge>
                            : d <= 30 ? <Badge className="bg-red-600">{d}d</Badge>
                            : d <= 60 ? <Badge className="bg-orange-500">{d}d</Badge>
                            : <Badge className="bg-emerald-600">{d}d</Badge>}
                        </TableCell>
                        <TableCell className="text-sm">${Number(l.monthly_rent || 0).toFixed(2)}</TableCell>
                        <TableCell>{hasRenewal ? <Badge variant="secondary">Started</Badge> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                        <TableCell>
                          {!hasRenewal && (
                            <Button size="sm" variant="outline" onClick={() => openForLease(l)}>
                              Start Renewal
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Renewals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {RENEWAL_STATUSES.map(s => <SelectItem key={s} value={s}>{formatStatusLabel(s)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Assigned Staff</Label>
              <Select value={filterStaff} onValueChange={setFilterStaff}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All staff</SelectItem>
                  {staff.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.display_name || s.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Property</Label>
              <Select value={filterProperty} onValueChange={setFilterProperty}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All properties</SelectItem>
                  {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.property_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No renewals match these filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Property / Unit</TableHead>
                    <TableHead>Current End</TableHead>
                    <TableHead>Proposed Rent</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned</TableHead>
                    <TableHead>Visibility</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm">{r.tenant?.first_name} {r.tenant?.last_name}</TableCell>
                      <TableCell className="text-sm">{r.property?.property_name}{r.unit?.unit_label ? ` — ${r.unit.unit_label}` : ''}</TableCell>
                      <TableCell className="text-sm">{r.current_lease_end_date ?? '—'}</TableCell>
                      <TableCell className="text-sm">{r.proposed_rent ? `$${Number(r.proposed_rent).toFixed(2)}` : '—'}</TableCell>
                      <TableCell><Badge variant="secondary">{formatStatusLabel(r.status)}</Badge></TableCell>
                      <TableCell className="text-sm">{staffLabel(r.assigned_to)}</TableCell>
                      <TableCell className="text-xs">
                        {r.tenant_visible && <Badge className="bg-blue-600 mr-1">Tenant</Badge>}
                        {r.owner_visible && <Badge className="bg-purple-600">Owner</Badge>}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => { setForm({ ...r, current_rent: r.current_rent ?? '', proposed_rent: r.proposed_rent ?? '' }); setEditId(r.id); }}>
                          Manage
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={!!editId} onOpenChange={(o) => { if (!o) setEditId(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Manage Renewal</DialogTitle></DialogHeader>
          {editing && (
            <RenewalForm form={form} setForm={setForm} leases={leases} tenants={tenants} properties={properties} units={units} staff={staff} isAdmin />
          )}
          <RenewalActivityList id={editId} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditId(null)}>Close</Button>
            <Button onClick={async () => {
              if (!editId) return;
              try {
                const { id, created_at, updated_at, created_by, lease, property, unit, tenant, ...patch } = form;
                patch.current_rent = patch.current_rent ? Number(patch.current_rent) : null;
                patch.proposed_rent = patch.proposed_rent ? Number(patch.proposed_rent) : null;
                await update.mutateAsync({ id: editId, patch, activityMessage: `Status: ${formatStatusLabel(patch.status)}` });
                toast.success('Renewal updated');
                setEditId(null);
              } catch (e: any) { toast.error(e.message); }
            }}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function RenewalForm({ form, setForm, leases, tenants, properties, units, staff, isAdmin, restrictedFields }: any) {
  const unitsForProperty = units.filter((u: any) => u.property_id === form.property_id);
  return (
    <div className="space-y-3">
      {!restrictedFields && (
        <div>
          <Label>Lease *</Label>
          <Select value={form.lease_id ?? ''} onValueChange={(v) => {
            const l = leases.find((x: any) => x.id === v);
            setForm({ ...form, lease_id: v,
              tenant_id: l?.tenant_id ?? form.tenant_id,
              property_id: l?.property_id ?? form.property_id,
              unit_id: l?.unit_id ?? form.unit_id,
              current_lease_end_date: l?.end_date ?? form.current_lease_end_date,
              current_rent: l?.monthly_rent ?? form.current_rent,
            });
          }}>
            <SelectTrigger><SelectValue placeholder="Select lease" /></SelectTrigger>
            <SelectContent>
              {leases.map((l: any) => (
                <SelectItem key={l.id} value={l.id}>
                  {tenants.find((t: any) => t.id === l.tenant_id)?.first_name} {tenants.find((t: any) => t.id === l.tenant_id)?.last_name} — {properties.find((p: any) => p.id === l.property_id)?.property_name} — ends {l.end_date ?? 'M2M'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Current Lease End</Label><Input type="date" value={form.current_lease_end_date ?? ''} onChange={e => setForm({ ...form, current_lease_end_date: e.target.value })} /></div>
        <div>
          <Label>Status</Label>
          <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{RENEWAL_STATUSES.map(s => <SelectItem key={s} value={s}>{formatStatusLabel(s)}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Proposed Start</Label><Input type="date" value={form.proposed_start_date ?? ''} onChange={e => setForm({ ...form, proposed_start_date: e.target.value })} /></div>
        <div><Label>Proposed End</Label><Input type="date" value={form.proposed_end_date ?? ''} onChange={e => setForm({ ...form, proposed_end_date: e.target.value })} /></div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div><Label>Current Rent</Label><Input type="number" step="0.01" value={form.current_rent ?? ''} onChange={e => setForm({ ...form, current_rent: e.target.value })} /></div>
        <div><Label>Proposed Rent</Label><Input type="number" step="0.01" value={form.proposed_rent ?? ''} onChange={e => setForm({ ...form, proposed_rent: e.target.value })} /></div>
        <div>
          <Label>Frequency</Label>
          <Select value={form.rent_frequency ?? 'monthly'} onValueChange={v => setForm({ ...form, rent_frequency: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {isAdmin && (
        <div>
          <Label>Assigned Staff</Label>
          <Select value={form.assigned_to ?? ''} onValueChange={v => setForm({ ...form, assigned_to: v })}>
            <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
            <SelectContent>
              {staff.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.display_name || s.email}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
      <div>
        <Label>Admin Notes (internal only)</Label>
        <Textarea value={form.admin_notes ?? ''} onChange={e => setForm({ ...form, admin_notes: e.target.value })} rows={2} />
      </div>
      <div>
        <Label>Tenant-Visible Note</Label>
        <Textarea value={form.tenant_visible_note ?? ''} onChange={e => setForm({ ...form, tenant_visible_note: e.target.value })} rows={2} placeholder="Shown to tenant only if 'Visible to tenant' is enabled." />
      </div>
      {isAdmin && (
        <div>
          <Label>Owner-Visible Note</Label>
          <Textarea value={form.owner_visible_note ?? ''} onChange={e => setForm({ ...form, owner_visible_note: e.target.value })} rows={2} placeholder="Shown to owner only if 'Visible to owner' is enabled." />
        </div>
      )}
      {isAdmin && (
        <div className="flex flex-wrap gap-6 pt-1">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={!!form.tenant_visible} onCheckedChange={c => setForm({ ...form, tenant_visible: !!c })} />
            Visible to tenant
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={!!form.owner_visible} onCheckedChange={c => setForm({ ...form, owner_visible: !!c })} />
            Visible to owner
          </label>
        </div>
      )}
    </div>
  );
}

export function RenewalActivityList({ id }: { id: string | null }) {
  const { data = [] } = useRenewalActivity(id ?? undefined);
  if (!id) return null;
  return (
    <div className="border-t pt-3">
      <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Activity Timeline</h4>
      {data.length === 0 ? (
        <p className="text-xs text-muted-foreground">No activity yet.</p>
      ) : (
        <ul className="space-y-1 max-h-40 overflow-y-auto">
          {data.map((a: any) => (
            <li key={a.id} className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{formatStatusLabel(a.event_type)}</span> — {a.message || '—'}
              <span className="ml-2 text-[10px]">{new Date(a.created_at).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
