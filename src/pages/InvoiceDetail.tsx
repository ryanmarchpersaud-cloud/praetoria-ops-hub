import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useActionPermissions } from '@/hooks/useActionPermissions';
import { supabase } from '@/integrations/supabase/client';
import { useInvoice, useInvoiceLineItems, useUpdateInvoice } from '@/hooks/useInvoices';
import { StatusBadge } from '@/components/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ArrowLeft, Send, RotateCcw, CheckCircle, Ban, AlertCircle, CreditCard, Printer, Save, Loader2,
  LinkIcon, Briefcase, FileText, Receipt, DollarSign, Eye, EyeOff, CalendarDays, Tag, Undo2, Mail,
  Paperclip, X, Upload, FileCheck, Pencil
} from 'lucide-react';
import { RefundDialog } from '@/components/RefundDialog';
import { RecordPaymentDialog } from '@/components/finance/RecordPaymentDialog';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useBillingProfile } from '@/hooks/useInvoices';
import InvoiceLineItemEditor from '@/components/InvoiceLineItemEditor';
import { callEdgeFunction } from '@/lib/edgeFunctionClient';
import { AddToJobCostTrackerButton } from '@/components/dashboard/AddToJobCostTrackerButton';

function getStatusAfterTotalChange(invoice: any, nextTotal: number) {
  if (['Draft', 'Voided', 'Refunded'].includes(invoice.status)) return invoice.status;
  const amountPaid = Number(invoice.amount_paid || 0);
  if (amountPaid <= 0) return invoice.status;
  return amountPaid + 0.005 >= nextTotal ? 'Paid' : 'Partially Paid';
}

function formatRate(rate: number) {
  const pct = rate * 100;
  return pct % 1 === 0 ? pct.toFixed(0) : pct.toFixed(2);
}

function TaxRow({ invoice, canEdit }: { invoice: any; canEdit: boolean }) {
  const subtotal = Number(invoice.subtotal || 0);
  const gstRate = invoice.gst_rate == null ? null : Number(invoice.gst_rate);
  const pstRate = invoice.pst_rate == null ? null : Number(invoice.pst_rate);
  const combinedRate = Number(invoice.tax_rate || 0);
  const hasSplit = gstRate != null || pstRate != null;
  // When no split is recorded, fall back to combined rate as GST so we never show "GST 11%"
  const effGst = gstRate != null ? gstRate : (pstRate == null ? combinedRate : 0);
  const effPst = pstRate != null ? pstRate : 0;

  const gstAmount = invoice.gst_amount != null
    ? Number(invoice.gst_amount)
    : Math.round(subtotal * effGst * 100) / 100;
  const pstAmount = invoice.pst_amount != null
    ? Number(invoice.pst_amount)
    : Math.round(subtotal * effPst * 100) / 100;
  const totalTax = Number(invoice.tax || 0);

  const [editing, setEditing] = useState(false);
  const [gstStr, setGstStr] = useState(((gstRate ?? 0.05) * 100).toFixed(2));
  const [pstStr, setPstStr] = useState(((pstRate ?? 0.06) * 100).toFixed(2));
  const [exempt, setExempt] = useState(combinedRate === 0 && !hasSplit);
  const updateInvoice = useUpdateInvoice();

  const save = async () => {
    let nextGst: number | null = Math.max(0, Number(gstStr) || 0) / 100;
    let nextPst: number | null = Math.max(0, Number(pstStr) || 0) / 100;
    if (exempt) { nextGst = 0; nextPst = 0; }
    if (nextGst === 0) nextGst = null;
    if (nextPst === 0) nextPst = null;
    const effective = (nextGst || 0) + (nextPst || 0);
    const tip = Number(invoice.tip || 0);
    const nextTax = Math.round(subtotal * effective * 100) / 100;
    const nextTotal = Math.round((subtotal + nextTax + tip) * 100) / 100;
    await updateInvoice.mutateAsync({
      id: invoice.id,
      gst_rate: nextGst,
      pst_rate: nextPst,
      tax_rate: effective,
      status: getStatusAfterTotalChange(invoice, nextTotal),
    } as any);
    toast.success('Tax updated');
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="space-y-2 border rounded-md p-2 bg-muted/20">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium">Edit tax</span>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <Checkbox checked={exempt} onCheckedChange={(v) => setExempt(!!v)} />
            <span>Tax exempt</span>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px]">GST %</Label>
            <Input type="number" step="0.01" min="0" value={gstStr} disabled={exempt}
              onChange={e => setGstStr(e.target.value)} className="h-8 text-right tabular-nums" />
          </div>
          <div>
            <Label className="text-[10px]">SK PST %</Label>
            <Input type="number" step="0.01" min="0" value={pstStr} disabled={exempt}
              onChange={e => setPstStr(e.target.value)} className="h-8 text-right tabular-nums" />
          </div>
        </div>
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditing(false)}>Cancel</Button>
          <Button size="sm" className="h-7 px-2" onClick={save} disabled={updateInvoice.isPending}>Save</Button>
        </div>
      </div>
    );
  }

  const showGst = effGst > 0;
  const showPst = effPst > 0;

  return (
    <div className="space-y-1">
      {showGst && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">GST ({formatRate(effGst)}%)</span>
          <span className="tabular-nums">${gstAmount.toFixed(2)}</span>
        </div>
      )}
      {showPst && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">SK PST ({formatRate(effPst)}%)</span>
          <span className="tabular-nums">${pstAmount.toFixed(2)}</span>
        </div>
      )}
      {(showGst && showPst) && (
        <div className="flex justify-between text-xs items-center pt-0.5 border-t border-dashed">
          <span className="text-muted-foreground">Total Tax</span>
          <span className="flex items-center gap-2">
            <span className="tabular-nums font-medium">${totalTax.toFixed(2)}</span>
            {canEdit && (
              <Button size="sm" variant="ghost" className="h-6 px-1.5 text-xs" onClick={() => setEditing(true)}>
                <Pencil className="h-3 w-3" />
              </Button>
            )}
          </span>
        </div>
      )}
      {!(showGst && showPst) && canEdit && (
        <div className="flex justify-end">
          <Button size="sm" variant="ghost" className="h-6 px-1.5 text-xs" onClick={() => setEditing(true)}>
            <Pencil className="h-3 w-3" /> <span className="ml-1">Edit tax</span>
          </Button>
        </div>
      )}
      {!showGst && !showPst && !canEdit && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Tax</span>
          <span className="tabular-nums">$0.00</span>
        </div>
      )}
    </div>
  );
}

function TipRow({ invoice, canEdit }: { invoice: any; canEdit: boolean }) {
  const tip = Number(invoice.tip || 0);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(tip.toFixed(2));
  const updateInvoice = useUpdateInvoice();
  const save = async () => {
    const v = Math.max(0, Number(value) || 0);
    const subtotal = Number(invoice.subtotal || 0);
    const tax = Number(invoice.tax || 0);
    const nextTotal = Math.round((subtotal + tax + v) * 100) / 100;
    await updateInvoice.mutateAsync({ id: invoice.id, tip: v, status: getStatusAfterTotalChange(invoice, nextTotal) } as any);
    toast.success('Tip updated');
    setEditing(false);
  };
  if (editing) {
    return (
      <div className="flex justify-between items-center text-sm gap-2">
        <span className="text-muted-foreground">Tip</span>
        <div className="flex items-center gap-1">
          <span className="text-xs">$</span>
          <Input type="number" step="0.01" min="0" value={value} onChange={e => setValue(e.target.value)} className="h-7 w-20 text-right tabular-nums" autoFocus />
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={save} disabled={updateInvoice.isPending}>Save</Button>
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => { setValue(tip.toFixed(2)); setEditing(false); }}>Cancel</Button>
        </div>
      </div>
    );
  }
  if (tip === 0 && !canEdit) return null;
  return (
    <div className="flex justify-between text-sm items-center">
      <span className="text-muted-foreground">Tip{tip === 0 && canEdit ? ' (add)' : ''}</span>
      <span className="flex items-center gap-2">
        <span className="tabular-nums">${tip.toFixed(2)}</span>
        {canEdit && (
          <Button size="sm" variant="ghost" className="h-6 px-1.5 text-xs" onClick={() => { setValue(tip.toFixed(2)); setEditing(true); }}>
            <Pencil className="h-3 w-3" />
          </Button>
        )}
      </span>
    </div>
  );
}

export default function InvoiceDetail() {
  const { id } = useParams();
  const { data: invoice, isLoading } = useInvoice(id);
  const { data: lineItems = [] } = useInvoiceLineItems(id);
  const updateInvoice = useUpdateInvoice();
  const { data: billingProfile } = useBillingProfile(invoice?.customer_id);
  const { canManageInvoices, canEditInvoiceDrafts, canRecordPayments, canVoidInvoices, isLoading: permissionsLoading } = useActionPermissions();

  // Fetch invoice view tracking
  const { data: invoiceViews = [] } = useQuery({
    queryKey: ['invoice_views', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from('invoice_views')
        .select('*')
        .eq('invoice_id', id)
        .order('viewed_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!id,
  });

  // Editable draft fields
  const [editingMeta, setEditingMeta] = useState(false);
  const [draftMemo, setDraftMemo] = useState('');
  const [draftNotes, setDraftNotes] = useState('');
  const [draftIssueDate, setDraftIssueDate] = useState('');
  const [draftDueDate, setDraftDueDate] = useState('');
  const [draftPropertyId, setDraftPropertyId] = useState<string>('');
  const [forceLineItemEditor, setForceLineItemEditor] = useState(false);

  // Properties for this customer (for Property selector when editing)
  const { data: customerProperties = [] } = useQuery({
    queryKey: ['customer_properties_for_invoice', invoice?.customer_id],
    queryFn: async () => {
      if (!invoice?.customer_id) return [];
      const { data, error } = await supabase
        .from('properties')
        .select('id, property_name, address_line_1, city')
        .eq('customer_id', invoice.customer_id)
        .order('property_name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!invoice?.customer_id && editingMeta,
  });

  // Confirmation dialogs
  const [confirmEdit, setConfirmEdit] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);
  const [confirmVoid, setConfirmVoid] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [refundOpen, setRefundOpen] = useState(false);
  const [sendingReceipt, setSendingReceipt] = useState(false);
  const [collectingPayment, setCollectingPayment] = useState(false);
  const [collectConfirmOpen, setCollectConfirmOpen] = useState(false);

  // Email compose dialog state
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendMeCopy, setSendMeCopy] = useState(false);
  const [emailAttachments, setEmailAttachments] = useState<File[]>([]);

  if (isLoading) return <div className="flex items-center justify-center py-16 text-muted-foreground">Loading...</div>;
  if (!invoice) return <div className="flex items-center justify-center py-16 text-muted-foreground">Invoice not found</div>;

  const isDraft = invoice.status === 'Draft' || forceLineItemEditor;
  const total = Number(invoice.total || 0);
  const amountPaid = Number(invoice.amount_paid || 0);
  const balanceDue = Number(invoice.balance_due ?? total - amountPaid);

  const startEditing = () => {
    setDraftMemo(invoice.customer_memo || '');
    setDraftNotes(invoice.internal_notes || '');
    setDraftIssueDate(invoice.issue_date);
    setDraftDueDate(invoice.due_date);
    setDraftPropertyId(invoice.property_id || '');
    setEditingMeta(true);
  };

  const saveMeta = async () => {
    try {
      await updateInvoice.mutateAsync({
        id: invoice.id,
        customer_memo: draftMemo || null,
        internal_notes: draftNotes || null,
        issue_date: draftIssueDate,
        due_date: draftDueDate,
        property_id: draftPropertyId || null,
      });
      toast.success('Invoice details updated');
      setEditingMeta(false);
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleStatusChange = async (newStatus: string, extra?: Record<string, any>) => {
    try {
      await updateInvoice.mutateAsync({ id: invoice.id, status: newStatus, ...extra });
      setForceLineItemEditor(newStatus === 'Draft');
      toast.success(`Invoice marked as ${newStatus}`);

      // Fire invoice_overdue notification
      if (newStatus === 'Overdue') {
        const customerName = `${invoice.customers?.first_name || ''} ${invoice.customers?.last_name || ''}`.trim();
        try {
          await supabase.functions.invoke('send-notification', {
            body: {
              event: 'invoice_overdue',
              customer_id: invoice.customer_id,
              record_type: 'invoice',
              record_id: invoice.id,
              channels: ['in_app', 'email', 'sms'],
              audience: 'customer',
              variables: {
                customer_name: customerName,
                invoice_number: invoice.invoice_number || '',
                total: total.toFixed(2),
                balance_due: balanceDue.toFixed(2),
                due_date: format(new Date(invoice.due_date), 'MMM d, yyyy'),
                to_email: invoice.customers?.email || '',
                to_phone: invoice.customers?.phone || '',
              },
            },
          });
          // Also notify admin
          await supabase.functions.invoke('send-notification', {
            body: {
              event: 'invoice_overdue',
              record_type: 'invoice',
              record_id: invoice.id,
              channels: ['in_app'],
              audience: 'admin',
              variables: {
                customer_name: customerName,
                invoice_number: invoice.invoice_number || '',
                total: total.toFixed(2),
                balance_due: balanceDue.toFixed(2),
              },
            },
          });
        } catch { /* non-critical */ }
      }

      // Fire payment_failed notification
      if (newStatus === 'Failed') {
        const customerName = `${invoice.customers?.first_name || ''} ${invoice.customers?.last_name || ''}`.trim();
        try {
          await supabase.functions.invoke('send-notification', {
            body: {
              event: 'payment_failed',
              customer_id: invoice.customer_id,
              record_type: 'invoice',
              record_id: invoice.id,
              channels: ['in_app', 'email'],
              audience: 'customer',
              variables: {
                customer_name: customerName,
                invoice_number: invoice.invoice_number || '',
                total: total.toFixed(2),
                balance_due: balanceDue.toFixed(2),
                to_email: invoice.customers?.email || '',
              },
            },
          });
          await supabase.functions.invoke('send-notification', {
            body: {
              event: 'payment_failed',
              record_type: 'invoice',
              record_id: invoice.id,
              channels: ['in_app'],
              audience: 'admin',
              variables: {
                customer_name: customerName,
                invoice_number: invoice.invoice_number || '',
                total: total.toFixed(2),
              },
            },
          });
        } catch { /* non-critical */ }
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update invoice');
    }
  };

  const handleRecordPayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) { toast.error('Enter a valid amount'); return; }
    if (amount > balanceDue + 0.01) { toast.error(`Amount exceeds balance due ($${balanceDue.toFixed(2)})`); return; }

    const newPaid = amountPaid + amount;
    const newBalance = total - newPaid;
    const newStatus = newBalance <= 0.005 ? 'Paid' : 'Partially Paid';

    await handleStatusChange(newStatus, {
      amount_paid: Math.round(newPaid * 100) / 100,
      balance_due: Math.max(0, Math.round(newBalance * 100) / 100),
      ...(newStatus === 'Paid' ? { paid_at: new Date().toISOString() } : {}),
    });

    // Send payment_received notification to customer + admin
    try {
      const customerName = `${invoice.customers?.first_name || ''} ${invoice.customers?.last_name || ''}`.trim();
      await supabase.functions.invoke('send-notification', {
        body: {
          event: 'payment_received',
          customer_id: invoice.customer_id,
          record_type: 'invoice',
          record_id: invoice.id,
          channels: ['in_app', 'email', 'sms'],
          audience: 'customer',
          variables: {
            customer_name: customerName,
            invoice_number: invoice.invoice_number || '',
            amount_paid: amount.toFixed(2),
            total: total.toFixed(2),
            to_email: invoice.customers?.email || '',
            to_phone: invoice.customers?.phone || '',
          },
        },
      });
      // Also notify admin
      await supabase.functions.invoke('send-notification', {
        body: {
          event: 'payment_received',
          record_type: 'invoice',
          record_id: invoice.id,
          channels: ['in_app'],
          audience: 'admin',
          variables: {
            customer_name: customerName,
            invoice_number: invoice.invoice_number || '',
            amount_paid: amount.toFixed(2),
            total: total.toFixed(2),
          },
        },
      });
    } catch { /* non-critical */ }

    setPaymentOpen(false);
    setPaymentAmount('');
  };

  const canSend = ['Draft'].includes(invoice.status) && canManageInvoices;
  const canResend = ['Sent', 'Viewed', 'Overdue'].includes(invoice.status) && canManageInvoices;
  const canRecordPayment = ['Sent', 'Viewed', 'Overdue', 'Partially Paid'].includes(invoice.status) && canRecordPayments;
  const canVoid = !['Voided', 'Paid'].includes(invoice.status) && canVoidInvoices;
  const canMarkOverdue = ['Sent', 'Viewed'].includes(invoice.status) && canManageInvoices;
  const canRefund = amountPaid > 0 && !['Voided', 'Refunded'].includes(invoice.status) && canManageInvoices;
  const canSendReceipt = ['Paid', 'Partially Paid'].includes(invoice.status) && canManageInvoices;
  const canCollectFromCard = canRecordPayment && billingProfile?.payment_method_present && (billingProfile as any)?.default_payment_method_id;
  const canEditInvoice = !permissionsLoading
    && canEditInvoiceDrafts
    && !forceLineItemEditor
    && !['Draft', 'Voided', 'Refunded'].includes(invoice.status);
  const billingMode = (invoice as any).billing_mode;

  const openReceiptCompose = () => {
    const customerName = `${invoice.customers?.first_name || ''} ${invoice.customers?.last_name || ''}`.trim();
    setEmailTo(invoice.customers?.email || '');
    setEmailSubject(`Payment Receipt — ${invoice.invoice_number || 'Invoice'}`);
    setEmailMessage(`Hi ${customerName || 'there'},\n\nThank you for your payment of $${amountPaid.toFixed(2)} for invoice ${invoice.invoice_number || ''}.\n\nYour remaining balance is $${balanceDue.toFixed(2)}.\n\nIf you have any questions, please don't hesitate to contact us at support@praetoriagroup.ca.\n\nSincerely,\nPraetoria Group`);
    setConfirmSend(true);
  };

  const handleCollectPayment = async () => {
    if (!invoice?.id || balanceDue <= 0) return;
    setCollectingPayment(true);
    try {
      const res = await callEdgeFunction('collect-payment', {
        invoice_id: invoice.id,
        amount: balanceDue,
      });
      if (res?.success) {
        toast.success(`$${res.amount_charged.toFixed(2)} collected from card on file`);
        window.location.reload();
      } else {
        throw new Error(res?.error || 'Payment failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to collect payment');
    } finally {
      setCollectingPayment(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      <div className="flex items-center gap-2">
        <Link to="/finance/invoices" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl md:text-2xl font-bold">{invoice.invoice_number}</h1>
            <StatusBadge status={invoice.status} />
            {billingMode && <Badge variant="outline" className="text-[10px]">{billingMode}</Badge>}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {invoice.customer_id ? (
              <Link to={`/customers/${invoice.customer_id}`} className="hover:text-primary hover:underline transition-colors">
                {invoice.customers?.first_name} {invoice.customers?.last_name}
                {invoice.customers?.company_name && ` · ${invoice.customers.company_name}`}
              </Link>
            ) : (
              <>
                {invoice.customers?.first_name} {invoice.customers?.last_name}
                {invoice.customers?.company_name && ` · ${invoice.customers.company_name}`}
              </>
            )}
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        {canSend && (
          <Button size="sm" onClick={() => {
            const customerName = `${invoice.customers?.first_name || ''} ${invoice.customers?.last_name || ''}`.trim();
            setEmailTo(invoice.customers?.email || '');
            setEmailSubject(`Invoice from Praetoria Group — ${invoice.jobs?.service_category || 'Services'}`);
            setEmailMessage(`Hi ${customerName || 'there'},\n\nThank you for your recent business with us.\n\nThe invoice total is $${total.toFixed(2)}, with $${balanceDue.toFixed(2)} to be paid by ${format(new Date(invoice.due_date), 'MMM d, yyyy')}.\n\nIf you have any questions or concerns regarding this invoice, please don't hesitate to get in touch with us at support@praetoriagroup.ca.\n\nSincerely,\nPraetoria Group`);
            setConfirmSend(true);
          }}>
            <Send className="h-3.5 w-3.5 mr-1.5" /> Send Invoice
          </Button>
        )}
        {canSend && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleStatusChange('Sent', { sent_at: new Date().toISOString() })}
            title="Move from Draft to Sent without emailing the customer (use after delivering printed copy)"
          >
            <FileCheck className="h-3.5 w-3.5 mr-1.5" /> Mark as Sent
          </Button>
        )}
        {canResend && (
          <Button size="sm" variant="outline" onClick={() => {
            const customerName = `${invoice.customers?.first_name || ''} ${invoice.customers?.last_name || ''}`.trim();
            setEmailTo(invoice.customers?.email || '');
            setEmailSubject(`Invoice from Praetoria Group — ${invoice.jobs?.service_category || 'Services'}`);
            setEmailMessage(`Hi ${customerName || 'there'},\n\nThank you for your recent business with us.\n\nThe invoice total is $${total.toFixed(2)}, with $${balanceDue.toFixed(2)} to be paid by ${format(new Date(invoice.due_date), 'MMM d, yyyy')}.\n\nIf you have any questions or concerns regarding this invoice, please don't hesitate to get in touch with us at support@praetoriagroup.ca.\n\nSincerely,\nPraetoria Group`);
            setConfirmSend(true);
          }}>
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Resend
          </Button>
        )}
        {canRecordPayment && (
          <Button
            size="sm" variant="outline"
            onClick={() => setPaymentOpen(true)}
          >
            <DollarSign className="h-3.5 w-3.5 mr-1.5" /> Record Payment
          </Button>
        )}
        {canCollectFromCard && (
          <Button
            size="sm" variant="outline"
            className="text-primary border-primary/30 hover:bg-primary/10"
            onClick={() => setCollectConfirmOpen(true)}
            disabled={collectingPayment}
          >
            {collectingPayment ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5 mr-1.5" />}
             Pay invoice with saved card
          </Button>
        )}
        <Link to={`/invoices/${invoice.id}/print`}>
          <Button size="sm" variant="outline">
            <Printer className="h-3.5 w-3.5 mr-1.5" /> Print / PDF
          </Button>
        </Link>
        <AddToJobCostTrackerButton
          jobId={invoice.job_id ?? null}
          initialSearch={invoice.invoice_number ?? ''}
          label="Link to Job Cost Tracker"
          size="sm"
        />
        {canEditInvoice && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setConfirmEdit(true)}
            title="Edit line items and invoice details"
          >
            <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit Invoice
          </Button>
        )}
        {canRefund && (
          <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setRefundOpen(true)}>
            <Undo2 className="h-3.5 w-3.5 mr-1.5" /> Refund
          </Button>
        )}
        {canSendReceipt && (
          <Button size="sm" variant="outline" onClick={openReceiptCompose}>
            <Mail className="h-3.5 w-3.5 mr-1.5" />
            Send Receipt
          </Button>
        )}
        {canMarkOverdue && (
          <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => handleStatusChange('Overdue')}>
            <AlertCircle className="h-3.5 w-3.5 mr-1.5" /> Mark Overdue
          </Button>
        )}
        {canVoid && (
          <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => setConfirmVoid(true)}>
            <Ban className="h-3.5 w-3.5 mr-1.5" /> Void
          </Button>
        )}
      </div>

      {/* Overdue alert */}
      {invoice.status === 'Overdue' && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-destructive">Past Due</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                This invoice was due {format(new Date(invoice.due_date), 'MMM d, yyyy')} and is now overdue. Consider sending a reminder or recording a payment.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Failed payment alert */}
      {invoice.status === 'Failed' && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-destructive">Payment Failed</p>
              <p className="text-xs text-muted-foreground mt-0.5">The automated payment attempt for this invoice failed. Contact the customer or retry manually.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        {/* Invoice details */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Line Items</CardTitle>
          </CardHeader>
          <CardContent className={isDraft ? 'p-4' : 'p-0'}>
            {isDraft && canEditInvoiceDrafts ? (
              <>
                <InvoiceLineItemEditor invoiceId={invoice.id} existingItems={lineItems} />
                <div className="mt-4 border-t pt-3 space-y-1 max-w-sm ml-auto">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span className="tabular-nums">${Number(invoice.subtotal).toFixed(2)}</span></div>
                  <TaxRow invoice={invoice} canEdit={canEditInvoiceDrafts} />
                  <TipRow invoice={invoice} canEdit={canEditInvoiceDrafts} />
                  <Separator />
                  <div className="flex justify-between text-sm font-semibold"><span>Total</span><span className="tabular-nums">${total.toFixed(2)}</span></div>
                  {amountPaid > 0 && (
                    <>
                      <div className="flex justify-between text-sm text-success"><span>Paid</span><span className="tabular-nums">-${amountPaid.toFixed(2)}</span></div>
                      <div className="flex justify-between text-sm font-semibold text-destructive"><span>Balance Due</span><span className="tabular-nums">${balanceDue.toFixed(2)}</span></div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product & Service</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineItems.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No line items — add items while in Draft status</TableCell></TableRow>
                    ) : (
                      lineItems.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <p className="text-sm font-medium">{item.item_name}</p>
                            {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                          </TableCell>
                          <TableCell className="text-sm">
                            {item.service_date ? format(new Date(item.service_date + 'T00:00:00'), 'MMM d, yyyy') : '—'}
                            {item.service_time && <span className="text-xs text-muted-foreground ml-1">{item.service_time}</span>}
                          </TableCell>
                          <TableCell className="text-right text-sm tabular-nums">{item.quantity}</TableCell>
                          <TableCell className="text-right text-sm tabular-nums">${Number(item.unit_price).toFixed(2)}</TableCell>
                          <TableCell className="text-right text-sm font-medium tabular-nums">${Number(item.line_total).toFixed(2)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                <div className="px-4 py-3 space-y-1 border-t">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span className="tabular-nums">${Number(invoice.subtotal).toFixed(2)}</span></div>
                  <TaxRow invoice={invoice} canEdit={canEditInvoiceDrafts} />
                  <TipRow invoice={invoice} canEdit={canEditInvoiceDrafts} />
                  <Separator />
                  <div className="flex justify-between text-sm font-semibold"><span>Total</span><span className="tabular-nums">${total.toFixed(2)}</span></div>
                  {amountPaid > 0 && (
                    <>
                      <div className="flex justify-between text-sm text-success"><span>Paid</span><span className="tabular-nums">-${amountPaid.toFixed(2)}</span></div>
                      <div className="flex justify-between text-sm font-semibold text-destructive"><span>Balance Due</span><span className="tabular-nums">${balanceDue.toFixed(2)}</span></div>
                    </>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Sidebar info */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> Details</CardTitle>
                {canEditInvoiceDrafts && !editingMeta && (
                  <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={startEditing}>Edit</Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              {editingMeta ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Issue Date</Label>
                    <Input type="date" value={draftIssueDate} onChange={e => setDraftIssueDate(e.target.value)} className="h-8" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Due Date</Label>
                    <Input type="date" value={draftDueDate} onChange={e => setDraftDueDate(e.target.value)} className="h-8" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Property (where work was done)</Label>
                    <Select value={draftPropertyId || 'none'} onValueChange={v => setDraftPropertyId(v === 'none' ? '' : v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select property..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— No property —</SelectItem>
                        {customerProperties.map((p: any) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.property_name}{p.address_line_1 ? ` · ${p.address_line_1}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1"><Eye className="h-3 w-3" /> Customer Memo</Label>
                    <Textarea rows={2} value={draftMemo} onChange={e => setDraftMemo(e.target.value)} className="text-xs" placeholder="Shown on invoice to customer" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1"><EyeOff className="h-3 w-3" /> Internal Notes</Label>
                    <Textarea rows={2} value={draftNotes} onChange={e => setDraftNotes(e.target.value)} className="text-xs" placeholder="Private — not shown to customer" />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveMeta} disabled={updateInvoice.isPending} className="gap-1">
                      {updateInvoice.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingMeta(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <>
                  <div><span className="text-muted-foreground">Issue Date</span><p className="font-medium">{format(new Date(invoice.issue_date), 'MMM d, yyyy')}</p></div>
                  <div><span className="text-muted-foreground">Due Date</span><p className="font-medium">{format(new Date(invoice.due_date), 'MMM d, yyyy')}</p></div>
                  {billingMode && (
                    <div><span className="text-muted-foreground">Billing Mode</span><p className="font-medium capitalize">{billingMode.replace(/_/g, ' ')}</p></div>
                  )}
                  {invoice.jobs && <div><span className="text-muted-foreground">Job</span><p className="font-medium"><Link to={`/jobs/${invoice.jobs.id}`} className="text-primary hover:underline">{invoice.jobs.job_number} — {invoice.jobs.job_title}</Link></p></div>}
                  {invoice.properties && <div><span className="text-muted-foreground">Property</span><p className="font-medium"><Link to={`/properties/${invoice.property_id}`} className="text-primary hover:underline">{invoice.properties.property_name}</Link></p></div>}
                  {invoice.sent_at && <div><span className="text-muted-foreground">Sent</span><p className="font-medium">{format(new Date(invoice.sent_at), 'MMM d, yyyy h:mm a')}</p></div>}
                  {amountPaid > 0 && (
                    <div><span className="text-muted-foreground">Amount Paid</span><p className="font-medium text-emerald-600">${amountPaid.toFixed(2)}</p></div>
                  )}
                  {invoice.paid_at && <div><span className="text-muted-foreground">Date Paid</span><p className="font-medium text-emerald-600">{format(new Date(invoice.paid_at), 'MMM d, yyyy h:mm a')}</p></div>}
                  {balanceDue > 0.005 && (
                    <div><span className="text-muted-foreground">Balance Due</span><p className="font-medium text-destructive">${balanceDue.toFixed(2)}</p></div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Customer Info Card */}
          {invoice.customers && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Customer</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-1">
                <Link to={`/customers/${invoice.customer_id}`} className="font-medium text-primary hover:underline block">
                  {invoice.customers.first_name} {invoice.customers.last_name}
                </Link>
                {invoice.customers.company_name && <p className="text-muted-foreground">{invoice.customers.company_name}</p>}
                {invoice.customers.email && <p className="text-muted-foreground">{invoice.customers.email}</p>}
                {invoice.customers.phone && <p className="text-muted-foreground">{invoice.customers.phone}</p>}
                {invoice.customers.address_line_1 && <p className="text-muted-foreground">{invoice.customers.address_line_1}</p>}
                {(invoice.customers.city || invoice.customers.province) && (
                  <p className="text-muted-foreground">{[invoice.customers.city, invoice.customers.province, invoice.customers.postal_code].filter(Boolean).join(', ')}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Linked Source Records */}
          {(invoice.job_id || (invoice as any).visit_id || (invoice as any).quote_id) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <LinkIcon className="h-3.5 w-3.5" /> Source Records
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                {(invoice as any).quote_id && (
                  <Link to={`/quotes/${(invoice as any).quote_id}`} className="text-primary text-xs hover:underline flex items-center gap-1">
                    <FileText className="h-3 w-3" /> Source Quote →
                  </Link>
                )}
                {invoice.job_id && (
                  <Link to={`/jobs/${invoice.job_id}`} className="text-primary text-xs hover:underline flex items-center gap-1">
                    <Briefcase className="h-3 w-3" /> {invoice.jobs?.job_number} — {invoice.jobs?.job_title} →
                  </Link>
                )}
                {(invoice as any).visit_id && (
                  <Link to={`/visits/${(invoice as any).visit_id}`} className="text-primary text-xs hover:underline flex items-center gap-1">
                    <Receipt className="h-3 w-3" /> Source Visit →
                  </Link>
                )}
              </CardContent>
            </Card>
          )}

          {billingProfile && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5" /> Payment Method</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-2">
                <div><span className="text-muted-foreground">Preference</span><p className="font-medium capitalize">{billingProfile.payment_preference?.replace('-', ' ')}</p></div>
                {billingProfile.payment_method_present && (
                  <div>
                    <span className="text-muted-foreground">Card on File</span>
                    <p className="font-medium capitalize">{billingProfile.card_brand} •••• {billingProfile.card_last4}</p>
                    {(billingProfile as any).card_exp_month && (billingProfile as any).card_exp_year && (
                      <p className="text-xs text-muted-foreground">Exp {String((billingProfile as any).card_exp_month).padStart(2, '0')}/{(billingProfile as any).card_exp_year}</p>
                    )}
                    {(billingProfile as any).default_payment_method_id && (
                      <p className="text-xs text-accent">✓ Default</p>
                    )}
                  </div>
                )}
                <div><span className="text-muted-foreground">Auto-pay</span><p className={`font-medium ${billingProfile.autopay_enabled ? 'text-success' : 'text-muted-foreground'}`}>{billingProfile.autopay_enabled ? 'Enabled' : 'Disabled'}</p></div>
              </CardContent>
            </Card>
          )}

          {/* Customer View Tracking */}
          {(invoiceViews as any[]).length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5 text-blue-500" /> Customer Views
                  <Badge variant="secondary" className="text-[10px] ml-auto">{(invoiceViews as any[]).length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-1.5">
                {(invoiceViews as any[]).slice(0, 5).map((v: any) => (
                  <div key={v.id} className="flex items-center gap-1.5 text-muted-foreground">
                    <Eye className="h-3 w-3 text-blue-400 shrink-0" />
                    <span>{format(new Date(v.viewed_at), 'MMM d, yyyy h:mm a')}</span>
                  </div>
                ))}
                {(invoiceViews as any[]).length > 5 && (
                  <p className="text-muted-foreground text-[10px]">+ {(invoiceViews as any[]).length - 5} more views</p>
                )}
              </CardContent>
            </Card>
          )}

          {!editingMeta && invoice.customer_memo && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1.5"><Eye className="h-3.5 w-3.5" /> Customer Memo</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{invoice.customer_memo}</p></CardContent>
            </Card>
          )}

          {!editingMeta && invoice.internal_notes && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1.5"><EyeOff className="h-3.5 w-3.5" /> Internal Notes</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{invoice.internal_notes}</p></CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ═══ CONFIRMATION DIALOGS ═══ */}

      {/* Edit Confirmation */}
      <Dialog open={confirmEdit} onOpenChange={setConfirmEdit}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Invoice?</DialogTitle>
            <DialogDescription>
              This will open {invoice.invoice_number} for editing. Paid invoices will stay paid; you can adjust line items, dates, property, and notes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmEdit(false)}>Cancel</Button>
            <Button
              onClick={() => {
                setConfirmEdit(false);
                if (invoice.status === 'Paid') {
                  setForceLineItemEditor(true);
                  return;
                }
                handleStatusChange('Draft');
              }}
              disabled={updateInvoice.isPending}
            >
              {updateInvoice.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Pencil className="h-3.5 w-3.5 mr-1.5" />}
              Edit Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send / Resend — Polished Email Compose Dialog */}
      <Dialog open={confirmSend} onOpenChange={(open) => { setConfirmSend(open); if (!open) setEmailAttachments([]); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Email Invoice {invoice.invoice_number}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* To */}
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground">To</Label>
              <Input value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="customer@email.com" className="h-9" />
            </div>
            {/* Subject */}
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground">Subject</Label>
              <Input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} className="h-9" />
            </div>
            {/* Message */}
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground">Message</Label>
              <Textarea rows={7} value={emailMessage} onChange={e => setEmailMessage(e.target.value)} className="text-sm leading-relaxed" />
            </div>

            {/* Attachments */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Paperclip className="h-3 w-3" /> Attachments
              </Label>
              <div className="rounded-lg border border-dashed border-border/60 p-3 space-y-2">
                {/* Invoice PDF auto-attached */}
                <div className="flex items-center gap-2 text-xs bg-muted/50 rounded-md px-3 py-2">
                  <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="flex-1 font-medium">{invoice.invoice_number}.pdf</span>
                  <Badge variant="secondary" className="text-[9px]">Invoice</Badge>
                </div>

                {/* User-uploaded attachments */}
                {emailAttachments.map((file, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs bg-muted/50 rounded-md px-3 py-2">
                    <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="flex-1 truncate">{file.name}</span>
                    <span className="text-muted-foreground">{(file.size / 1024).toFixed(0)}KB</span>
                    <button onClick={() => setEmailAttachments(prev => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}

                {/* Upload button */}
                <label className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 cursor-pointer w-fit">
                  <Upload className="h-3 w-3" />
                  <span>Add attachment</span>
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={e => {
                      if (e.target.files) setEmailAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Options */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox id="sendCopy" checked={sendMeCopy} onCheckedChange={(c) => setSendMeCopy(!!c)} />
                <label htmlFor="sendCopy" className="text-xs text-muted-foreground cursor-pointer">Send me a copy</label>
              </div>
              <Link to={`/invoices/${invoice.id}/print`} target="_blank">
                <Button variant="ghost" size="sm" className="text-xs gap-1 h-7">
                  <Eye className="h-3 w-3" /> Preview Invoice
                </Button>
              </Link>
            </div>

            {lineItems.length === 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">This invoice has no line items. Are you sure you want to send it?</AlertDescription>
              </Alert>
            )}
            {isDraft && (
              <p className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
                Sending will finalize this invoice and make it read-only.
              </p>
            )}
            {!isDraft && (
              <p className="text-xs text-muted-foreground">This will resend the invoice email. The invoice status will not change.</p>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmSend(false)}>Cancel</Button>
            <Button onClick={async () => {
              if (!emailTo) { toast.error('Enter a recipient email'); return; }
              setSendingEmail(true);
              try {
                // Upload any user-added attachments to storage and collect URLs
                const attachmentUrls: string[] = [];
                for (const file of emailAttachments) {
                  // Tenant-scoped path: customer_id/invoice_id ensures RLS isolation
                  const tenantPrefix = invoice.customer_id ?? 'shared';
                  const filePath = `${tenantPrefix}/${invoice.id}/${Date.now()}-${file.name}`;
                  const { error: upErr } = await supabase.storage.from('invoice-attachments').upload(filePath, file);
                  if (!upErr) {
                    // Bucket is private — use a long-lived signed URL (1 year) so the
                    // customer can open the file directly from the email. The portal
                    // link in the email body is the permanent fallback.
                    const { data: signed } = await supabase.storage
                      .from('invoice-attachments')
                      .createSignedUrl(filePath, 60 * 60 * 24 * 365);
                    if (signed?.signedUrl) attachmentUrls.push(signed.signedUrl);
                  }
                }
                // Include the printable invoice PDF link
                const invoicePdfUrl = `${window.location.origin}/invoices/${invoice.id}/print`;

                const customerName = `${invoice.customers?.first_name || ''} ${invoice.customers?.last_name || ''}`.trim();
                await supabase.functions.invoke('send-email', {
                  body: {
                    action: 'invoice_sent',
                    customer_email: emailTo,
                    customer_name: customerName,
                    invoice_number: invoice.invoice_number,
                    service_category: invoice.jobs?.service_category || (invoice as any).service_category,
                    total: total.toFixed(2),
                    balance_due: balanceDue.toFixed(2),
                    due_date: format(new Date(invoice.due_date), 'MMM d, yyyy'),
                    invoice_id: invoice.id,
                    custom_subject: emailSubject,
                    custom_message: emailMessage,
                    send_copy: sendMeCopy,
                    invoice_pdf_url: invoicePdfUrl,
                    attachments: attachmentUrls,
                  },
                });
                // Also send in-app + SMS notification
                try {
                  await supabase.functions.invoke('send-notification', {
                    body: {
                      event: 'invoice_sent',
                      customer_id: invoice.customer_id,
                      record_type: 'invoice',
                      record_id: invoice.id,
                      channels: ['in_app', 'sms'],
                      audience: 'customer',
                      variables: {
                        customer_name: customerName,
                        invoice_number: invoice.invoice_number || '',
                        total: total.toFixed(2),
                        due_date: format(new Date(invoice.due_date), 'MMM d, yyyy'),
                        property: '',
                        to_phone: invoice.customers?.phone || '',
                      },
                    },
                  });
                } catch { /* non-critical */ }
                if (isDraft) {
                  handleStatusChange('Sent', { sent_at: new Date().toISOString() });
                }
                toast.success('Invoice email sent');
                setConfirmSend(false);
                setEmailAttachments([]);
              } catch (e) {
                console.error('Invoice email send failed:', e);
                toast.error('Failed to send invoice email');
              } finally {
                setSendingEmail(false);
              }
            }} disabled={sendingEmail} className="gap-1.5">
              {sendingEmail ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Void Confirmation */}
      <Dialog open={confirmVoid} onOpenChange={setConfirmVoid}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Void Invoice?</DialogTitle>
            <DialogDescription>
              Voiding {invoice.invoice_number} is permanent. The invoice will be marked as Void and cannot be reopened.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmVoid(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { handleStatusChange('Voided'); setConfirmVoid(false); }}>
              <Ban className="h-3.5 w-3.5 mr-1.5" /> Void Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={collectConfirmOpen} onOpenChange={setCollectConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" /> Charge saved card?
            </DialogTitle>
            <DialogDescription>
              Charge ${balanceDue.toFixed(2)} to {billingProfile?.card_brand} •••• {billingProfile?.card_last4} for invoice {invoice.invoice_number}. Only safe card metadata is stored.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
            <p>Default method: {billingProfile?.card_brand} •••• {billingProfile?.card_last4}</p>
            {(billingProfile as any)?.card_exp_month && (billingProfile as any)?.card_exp_year && (
              <p>Expires {String((billingProfile as any).card_exp_month).padStart(2, '0')}/{(billingProfile as any).card_exp_year}</p>
            )}
            <p>Consent recorded: {(billingProfile as any)?.autopay_consent_at ? format(new Date((billingProfile as any).autopay_consent_at), 'MMM d, yyyy') : 'Card-on-file authorization on setup'}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCollectConfirmOpen(false)} disabled={collectingPayment}>Cancel</Button>
            <Button onClick={async () => { await handleCollectPayment(); setCollectConfirmOpen(false); }} disabled={collectingPayment}>
              {collectingPayment ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5 mr-1.5" />}
              Charge ${balanceDue.toFixed(2)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <RecordPaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        customerId={invoice.customer_id}
        initialInvoiceId={invoice.id}
      />

      {/* Refund Dialog */}
      <RefundDialog
        open={refundOpen}
        onOpenChange={setRefundOpen}
        invoice={{
          id: invoice.id,
          invoice_number: invoice.invoice_number,
          total,
          amount_paid: amountPaid,
          balance_due: balanceDue,
          customer_id: invoice.customer_id,
        }}
      />
    </div>
  );
}
