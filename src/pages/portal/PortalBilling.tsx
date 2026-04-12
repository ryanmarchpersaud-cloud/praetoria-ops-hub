import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCustomerProfile } from '@/hooks/useUserRole';
import { useBillingProfile } from '@/hooks/useInvoices';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CreditCard, FileText, CheckCircle, Receipt, ChevronDown, ChevronUp,
  Phone, Mail, AlertCircle, ExternalLink, DollarSign, Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { callEdgeFunction } from '@/lib/edgeFunctionClient';

export default function PortalBilling() {
  const { user } = useAuth();
  const { data: customer } = useCustomerProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [savingCard, setSavingCard] = useState(false);

  // Auto-sync card on return from Stripe setup
  const searchParams = new URLSearchParams(window.location.search);
  const cardSaved = searchParams.get('card_saved');

  useState(() => {
    if (cardSaved === 'true' && customer?.id) {
      callEdgeFunction('sync-payment-method', { role_type: 'customer' })
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['billing_profile', customer.id] });
          // Clean up URL
          const url = new URL(window.location.href);
          url.searchParams.delete('card_saved');
          window.history.replaceState({}, '', url.toString());
          toast({ title: 'Card saved successfully!' });
        })
        .catch(() => {});
    }
  });

  // All invoices for this customer
  const { data: allInvoices = [], isLoading } = useQuery({
    queryKey: ['portal_invoices', customer?.id],
    queryFn: async () => {
      if (!customer) return [];
      const { data, error } = await supabase
        .from('invoices')
        .select('*, properties(property_name), jobs(job_title, job_number), invoice_line_items(id, item_name, description, quantity, unit_price, line_total, sort_order)')
        .eq('customer_id', customer.id)
        .not('status', 'eq', 'Draft')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!customer,
  });

  const { data: billingProfile } = useBillingProfile(customer?.id);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [payDialog, setPayDialog] = useState<{ open: boolean; invoice: any }>({ open: false, invoice: null });
  const [requestingLink, setRequestingLink] = useState(false);

  const openInvoices = allInvoices.filter((i: any) => ['Sent', 'Viewed'].includes(i.status));
  const overdueInvoices = allInvoices.filter((i: any) => i.status === 'Overdue');
  const paidInvoices = allInvoices.filter((i: any) => i.status === 'Paid');
  const totalOwing = [...openInvoices, ...overdueInvoices].reduce((sum: number, i: any) => sum + Number(i.balance_due || 0), 0);

  // Mark invoice as viewed when expanded
  const handleExpand = async (inv: any) => {
    const next = expandedId === inv.id ? null : inv.id;
    setExpandedId(next);
    if (next) {
      if (user?.id) {
        supabase.from('invoice_views').insert({
          invoice_id: inv.id,
          viewer_user_id: user.id,
        } as any).then(() => {});
      }
      if (inv.status === 'Sent' && !inv.viewed_at) {
        await supabase.from('invoices').update({ viewed_at: new Date().toISOString(), status: 'Viewed' as any }).eq('id', inv.id);
      }
    }
  };

  // Stripe payment link for invoice
  const handleRequestPaymentLink = async () => {
    const inv = payDialog.invoice;
    if (!inv) return;
    setRequestingLink(true);
    try {
      const res = await callEdgeFunction('create-checkout', {
        action: 'invoice_payment',
        invoice_id: inv.id,
        amount: Number(inv.balance_due),
        description: `Invoice ${inv.invoice_number}`,
      });
      if (res?.url) {
        window.open(res.url, '_blank');
      } else {
        throw new Error(res?.error || 'Failed to create payment link');
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setRequestingLink(false);
    }
  };

  // Save card on file via Stripe setup
  const handleSaveCard = async () => {
    setSavingCard(true);
    try {
      const res = await callEdgeFunction('setup-payment-method', {
        role_type: 'customer',
      });
      if (res?.url) {
        window.location.href = res.url;
      } else {
        throw new Error(res?.error || 'Failed to start card setup');
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSavingCard(false);
    }
  };

  const InvoiceCard = ({ inv }: { inv: any }) => {
    const isExpanded = expandedId === inv.id;
    const lineItems = (inv.invoice_line_items || []).sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
    const isOverdue = inv.status === 'Overdue';
    const isPaid = inv.status === 'Paid';
    const canPay = !isPaid && Number(inv.balance_due) > 0;

    return (
      <Card className={cn(isOverdue && 'border-destructive/30')}>
        <CardContent className="p-4 space-y-2">
          <button onClick={() => handleExpand(inv)} className="w-full text-left">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm font-mono">{inv.invoice_number}</p>
                  <StatusBadge status={inv.status} showIcon={false} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Due {format(new Date(inv.due_date), 'MMM d, yyyy')}</p>
                {inv.properties?.property_name && (
                  <p className="text-xs text-muted-foreground">{inv.properties.property_name}</p>
                )}
              </div>
              <div className="text-right flex items-center gap-2">
                <div>
                  <p className="font-semibold font-mono">${Number(inv.total).toFixed(2)}</p>
                  {Number(inv.balance_due) > 0 && Number(inv.balance_due) !== Number(inv.total) && (
                    <p className="text-[10px] text-muted-foreground">bal ${Number(inv.balance_due).toFixed(2)}</p>
                  )}
                </div>
                {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
            </div>
          </button>

          {isPaid && inv.paid_at && (
            <p className="text-[11px] text-emerald-600 flex items-center gap-1">
              <CheckCircle className="h-3 w-3" /> Paid {format(new Date(inv.paid_at), 'MMM d, yyyy')}
              {inv.payment_method && <span className="text-muted-foreground ml-1">via {inv.payment_method}</span>}
            </p>
          )}

          {isExpanded && (
            <div className="border-t border-border pt-3 space-y-3">
              {inv.jobs?.job_title && (
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{inv.jobs.job_title}</span>
                  {inv.jobs.job_number && <span className="ml-1 font-mono">({inv.jobs.job_number})</span>}
                </div>
              )}

              {lineItems.length > 0 && (
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Line Items</p>
                  <div className="border border-border rounded-md overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left px-3 py-1.5 font-medium">Item</th>
                          <th className="text-right px-3 py-1.5 font-medium w-16">Qty</th>
                          <th className="text-right px-3 py-1.5 font-medium w-20">Price</th>
                          <th className="text-right px-3 py-1.5 font-medium w-20">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lineItems.map((li: any) => (
                          <tr key={li.id} className="border-t border-border">
                            <td className="px-3 py-2">
                              <p className="font-medium">{li.item_name}</p>
                              {li.description && <p className="text-muted-foreground mt-0.5">{li.description}</p>}
                            </td>
                            <td className="text-right px-3 py-2">{li.quantity}</td>
                            <td className="text-right px-3 py-2">${Number(li.unit_price || 0).toFixed(2)}</td>
                            <td className="text-right px-3 py-2 font-medium">${Number(li.line_total || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 mt-2 text-xs">
                    <span className="text-muted-foreground">Subtotal: ${Number(inv.subtotal || 0).toFixed(2)}</span>
                    <span className="text-muted-foreground">Tax (HST): ${Number(inv.tax || 0).toFixed(2)}</span>
                    <span className="font-semibold text-sm">Total: ${Number(inv.total || 0).toFixed(2)}</span>
                    {Number(inv.amount_paid) > 0 && (
                      <>
                        <span className="text-emerald-600">Paid: -${Number(inv.amount_paid).toFixed(2)}</span>
                        <span className="font-semibold text-sm text-destructive">Balance: ${Number(inv.balance_due).toFixed(2)}</span>
                      </>
                    )}
                  </div>
                </div>
              )}

              {inv.customer_memo && (
                <div className="bg-muted/50 rounded-md p-3">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Note</p>
                  <p className="text-xs text-foreground">{inv.customer_memo}</p>
                </div>
              )}

              <p className="text-[10px] text-muted-foreground">
                Issued {format(new Date(inv.issue_date), 'MMMM d, yyyy')}
                {inv.sent_at && <> · Sent {format(new Date(inv.sent_at), 'MMM d')}</>}
              </p>

              {canPay && (
                <Button
                  className="w-full"
                  size="sm"
                  onClick={() => setPayDialog({ open: true, invoice: inv })}
                >
                  <DollarSign className="h-4 w-4 mr-1" /> Pay ${Number(inv.balance_due).toFixed(2)}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <h1 className="text-xl font-bold flex items-center gap-2">
        <Receipt className="h-5 w-5 text-primary" /> Billing & Payments
      </h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Amount Owing</p>
            <p className={cn('text-xl font-bold font-mono mt-1', totalOwing > 0 ? 'text-destructive' : 'text-emerald-600')}>
              ${totalOwing.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Overdue</p>
            <p className={cn('text-xl font-bold font-mono mt-1', overdueInvoices.length > 0 ? 'text-destructive' : 'text-muted-foreground')}>
              {overdueInvoices.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payment method summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1.5"><CreditCard className="h-4 w-4" /> Payment Method</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {billingProfile?.payment_method_present ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium capitalize">{billingProfile.card_brand} •••• {billingProfile.card_last4}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {billingProfile.autopay_enabled ? (
                    <span className="text-emerald-600 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Auto-pay enabled</span>
                  ) : 'Manual payments'}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleSaveCard} disabled={savingCard}>
                {savingCard ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5 mr-1" />}
                Update Card
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-muted-foreground">No payment method on file.</p>
              <Button size="sm" onClick={handleSaveCard} disabled={savingCard} className="w-full">
                {savingCard ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <CreditCard className="h-3.5 w-3.5 mr-1" />}
                Add Credit Card
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice tabs */}
      <Tabs defaultValue="open">
        <TabsList className="w-full">
          <TabsTrigger value="open" className="flex-1 text-xs">
            Open {openInvoices.length > 0 && `(${openInvoices.length})`}
          </TabsTrigger>
          <TabsTrigger value="overdue" className="flex-1 text-xs">
            Overdue {overdueInvoices.length > 0 && `(${overdueInvoices.length})`}
          </TabsTrigger>
          <TabsTrigger value="paid" className="flex-1 text-xs">
            Paid {paidInvoices.length > 0 && `(${paidInvoices.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="open" className="space-y-2 mt-3">
          {isLoading ? <p className="text-center text-sm text-muted-foreground py-6">Loading...</p> :
           openInvoices.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
              <CheckCircle className="h-8 w-8 text-emerald-500/40" />
              No open invoices
            </CardContent></Card>
          ) : openInvoices.map((inv: any) => <InvoiceCard key={inv.id} inv={inv} />)}
        </TabsContent>

        <TabsContent value="overdue" className="space-y-2 mt-3">
          {overdueInvoices.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
              <CheckCircle className="h-8 w-8 text-emerald-500/40" />
              Nothing overdue
            </CardContent></Card>
          ) : overdueInvoices.map((inv: any) => <InvoiceCard key={inv.id} inv={inv} />)}
        </TabsContent>

        <TabsContent value="paid" className="space-y-2 mt-3">
          {paidInvoices.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No receipts yet</CardContent></Card>
          ) : paidInvoices.map((inv: any) => <InvoiceCard key={inv.id} inv={inv} />)}
        </TabsContent>
      </Tabs>

      {/* Pay Invoice Dialog */}
      <Dialog open={payDialog.open} onOpenChange={(o) => !o && setPayDialog({ open: false, invoice: null })}>
        <DialogContent className="max-w-sm mx-3">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" /> Pay Invoice
            </DialogTitle>
            <DialogDescription>
              Choose a payment method for invoice {payDialog.invoice?.invoice_number}
            </DialogDescription>
          </DialogHeader>
          {payDialog.invoice && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <p className="text-xs text-muted-foreground">Amount Due</p>
                <p className="text-2xl font-bold font-mono mt-1">${Number(payDialog.invoice.balance_due).toFixed(2)}</p>
              </div>

              {/* E-Transfer option */}
              <Card className="border-primary/20">
                <CardContent className="p-4 space-y-2">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4 text-primary" /> Interac e-Transfer
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Send an e-Transfer to:
                  </p>
                  <div className="bg-muted rounded-md px-3 py-2 text-sm font-mono font-medium">
                    payments@praetoriasnowandice.ca
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Include invoice #{payDialog.invoice.invoice_number} in the message field.
                  </p>
                </CardContent>
              </Card>

              {/* Card payment via Stripe */}
              <Card>
                <CardContent className="p-4 space-y-2">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <CreditCard className="h-4 w-4" /> Pay by Card
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Secure card payments powered by Stripe.
                  </p>
                  <Button
                    className="w-full"
                    size="sm"
                    onClick={handleRequestPaymentLink}
                    disabled={requestingLink}
                  >
                    {requestingLink ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <ExternalLink className="h-3.5 w-3.5 mr-1" />}
                    Pay Now with Card
                  </Button>
                </CardContent>
              </Card>

              <div className="space-y-2 text-xs text-muted-foreground">
                <p>Need help? Contact us:</p>
                <div className="flex flex-col gap-1">
                  <a href="tel:+13067376269" className="inline-flex items-center gap-2 text-primary hover:underline">
                    <Phone className="h-3.5 w-3.5" /> (306) 737-6269
                  </a>
                  <a href="mailto:support@praetoriagroup.ca" className="inline-flex items-center gap-2 text-primary hover:underline">
                    <Mail className="h-3.5 w-3.5" /> support@praetoriagroup.ca
                  </a>
                </div>
              </div>

              <Button variant="outline" className="w-full" onClick={() => setPayDialog({ open: false, invoice: null })}>
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
