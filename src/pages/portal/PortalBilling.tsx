import { useState } from 'react';
import { useInvoices, useBillingProfile } from '@/hooks/useInvoices';
import { useCustomerProfile } from '@/hooks/useUserRole';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditCard, FileText, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function PortalBilling() {
  const { data: customer } = useCustomerProfile();
  const { data: allInvoices = [], isLoading } = useInvoices();
  const { data: billingProfile } = useBillingProfile(customer?.id);

  const openInvoices = allInvoices.filter((i: any) => ['Sent', 'Viewed'].includes(i.status));
  const overdueInvoices = allInvoices.filter((i: any) => i.status === 'Overdue');
  const paidInvoices = allInvoices.filter((i: any) => i.status === 'Paid');
  const totalOwing = [...openInvoices, ...overdueInvoices].reduce((sum: number, i: any) => sum + Number(i.balance_due || 0), 0);

  const InvoiceCard = ({ inv }: { inv: any }) => (
    <Card className={inv.status === 'Overdue' ? 'border-destructive/30' : ''}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-sm mono">{inv.invoice_number}</p>
              <StatusBadge status={inv.status} showIcon={false} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Due {format(new Date(inv.due_date), 'MMM d, yyyy')}</p>
            {inv.properties?.property_name && (
              <p className="text-xs text-muted-foreground">{inv.properties.property_name}</p>
            )}
          </div>
          <div className="text-right">
            <p className="font-semibold mono">${Number(inv.total).toFixed(2)}</p>
            {Number(inv.balance_due) > 0 && Number(inv.balance_due) !== Number(inv.total) && (
              <p className="text-[10px] text-muted-foreground">bal ${Number(inv.balance_due).toFixed(2)}</p>
            )}
          </div>
        </div>
        {inv.status === 'Paid' && inv.paid_at && (
          <p className="text-[11px] text-success mt-2 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" /> Paid {format(new Date(inv.paid_at), 'MMM d, yyyy')}
          </p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4 animate-fade-in">
      <h1 className="text-xl font-bold">Billing & Payments</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Amount Owing</p>
            <p className={`text-xl font-bold mono mt-1 ${totalOwing > 0 ? 'text-destructive' : 'text-success'}`}>
              ${totalOwing.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Overdue</p>
            <p className={`text-xl font-bold mono mt-1 ${overdueInvoices.length > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
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
        <CardContent className="text-sm">
          {billingProfile?.payment_method_present ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium capitalize">{billingProfile.card_brand} •••• {billingProfile.card_last4}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {billingProfile.autopay_enabled ? (
                    <span className="text-success flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Auto-pay enabled</span>
                  ) : 'Manual payments'}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">No payment method on file. Contact us to set up card payments.</p>
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
              <CheckCircle className="h-8 w-8 text-success/40" />
              No open invoices
            </CardContent></Card>
          ) : openInvoices.map((inv: any) => <InvoiceCard key={inv.id} inv={inv} />)}
        </TabsContent>

        <TabsContent value="overdue" className="space-y-2 mt-3">
          {overdueInvoices.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
              <CheckCircle className="h-8 w-8 text-success/40" />
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
    </div>
  );
}
