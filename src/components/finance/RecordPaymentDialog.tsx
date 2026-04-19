import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { CalendarIcon, CheckCircle2, Info, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useFinanceAccounts } from '@/hooks/useFinanceAccounts';
import { useRecordPayment } from '@/hooks/useFinancePayments';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  /** When opened from a specific invoice, pre-select & default-fill it. */
  initialInvoiceId?: string;
  /** Optional callback after successful save. */
  onSuccess?: () => void;
}

const fmt = (n: number) =>
  '$' + (Number.isFinite(n) ? n : 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const METHODS = [
  { value: 'cheque', label: 'Check' },
  { value: 'cash', label: 'Cash' },
  { value: 'e_transfer', label: 'E-Transfer' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'ach', label: 'ACH / Bank Transfer' },
  { value: 'wire', label: 'Wire Transfer' },
  { value: 'other', label: 'Other' },
];

export function RecordPaymentDialog({ open, onOpenChange, customerId, initialInvoiceId, onSuccess }: Props) {
  const qc = useQueryClient();
  const recordPayment = useRecordPayment();
  const { data: accounts = [] } = useFinanceAccounts();

  // Fetch customer info (header + auto details)
  const { data: customer } = useQuery({
    queryKey: ['rpd_customer', customerId],
    queryFn: async () => {
      if (!customerId) return null;
      const { data } = await supabase
        .from('customers')
        .select('id, first_name, last_name, company_name, email')
        .eq('id', customerId)
        .single();
      return data;
    },
    enabled: !!customerId && open,
  });

  // Fetch all outstanding invoices for this customer
  const { data: outstanding = [], isLoading: loadingInv } = useQuery({
    queryKey: ['rpd_outstanding', customerId],
    queryFn: async () => {
      if (!customerId) return [];
      const { data } = await supabase
        .from('invoices')
        .select('id, invoice_number, status, total, amount_paid, balance_due, issue_date, due_date, properties(property_name, address_line_1, city)')
        .eq('customer_id', customerId)
        .gt('balance_due', 0)
        .not('status', 'in', '("Draft","Voided")')
        .order('due_date', { ascending: true });
      return data || [];
    },
    enabled: !!customerId && open,
  });

  // Form state
  const [method, setMethod] = useState<string>('cheque');
  const [reference, setReference] = useState('');
  const [transactionDate, setTransactionDate] = useState<Date>(new Date());
  const [dateOpen, setDateOpen] = useState(false);
  const [details, setDetails] = useState('');
  const [accountId, setAccountId] = useState<string>('');
  const [allocations, setAllocations] = useState<Record<string, string>>({}); // invoice_id -> amount string
  const [submitting, setSubmitting] = useState(false);

  // Reset on open
  useEffect(() => {
    if (!open) return;
    setMethod('cheque');
    setReference('');
    setTransactionDate(new Date());
    setDetails('');
    setAccountId('');
    setAllocations({});
    setSubmitting(false);
  }, [open]);

  // Auto-select initial invoice once data loads
  useEffect(() => {
    if (!open || !initialInvoiceId || loadingInv) return;
    const inv = outstanding.find((i: any) => i.id === initialInvoiceId);
    if (inv && !(initialInvoiceId in allocations)) {
      setAllocations({ [initialInvoiceId]: Number(inv.balance_due).toFixed(2) });
      setDetails(`Payment applied to Invoice #${inv.invoice_number}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialInvoiceId, loadingInv, outstanding.length]);

  const accountBalance = useMemo(
    () => outstanding.reduce((s: number, i: any) => s + Number(i.balance_due || 0), 0),
    [outstanding],
  );

  const totalEntered = useMemo(
    () => Object.values(allocations).reduce((s, v) => s + (parseFloat(v) || 0), 0),
    [allocations],
  );

  const selectedCount = Object.keys(allocations).length;

  const toggleInvoice = (inv: any) => {
    setAllocations(prev => {
      const next = { ...prev };
      if (inv.id in next) {
        delete next[inv.id];
      } else {
        next[inv.id] = Number(inv.balance_due).toFixed(2);
      }
      return next;
    });
  };

  const setAmount = (id: string, value: string) => {
    setAllocations(prev => ({ ...prev, [id]: value }));
  };

  const selectAll = () => {
    const next: Record<string, string> = {};
    outstanding.forEach((inv: any) => {
      next[inv.id] = Number(inv.balance_due).toFixed(2);
    });
    setAllocations(next);
  };

  // Auto-update details preview when allocations change (only if user hasn't customized heavily)
  useEffect(() => {
    if (!open) return;
    const ids = Object.keys(allocations);
    if (ids.length === 0) return;
    const numbers = ids
      .map(id => outstanding.find((i: any) => i.id === id)?.invoice_number)
      .filter(Boolean);
    if (numbers.length === 0) return;
    // Only auto-fill if details is empty or matches our generated pattern
    const looksAuto = !details || /^Payment applied to Invoice #/.test(details);
    if (looksAuto) {
      setDetails(
        numbers.length === 1
          ? `Payment applied to Invoice #${numbers[0]}`
          : `Payment applied to Invoices #${numbers.join(', #')}`,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allocations, open]);

  const customerName = customer
    ? customer.company_name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
    : '';

  const handleSubmit = async () => {
    const items = Object.entries(allocations)
      .map(([id, val]) => ({ id, amount: parseFloat(val) }))
      .filter(x => Number.isFinite(x.amount) && x.amount > 0);

    if (items.length === 0) {
      toast.error('Select at least one invoice and enter an amount');
      return;
    }

    // Validate not exceeding balance
    for (const item of items) {
      const inv = outstanding.find((i: any) => i.id === item.id);
      if (!inv) continue;
      if (item.amount > Number(inv.balance_due) + 0.01) {
        toast.error(`Payment for ${inv.invoice_number} exceeds balance due (${fmt(Number(inv.balance_due))})`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const payDate = format(transactionDate, 'yyyy-MM-dd');
      // Create one finance_payments row per invoice (correct ledger attribution)
      for (const item of items) {
        await recordPayment.mutateAsync({
          invoice_id: item.id,
          customer_id: customerId,
          payment_type: 'invoice_payment',
          amount: Math.round(item.amount * 100) / 100,
          payment_method: method,
          payment_date: payDate,
          account_id: accountId || null,
          reference_number: reference || null,
          notes: details || null,
        });

        // Trigger payment_received notifications (best-effort, non-blocking)
        try {
          const inv = outstanding.find((i: any) => i.id === item.id);
          await supabase.functions.invoke('send-notification', {
            body: {
              event: 'payment_received',
              customer_id: customerId,
              record_type: 'invoice',
              record_id: item.id,
              channels: ['in_app'],
              audience: 'admin',
              variables: {
                customer_name: customerName,
                invoice_number: inv?.invoice_number || '',
                amount_paid: item.amount.toFixed(2),
              },
            },
          });
        } catch { /* non-critical */ }
      }

      toast.success(`${fmt(totalEntered)} recorded across ${items.length} invoice${items.length > 1 ? 's' : ''}`);
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['invoice'] });
      qc.invalidateQueries({ queryKey: ['rpd_outstanding', customerId] });
      qc.invalidateQueries({ queryKey: ['cbl_invoices', customerId] });
      qc.invalidateQueries({ queryKey: ['cbl_payments', customerId] });
      qc.invalidateQueries({ queryKey: ['finance_payments_full'] });
      onOpenChange(false);
      onSuccess?.();
    } catch (e: any) {
      toast.error(e.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Record Payment
            {customerName && <span className="text-muted-foreground font-normal">— {customerName}</span>}
          </DialogTitle>
          <DialogDescription>
            Choose payment details and apply to one or more outstanding invoices.
          </DialogDescription>
        </DialogHeader>

        {/* Top form grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Payment method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                {METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">
              {method === 'cheque' ? 'Check #' : method === 'credit_card' ? 'Auth / Last 4' : 'Reference #'}
            </Label>
            <Input
              value={reference}
              onChange={e => setReference(e.target.value)}
              placeholder={method === 'cheque' ? 'e.g. 3168' : 'Confirmation, last 4, etc.'}
              className="h-10"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Transaction date</Label>
            <Popover open={dateOpen} onOpenChange={setDateOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-10 w-full justify-start font-normal">
                  <CalendarIcon className="h-3.5 w-3.5 mr-2" />
                  {format(transactionDate, 'MMM d, yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={transactionDate}
                  onSelect={d => { if (d) { setTransactionDate(d); setDateOpen(false); } }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Deposit account (optional)</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="h-10"><SelectValue placeholder="Select account..." /></SelectTrigger>
              <SelectContent>
                {accounts.filter((a: any) => a.is_active).map((a: any) => (
                  <SelectItem key={a.id} value={a.id}>{a.account_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs">Details</Label>
            <Textarea
              rows={2}
              value={details}
              onChange={e => setDetails(e.target.value)}
              placeholder="Payment applied to Invoice #..."
              className="text-sm"
            />
          </div>
        </div>

        {/* Outstanding invoices section */}
        <div className="border-t pt-4 mt-2">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <h3 className="text-base font-bold">Outstanding invoices</h3>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Info className="h-3 w-3" />
                Select the invoices you're paying and review the amounts before continuing.
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Account balance</p>
              <p className="text-2xl font-bold tabular-nums">{fmt(accountBalance)}</p>
            </div>
          </div>

          {loadingInv ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : outstanding.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground border rounded-md">
              No outstanding invoices for this customer.
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-2 text-xs">
                <span className="font-medium">{selectedCount} selected</span>
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-primary hover:underline font-medium"
                >
                  Select all
                </button>
              </div>

              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 border-b">
                    <tr className="text-xs">
                      <th className="w-8 px-3 py-2"></th>
                      <th className="text-left px-2 py-2 font-medium">Invoice #</th>
                      <th className="text-left px-2 py-2 font-medium">Due Date</th>
                      <th className="text-left px-2 py-2 font-medium hidden sm:table-cell">Property</th>
                      <th className="text-right px-2 py-2 font-medium">Total</th>
                      <th className="text-right px-2 py-2 font-medium">Balance</th>
                      <th className="text-right px-2 py-2 font-medium w-32">Enter Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {outstanding.map((inv: any) => {
                      const checked = inv.id in allocations;
                      const overdue = inv.due_date && new Date(inv.due_date) < new Date() && Number(inv.balance_due) > 0;
                      return (
                        <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/20">
                          <td className="px-3 py-2">
                            <Checkbox checked={checked} onCheckedChange={() => toggleInvoice(inv)} />
                          </td>
                          <td className="px-2 py-2 font-medium text-primary">#{inv.invoice_number}</td>
                          <td className="px-2 py-2">
                            <div className="flex flex-col gap-0.5">
                              {overdue ? (
                                <Badge variant="destructive" className="text-[10px] h-4 px-1.5 w-fit">Past due</Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px] h-4 px-1.5 w-fit">Awaiting payment</Badge>
                              )}
                              <span className="text-xs text-muted-foreground">
                                {inv.due_date ? format(new Date(inv.due_date), 'MMM d, yyyy') : '—'}
                              </span>
                            </div>
                          </td>
                          <td className="px-2 py-2 text-xs text-muted-foreground hidden sm:table-cell">
                            {inv.properties?.address_line_1 || inv.properties?.property_name || '—'}
                          </td>
                          <td className="px-2 py-2 text-right font-mono">{fmt(Number(inv.total || 0))}</td>
                          <td className="px-2 py-2 text-right font-mono font-semibold">{fmt(Number(inv.balance_due || 0))}</td>
                          <td className="px-2 py-2 text-right">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max={Number(inv.balance_due)}
                              value={allocations[inv.id] ?? ''}
                              onChange={e => setAmount(inv.id, e.target.value)}
                              onFocus={() => { if (!(inv.id in allocations)) toggleInvoice(inv); }}
                              disabled={!checked}
                              placeholder={fmt(Number(inv.balance_due))}
                              className={cn("h-9 text-right font-mono", !checked && "bg-muted/30")}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {selectedCount > 0 && (
                    <tfoot className="bg-muted/30 border-t font-semibold">
                      <tr>
                        <td colSpan={5} className="px-3 py-2 text-right text-xs uppercase tracking-wide text-muted-foreground">Total payment</td>
                        <td className="px-2 py-2"></td>
                        <td className="px-2 py-2 text-right font-mono">{fmt(totalEntered)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2 pt-2 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting || selectedCount === 0 || totalEntered <= 0} className="gap-1.5">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Save {totalEntered > 0 ? fmt(totalEntered) : 'Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default RecordPaymentDialog;
