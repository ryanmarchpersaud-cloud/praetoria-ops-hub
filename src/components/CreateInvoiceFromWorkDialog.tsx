import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Receipt, Loader2, AlertTriangle, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { format, addDays } from 'date-fns';

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
  const [taxRate, setTaxRate] = useState('0.13');
  const [customerMemo, setCustomerMemo] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [duplicate, setDuplicate] = useState<any>(null);
  const [checkingDupe, setCheckingDupe] = useState(false);

  // Billing mode validation
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

  // Check for duplicates
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

  // Init notes
  useEffect(() => {
    if (open && sourceRecord) {
      const label = sourceType === 'quote' ? sourceRecord.quote_number
        : sourceType === 'job' ? sourceRecord.job_number
        : sourceRecord.visit_number;
      setInternalNotes(`From ${sourceType} ${label}`);
      setCustomerMemo(sourceRecord.job_title || sourceRecord.service_summary || sourceRecord.scope_of_work || '');
    }
  }, [open, sourceRecord, sourceType]);

  const handleCreate = async () => {
    if (!customerId) { toast({ title: 'Customer required', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const { data: invoice, error } = await supabase.from('invoices').insert({
        invoice_number: '',
        customer_id: customerId,
        property_id: propertyId || null,
        job_id: jobId || null,
        visit_id: visitId || null,
        quote_id: quoteId || null,
        issue_date: issueDate,
        due_date: dueDate,
        tax_rate: parseFloat(taxRate),
        status: 'Draft' as any,
        customer_memo: customerMemo || null,
        internal_notes: internalNotes || null,
        billing_mode: effectiveBillingMode,
      } as any).select().single();
      if (error) throw error;

      // Copy line items if available
      if (lineItems.length > 0) {
        const items = lineItems.map((li: any, idx: number) => ({
          invoice_id: invoice.id,
          item_name: li.item_name,
          description: li.description || null,
          quantity: Number(li.quantity),
          unit_price: Number(li.unit_price),
          sort_order: idx,
        }));
        await supabase.from('invoice_line_items').insert(items as any);
      }

      // Update billing_status on source
      if (jobId) {
        await supabase.from('jobs').update({ billing_status: 'invoiced' } as any).eq('id', jobId);
      }
      if (visitId) {
        await supabase.from('visits').update({ billing_status: 'invoiced' } as any).eq('id', visitId);
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

  const subtotal = lineItems.reduce((s, li) => s + Number(li.line_total || 0), 0);
  const tax = subtotal * parseFloat(taxRate || '0');
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
            {lineItems.length > 0 && (
              <>
                <div className="flex justify-between"><span className="text-muted-foreground">Line Items</span><span>{lineItems.length}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-mono">${subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Tax ({(parseFloat(taxRate) * 100).toFixed(0)}%)</span><span className="font-mono">${tax.toFixed(2)}</span></div>
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
            <Input value={taxRate} onChange={e => setTaxRate(e.target.value)} />
          </div>
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
