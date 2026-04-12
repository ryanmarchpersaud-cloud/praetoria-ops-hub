import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StatusBadge } from '@/components/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft, CreditCard, Banknote, Send, MoreHorizontal, FileText,
  CheckCircle, Clock, Truck, Receipt, User, MapPin, CalendarDays,
  DollarSign, Hash, Mail, Loader2,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { useState } from 'react';

const fmt = (n: number) => '$' + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function statusLabel(p: any): string {
  if (p.is_reversed) return 'Refunded';
  if (p.payment_type === 'refund') return 'Refunded';
  return 'Succeeded';
}

function methodLabel(m: string | null): string {
  if (!m) return '—';
  const map: Record<string, string> = {
    card: 'Card', e_transfer: 'E-Transfer', ach: 'ACH / Bank', cash: 'Cash',
    cheque: 'Cheque', online: 'Online', stripe: 'Online (Stripe)',
  };
  return map[m] || m.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function PaymentDetail() {
  const { id } = useParams();
  const [sendingReceipt, setSendingReceipt] = useState(false);

  const { data: payment, isLoading } = useQuery({
    queryKey: ['payment_detail', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('finance_payments')
        .select('*, finance_accounts(account_name), invoices(id, invoice_number, customer_id, total, status, issue_date, due_date, paid_at, customers(*))')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Billing profile for card info
  const { data: billingProfile } = useQuery({
    queryKey: ['billing_profile_payment', payment?.invoices?.customer_id],
    queryFn: async () => {
      const custId = payment?.invoices?.customer_id;
      if (!custId) return null;
      const { data, error } = await supabase
        .from('customer_billing_profiles')
        .select('*')
        .eq('customer_id', custId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!payment?.invoices?.customer_id,
  });

  // Activity log for this invoice
  const { data: activities = [] } = useQuery({
    queryKey: ['payment_activity', payment?.invoice_id],
    queryFn: async () => {
      if (!payment?.invoice_id) return [];
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('record_id', payment.invoice_id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) return [];
      return data ?? [];
    },
    enabled: !!payment?.invoice_id,
  });

  // Notifications sent for this invoice
  const { data: notifications = [] } = useQuery({
    queryKey: ['payment_notifications', payment?.invoice_id],
    queryFn: async () => {
      if (!payment?.invoice_id) return [];
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('record_id', payment.invoice_id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) return [];
      return data ?? [];
    },
    enabled: !!payment?.invoice_id,
  });

  const handleSendReceipt = async () => {
    if (!payment?.invoices?.customers?.email) { toast.error('No customer email'); return; }
    setSendingReceipt(true);
    try {
      const cust = payment.invoices.customers;
      const customerName = `${cust.first_name || ''} ${cust.last_name || ''}`.trim();
      await supabase.functions.invoke('send-notification', {
        body: {
          event: 'payment_received',
          customer_id: payment.invoices.customer_id,
          record_type: 'invoice',
          record_id: payment.invoice_id,
          channels: ['in_app', 'email'],
          audience: 'customer',
          variables: {
            customer_name: customerName,
            invoice_number: payment.invoices.invoice_number || '',
            amount_paid: Number(payment.amount).toFixed(2),
            total: Number(payment.invoices.total).toFixed(2),
            to_email: cust.email || '',
          },
        },
      });
      toast.success('Receipt sent to customer');
    } catch { toast.error('Failed to send receipt'); } finally { setSendingReceipt(false); }
  };

  if (isLoading) return <div className="p-6"><Skeleton className="h-96" /></div>;
  if (!payment) return <div className="p-6 text-center text-muted-foreground">Payment not found</div>;

  const inv = payment.invoices;
  const cust = inv?.customers;
  const status = statusLabel(payment);
  const statusVariant = status === 'Succeeded' ? 'Paid' : status === 'Refunded' ? 'Voided' : status;

  // Build timeline events
  const timeline: { icon: any; label: string; date: string; color: string }[] = [];
  timeline.push({ icon: DollarSign, label: 'Payment Collected', date: payment.payment_date, color: 'text-success' });
  if (payment.reconciled && payment.reconciled_at) {
    timeline.push({ icon: CheckCircle, label: 'Reconciled', date: payment.reconciled_at, color: 'text-accent' });
  }
  if (payment.is_reversed && payment.reversed_at) {
    timeline.push({ icon: Receipt, label: 'Refunded', date: payment.reversed_at, color: 'text-destructive' });
  }

  // Build activity feed from notifications + activities
  const feed = [
    ...notifications.map((n: any) => ({
      date: n.created_at || n.sent_at,
      label: n.subject || n.event?.replace(/_/g, ' ') || 'Notification',
      detail: n.body?.substring(0, 100) || '',
    })),
    ...activities.map((a: any) => ({
      date: a.created_at,
      label: a.action_name?.replace(/_/g, ' ') || 'Activity',
      detail: typeof a.payload_summary === 'string' ? a.payload_summary : JSON.stringify(a.payload_summary || '').substring(0, 100),
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link to="/finance/payments" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl md:text-2xl font-bold">Payment</h1>
            <StatusBadge status={statusVariant} />
          </div>
          {cust && <p className="text-xs text-muted-foreground mt-0.5">{cust.first_name} {cust.last_name}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleSendReceipt} disabled={sendingReceipt}>
            {sendingReceipt ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
            Send Receipt
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {inv && (
                <DropdownMenuItem asChild>
                  <Link to={`/invoices/${inv.id}`}><FileText className="h-4 w-4 mr-2" /> View Invoice</Link>
                </DropdownMenuItem>
              )}
              {cust && (
                <DropdownMenuItem asChild>
                  <Link to={`/customers/${inv.customer_id}`}><User className="h-4 w-4 mr-2" /> View Customer</Link>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Main Panel */}
        <div className="md:col-span-2 space-y-4">
          {/* Amount Card */}
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-1">Total Collected</p>
              <p className="text-3xl font-bold tabular-nums">{fmt(Number(payment.amount))}</p>
            </CardContent>
          </Card>

          {/* Payment Summary */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Payment Summary</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount Paid</span>
                <span className="font-medium tabular-nums">{fmt(Number(payment.amount))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Method</span>
                <span className="font-medium flex items-center gap-1.5">
                  {payment.payment_method === 'card' ? <CreditCard className="h-3.5 w-3.5" /> : <Banknote className="h-3.5 w-3.5" />}
                  {methodLabel(payment.payment_method)}
                </span>
              </div>
              {billingProfile?.payment_method_present && payment.payment_method === 'card' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Card</span>
                    <span className="font-medium capitalize">{billingProfile.card_brand} •••• {billingProfile.card_last4}</span>
                  </div>
                  {(billingProfile as any).card_exp_month && (billingProfile as any).card_exp_year && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Expiry</span>
                      <span className="font-medium">{String((billingProfile as any).card_exp_month).padStart(2, '0')}/{(billingProfile as any).card_exp_year}</span>
                    </div>
                  )}
                </>
              )}
              {payment.reference_number && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Transaction #</span>
                  <span className="font-mono text-xs">{payment.reference_number}</span>
                </div>
              )}
              <Separator />
              {inv && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Applied to</span>
                  <Link to={`/invoices/${inv.id}`} className="text-primary hover:underline font-medium text-xs flex items-center gap-1">
                    <FileText className="h-3 w-3" /> {inv.invoice_number}
                  </Link>
                </div>
              )}
              {payment.finance_accounts?.account_name && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Deposit Account</span>
                  <span className="font-medium">{payment.finance_accounts.account_name}</span>
                </div>
              )}
              {payment.internal_note && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Notes</span>
                  <span className="text-xs max-w-[200px] text-right">{payment.internal_note}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Feed */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {feed.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No activity recorded yet</p>
              ) : (
                <div className="space-y-3">
                  {feed.slice(0, 15).map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                        <CalendarDays className="h-3 w-3 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium capitalize">{item.label}</p>
                        {item.detail && <p className="text-xs text-muted-foreground truncate">{item.detail}</p>}
                      </div>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {format(parseISO(item.date), 'MMM d, h:mm a')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Timeline */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Timeline</CardTitle></CardHeader>
            <CardContent>
              <div className="relative pl-6 space-y-4">
                <div className="absolute left-2.5 top-1 bottom-1 w-px bg-border" />
                {timeline.map((t, i) => (
                  <div key={i} className="relative flex items-start gap-3">
                    <div className={`absolute -left-6 top-0.5 h-5 w-5 rounded-full bg-background border-2 border-current flex items-center justify-center ${t.color}`}>
                      <t.icon className="h-2.5 w-2.5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{t.label}</p>
                      <p className="text-[10px] text-muted-foreground">{format(parseISO(t.date), 'MMM d, yyyy h:mm a')}</p>
                    </div>
                  </div>
                ))}
                {/* Future states */}
                {!payment.reconciled && (
                  <div className="relative flex items-start gap-3 opacity-40">
                    <div className="absolute -left-6 top-0.5 h-5 w-5 rounded-full bg-background border-2 border-muted-foreground flex items-center justify-center">
                      <Truck className="h-2.5 w-2.5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Deposited</p>
                      <p className="text-[10px] text-muted-foreground">Pending</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Client Info */}
          {cust && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Client</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-1">
                <Link to={`/customers/${inv.customer_id}`} className="font-medium text-primary hover:underline block">
                  {cust.first_name} {cust.last_name}
                </Link>
                {cust.company_name && <p className="text-muted-foreground">{cust.company_name}</p>}
                {cust.email && (
                  <p className="text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" /> {cust.email}
                  </p>
                )}
                {cust.phone && <p className="text-muted-foreground">{cust.phone}</p>}
                {cust.address_line_1 && (
                  <p className="text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {cust.address_line_1}
                  </p>
                )}
                {(cust.city || cust.province) && (
                  <p className="text-muted-foreground">{[cust.city, cust.province, cust.postal_code].filter(Boolean).join(', ')}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Invoice Quick View */}
          {inv && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Linked Invoice</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-2">
                <Link to={`/invoices/${inv.id}`} className="text-primary hover:underline font-medium flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" /> {inv.invoice_number}
                </Link>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <StatusBadge status={inv.status} />
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-medium tabular-nums">{fmt(Number(inv.total))}</span>
                </div>
                {inv.paid_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Paid At</span>
                    <span className="text-xs">{format(parseISO(inv.paid_at), 'MMM d, yyyy')}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
