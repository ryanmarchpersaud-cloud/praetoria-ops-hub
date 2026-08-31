import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Copy, Loader2 } from 'lucide-react';
import { addDays, addMonths, differenceInCalendarDays, format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface Props {
  invoice: any;
  lineItems: any[];
  trigger?: React.ReactNode;
}

function safeParse(d: string | null | undefined) {
  if (!d) return new Date();
  try { return parseISO(d); } catch { return new Date(); }
}

export function DuplicateInvoiceDialog({ invoice, lineItems, trigger }: Props) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const origIssue = safeParse(invoice?.issue_date);
  const origDue = safeParse(invoice?.due_date);
  const termDays = Math.max(0, differenceInCalendarDays(origDue, origIssue));

  // Default the new invoice to the next month of the original period
  const defaultIssue = addMonths(origIssue, 1);
  const [issueDate, setIssueDate] = useState(format(defaultIssue, 'yyyy-MM-dd'));
  const [dueDate, setDueDate] = useState(format(addDays(defaultIssue, termDays), 'yyyy-MM-dd'));
  const [rollServiceDates, setRollServiceDates] = useState(true);
  const [copyMemo, setCopyMemo] = useState(true);

  const onIssueChange = (v: string) => {
    setIssueDate(v);
    if (v) {
      try { setDueDate(format(addDays(parseISO(v), termDays), 'yyyy-MM-dd')); } catch { /* ignore */ }
    }
  };

  const handleDuplicate = async () => {
    setSaving(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const payload: any = {
        invoice_number: '',
        customer_id: invoice.customer_id,
        property_id: invoice.property_id,
        job_id: invoice.job_id,
        quote_id: invoice.quote_id,
        visit_id: null,
        status: 'Draft',
        issue_date: issueDate,
        due_date: dueDate,
        subtotal: invoice.subtotal,
        tax_rate: invoice.tax_rate,
        tax: invoice.tax,
        gst_rate: invoice.gst_rate,
        pst_rate: invoice.pst_rate,
        gst_amount: invoice.gst_amount,
        pst_amount: invoice.pst_amount,
        tip: invoice.tip,
        total: invoice.total,
        amount_paid: 0,
        billing_mode: invoice.billing_mode,
        invoice_heading: invoice.invoice_heading,
        customer_memo: copyMemo ? invoice.customer_memo : null,
        internal_notes: invoice.internal_notes,
        created_by: userRes?.user?.id ?? null,
      };

      const { data: created, error } = await supabase.from('invoices').insert(payload).select().single();
      if (error) throw error;

      if (lineItems.length > 0) {
        const monthShift = differenceInCalendarDays(parseISO(issueDate), origIssue);
        const items = lineItems.map((li, idx) => ({
          invoice_id: created.id,
          visit_id: null,
          item_name: li.item_name,
          description: li.description,
          quantity: li.quantity,
          unit_price: li.unit_price,
          line_total: li.line_total,
          sort_order: li.sort_order ?? idx,
          service_date: rollServiceDates && li.service_date
            ? format(addDays(parseISO(li.service_date), monthShift), 'yyyy-MM-dd')
            : li.service_date,
          service_time: li.service_time,
        }));
        const { error: liError } = await supabase.from('invoice_line_items').insert(items);
        if (liError) throw liError;
      }

      qc.invalidateQueries({ queryKey: ['invoices'] });
      toast.success(`Draft ${created.invoice_number || 'invoice'} created from ${invoice.invoice_number}`);
      setOpen(false);
      navigate(`/invoices/${created.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to duplicate invoice');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <span onClick={() => setOpen(true)}>
        {trigger ?? (
          <Button size="sm" variant="outline" title="Create a new draft invoice with the same line items">
            <Copy className="h-3.5 w-3.5 mr-1.5" /> Duplicate Invoice
          </Button>
        )}
      </span>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicate {invoice.invoice_number}</DialogTitle>
            <DialogDescription>
              Creates a new <strong>Draft</strong> invoice for the same customer, property and job with the same
              line items and tax settings. Payments are not copied.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Issue date</Label>
              <Input type="date" value={issueDate} onChange={e => onIssueChange(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Due date</Label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={rollServiceDates} onCheckedChange={v => setRollServiceDates(!!v)} />
              <span>Shift line-item service dates to the new period</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={copyMemo} onCheckedChange={v => setCopyMemo(!!v)} />
              <span>Copy the customer memo</span>
            </label>
          </div>

          <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
            {lineItems.length} line item{lineItems.length === 1 ? '' : 's'} · Total ${Number(invoice.total || 0).toFixed(2)}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleDuplicate} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Copy className="h-4 w-4 mr-2" />}
              Create Draft Copy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default DuplicateInvoiceDialog;
