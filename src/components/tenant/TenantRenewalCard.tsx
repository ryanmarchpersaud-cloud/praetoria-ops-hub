import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarClock, Check, HelpCircle, XCircle, Mail, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useTenantRenewal, useTenantRespondRenewal } from '@/hooks/pm/useLeaseRenewals';
import { getRenewalStageMeta } from '@/lib/statusLabel';
import { RenewalStageBadge } from '@/components/pm/RenewalStageBadge';
import { toast } from 'sonner';

function fmtDate(d?: string | null) {
  if (!d) return '—';
  try {
    return new Date(d + 'T00:00:00').toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch { return d; }
}

function fmtMoney(n?: number | string | null) {
  if (n === null || n === undefined || n === '') return '—';
  const num = typeof n === 'string' ? Number(n) : n;
  if (!Number.isFinite(num)) return '—';
  return `$${num.toFixed(2)}`;
}

export function TenantRenewalCard() {
  const { data: renewal, isLoading } = useTenantRenewal();
  const respond = useTenantRespondRenewal();

  if (isLoading || !renewal) return null;

  const submit = async (response: 'interested' | 'questions' | 'not_renewing') => {
    try {
      await respond.mutateAsync({ id: renewal.id, response });
      toast.success('Response sent to Praetoria Group.');
    } catch (e: any) { toast.error(e.message); }
  };

  const alreadyResponded = !!renewal.tenant_response;
  const meta = getRenewalStageMeta(renewal.status);
  const canRespond = !alreadyResponded && ['sent_to_tenant', 'tenant_reviewing'].includes(renewal.status);

  const current = renewal.current_rent != null ? Number(renewal.current_rent) : null;
  const proposed = renewal.proposed_rent != null ? Number(renewal.proposed_rent) : null;
  const delta = current != null && proposed != null ? proposed - current : null;
  const deltaPct = current && delta != null && current !== 0 ? (delta / current) * 100 : null;
  const DeltaIcon = delta == null ? Minus : delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const deltaColor = delta == null || delta === 0 ? 'text-slate-600' : delta > 0 ? 'text-amber-700' : 'text-emerald-700';

  return (
    <Card className="border-emerald-300 bg-emerald-50/60">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-sm text-emerald-900 flex items-center gap-2">
            <CalendarClock className="h-4 w-4" /> Lease Renewal
          </CardTitle>
          <RenewalStageBadge status={renewal.status} audience="tenant" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {/* What happens next — plain language helper */}
        {meta.tenantHelper && (
          <div className="rounded-md bg-white/80 border border-emerald-200 p-3">
            <p className="text-[11px] uppercase tracking-wider text-emerald-800 font-semibold mb-1">
              What happens next
            </p>
            <p className="text-slate-800">{meta.tenantHelper}</p>
          </div>
        )}

        {/* Key dates */}
        <div>
          <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">
            Key Dates
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-white border rounded-md p-3">
            <div>
              <p className="text-[11px] text-muted-foreground">Current lease ends</p>
              <p className="font-semibold text-slate-900">{fmtDate(renewal.current_lease_end_date)}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">New lease starts</p>
              <p className="font-semibold text-slate-900">{fmtDate(renewal.proposed_start_date)}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">New lease ends</p>
              <p className="font-semibold text-slate-900">{fmtDate(renewal.proposed_end_date)}</p>
            </div>
          </div>
        </div>

        {/* Rent — current → proposed with delta */}
        <div>
          <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">
            Rent
          </p>
          <div className="flex items-center gap-3 bg-white border rounded-md p-3">
            <div className="text-center flex-1">
              <p className="text-[11px] text-muted-foreground">Current</p>
              <p className="font-semibold text-slate-900">{fmtMoney(current)}</p>
            </div>
            <div className={`flex flex-col items-center ${deltaColor}`}>
              <DeltaIcon className="h-4 w-4" />
              {delta != null && (
                <p className="text-[11px] font-semibold mt-0.5">
                  {delta > 0 ? '+' : ''}{fmtMoney(delta)}
                  {deltaPct != null && (
                    <span className="ml-1">({delta > 0 ? '+' : ''}{deltaPct.toFixed(1)}%)</span>
                  )}
                </p>
              )}
            </div>
            <div className="text-center flex-1">
              <p className="text-[11px] text-muted-foreground">Proposed</p>
              <p className="font-semibold text-slate-900">{fmtMoney(proposed)}</p>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1 text-right">
            per {renewal.rent_frequency || 'month'}
          </p>
        </div>

        {/* Note from Praetoria — only if present */}
        {renewal.tenant_visible_note && (
          <div className="bg-white border rounded-md p-3">
            <p className="text-[11px] uppercase tracking-wider text-emerald-800 font-semibold mb-1">
              Note from Praetoria
            </p>
            <p className="text-slate-800 whitespace-pre-wrap text-[13px]">{renewal.tenant_visible_note}</p>
          </div>
        )}

        {/* Your response status */}
        {alreadyResponded && (
          <div className="rounded-md bg-emerald-100/70 border border-emerald-200 p-3 text-emerald-900">
            <p className="text-[11px] uppercase tracking-wider font-semibold mb-0.5">Your response</p>
            <p className="text-sm font-medium">
              You told us: <span className="capitalize">{String(renewal.tenant_response).replace('_', ' ')}</span>
            </p>
            <p className="text-[11px] mt-1">Thanks — we received it. Your property manager will follow up if needed.</p>
          </div>
        )}

        <p className="text-[11px] text-muted-foreground italic border-l-2 border-emerald-300 pl-2">
          This is a summary for you to review. Final lease terms are confirmed in writing by Praetoria Group.
        </p>

        {canRespond && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
            <Button size="sm" className="bg-emerald-700 hover:bg-emerald-800" onClick={() => submit('interested')}>
              <Check className="h-3 w-3 mr-1" /> I'd like to renew
            </Button>
            <Button size="sm" variant="outline" onClick={() => submit('questions')}>
              <HelpCircle className="h-3 w-3 mr-1" /> I have questions
            </Button>
            <Button size="sm" variant="outline" className="border-red-300 text-red-700 hover:bg-red-50" onClick={() => submit('not_renewing')}>
              <XCircle className="h-3 w-3 mr-1" /> Not renewing
            </Button>
          </div>
        )}

        <Button asChild variant="ghost" size="sm" className="w-full">
          <a href="mailto:ops@praetoriagroup.ca">
            <Mail className="h-3 w-3 mr-1" /> Contact Praetoria (ops@praetoriagroup.ca)
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
