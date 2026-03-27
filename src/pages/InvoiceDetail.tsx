import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useInvoice, useInvoiceLineItems, useUpdateInvoice } from '@/hooks/useInvoices';
import { StatusBadge } from '@/components/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Send, RotateCcw, CheckCircle, Ban, AlertCircle, CreditCard, Printer, Save, Loader2, LinkIcon, Briefcase, FileText, Receipt } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useBillingProfile } from '@/hooks/useInvoices';
import InvoiceLineItemEditor from '@/components/InvoiceLineItemEditor';

export default function InvoiceDetail() {
  const { id } = useParams();
  const { data: invoice, isLoading } = useInvoice(id);
  const { data: lineItems = [] } = useInvoiceLineItems(id);
  const updateInvoice = useUpdateInvoice();
  const { data: billingProfile } = useBillingProfile(invoice?.customer_id);

  // Editable draft fields
  const [editingMeta, setEditingMeta] = useState(false);
  const [draftMemo, setDraftMemo] = useState('');
  const [draftNotes, setDraftNotes] = useState('');
  const [draftIssueDate, setDraftIssueDate] = useState('');
  const [draftDueDate, setDraftDueDate] = useState('');

  if (isLoading) return <div className="flex items-center justify-center py-16 text-muted-foreground">Loading...</div>;
  if (!invoice) return <div className="flex items-center justify-center py-16 text-muted-foreground">Invoice not found</div>;

  const isDraft = invoice.status === 'Draft';

  const startEditing = () => {
    setDraftMemo(invoice.customer_memo || '');
    setDraftNotes(invoice.internal_notes || '');
    setDraftIssueDate(invoice.issue_date);
    setDraftDueDate(invoice.due_date);
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
      toast.success(`Invoice marked as ${newStatus}`);
    } catch {
      toast.error('Failed to update invoice');
    }
  };

  const canSend = ['Draft'].includes(invoice.status);
  const canResend = ['Sent', 'Viewed', 'Overdue'].includes(invoice.status);
  const canMarkPaid = ['Sent', 'Viewed', 'Overdue', 'Partially Paid'].includes(invoice.status);
  const canVoid = !['Voided', 'Paid'].includes(invoice.status);

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      <div className="flex items-center gap-2">
        <Link to="/finance/invoices" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl md:text-2xl font-bold">{invoice.invoice_number}</h1>
            <StatusBadge status={invoice.status} />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {invoice.customers?.first_name} {invoice.customers?.last_name}
            {invoice.customers?.company_name && ` · ${invoice.customers.company_name}`}
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        {canSend && (
          <Button size="sm" onClick={() => handleStatusChange('Sent', { sent_at: new Date().toISOString() })}>
            <Send className="h-3.5 w-3.5 mr-1.5" /> Send Invoice
          </Button>
        )}
        {canResend && (
          <Button size="sm" variant="outline" onClick={() => handleStatusChange('Sent', { sent_at: new Date().toISOString() })}>
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Resend
          </Button>
        )}
        {canMarkPaid && (
          <Button size="sm" variant="outline" className="text-success border-success/30 hover:bg-success/10" onClick={() => handleStatusChange('Paid', { paid_at: new Date().toISOString(), amount_paid: invoice.total, balance_due: 0 })}>
            <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Mark Paid
          </Button>
        )}
        <Link to={`/invoices/${invoice.id}/print`}>
          <Button size="sm" variant="outline">
            <Printer className="h-3.5 w-3.5 mr-1.5" /> Print / PDF
          </Button>
        </Link>
        {canVoid && (
          <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => handleStatusChange('Voided')}>
            <Ban className="h-3.5 w-3.5 mr-1.5" /> Void
          </Button>
        )}
      </div>

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
            {isDraft ? (
              <InvoiceLineItemEditor invoiceId={invoice.id} existingItems={lineItems} />
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineItems.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No line items</TableCell></TableRow>
                    ) : (
                      lineItems.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <p className="text-sm font-medium">{item.item_name}</p>
                            {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                          </TableCell>
                          <TableCell className="text-right text-sm mono">{item.quantity}</TableCell>
                          <TableCell className="text-right text-sm mono">${Number(item.unit_price).toFixed(2)}</TableCell>
                          <TableCell className="text-right text-sm font-medium mono">${Number(item.line_total).toFixed(2)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                <div className="px-4 py-3 space-y-1 border-t">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span className="mono">${Number(invoice.subtotal).toFixed(2)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Tax ({(Number(invoice.tax_rate) * 100).toFixed(0)}%)</span><span className="mono">${Number(invoice.tax).toFixed(2)}</span></div>
                  <Separator />
                  <div className="flex justify-between text-sm font-semibold"><span>Total</span><span className="mono">${Number(invoice.total).toFixed(2)}</span></div>
                  {Number(invoice.amount_paid) > 0 && (
                    <>
                      <div className="flex justify-between text-sm text-success"><span>Paid</span><span className="mono">-${Number(invoice.amount_paid).toFixed(2)}</span></div>
                      <div className="flex justify-between text-sm font-semibold text-destructive"><span>Balance Due</span><span className="mono">${Number(invoice.balance_due).toFixed(2)}</span></div>
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
                <CardTitle className="text-sm">Details</CardTitle>
                {isDraft && !editingMeta && (
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
                    <Label className="text-xs">Customer Memo</Label>
                    <Textarea rows={2} value={draftMemo} onChange={e => setDraftMemo(e.target.value)} className="text-xs" placeholder="Message shown on invoice" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Internal Notes</Label>
                    <Textarea rows={2} value={draftNotes} onChange={e => setDraftNotes(e.target.value)} className="text-xs" placeholder="Private notes" />
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
                  {invoice.jobs && <div><span className="text-muted-foreground">Job</span><p className="font-medium"><Link to={`/jobs/${invoice.jobs.id}`} className="text-primary hover:underline">{invoice.jobs.job_number} — {invoice.jobs.job_title}</Link></p></div>}
                  {invoice.properties && <div><span className="text-muted-foreground">Property</span><p className="font-medium"><Link to={`/properties/${invoice.property_id}`} className="text-primary hover:underline">{invoice.properties.property_name}</Link></p></div>}
                  {invoice.sent_at && <div><span className="text-muted-foreground">Sent</span><p className="font-medium">{format(new Date(invoice.sent_at), 'MMM d, yyyy h:mm a')}</p></div>}
                  {invoice.paid_at && <div><span className="text-muted-foreground">Paid</span><p className="font-medium">{format(new Date(invoice.paid_at), 'MMM d, yyyy h:mm a')}</p></div>}
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
                  <div><span className="text-muted-foreground">Card on File</span><p className="font-medium capitalize">{billingProfile.card_brand} •••• {billingProfile.card_last4}</p></div>
                )}
                <div><span className="text-muted-foreground">Auto-pay</span><p className={`font-medium ${billingProfile.autopay_enabled ? 'text-success' : 'text-muted-foreground'}`}>{billingProfile.autopay_enabled ? 'Enabled' : 'Disabled'}</p></div>
              </CardContent>
            </Card>
          )}

          {!editingMeta && invoice.customer_memo && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Customer Memo</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{invoice.customer_memo}</p></CardContent>
            </Card>
          )}

          {!editingMeta && invoice.internal_notes && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Internal Notes</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{invoice.internal_notes}</p></CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
