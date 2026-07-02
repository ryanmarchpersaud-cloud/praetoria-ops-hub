import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, DollarSign, CreditCard, Landmark, Repeat, Send, Mail,
  Info, ReceiptText,
} from 'lucide-react';
import { useMyBalance, useMyNextDue } from '@/hooks/useTenantPortalExt';

const SUPPORT_EMAIL = 'ops@praetoriagroup.ca';

const METHODS = [
  { icon: CreditCard, label: 'Credit / debit card' },
  { icon: Landmark, label: 'Bank transfer (ACH)' },
  { icon: Send, label: 'Interac e-transfer' },
  { icon: Repeat, label: 'Autopay / recurring' },
];

const TYPE_LABEL: Record<string, string> = {
  charge: 'Charge',
  rent_charge: 'Rent charge',
  payment: 'Payment received',
  credit: 'Credit',
  adjustment_credit: 'Credit adjustment',
  adjustment_charge: 'Charge adjustment',
  refund: 'Refund',
  deposit_refund: 'Deposit refund',
  late_fee: 'Late fee',
  deposit: 'Security deposit',
  nsf_fee: 'Returned payment fee',
  other_charge: 'Other charge',
  other_credit: 'Other credit',
  payment_plan_note: 'Payment plan',
};

const CREDIT_TYPES = ['payment', 'credit', 'refund', 'adjustment_credit', 'deposit_refund', 'other_credit'];

export default function TenantPayments() {
  const { balance, entries } = useMyBalance();
  const { data: nextDue } = useMyNextDue();

  return (
    <div className="p-4 space-y-4">
      <Button asChild variant="ghost" size="sm">
        <Link to="/tenant"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link>
      </Button>

      <Card className="border-emerald-200 bg-emerald-50/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-emerald-800 flex items-center gap-2">
            <DollarSign className="h-4 w-4" /> Current Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-slate-900">
            ${balance.toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {balance > 0
              ? 'Amount owing on your account.'
              : balance < 0
                ? 'You have a credit on your account.'
                : 'No outstanding balance.'}
          </p>
          {nextDue && (
            <p className="text-xs text-emerald-800 mt-2 font-medium">
              Next rent due: {new Date(nextDue).toLocaleDateString()}
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="p-4 flex items-start gap-3">
          <Info className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-amber-900">
              Online rent payments — coming soon
            </p>
            <p className="text-amber-800 mt-1">
              Online payment processing is not yet active in the Tenant Portal. To pay
              rent right now, please email{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="underline font-medium">
                {SUPPORT_EMAIL}
              </a>{' '}
              and your property manager will send payment instructions.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Planned Payment Methods</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {METHODS.map(m => (
            <div
              key={m.label}
              className="flex items-center justify-between border rounded-lg px-3 py-2.5"
            >
              <div className="flex items-center gap-2 text-sm">
                <m.icon className="h-4 w-4 text-emerald-700" />
                <span>{m.label}</span>
              </div>
              <Badge variant="outline" className="text-[10px]">Coming soon</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ReceiptText className="h-4 w-4 text-emerald-700" /> Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No entries on your account yet.
            </p>
          ) : (
            <div className="divide-y">
              {entries.slice(0, 15).map((e: any) => {
                const isPositive = ['payment', 'credit', 'refund'].includes(e.type);
                return (
                  <div key={e.id} className="py-2 flex items-center justify-between text-sm">
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {TYPE_LABEL[e.type] ?? e.type}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(e.entry_date).toLocaleDateString()}
                        {e.description ? ` · ${e.description}` : ''}
                      </p>
                    </div>
                    <p
                      className={`font-semibold ${isPositive ? 'text-emerald-700' : 'text-slate-900'}`}
                    >
                      {isPositive ? '-' : '+'}${Number(e.amount).toFixed(2)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <a
        href={`mailto:${SUPPORT_EMAIL}`}
        className="flex items-center justify-center gap-2 text-emerald-700 font-medium py-2"
      >
        <Mail className="h-4 w-4" /> Contact {SUPPORT_EMAIL}
      </a>
    </div>
  );
}
