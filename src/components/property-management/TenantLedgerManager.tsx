import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  DollarSign, Plus, Trash2, Check, Ban, Upload, FileText, Receipt,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  usePmLedgerFor, useCreatePmLedgerEntry, useUpdatePmLedgerEntry,
  useDeletePmLedgerEntry, usePmTenantBalance, signedAmount,
  type PmLedgerEntry,
} from '@/hooks/usePmLedger';

type Props = {
  tenantId: string;
  leaseId?: string | null;
  propertyId?: string | null;
  unitId?: string | null;
  defaultRentAmount?: number;
  defaultRentDueDay?: number;
};

type QuickAction = 'rent_charge' | 'payment' | 'late_fee' | 'credit' | 'adjustment_credit' | 'deposit' | 'deposit_refund' | 'other_charge' | 'other_credit' | 'nsf_fee';

const TYPE_LABEL: Record<string, string> = {
  rent_charge: 'Rent charge',
  late_fee: 'Late fee',
  deposit: 'Security deposit',
  adjustment_charge: 'Adjustment (charge)',
  other_charge: 'Other charge',
  nsf_fee: 'NSF / returned fee',
  payment: 'Payment received',
  credit: 'Credit',
  adjustment_credit: 'Adjustment (credit)',
  deposit_refund: 'Deposit refund',
  other_credit: 'Other credit',
  payment_plan_note: 'Payment plan note',
};

const PAYMENT_METHODS = [
  'e_transfer', 'cash', 'cheque', 'debit_manual', 'credit_card_manual',
  'bank_transfer_manual', 'other',
];
const METHOD_LABEL: Record<string, string> = {
  e_transfer: 'E-transfer',
  cash: 'Cash',
  cheque: 'Cheque',
  debit_manual: 'Debit (manual)',
  credit_card_manual: 'Credit card (manual)',
  bank_transfer_manual: 'Bank transfer (manual)',
  other: 'Other',
};

const STATUS_BADGE: Record<string, string> = {
  posted: 'bg-slate-100 text-slate-700',
  unpaid: 'bg-amber-100 text-amber-800',
  partially_paid: 'bg-amber-100 text-amber-800',
  paid: 'bg-emerald-100 text-emerald-800',
  waived: 'bg-slate-200 text-slate-600 line-through',
  cancelled: 'bg-slate-200 text-slate-600 line-through',
  recorded: 'bg-emerald-50 text-emerald-700',
  pending: 'bg-amber-50 text-amber-700',
  cleared: 'bg-emerald-100 text-emerald-800',
  reversed: 'bg-rose-100 text-rose-700 line-through',
  nsf: 'bg-rose-100 text-rose-800',
  note: 'bg-slate-100 text-slate-600',
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function TenantLedgerManager({
  tenantId, leaseId, propertyId, unitId,
  defaultRentAmount = 0, defaultRentDueDay = 1,
}: Props) {
  const { data: entries = [] } = usePmLedgerFor({ tenantId, leaseId });
  const { data: balance = 0 } = usePmTenantBalance(tenantId);
  const create = useCreatePmLedgerEntry();
  const update = useUpdatePmLedgerEntry();
  const del = useDeletePmLedgerEntry();

  const [dialogAction, setDialogAction] = useState<QuickAction | null>(null);
  const [busy, setBusy] = useState(false);

  const outstandingCharges = useMemo(
    () => entries.filter(e =>
      ['rent_charge', 'late_fee', 'other_charge', 'adjustment_charge', 'nsf_fee'].includes(e.type)
      && !['paid', 'waived', 'cancelled'].includes(e.status)
    ),
    [entries],
  );

  const handleSaveEntry = async (payload: Partial<PmLedgerEntry>, file?: File | null) => {
    setBusy(true);
    try {
      let receipt_path: string | undefined;
      if (file) {
        const path = `pm/${propertyId ?? 'unassigned'}/tenant-${tenantId}/receipts/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage
          .from('property-management-documents')
          .upload(path, file, { upsert: false });
        if (error) throw error;
        receipt_path = path;
      }
      await create.mutateAsync({
        tenant_id: tenantId,
        lease_id: leaseId ?? null,
        property_id: propertyId ?? null,
        unit_id: unitId ?? null,
        entry_date: (payload.entry_date as string) || todayISO(),
        ...payload,
        ...(receipt_path ? { receipt_path } : {}),
      });
      toast.success('Ledger entry saved');
      setDialogAction(null);
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to save entry');
    } finally {
      setBusy(false);
    }
  };

  const markStatus = async (entry: PmLedgerEntry, status: string) => {
    try {
      const patch: any = { status };
      if (status === 'paid') patch.paid_date = todayISO();
      await update.mutateAsync({ id: entry.id, patch });
      toast.success(`Marked ${status.replace('_', ' ')}`);
    } catch (e: any) { toast.error(e?.message ?? 'Failed'); }
  };

  const openReceipt = async (path: string) => {
    const { data, error } = await supabase.storage
      .from('property-management-documents').createSignedUrl(path, 300);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, '_blank');
  };

  return (
    <Card className="border-emerald-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2 text-emerald-900">
              <DollarSign className="h-5 w-5" /> Tenant Ledger
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Rent charges, manual payments, credits and adjustments. Manual only — no online processing.
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Current balance</p>
            <p className={`text-2xl font-bold ${balance > 0 ? 'text-rose-700' : balance < 0 ? 'text-emerald-700' : 'text-slate-900'}`}>
              ${Number(balance).toFixed(2)}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700"
            onClick={() => setDialogAction('rent_charge')}>
            <Plus className="h-4 w-4 mr-1" /> Add Rent Charge
          </Button>
          <Button size="sm" variant="outline"
            onClick={() => setDialogAction('payment')}>
            <Receipt className="h-4 w-4 mr-1" /> Record Payment
          </Button>
          <Button size="sm" variant="outline"
            onClick={() => setDialogAction('late_fee')}>Late Fee</Button>
          <Button size="sm" variant="outline"
            onClick={() => setDialogAction('credit')}>Credit</Button>
          <Button size="sm" variant="outline"
            onClick={() => setDialogAction('adjustment_credit')}>Adjustment</Button>
          <Button size="sm" variant="outline"
            onClick={() => setDialogAction('deposit')}>Deposit</Button>
          <Button size="sm" variant="outline"
            onClick={() => setDialogAction('other_charge')}>Other Charge</Button>
        </div>

        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center border rounded-md">
            No ledger entries yet.
          </p>
        ) : (
          <div className="border rounded-md divide-y">
            {entries.map(e => {
              const signed = signedAmount(e);
              const isCredit = signed < 0;
              return (
                <div key={e.id} className="p-3 flex items-start gap-3 flex-wrap md:flex-nowrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{TYPE_LABEL[e.type] ?? e.type}</span>
                      <Badge variant="outline" className={STATUS_BADGE[e.status] ?? ''}>
                        {e.status.replace('_', ' ')}
                      </Badge>
                      {e.tenant_visible && (
                        <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-700">
                          Tenant-visible
                        </Badge>
                      )}
                      {e.receipt_path && (
                        <button className="text-xs text-emerald-700 underline inline-flex items-center gap-1"
                          onClick={() => openReceipt(e.receipt_path!)}>
                          <FileText className="h-3 w-3" /> Receipt
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {e.entry_date}
                      {e.due_date ? ` · due ${e.due_date}` : ''}
                      {e.period_start ? ` · ${e.period_start} → ${e.period_end ?? ''}` : ''}
                      {e.payment_method ? ` · ${METHOD_LABEL[e.payment_method] ?? e.payment_method}` : ''}
                      {e.reference ? ` · ref ${e.reference}` : ''}
                    </p>
                    {e.description && <p className="text-xs mt-1">{e.description}</p>}
                    {e.tenant_note && <p className="text-xs mt-1 text-emerald-800">Tenant: {e.tenant_note}</p>}
                    {e.admin_note && <p className="text-xs mt-1 text-slate-500">Admin: {e.admin_note}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`font-semibold text-sm ${isCredit ? 'text-emerald-700' : 'text-slate-900'}`}>
                      {isCredit ? '-' : '+'}${Math.abs(Number(e.amount)).toFixed(2)}
                    </p>
                    <div className="flex gap-1 mt-1 justify-end">
                      {['rent_charge', 'late_fee', 'other_charge', 'adjustment_charge', 'nsf_fee'].includes(e.type)
                        && !['paid', 'waived', 'cancelled'].includes(e.status) && (
                          <>
                            <Button size="sm" variant="ghost" className="h-7 px-2"
                              onClick={() => markStatus(e, 'paid')}
                              title="Mark paid"><Check className="h-3 w-3" /></Button>
                            <Button size="sm" variant="ghost" className="h-7 px-2"
                              onClick={() => markStatus(e, 'waived')}
                              title="Waive"><Ban className="h-3 w-3" /></Button>
                          </>
                        )}
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-rose-600"
                        onClick={async () => {
                          if (!confirm('Delete this ledger entry? This cannot be undone.')) return;
                          try { await del.mutateAsync(e.id); toast.success('Deleted'); }
                          catch (err: any) { toast.error(err?.message ?? 'Failed'); }
                        }}
                        title="Delete"><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <EntryDialog
        action={dialogAction}
        onClose={() => setDialogAction(null)}
        onSubmit={handleSaveEntry}
        busy={busy}
        defaultRentAmount={defaultRentAmount}
        defaultRentDueDay={defaultRentDueDay}
        outstandingCharges={outstandingCharges}
      />
    </Card>
  );
}

/* ------------------------------------------------------------------ */

function EntryDialog({
  action, onClose, onSubmit, busy,
  defaultRentAmount, defaultRentDueDay, outstandingCharges,
}: {
  action: QuickAction | null;
  onClose: () => void;
  onSubmit: (p: Partial<PmLedgerEntry>, file?: File | null) => void | Promise<void>;
  busy: boolean;
  defaultRentAmount: number;
  defaultRentDueDay: number;
  outstandingCharges: PmLedgerEntry[];
}) {
  const isPayment = action === 'payment';
  const isCharge = action && ['rent_charge', 'late_fee', 'deposit', 'other_charge', 'nsf_fee'].includes(action);
  const isCredit = action && ['credit', 'adjustment_credit', 'deposit_refund', 'other_credit'].includes(action);
  const isRent = action === 'rent_charge';

  const [amount, setAmount] = useState<string>('');
  const [entryDate, setEntryDate] = useState<string>(todayISO());
  const [dueDate, setDueDate] = useState<string>('');
  const [periodStart, setPeriodStart] = useState<string>('');
  const [periodEnd, setPeriodEnd] = useState<string>('');
  const [description, setDescription] = useState('');
  const [reference, setReference] = useState('');
  const [tenantNote, setTenantNote] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [tenantVisible, setTenantVisible] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<string>('e_transfer');
  const [relatedChargeId, setRelatedChargeId] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptTenantVisible, setReceiptTenantVisible] = useState(false);

  // Prefill when opened
  const reset = () => {
    setAmount(isRent && defaultRentAmount ? String(defaultRentAmount) : '');
    setEntryDate(todayISO());
    setDueDate(isRent ? computeNextDueDate(defaultRentDueDay) : '');
    setPeriodStart(''); setPeriodEnd('');
    setDescription(''); setReference('');
    setTenantNote(''); setAdminNote('');
    setTenantVisible(true);
    setPaymentMethod('e_transfer');
    setRelatedChargeId(''); setReceiptFile(null); setReceiptTenantVisible(false);
    setStatus(isCharge ? 'unpaid' : isPayment ? 'recorded' : 'posted');
  };

  // Re-init form when action changes
  useMemoInit(action, reset);

  if (!action) return null;

  const title = TYPE_LABEL[action === 'payment' ? 'payment' : action] ?? 'Ledger entry';

  const submit = () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) { toast.error('Enter a valid amount'); return; }
    const payload: Partial<PmLedgerEntry> = {
      type: action === 'payment' ? 'payment' : action,
      amount: amt,
      entry_date: entryDate || todayISO(),
      due_date: dueDate || null,
      period_start: periodStart || null,
      period_end: periodEnd || null,
      description: description || null,
      reference: reference || null,
      tenant_note: tenantNote || null,
      admin_note: adminNote || null,
      tenant_visible: tenantVisible,
      status: status || (isCharge ? 'unpaid' : isPayment ? 'recorded' : 'posted'),
    };
    if (isPayment) {
      payload.payment_method = paymentMethod;
      payload.paid_date = entryDate || todayISO();
      if (relatedChargeId) payload.related_charge_id = relatedChargeId;
      if (receiptFile) payload.receipt_tenant_visible = receiptTenantVisible;
    }
    onSubmit(payload, receiptFile);
  };

  return (
    <Dialog open={!!action} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Amount ($)</Label>
              <Input type="number" step="0.01" value={amount}
                onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <Label>{isPayment ? 'Payment date' : 'Entry date'}</Label>
              <Input type="date" value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)} />
            </div>
          </div>

          {isRent && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Due date</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <div>
                <Label>Period start</Label>
                <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
              </div>
              <div>
                <Label>Period end</Label>
                <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
              </div>
            </div>
          )}

          {isCharge && !isRent && (
            <div>
              <Label>Due date (optional)</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          )}

          {isPayment && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Payment method</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map(m => (
                        <SelectItem key={m} value={m}>{METHOD_LABEL[m]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['recorded', 'pending', 'cleared', 'reversed', 'nsf'].map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Applies to charge (optional)</Label>
                <Select value={relatedChargeId || 'none'}
                  onValueChange={(v) => setRelatedChargeId(v === 'none' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Not linked" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Not linked —</SelectItem>
                    {outstandingCharges.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {TYPE_LABEL[c.type]} · ${Number(c.amount).toFixed(2)}
                        {c.due_date ? ` · due ${c.due_date}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Reference / transaction #</Label>
                <Input value={reference} onChange={(e) => setReference(e.target.value)}
                  placeholder="e-transfer confirmation, cheque #, etc." />
              </div>
              <div>
                <Label>Receipt (optional)</Label>
                <Input type="file" accept=".pdf,image/*"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)} />
                {receiptFile && (
                  <label className="flex items-center gap-2 mt-2 text-xs">
                    <Switch checked={receiptTenantVisible}
                      onCheckedChange={setReceiptTenantVisible} />
                    Also share this receipt with the tenant
                  </label>
                )}
              </div>
            </>
          )}

          <div>
            <Label>Description / memo</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder={isRent ? 'e.g. July 2026 rent' : ''} />
          </div>

          <div>
            <Label>Tenant-visible note (optional)</Label>
            <Textarea rows={2} value={tenantNote}
              onChange={(e) => setTenantNote(e.target.value)}
              placeholder="Shown to the tenant" />
          </div>

          <div>
            <Label>Admin-only note (optional)</Label>
            <Textarea rows={2} value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="Internal only, never shown to tenant" />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Switch checked={tenantVisible} onCheckedChange={setTenantVisible} />
            Show this entry to the tenant in their portal
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={submit} disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Simple init-on-change helper (avoids full useEffect setup for a small dialog). */
function useMemoInit(key: unknown, fn: () => void) {
  useMemo(() => { fn(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [key]);
}

function computeNextDueDate(dueDay: number): string {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
  const targetMonth = d > dueDay ? m + 1 : m;
  const dt = new Date(y, targetMonth, Math.min(dueDay || 1, 28));
  return dt.toISOString().slice(0, 10);
}
