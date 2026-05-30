import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { Plus, Pencil, Trash2, Check, Printer, FileText, DollarSign, AlertCircle, ChevronsUpDown, Package } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

type PayStub = any;
type LineItem = any;

const SERVICE_TYPES = [
  'Junk Removal',
  'Drywall Work',
  'Mixed Work - Drywall + Junk Removal',
  'Snow Removal',
  'Landscaping',
  'Maintenance',
  'Other',
];

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
};

function formatMoney(n: number | null | undefined) {
  return `$${Number(n || 0).toFixed(2)}`;
}

// Parse YYYY-MM-DD date strings as local dates to avoid UTC timezone shifts
function parseLocalDate(s: string | null | undefined): Date {
  if (!s) return new Date(NaN);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  return new Date(s);
}

export function SubcontractorPayStubs({ subcontractorId, subcontractorName }: { subcontractorId: string; subcontractorName: string }) {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [activeStubId, setActiveStubId] = useState<string | null>(null);

  const { data: stubs = [], isLoading } = useQuery({
    queryKey: ['sub_pay_stubs', subcontractorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subcontractor_pay_stubs')
        .select('*')
        .eq('subcontractor_id', subcontractorId)
        .order('period_start', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const groups = {
    draft: stubs.filter((s: PayStub) => s.status === 'draft'),
    approved: stubs.filter((s: PayStub) => s.status === 'approved'),
    paid: stubs.filter((s: PayStub) => s.status === 'paid'),
  };

  const totalOwed = stubs
    .filter((s: PayStub) => s.status !== 'paid')
    .reduce((acc: number, s: PayStub) => acc + Number(s.total || 0), 0);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase">Drafts</p>
            <p className="text-2xl font-bold">{groups.draft.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase">Approved</p>
            <p className="text-2xl font-bold">{groups.approved.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase">Total Owed</p>
            <p className="text-2xl font-bold text-primary">{formatMoney(totalOwed)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold flex items-center gap-2"><DollarSign className="h-4 w-4" /> Pay Stubs</h3>
        <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> New Pay Stub
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-4 text-sm text-muted-foreground">Loading...</p>
          ) : stubs.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No pay stubs yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pay Stub #</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Confirmed</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stubs.map((s: PayStub) => (
                  <TableRow key={s.id} className="cursor-pointer" onClick={() => setActiveStubId(s.id)}>
                    <TableCell className="font-mono text-xs">{s.pay_stub_number}</TableCell>
                    <TableCell className="text-sm">
                      {format(parseLocalDate(s.period_start), 'MMM d')} – {format(parseLocalDate(s.period_end), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[s.status]} variant="outline">{s.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm">{formatMoney(s.confirmed_subtotal)}</TableCell>
                    <TableCell className="text-right text-sm text-amber-600">{formatMoney(s.pending_subtotal)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatMoney(s.total)}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setActiveStubId(s.id); }}>Open</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {createOpen && (
        <CreatePayStubDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          subcontractorId={subcontractorId}
          onCreated={(id) => {
            qc.invalidateQueries({ queryKey: ['sub_pay_stubs', subcontractorId] });
            setActiveStubId(id);
          }}
        />
      )}

      {activeStubId && (
        <PayStubDetailDialog
          stubId={activeStubId}
          subcontractorName={subcontractorName}
          open={!!activeStubId}
          onOpenChange={(o) => !o && setActiveStubId(null)}
          onChanged={() => qc.invalidateQueries({ queryKey: ['sub_pay_stubs', subcontractorId] })}
        />
      )}
    </div>
  );
}

// ───────────────────────── CREATE ─────────────────────────
function CreatePayStubDialog({
  open, onOpenChange, subcontractorId, onCreated,
}: { open: boolean; onOpenChange: (o: boolean) => void; subcontractorId: string; onCreated: (id: string) => void }) {
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!periodStart || !periodEnd) { toast.error('Pay period dates required'); return; }
    setSaving(true);
    const { data, error } = await supabase
      .from('subcontractor_pay_stubs')
      .insert({ subcontractor_id: subcontractorId, period_start: periodStart, period_end: periodEnd, status: 'draft' })
      .select('id').single();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Pay stub created');
    onOpenChange(false);
    onCreated(data.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>New Pay Stub</DialogTitle></DialogHeader>
        <div className="space-y-3 pt-2">
          <div>
            <Label>Period Start</Label>
            <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
          </div>
          <div>
            <Label>Period End</Label>
            <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? 'Saving...' : 'Create'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ───────────────────────── DETAIL ─────────────────────────
function PayStubDetailDialog({
  stubId, subcontractorName, open, onOpenChange, onChanged,
}: { stubId: string; subcontractorName: string; open: boolean; onOpenChange: (o: boolean) => void; onChanged: () => void }) {
  const qc = useQueryClient();
  const [editingItem, setEditingItem] = useState<LineItem | null>(null);
  const [addingItem, setAddingItem] = useState(false);

  const { data: stub, refetch: refetchStub } = useQuery({
    queryKey: ['pay_stub_detail', stubId],
    queryFn: async () => {
      const { data, error } = await supabase.from('subcontractor_pay_stubs').select('*').eq('id', stubId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: items = [], refetch: refetchItems } = useQuery({
    queryKey: ['pay_stub_items', stubId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subcontractor_pay_stub_line_items')
        .select('*')
        .eq('pay_stub_id', stubId)
        .order('sort_order', { ascending: true })
        .order('work_date', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const refresh = () => { refetchStub(); refetchItems(); onChanged(); };

  const updateStub = async (patch: any) => {
    const { error } = await supabase.from('subcontractor_pay_stubs').update(patch).eq('id', stubId);
    if (error) toast.error(error.message);
    else { toast.success('Updated'); refresh(); }
  };

  const toggleConfirm = async (it: LineItem) => {
    const { error } = await supabase
      .from('subcontractor_pay_stub_line_items')
      .update({ is_confirmed: !it.is_confirmed })
      .eq('id', it.id);
    if (error) toast.error(error.message); else refresh();
  };

  const deleteItem = async (id: string) => {
    if (!confirm('Delete this line item?')) return;
    const { error } = await supabase.from('subcontractor_pay_stub_line_items').delete().eq('id', id);
    if (error) toast.error(error.message); else { toast.success('Deleted'); refresh(); }
  };

  const allConfirmed = items.length > 0 && items.every((i: LineItem) => i.is_confirmed);
  const hasMixedUnsplit = items.some((i: LineItem) => i.is_mixed && !i.is_confirmed);

  if (!stub) return null;

  const printPDF = () => {
    window.open(`/admin/subcontractor-pay-stub/${stubId}/print`, '_blank');
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <FileText className="h-5 w-5" /> {stub.pay_stub_number}
                <Badge className={STATUS_COLORS[stub.status]} variant="outline">{stub.status}</Badge>
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={printPDF} className="gap-1.5">
                  <Printer className="h-3.5 w-3.5" /> Print / PDF
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Header info */}
            <Card>
              <CardContent className="p-4 grid md:grid-cols-3 gap-3 text-sm">
                <div><span className="text-muted-foreground">Subcontractor:</span> <strong>{subcontractorName}</strong></div>
                <div><span className="text-muted-foreground">Period:</span> <strong>{format(parseLocalDate(stub.period_start), 'MMM d, yyyy')} – {format(parseLocalDate(stub.period_end), 'MMM d, yyyy')}</strong></div>
                <div><span className="text-muted-foreground">Status:</span> <strong className="capitalize">{stub.status}</strong></div>
              </CardContent>
            </Card>

            {/* Totals */}
            <div className="grid grid-cols-3 gap-3">
              <Card><CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Confirmed Subtotal</p>
                <p className="text-xl font-bold text-green-600">{formatMoney(stub.confirmed_subtotal)}</p>
              </CardContent></Card>
              <Card><CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="text-xl font-bold text-amber-600">{formatMoney(stub.pending_subtotal)}</p>
              </CardContent></Card>
              <Card><CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">{allConfirmed ? 'Final Total' : 'Provisional Total'}</p>
                <p className="text-xl font-bold">{allConfirmed ? formatMoney(stub.total) : '—'}</p>
              </CardContent></Card>
            </div>

            {!allConfirmed && (
              <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>Final total is shown only after all pending hours and mixed-work splits are confirmed.</span>
              </div>
            )}

            {/* Line items */}
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm">Line Items ({items.length})</CardTitle>
                <Button size="sm" variant="outline" onClick={() => setAddingItem(true)} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Add Line
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead className="text-right">Hours</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((it: LineItem) => (
                      <TableRow key={it.id} className={it.is_confirmed ? '' : 'bg-amber-50/50'}>
                        <TableCell className="text-sm">{format(parseLocalDate(it.work_date), 'MMM d, yyyy')}</TableCell>
                        <TableCell className="text-sm">
                          {it.service_type}
                          {it.is_mixed && <Badge variant="outline" className="ml-1 text-[10px]">mixed</Badge>}
                          {it.notes && <p className="text-[11px] text-muted-foreground mt-0.5 max-w-xs">{it.notes}</p>}
                          {it.is_mixed && Array.isArray(it.mixed_split) && it.mixed_split.length > 0 && (
                            <div className="text-[11px] text-muted-foreground mt-1 space-y-0.5">
                              {it.mixed_split.map((s: any, i: number) => (
                                <div key={i}>• {s.service_type}: {s.hours}h × ${s.hourly_rate} = {formatMoney(s.line_total)}</div>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {it.start_time && it.end_time ? `${it.start_time} – ${it.end_time}` : '—'}
                        </TableCell>
                        <TableCell className="text-right text-sm">{it.hours ?? '—'}</TableCell>
                        <TableCell className="text-right text-sm">{it.is_mixed ? 'split' : it.hourly_rate ? `$${Number(it.hourly_rate).toFixed(2)}` : '—'}</TableCell>
                        <TableCell className="text-right font-medium">{formatMoney(it.line_total)}</TableCell>
                        <TableCell>
                          {it.is_confirmed
                            ? <Badge className="bg-green-100 text-green-800" variant="outline">confirmed</Badge>
                            : <Badge className="bg-amber-100 text-amber-800" variant="outline">pending</Badge>}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => toggleConfirm(it)} title={it.is_confirmed ? 'Unconfirm' : 'Confirm'}>
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingItem(it)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteItem(it.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Notes */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Internal Admin Notes (not on subcontractor PDF)</Label>
                <Textarea defaultValue={stub.internal_notes || ''} onBlur={(e) => e.target.value !== (stub.internal_notes || '') && updateStub({ internal_notes: e.target.value })} rows={4} />
              </div>
              <div>
                <Label className="text-xs">Subcontractor-Visible Notes</Label>
                <Textarea defaultValue={stub.subcontractor_notes || ''} onBlur={(e) => e.target.value !== (stub.subcontractor_notes || '') && updateStub({ subcontractor_notes: e.target.value })} rows={4} />
              </div>
            </div>

            {/* Payment + status controls */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Status & Payment</CardTitle></CardHeader>
              <CardContent className="grid md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Status</Label>
                  <Select value={stub.status} onValueChange={(v) => {
                    if (v === 'approved' && hasMixedUnsplit) {
                      toast.error('Confirm/split mixed-work entries before approving.');
                      return;
                    }
                    updateStub({ status: v });
                  }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Payment Date</Label>
                  <Input type="date" defaultValue={stub.payment_date || ''} onBlur={(e) => e.target.value !== (stub.payment_date || '') && updateStub({ payment_date: e.target.value || null })} />
                </div>
                <div>
                  <Label className="text-xs">Payment Method</Label>
                  <Select value={stub.payment_method || ''} onValueChange={(v) => updateStub({ payment_method: v })}>
                    <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="E-Transfer">E-Transfer</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                      <SelectItem value="Direct Deposit">Direct Deposit</SelectItem>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {(editingItem || addingItem) && (
        <LineItemDialog
          stubId={stubId}
          item={editingItem}
          open={!!(editingItem || addingItem)}
          onOpenChange={(o) => { if (!o) { setEditingItem(null); setAddingItem(false); } }}
          onSaved={() => { refresh(); setEditingItem(null); setAddingItem(false); }}
        />
      )}
    </>
  );
}

// ───────────────────────── LINE ITEM EDITOR ─────────────────────────
function LineItemDialog({
  stubId, item, open, onOpenChange, onSaved,
}: { stubId: string; item: LineItem | null; open: boolean; onOpenChange: (o: boolean) => void; onSaved: () => void }) {
  const isEdit = !!item;
  const [workDate, setWorkDate] = useState(item?.work_date || '');
  const [serviceType, setServiceType] = useState(item?.service_type || 'Junk Removal');
  const [startTime, setStartTime] = useState(item?.start_time || '');
  const [endTime, setEndTime] = useState(item?.end_time || '');
  const [hours, setHours] = useState<string>(item?.hours?.toString() || '');
  const [hourlyRate, setHourlyRate] = useState<string>(item?.hourly_rate?.toString() || '');
  const [notes, setNotes] = useState(item?.notes || '');
  const [isConfirmed, setIsConfirmed] = useState<boolean>(item?.is_confirmed || false);
  const [isMixed, setIsMixed] = useState<boolean>(item?.is_mixed || false);
  // Mixed split
  const initSplit = Array.isArray(item?.mixed_split) && item.mixed_split.length === 2
    ? item.mixed_split
    : [{ service_type: 'Drywall Work', hours: 0, hourly_rate: 30 }, { service_type: 'Junk Removal', hours: 0, hourly_rate: 25 }];
  const [drywallHours, setDrywallHours] = useState<string>(initSplit[0]?.hours?.toString() || '');
  const [drywallRate, setDrywallRate] = useState<string>(initSplit[0]?.hourly_rate?.toString() || '30');
  const [junkHours, setJunkHours] = useState<string>(initSplit[1]?.hours?.toString() || '');
  const [junkRate, setJunkRate] = useState<string>(initSplit[1]?.hourly_rate?.toString() || '25');

  const computedLineTotal = (() => {
    if (isMixed) {
      const dt = (parseFloat(drywallHours) || 0) * (parseFloat(drywallRate) || 0);
      const jt = (parseFloat(junkHours) || 0) * (parseFloat(junkRate) || 0);
      return dt + jt;
    }
    return (parseFloat(hours) || 0) * (parseFloat(hourlyRate) || 0);
  })();

  const splitSum = (parseFloat(drywallHours) || 0) + (parseFloat(junkHours) || 0);
  const totalMixedHours = parseFloat(hours) || 0;
  const splitMatches = !isMixed || Math.abs(splitSum - totalMixedHours) < 0.001;

  const save = async () => {
    if (!workDate) { toast.error('Date required'); return; }
    if (isMixed && !splitMatches) { toast.error(`Split hours (${splitSum}) must equal total (${totalMixedHours}).`); return; }

    const payload: any = {
      pay_stub_id: stubId,
      work_date: workDate,
      service_type: serviceType,
      start_time: startTime || null,
      end_time: endTime || null,
      hours: hours ? parseFloat(hours) : null,
      hourly_rate: isMixed ? null : (hourlyRate ? parseFloat(hourlyRate) : null),
      line_total: computedLineTotal,
      notes: notes || null,
      is_confirmed: isConfirmed,
      is_mixed: isMixed,
      mixed_split: isMixed ? [
        { service_type: 'Drywall Work', hours: parseFloat(drywallHours) || 0, hourly_rate: parseFloat(drywallRate) || 0, line_total: (parseFloat(drywallHours) || 0) * (parseFloat(drywallRate) || 0) },
        { service_type: 'Junk Removal', hours: parseFloat(junkHours) || 0, hourly_rate: parseFloat(junkRate) || 0, line_total: (parseFloat(junkHours) || 0) * (parseFloat(junkRate) || 0) },
      ] : null,
    };

    const { error } = isEdit
      ? await supabase.from('subcontractor_pay_stub_line_items').update(payload).eq('id', item!.id)
      : await supabase.from('subcontractor_pay_stub_line_items').insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success('Saved');
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? 'Edit Line Item' : 'Add Line Item'}</DialogTitle></DialogHeader>
        <div className="space-y-3 pt-2">
          <CatalogPicker
            onPick={(it) => {
              if (it.service_category) setServiceType(it.service_category);
              if (it.unit_price != null) setHourlyRate(String(it.unit_price));
              setNotes((prev) => prev ? prev : it.name);
            }}
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Work Date</Label>
              <Input type="date" value={workDate} onChange={(e) => setWorkDate(e.target.value)} />
            </div>
            <div>
              <Label>Service Type</Label>
              <Select value={serviceType} onValueChange={setServiceType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Start Time</Label>
              <Input value={startTime} onChange={(e) => setStartTime(e.target.value)} placeholder="10:00 AM" />
            </div>
            <div>
              <Label>End Time</Label>
              <Input value={endTime} onChange={(e) => setEndTime(e.target.value)} placeholder="5:00 PM" />
            </div>
            <div>
              <Label>Total Hours</Label>
              <Input type="number" step="0.25" value={hours} onChange={(e) => setHours(e.target.value)} />
            </div>
            {!isMixed && (
              <div>
                <Label>Hourly Rate ($)</Label>
                <Input type="number" step="0.01" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="mixed" checked={isMixed} onChange={(e) => setIsMixed(e.target.checked)} />
            <Label htmlFor="mixed" className="cursor-pointer">Mixed work (split between Drywall + Junk Removal)</Label>
          </div>

          {isMixed && (
            <Card className="border-amber-200 bg-amber-50/30">
              <CardContent className="p-3 space-y-2">
                <p className="text-xs text-muted-foreground">Split the total {totalMixedHours || 0} hours between services. Sum must equal total.</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <Label className="text-xs">Drywall Hours</Label>
                    <Input type="number" step="0.25" value={drywallHours} onChange={(e) => setDrywallHours(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Drywall Rate ($)</Label>
                    <Input type="number" step="0.01" value={drywallRate} onChange={(e) => setDrywallRate(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Junk Removal Hours</Label>
                    <Input type="number" step="0.25" value={junkHours} onChange={(e) => setJunkHours(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Junk Removal Rate ($)</Label>
                    <Input type="number" step="0.01" value={junkRate} onChange={(e) => setJunkRate(e.target.value)} />
                  </div>
                </div>
                <div className={`text-xs ${splitMatches ? 'text-green-700' : 'text-destructive'}`}>
                  Split sum: {splitSum} hrs {splitMatches ? '✓' : `(must equal ${totalMixedHours})`}
                </div>
              </CardContent>
            </Card>
          )}

          <div>
            <Label>Notes</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="conf" checked={isConfirmed} onChange={(e) => setIsConfirmed(e.target.checked)} />
            <Label htmlFor="conf" className="cursor-pointer">Mark as confirmed</Label>
          </div>

          <div className="flex justify-between items-center p-3 bg-muted rounded">
            <span className="text-sm">Line Total</span>
            <span className="text-lg font-bold">{formatMoney(computedLineTotal)}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type CatalogItem = { id: string; name: string; service_category: string | null; unit_price: number | null; unit_label: string | null };

function CatalogPicker({ onPick }: { onPick: (item: CatalogItem) => void }) {
  const [open, setOpen] = useState(false);
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['catalog-items-picker'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products_services')
        .select('id, name, service_category, unit_price, unit_label')
        .eq('status', 'Active')
        .order('name');
      if (error) throw error;
      return (data || []) as CatalogItem[];
    },
  });

  return (
    <div>
      <Label className="flex items-center gap-1.5"><Package className="h-3.5 w-3.5" /> Pick from Catalog (optional)</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" className="w-full justify-between font-normal mt-1">
            <span className="text-muted-foreground">{isLoading ? 'Loading catalog…' : 'Search service items…'}</span>
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search catalog (garbage, landfill, lawn…)" />
            <CommandList>
              <CommandEmpty>No catalog items found.</CommandEmpty>
              <CommandGroup>
                {items.map((it) => (
                  <CommandItem
                    key={it.id}
                    value={`${it.name} ${it.service_category || ''}`}
                    onSelect={() => { onPick(it); setOpen(false); toast.success(`Filled from: ${it.name}`); }}
                  >
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="font-medium truncate">{it.name}</span>
                      <span className="text-xs text-muted-foreground truncate">
                        {it.service_category || '—'}{it.unit_price ? ` · $${Number(it.unit_price).toFixed(2)} ${it.unit_label || ''}` : ''}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <p className="text-xs text-muted-foreground mt-1">Auto-fills service type, rate, and notes. You can still edit fields below.</p>
    </div>
  );
}
