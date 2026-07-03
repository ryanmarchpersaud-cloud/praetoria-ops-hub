import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Plus, CalendarClock, AlertTriangle, Download, Printer, Copy, MessageSquare,
  ArrowUpDown, Filter, X, Users, CheckSquare, Archive,
} from 'lucide-react';
import { usePmLeases, usePmTenants, usePmProperties, usePmUnits } from '@/hooks/usePropertyManagement';
import { usePMStaffUsers } from '@/hooks/pm-staff/usePMStaffData';
import {
  useLeaseRenewals, useCreateLeaseRenewal, useUpdateLeaseRenewal,
  useLeasesEndingSoon, useRenewalActivity, RENEWAL_STATUSES,
} from '@/hooks/pm/useLeaseRenewals';
import { useUserRole } from '@/hooks/useUserRole';
import { formatStatusLabel } from '@/lib/statusLabel';
import { toast } from 'sonner';

const CLOSED_STATUSES = new Set(['completed', 'cancelled', 'non_renewal', 'tenant_declined']);
const PENDING_TENANT = new Set(['sent_to_tenant', 'tenant_reviewing']);

function daysUntil(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr).getTime();
  return Math.round((d - Date.now()) / 86400_000);
}

function csvEscape(v: any): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCSV(rows: any[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => csvEscape(r[h])).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

type SortKey = 'end_date' | 'created_at' | 'updated_at' | 'proposed_rent' | 'assigned' | 'property';

export default function PMLeaseRenewalsList() {
  const { data: renewals = [] } = useLeaseRenewals();
  const { data: endingSoon = [] } = useLeasesEndingSoon(90);
  const { data: leases = [] } = usePmLeases();
  const { data: tenants = [] } = usePmTenants();
  const { data: properties = [] } = usePmProperties();
  const { data: units = [] } = usePmUnits();
  const { data: staff = [] } = usePMStaffUsers();
  const { roles } = useUserRole();
  const canBulk = roles.some(r => ['owner','admin','manager','ops_manager','property_manager'].includes(r));
  const create = useCreateLeaseRenewal();
  const update = useUpdateLeaseRenewal();

  const [openNew, setOpenNew] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>(null);

  const [tab, setTab] = useState<'active' | 'archived' | 'all'>('active');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterResponse, setFilterResponse] = useState<string>('all');
  const [filterStaff, setFilterStaff] = useState<string>('all');
  const [filterProperty, setFilterProperty] = useState<string>('all');
  const [filterUnit, setFilterUnit] = useState<string>('all');
  const [filterTenant, setFilterTenant] = useState<string>('all');
  const [filterTenantVisible, setFilterTenantVisible] = useState<string>('all');
  const [filterOwnerVisible, setFilterOwnerVisible] = useState<string>('all');
  const [filterOverdue, setFilterOverdue] = useState<string>('all');
  const [endFrom, setEndFrom] = useState('');
  const [endTo, setEndTo] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('end_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const emptyForm = {
    lease_id: '', tenant_id: '', property_id: '', unit_id: '', assigned_to: '',
    status: 'not_started', current_lease_end_date: '',
    proposed_start_date: '', proposed_end_date: '',
    current_rent: '', proposed_rent: '', rent_frequency: 'monthly',
    admin_notes: '', tenant_visible_note: '', owner_visible_note: '',
    tenant_visible: false, owner_visible: false,
  };
  const [form, setForm] = useState<any>(emptyForm);

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

  const staffLabel = (id: string | null) => {
    if (!id) return '—';
    const s = staff.find((x: any) => x.user_id === id);
    return s?.display_name || '—';
  };

  const propertyLabel = (r: any) =>
    `${r.property?.property_name ?? ''}${r.unit?.unit_label ? ` — ${r.unit.unit_label}` : ''}`;

  const tenantLabel = (r: any) => `${r.tenant?.first_name ?? ''} ${r.tenant?.last_name ?? ''}`.trim();

  // Summary counts
  const summary = useMemo(() => {
    const today = Date.now();
    let draft = 0, pendingTenant = 0, accepted = 0, declined = 0, overdue = 0;
    for (const r of renewals) {
      if (r.status === 'not_started') draft++;
      if (PENDING_TENANT.has(r.status)) pendingTenant++;
      if (r.status === 'tenant_accepted') accepted++;
      if (r.status === 'tenant_declined') declined++;
      if (r.current_lease_end_date && new Date(r.current_lease_end_date).getTime() < today && !CLOSED_STATUSES.has(r.status)) overdue++;
    }
    const endingSoonNoRenewal = endingSoon.filter((l: any) => !renewals.some(r => r.lease_id === l.id)).length;
    return { draft, pendingTenant, accepted, declined, overdue, endingSoon: endingSoonNoRenewal };
  }, [renewals, endingSoon]);

  const filtered = useMemo(() => {
    const today = Date.now();
    const s = search.trim().toLowerCase();
    let list = renewals.filter(r => {
      if (tab === 'active' && CLOSED_STATUSES.has(r.status)) return false;
      if (tab === 'archived' && !CLOSED_STATUSES.has(r.status)) return false;
      if (filterStatus !== 'all' && r.status !== filterStatus) return false;
      if (filterResponse !== 'all' && (r.tenant_response ?? 'none') !== filterResponse) return false;
      if (filterStaff !== 'all' && r.assigned_to !== filterStaff) return false;
      if (filterProperty !== 'all' && r.property_id !== filterProperty) return false;
      if (filterUnit !== 'all' && r.unit_id !== filterUnit) return false;
      if (filterTenant !== 'all' && r.tenant_id !== filterTenant) return false;
      if (filterTenantVisible === 'yes' && !r.tenant_visible) return false;
      if (filterTenantVisible === 'no' && r.tenant_visible) return false;
      if (filterOwnerVisible === 'yes' && !r.owner_visible) return false;
      if (filterOwnerVisible === 'no' && r.owner_visible) return false;
      if (endFrom && (!r.current_lease_end_date || r.current_lease_end_date < endFrom)) return false;
      if (endTo && (!r.current_lease_end_date || r.current_lease_end_date > endTo)) return false;
      if (filterOverdue === 'overdue') {
        if (!r.current_lease_end_date || new Date(r.current_lease_end_date).getTime() >= today || CLOSED_STATUSES.has(r.status)) return false;
      }
      if (filterOverdue === 'ending_30') {
        const d = daysUntil(r.current_lease_end_date);
        if (d === null || d < 0 || d > 30) return false;
      }
      if (s) {
        const hay = `${tenantLabel(r)} ${propertyLabel(r)} ${r.tenant?.email ?? ''}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });

    const dir = sortDir === 'asc' ? 1 : -1;
    list = [...list].sort((a, b) => {
      const av = (() => {
        switch (sortKey) {
          case 'end_date': return a.current_lease_end_date ?? '';
          case 'created_at': return a.created_at ?? '';
          case 'updated_at': return a.updated_at ?? '';
          case 'proposed_rent': return Number(a.proposed_rent ?? 0);
          case 'assigned': return staffLabel(a.assigned_to).toLowerCase();
          case 'property': return propertyLabel(a).toLowerCase();
        }
      })();
      const bv = (() => {
        switch (sortKey) {
          case 'end_date': return b.current_lease_end_date ?? '';
          case 'created_at': return b.created_at ?? '';
          case 'updated_at': return b.updated_at ?? '';
          case 'proposed_rent': return Number(b.proposed_rent ?? 0);
          case 'assigned': return staffLabel(b.assigned_to).toLowerCase();
          case 'property': return propertyLabel(b).toLowerCase();
        }
      })();
      if (av! < bv!) return -1 * dir;
      if (av! > bv!) return 1 * dir;
      return 0;
    });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renewals, tab, search, filterStatus, filterResponse, filterStaff, filterProperty, filterUnit, filterTenant, filterTenantVisible, filterOwnerVisible, filterOverdue, endFrom, endTo, sortKey, sortDir, staff]);

  const clearFilters = () => {
    setSearch(''); setFilterStatus('all'); setFilterResponse('all'); setFilterStaff('all');
    setFilterProperty('all'); setFilterUnit('all'); setFilterTenant('all');
    setFilterTenantVisible('all'); setFilterOwnerVisible('all'); setFilterOverdue('all');
    setEndFrom(''); setEndTo('');
  };

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir('asc'); }
  };

  const allChecked = filtered.length > 0 && filtered.every(r => selected.has(r.id));
  const toggleAll = () => {
    if (allChecked) setSelected(new Set());
    else setSelected(new Set(filtered.map(r => r.id)));
  };
  const toggleOne = (id: string) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };

  const bulkApply = async (patch: any, msg: string) => {
    if (!canBulk) return toast.error('Not authorized for bulk actions');
    if (selected.size === 0) return toast.error('Nothing selected');
    try {
      for (const id of selected) {
        await update.mutateAsync({ id, patch, activityMessage: `Bulk: ${msg}` });
      }
      toast.success(`Applied to ${selected.size} renewal(s)`);
      setSelected(new Set());
    } catch (e: any) { toast.error(e.message); }
  };

  const exportCsv = () => {
    const rows = filtered.map(r => ({
      property: r.property?.property_name ?? '',
      unit: r.unit?.unit_label ?? '',
      tenant: tenantLabel(r),
      tenant_email: r.tenant?.email ?? '',
      current_lease_end_date: r.current_lease_end_date ?? '',
      proposed_start_date: r.proposed_start_date ?? '',
      proposed_end_date: r.proposed_end_date ?? '',
      current_rent: r.current_rent ?? '',
      proposed_rent: r.proposed_rent ?? '',
      rent_frequency: r.rent_frequency ?? '',
      status: formatStatusLabel(r.status),
      tenant_response: r.tenant_response ?? '',
      tenant_responded_at: r.tenant_responded_at ?? '',
      assigned_staff: staffLabel(r.assigned_to),
      tenant_visible: r.tenant_visible ? 'yes' : 'no',
      owner_visible: r.owner_visible ? 'yes' : 'no',
      created_at: r.created_at ?? '',
      updated_at: r.updated_at ?? '',
    }));
    if (!rows.length) return toast.error('Nothing to export');
    downloadCSV(rows, `lease-renewals-${new Date().toISOString().slice(0,10)}.csv`);
  };

  const detail = renewals.find(r => r.id === detailId);
  const rentedLeaseIds = new Set(renewals.map(r => r.lease_id));

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarClock className="h-6 w-6 text-emerald-600" />
            Lease Renewals
          </h1>
          <p className="text-sm text-muted-foreground">Track renewals, assign staff, and communicate with tenants.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-1" />CSV</Button>
          <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" />Print</Button>
          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogTrigger asChild>
              <Button onClick={() => { setForm(emptyForm); setOpenNew(true); }}>
                <Plus className="mr-2 h-4 w-4" /> New Renewal
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>New Lease Renewal</DialogTitle></DialogHeader>
              <RenewalForm form={form} setForm={setForm} leases={leases} tenants={tenants} properties={properties} units={units} staff={staff} isAdmin />
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenNew(false)}>Cancel</Button>
                <Button onClick={submit} disabled={create.isPending}>Create Renewal</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <SummaryCard label="Draft" value={summary.draft} tone="slate" onClick={() => { setTab('active'); setFilterStatus('not_started'); }} />
        <SummaryCard label="Pending Tenant" value={summary.pendingTenant} tone="blue" onClick={() => { setTab('active'); setFilterStatus('sent_to_tenant'); }} />
        <SummaryCard label="Accepted" value={summary.accepted} tone="emerald" onClick={() => { setTab('all'); setFilterStatus('tenant_accepted'); }} />
        <SummaryCard label="Declined" value={summary.declined} tone="rose" onClick={() => { setTab('all'); setFilterStatus('tenant_declined'); }} />
        <SummaryCard label="Overdue" value={summary.overdue} tone="red" onClick={() => { setTab('active'); setFilterOverdue('overdue'); }} />
        <SummaryCard label="Ending ≤30d (no renewal)" value={summary.endingSoon} tone="amber" />
      </div>

      {/* Leases ending soon */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Leases Ending Soon (90 days)
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

      {/* Renewals list */}
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-base">Renewals</CardTitle>
            <Tabs value={tab} onValueChange={(v: any) => setTab(v)}>
              <TabsList>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="archived"><Archive className="h-3.5 w-3.5 mr-1" />Archived</TabsTrigger>
                <TabsTrigger value="all">All</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Filters row */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            <Input placeholder="Search tenant / property / email…" value={search} onChange={e => setSearch(e.target.value)} />
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {RENEWAL_STATUSES.map(s => <SelectItem key={s} value={s}>{formatStatusLabel(s)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterResponse} onValueChange={setFilterResponse}>
              <SelectTrigger><SelectValue placeholder="Tenant response" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any response</SelectItem>
                <SelectItem value="none">No response</SelectItem>
                <SelectItem value="interested">Interested</SelectItem>
                <SelectItem value="questions">Questions</SelectItem>
                <SelectItem value="not_renewing">Not renewing</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStaff} onValueChange={setFilterStaff}>
              <SelectTrigger><SelectValue placeholder="Staff" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All staff</SelectItem>
                {staff.map((s: any) => <SelectItem key={s.user_id} value={s.user_id}>{s.display_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterProperty} onValueChange={(v) => { setFilterProperty(v); setFilterUnit('all'); }}>
              <SelectTrigger><SelectValue placeholder="Property" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All properties</SelectItem>
                {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.property_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterUnit} onValueChange={setFilterUnit}>
              <SelectTrigger><SelectValue placeholder="Unit" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All units</SelectItem>
                {units.filter((u: any) => filterProperty === 'all' || u.property_id === filterProperty)
                  .map((u: any) => <SelectItem key={u.id} value={u.id}>{u.unit_label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterTenant} onValueChange={setFilterTenant}>
              <SelectTrigger><SelectValue placeholder="Tenant" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tenants</SelectItem>
                {tenants.map(t => <SelectItem key={t.id} value={t.id}>{t.first_name} {t.last_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterOverdue} onValueChange={setFilterOverdue}>
              <SelectTrigger><SelectValue placeholder="Timing" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any timing</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="ending_30">Ending ≤30 days</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterTenantVisible} onValueChange={setFilterTenantVisible}>
              <SelectTrigger><SelectValue placeholder="Tenant visible" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tenant visible: any</SelectItem>
                <SelectItem value="yes">Tenant visible: yes</SelectItem>
                <SelectItem value="no">Tenant visible: no</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterOwnerVisible} onValueChange={setFilterOwnerVisible}>
              <SelectTrigger><SelectValue placeholder="Owner visible" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Owner visible: any</SelectItem>
                <SelectItem value="yes">Owner visible: yes</SelectItem>
                <SelectItem value="no">Owner visible: no</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-1 items-center">
              <Input type="date" value={endFrom} onChange={e => setEndFrom(e.target.value)} title="End date from" />
              <Input type="date" value={endTo} onChange={e => setEndTo(e.target.value)} title="End date to" />
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={clearFilters}><X className="h-3.5 w-3.5 mr-1" />Clear</Button>
          </div>

          {/* Sort + bulk toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground flex items-center gap-1"><ArrowUpDown className="h-3 w-3" />Sort:</span>
            <Select value={sortKey} onValueChange={(v: any) => setSortKey(v)}>
              <SelectTrigger className="w-[170px] h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="end_date">Lease end date</SelectItem>
                <SelectItem value="created_at">Created date</SelectItem>
                <SelectItem value="updated_at">Updated date</SelectItem>
                <SelectItem value="proposed_rent">Proposed rent</SelectItem>
                <SelectItem value="assigned">Assigned staff</SelectItem>
                <SelectItem value="property">Property / unit</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}>
              {sortDir === 'asc' ? '↑ Asc' : '↓ Desc'}
            </Button>

            {canBulk && selected.size > 0 && (
              <div className="ml-auto flex items-center gap-2 border-l pl-3">
                <Badge variant="secondary"><CheckSquare className="h-3 w-3 mr-1" />{selected.size} selected</Badge>
                <BulkAssignPopover staff={staff} onApply={(id) => bulkApply({ assigned_to: id || null }, `Assigned to ${staffLabel(id)}`)} />
                <BulkStatusPopover onApply={(s) => bulkApply({ status: s }, `Status → ${formatStatusLabel(s)}`)} />
                <Button size="sm" variant="outline" onClick={() => bulkApply({ tenant_visible: true }, 'Tenant visible → yes')}>Tenant visible ✓</Button>
                <Button size="sm" variant="outline" onClick={() => bulkApply({ tenant_visible: false }, 'Tenant visible → no')}>Tenant visible ✗</Button>
                <Button size="sm" variant="outline" onClick={() => bulkApply({ owner_visible: true }, 'Owner visible → yes')}>Owner visible ✓</Button>
                <Button size="sm" variant="outline" onClick={() => bulkApply({ owner_visible: false }, 'Owner visible → no')}>Owner visible ✗</Button>
                <Button size="sm" variant="outline" onClick={() => bulkApply({ status: 'cancelled' }, 'Archived')}><Archive className="h-3.5 w-3.5 mr-1" />Archive</Button>
                <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No renewals match these filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {canBulk && (
                      <TableHead className="w-8"><Checkbox checked={allChecked} onCheckedChange={toggleAll} /></TableHead>
                    )}
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('property')}>Tenant / Property {sortKey==='property' && (sortDir==='asc'?'↑':'↓')}</TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('end_date')}>Current End {sortKey==='end_date' && (sortDir==='asc'?'↑':'↓')}</TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('proposed_rent')}>Proposed Rent {sortKey==='proposed_rent' && (sortDir==='asc'?'↑':'↓')}</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Response</TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('assigned')}>Assigned {sortKey==='assigned' && (sortDir==='asc'?'↑':'↓')}</TableHead>
                    <TableHead>Visibility</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(r => {
                    const d = daysUntil(r.current_lease_end_date);
                    const isOverdue = d !== null && d < 0 && !CLOSED_STATUSES.has(r.status);
                    const soon = d !== null && d >= 0 && d <= 30 && !CLOSED_STATUSES.has(r.status);
                    return (
                      <TableRow key={r.id} className={isOverdue ? 'bg-red-50/60' : soon ? 'bg-amber-50/50' : ''}>
                        {canBulk && (
                          <TableCell><Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggleOne(r.id)} /></TableCell>
                        )}
                        <TableCell className="text-sm">
                          <div className="font-medium">{tenantLabel(r)}</div>
                          <div className="text-xs text-muted-foreground">{propertyLabel(r)}</div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {r.current_lease_end_date ?? '—'}
                          {isOverdue && <Badge className="bg-red-600 ml-2">Overdue {Math.abs(d!)}d</Badge>}
                          {soon && <Badge className="bg-amber-600 ml-2">{d}d</Badge>}
                        </TableCell>
                        <TableCell className="text-sm">{r.proposed_rent ? `$${Number(r.proposed_rent).toFixed(2)}` : '—'}</TableCell>
                        <TableCell><Badge variant="secondary">{formatStatusLabel(r.status)}</Badge></TableCell>
                        <TableCell className="text-xs">{r.tenant_response ? formatStatusLabel(r.tenant_response) : '—'}</TableCell>
                        <TableCell className="text-sm">{staffLabel(r.assigned_to)}</TableCell>
                        <TableCell className="text-xs">
                          {r.tenant_visible && <Badge className="bg-blue-600 mr-1">Tenant</Badge>}
                          {r.owner_visible && <Badge className="bg-purple-600">Owner</Badge>}
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" onClick={() => { setEditForm({ ...r, current_rent: r.current_rent ?? '', proposed_rent: r.proposed_rent ?? '' }); setDetailId(r.id); }}>
                            Open
                          </Button>
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

      {/* Detail drawer */}
      <Sheet open={!!detailId} onOpenChange={(o) => { if (!o) { setDetailId(null); setEditForm(null); } }}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Renewal Details</SheetTitle>
          </SheetHeader>
          {detail && editForm && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Tenant:</span> <span className="font-medium">{tenantLabel(detail)}</span></div>
                <div><span className="text-muted-foreground">Property:</span> <span className="font-medium">{propertyLabel(detail)}</span></div>
                <div><span className="text-muted-foreground">Current lease:</span> {detail.lease?.start_date ?? '—'} → {detail.lease?.end_date ?? '—'}</div>
                <div><span className="text-muted-foreground">Current rent:</span> ${Number(detail.current_rent ?? detail.lease?.monthly_rent ?? 0).toFixed(2)}</div>
                <div><span className="text-muted-foreground">Response:</span> {detail.tenant_response ? formatStatusLabel(detail.tenant_response) : '—'}</div>
                <div><span className="text-muted-foreground">Responded:</span> {detail.tenant_responded_at ? new Date(detail.tenant_responded_at).toLocaleString() : '—'}</div>
                <div><span className="text-muted-foreground">Created:</span> {detail.created_at ? new Date(detail.created_at).toLocaleString() : '—'}</div>
                <div><span className="text-muted-foreground">Updated:</span> {detail.updated_at ? new Date(detail.updated_at).toLocaleString() : '—'}</div>
              </div>

              <MessageTemplatesPopover renewal={detail} tenantName={tenantLabel(detail)} property={propertyLabel(detail)} />

              <div className="border-t pt-3">
                <RenewalForm form={editForm} setForm={setEditForm} leases={leases} tenants={tenants} properties={properties} units={units} staff={staff} isAdmin />
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => { setDetailId(null); setEditForm(null); }}>Close</Button>
                <Button onClick={async () => {
                  if (!detailId) return;
                  try {
                    const { id, created_at, updated_at, created_by, lease, property, unit, tenant, ...patch } = editForm;
                    patch.current_rent = patch.current_rent ? Number(patch.current_rent) : null;
                    patch.proposed_rent = patch.proposed_rent ? Number(patch.proposed_rent) : null;
                    await update.mutateAsync({ id: detailId, patch, activityMessage: `Status: ${formatStatusLabel(patch.status)}` });
                    toast.success('Renewal updated');
                    setDetailId(null); setEditForm(null);
                  } catch (e: any) { toast.error(e.message); }
                }}>Save Changes</Button>
              </div>

              <RenewalActivityList id={detailId} />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function SummaryCard({ label, value, tone, onClick }: { label: string; value: number; tone: string; onClick?: () => void }) {
  const toneMap: Record<string, string> = {
    slate: 'border-slate-200 text-slate-700',
    blue: 'border-blue-200 text-blue-700 bg-blue-50/40',
    emerald: 'border-emerald-200 text-emerald-700 bg-emerald-50/40',
    rose: 'border-rose-200 text-rose-700 bg-rose-50/40',
    red: 'border-red-300 text-red-700 bg-red-50/60',
    amber: 'border-amber-200 text-amber-700 bg-amber-50/40',
  };
  return (
    <button type="button" onClick={onClick} className={`text-left rounded-lg border p-3 hover:shadow-sm transition ${toneMap[tone]}`}>
      <div className="text-xs uppercase tracking-wide opacity-80">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </button>
  );
}

function BulkAssignPopover({ staff, onApply }: { staff: any[]; onApply: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [id, setId] = useState('');
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline"><Users className="h-3.5 w-3.5 mr-1" />Assign</Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 space-y-2">
        <Label className="text-xs">Assign to</Label>
        <Select value={id} onValueChange={setId}>
          <SelectTrigger><SelectValue placeholder="Choose staff" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__unassigned">Unassigned</SelectItem>
            {staff.map((s: any) => <SelectItem key={s.user_id} value={s.user_id}>{s.display_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" className="w-full" onClick={() => { onApply(id === '__unassigned' ? '' : id); setOpen(false); }}>Apply</Button>
      </PopoverContent>
    </Popover>
  );
}

function BulkStatusPopover({ onApply }: { onApply: (s: string) => void }) {
  const [open, setOpen] = useState(false);
  const [s, setS] = useState('');
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline"><Filter className="h-3.5 w-3.5 mr-1" />Status</Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 space-y-2">
        <Label className="text-xs">Set status</Label>
        <Select value={s} onValueChange={setS}>
          <SelectTrigger><SelectValue placeholder="Choose status" /></SelectTrigger>
          <SelectContent>
            {RENEWAL_STATUSES.map(x => <SelectItem key={x} value={x}>{formatStatusLabel(x)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" className="w-full" disabled={!s} onClick={() => { onApply(s); setOpen(false); }}>Apply</Button>
      </PopoverContent>
    </Popover>
  );
}

function MessageTemplatesPopover({ renewal, tenantName, property }: { renewal: any; tenantName: string; property: string }) {
  const endDate = renewal.current_lease_end_date ?? '(end date)';
  const proposedRent = renewal.proposed_rent ? `$${Number(renewal.proposed_rent).toFixed(2)}` : '(proposed rent)';
  const proposedStart = renewal.proposed_start_date ?? '(start date)';
  const proposedEnd = renewal.proposed_end_date ?? '(end date)';

  const templates = [
    {
      label: 'Tenant follow-up',
      text: `Hi ${tenantName || 'there'},\n\nYour lease at ${property} is scheduled to end on ${endDate}. We'd love to have you stay with us — please let us know if you're interested in renewing so we can finalize terms.\n\nThank you,\nPraetoria Property Management`,
    },
    {
      label: 'Renewal offer reminder',
      text: `Hi ${tenantName || 'there'},\n\nJust a friendly reminder about your lease renewal offer for ${property}:\n• Proposed term: ${proposedStart} → ${proposedEnd}\n• Proposed rent: ${proposedRent}\n\nPlease sign in to your Tenant Portal to review and respond.\n\nThank you,\nPraetoria Property Management`,
    },
    {
      label: 'Owner summary',
      text: `Renewal update for ${property}\n\nTenant: ${tenantName}\nCurrent lease ends: ${endDate}\nProposed term: ${proposedStart} → ${proposedEnd}\nProposed rent: ${proposedRent}\nStatus: ${formatStatusLabel(renewal.status)}\nTenant response: ${renewal.tenant_response ? formatStatusLabel(renewal.tenant_response) : 'Pending'}\n\n— Praetoria Property Management`,
    },
  ];

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm"><MessageSquare className="h-3.5 w-3.5 mr-1" />Copy message templates</Button>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] space-y-3">
        <p className="text-xs text-muted-foreground">Helper text only — no messages are sent from here. Copy and paste into your preferred channel.</p>
        {templates.map(t => (
          <div key={t.label} className="border rounded p-2 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">{t.label}</span>
              <Button size="sm" variant="ghost" onClick={() => copy(t.text)}><Copy className="h-3 w-3 mr-1" />Copy</Button>
            </div>
            <pre className="text-[11px] whitespace-pre-wrap text-muted-foreground max-h-32 overflow-y-auto">{t.text}</pre>
          </div>
        ))}
      </PopoverContent>
    </Popover>
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
              {staff.map((s: any) => <SelectItem key={s.user_id} value={s.user_id}>{s.display_name}</SelectItem>)}
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
        <ul className="space-y-1 max-h-56 overflow-y-auto">
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
