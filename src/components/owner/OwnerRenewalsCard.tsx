import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarClock, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useOwnerRenewals } from '@/hooks/useOwnerRenewals';
import { RenewalStageBadge } from '@/components/pm/RenewalStageBadge';
import { getRenewalStageMeta } from '@/lib/statusLabel';

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

const LEGEND: Array<{ status: string; label: string }> = [
  { status: 'renewal_prepared', label: 'Prepared' },
  { status: 'sent_to_tenant', label: 'Sent to tenant' },
  { status: 'tenant_reviewing', label: 'Tenant reviewing' },
  { status: 'tenant_accepted', label: 'Accepted' },
  { status: 'tenant_declined', label: 'Declined' },
  { status: 'month_to_month', label: 'Month-to-month' },
  { status: 'non_renewal', label: 'Non-renewal' },
  { status: 'completed', label: 'Complete' },
];

interface Props {
  propertyId?: string;
}

export function OwnerRenewalsCard({ propertyId }: Props) {
  const { data: renewals = [], isLoading } = useOwnerRenewals(propertyId);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-slate-700" /> Lease Renewals
          </CardTitle>
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-slate-800"
                  aria-label="Stage legend"
                >
                  <Info className="h-3.5 w-3.5" /> Stage legend
                </button>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs">
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold">Renewal stages</p>
                  {LEGEND.map((s) => (
                    <div key={s.status} className="flex items-center gap-2">
                      <RenewalStageBadge status={s.status} audience="owner" className="text-[10px] py-0" />
                      <span className="text-[11px] text-slate-600">
                        {getRenewalStageMeta(s.status).ownerHelper}
                      </span>
                    </div>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : renewals.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No renewals are being tracked for your properties right now.
          </p>
        ) : (
          <div className="divide-y">
            {renewals.map((r: any) => {
              const tenantName = [r.tenant?.first_name, r.tenant?.last_name].filter(Boolean).join(' ') || '—';
              const current = r.current_rent != null ? Number(r.current_rent) : null;
              const proposed = r.proposed_rent != null ? Number(r.proposed_rent) : null;
              const delta = current != null && proposed != null ? proposed - current : null;
              return (
                <div key={r.id} className="py-3 first:pt-0 last:pb-0 space-y-1.5">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {tenantName}
                        {r.unit?.unit_label && (
                          <span className="text-muted-foreground font-normal"> · Unit {r.unit.unit_label}</span>
                        )}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {r.property?.property_name || '—'}
                      </p>
                    </div>
                    <RenewalStageBadge status={r.status} audience="owner" />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    <div>
                      <p className="text-muted-foreground">Current ends</p>
                      <p className="font-medium text-slate-800">{fmtDate(r.current_lease_end_date)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">New term</p>
                      <p className="font-medium text-slate-800">
                        {fmtDate(r.proposed_start_date)} → {fmtDate(r.proposed_end_date)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Rent</p>
                      <p className="font-medium text-slate-800">
                        {fmtMoney(current)} → {fmtMoney(proposed)}
                        {delta != null && delta !== 0 && (
                          <span className={`ml-1 ${delta > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                            ({delta > 0 ? '+' : ''}{fmtMoney(delta)})
                          </span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Tenant response</p>
                      <p className="font-medium text-slate-800 capitalize">
                        {r.tenant_response ? String(r.tenant_response).replace('_', ' ') : 'Awaiting'}
                      </p>
                    </div>
                  </div>

                  {r.owner_visible_note && (
                    <div className="mt-1 bg-slate-50 border rounded-md p-2 text-[12px] text-slate-800 whitespace-pre-wrap">
                      <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block mb-0.5">
                        Note from Praetoria
                      </span>
                      {r.owner_visible_note}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
