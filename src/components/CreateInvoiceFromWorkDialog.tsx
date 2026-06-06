import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Receipt, Loader2, AlertTriangle, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { format, addDays } from 'date-fns';
import { z } from 'zod';

type SourceType = 'quote' | 'job' | 'visit';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceType: SourceType;
  sourceRecord: any;
  lineItems?: any[];
  customerId: string;
  propertyId?: string | null;
  jobId?: string | null;
  visitId?: string | null;
  quoteId?: string | null;
  requestId?: string | null;
  billingMode?: string | null;
}

const createInvoiceDraftSchema = z.object({
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid issue date'),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid due date'),
  taxRate: z.string()
    .trim()
    .min(1, 'Tax rate is required')
    .refine((value) => !Number.isNaN(Number(value)), 'Enter a valid tax rate')
    .transform((value) => Number(value))
    .refine((value) => value >= 0, 'Tax rate must be 0 or greater')
    .refine((value) => value <= 1, 'Tax rate cannot be greater than 1.00'),
  customerMemo: z.string().max(2000, 'Customer memo must be 2000 characters or less').transform((value) => value.trim()),
  internalNotes: z.string().max(2000, 'Internal notes must be 2000 characters or less').transform((value) => value.trim()),
}).refine((data) => data.dueDate >= data.issueDate, {
  path: ['dueDate'],
  message: 'Due date must be on or after the issue date',
});

const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function CreateInvoiceFromWorkDialog({
  open, onOpenChange, sourceType, sourceRecord, lineItems = [],
  customerId, propertyId, jobId, visitId, quoteId, requestId, billingMode,
}: Props) {
  const { toast } = useToast();
  const nav = useNavigate();
  const qc = useQueryClient();

  const today = format(new Date(), 'yyyy-MM-dd');
  const defaultDue = format(addDays(new Date(), 30), 'yyyy-MM-dd');

  const [issueDate, setIssueDate] = useState(today);
  const [dueDate, setDueDate] = useState(defaultDue);
  const [taxRate, setTaxRate] = useState('0.05');
  const [taxIncluded, setTaxIncluded] = useState(sourceType === 'job');
  const [customerMemo, setCustomerMemo] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [duplicate, setDuplicate] = useState<any>(null);
  const [checkingDupe, setCheckingDupe] = useState(false);

  const normalizedLineItems = useMemo(() => {
    return lineItems
      .filter((li: any) => li?.item_name)
      .map((li: any, idx: number) => {
        const quantity = Number(li.quantity) || 0;
        const unitPrice = Number(li.unit_price) || 0;
        const parsedLineTotal = Number(li.line_total);

        return {
          ...li,
          quantity,
          unit_price: unitPrice,
          line_total: Number.isFinite(parsedLineTotal) ? parsedLineTotal : quantity * unitPrice,
          sort_order: Number.isInteger(Number(li.sort_order)) ? Number(li.sort_order) : idx,
        };
      });
  }, [lineItems]);

  const effectiveBillingMode = billingMode || (sourceType === 'quote' ? 'quoted_fixed' : sourceType === 'visit' ? 'per_visit' : 'manual');
  const billingModeBlocked = (() => {
    if (effectiveBillingMode === 'quoted_fixed' && sourceType === 'visit') {
      return 'This job uses quoted fixed-price billing. Create the invoice from the job or quote instead, not individual visits.';
    }
    if (effectiveBillingMode === 'per_visit' && sourceType === 'job') {
      return 'This job uses per-visit billing. Create invoices from individual completed visits instead.';
    }
    return null;
  })();

  useEffect(() => {
    if (!open) return;
    setDuplicate(null);
    setCheckingDupe(true);

    const check = async () => {
      let query = supabase.from('invoices').select('id, invoice_number, status, total');
      if (jobId) query = query.eq('job_id', jobId);
      if (visitId) query = query.eq('visit_id', visitId as any);
      if (quoteId) query = query.eq('quote_id', quoteId as any);

      if (!jobId && !visitId && !quoteId) {
        setCheckingDupe(false);
        return;
      }

      const { data } = await query;
      if (data && data.length > 0) {
        setDuplicate(data[0]);
      }
      setCheckingDupe(false);
    };

    check();
  }, [open, jobId, visitId, quoteId]);

  useEffect(() => {
    if (open && sourceRecord) {
      setTaxIncluded(sourceType === 'job');
      const label = sourceType === 'quote' ? sourceRecord.quote_number
        : sourceType === 'job' ? sourceRecord.job_number
        : sourceRecord.visit_number;
      setInternalNotes(`From ${sourceType} ${label}`);
      setCustomerMemo(sourceRecord.job_title || sourceRecord.service_summary || sourceRecord.scope_of_work || '');
    }
  }, [open, sourceRecord, sourceType]);

  const handleCreate = async () => {
    if (!customerId) {
      toast({ title: 'Customer required', variant: 'destructive' });
      return;
    }

    const parsed = createInvoiceDraftSchema.safeParse({
      issueDate,
      dueDate,
      taxRate,
      customerMemo,
      internalNotes,
    });

    if (!parsed.success) {
      toast({
        title: 'Check invoice details',
        description: parsed.error.issues[0]?.message || 'Please review the invoice form.',
        variant: 'destructive',
      });
      return;
    }

    const {
      issueDate: validatedIssueDate,
      dueDate: validatedDueDate,
      taxRate: validatedTaxRate,
      customerMemo: validatedCustomerMemo,
      internalNotes: validatedInternalNotes,
    } = parsed.data;

    setSaving(true);
    try {
      const { data: invoice, error } = await supabase.from('invoices').insert({
        invoice_number: '',
        customer_id: customerId,
        property_id: propertyId || null,
        job_id: jobId || null,
        visit_id: visitId || null,
        quote_id: quoteId || null,
        issue_date: validatedIssueDate,
        due_date: validatedDueDate,
        tax_rate: validatedTaxRate,
        gst_rate: Math.abs(validatedTaxRate - 0.11) < 0.0001 ? 0.05 : (Math.abs(validatedTaxRate - 0.05) < 0.0001 ? 0.05 : null),
        pst_rate: Math.abs(validatedTaxRate - 0.11) < 0.0001 ? 0.06 : (Math.abs(validatedTaxRate - 0.06) < 0.0001 ? 0.06 : null),
        status: 'Draft' as any,
        customer_memo: validatedCustomerMemo || null,
        internal_notes: validatedInternalNotes || null,
        billing_mode: effectiveBillingMode,
      } as any).select().single();
      if (error) throw error;

      if (normalizedLineItems.length > 0) {
        const items = normalizedLineItems.map((li: any, idx: number) => {
          const grossLineTotal = Number(li.line_total || li.quantity * li.unit_price || 0);
          const grossUnitPrice = li.quantity > 0 ? grossLineTotal / li.quantity : li.unit_price;
          const unitPrice = taxIncluded && validatedTaxRate > 0 ? money(grossUnitPrice / (1 + validatedTaxRate)) : money(grossUnitPrice);
          return ({
            invoice_id: invoice.id,
            item_name: li.item_name,
            description: li.description || null,
            quantity: li.quantity,
            unit_price: unitPrice,
            line_total: money(li.quantity * unitPrice),
            sort_order: Number.isInteger(Number(li.sort_order)) ? Number(li.sort_order) : idx,
          });
        });
        const { error: itemsError } = await supabase.from('invoice_line_items').insert(items as any);
        if (itemsError) throw itemsError;
      }

      if (jobId && (sourceRecord?.status === 'Completed' || sourceRecord?.status === 'Closed')) {
        const { error: jobUpdateError } = await supabase.from('jobs').update({ billing_status: 'invoiced' } as any).eq('id', jobId);
        if (jobUpdateError) throw jobUpdateError;
      }
      if (visitId) {
        const { error: visitUpdateError } = await supabase.from('visits').update({ billing_status: 'invoiced' } as any).eq('id', visitId);
        if (visitUpdateError) throw visitUpdateError;
      }

      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['jobs'] });
      qc.invalidateQueries({ queryKey: ['visits'] });
      qc.invalidateQueries({ queryKey: ['dashboard_invoices'] });

      toast({ title: 'Draft invoice created', description: invoice.invoice_number });
      onOpenChange(false);
      nav(`/invoices/${invoice.id}`);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const parsedTaxRate = Number(taxRate || '0');
  const displayLineItems = normalizedLineItems.map((li: any) => {
    const grossLineTotal = Number(li.line_total || li.quantity * li.unit_price || 0);
    return taxIncluded && Number.isFinite(parsedTaxRate) && parsedTaxRate > 0 ? money(grossLineTotal / (1 + parsedTaxRate)) : grossLineTotal;
  });
  const subtotal = displayLineItems.reduce((sum, lineTotal) => sum + Number(lineTotal || 0), 0);
  const tax = subtotal * (Number.isFinite(parsedTaxRate) ? parsedTaxRate : 0);
  const total = subtotal + tax;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Create Invoice Draft
          </DialogTitle>
          <DialogDescription>
            Generate a draft invoice from {sourceType === 'quote' ? 'approved quote' : sourceType === 'job' ? 'completed job' : 'completed visit'}
          </DialogDescription>
        </DialogHeader>

        {billingModeBlocked && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">{billingModeBlocked}</AlertDescription>
          </Alert>
        )}

        {duplicate && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              An invoice ({duplicate.invoice_number} — {duplicate.status}) already exists for this {sourceType}.
              Creating another may result in duplicate billing.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <Card><CardContent className="p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Source</span>
              <Badge variant="outline">{sourceType === 'quote' ? sourceRecord?.quote_number : sourceType === 'job' ? sourceRecord?.job_number : sourceRecord?.visit_number}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Billing Mode</span>
              <Badge variant="secondary" className="text-[10px]">{effectiveBillingMode}</Badge>
            </div>
            {normalizedLineItems.length > 0 && (
              <>
                <div className="flex justify-between"><span className="text-muted-foreground">Line Items</span><span>{normalizedLineItems.length}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-mono">${subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Tax ({((Number.isFinite(parsedTaxRate) ? parsedTaxRate : 0) * 100).toFixed(0)}%)</span><span className="font-mono">${tax.toFixed(2)}</span></div>
                <div className="flex justify-between font-medium"><span>Total</span><span className="font-mono">${total.toFixed(2)}</span></div>
              </>
            )}
          </CardContent></Card>

          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Issue Date</Label><Input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} /></div>
            <div><Label className="text-xs">Due Date</Label><Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></div>
          </div>
          <div>
            <Label className="text-xs">Tax Rate</Label>
            <Input type="number" inputMode="decimal" min="0" max="1" step="0.01" value={taxRate} onChange={e => setTaxRate(e.target.value)} />
          </div>
          {normalizedLineItems.length > 0 && (
            <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-3">
              <Checkbox id="tax_included" checked={taxIncluded} onCheckedChange={(checked) => setTaxIncluded(checked === true)} />
              <Label htmlFor="tax_included" className="text-xs cursor-pointer">Line item prices include tax</Label>
            </div>
          )}
          <div><Label className="text-xs">Customer Memo</Label><Textarea value={customerMemo} onChange={e => setCustomerMemo(e.target.value)} rows={2} /></div>
          <div><Label className="text-xs">Internal Notes</Label><Textarea value={internalNotes} onChange={e => setInternalNotes(e.target.value)} rows={2} /></div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={saving || checkingDupe || !!billingModeBlocked} className="gap-1.5">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />}
            Create Draft Invoice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
