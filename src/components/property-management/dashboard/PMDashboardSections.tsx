import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Building2, DollarSign, AlertTriangle, KeyRound, CalendarClock,
  Users, ClipboardList, CalendarDays, Wrench, TimerReset, Clock, CheckCircle2,
  FileText, ArrowRight, Home,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  usePMBusinessKPIs, useLeasingPipeline, useShowingsToday, useStaffTasksToday,
  useRenewalsAttention, useMaintenanceByPriority, usePMStaffActivity,
} from '@/hooks/pm/useDashboardData';

const fmt$ = (n: number) => n.toLocaleString('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 });
const fmtHours = (hours: number) => {
  if (!Number.isFinite(hours) || hours <= 0) return '0m';
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}m`;
  return `${hours.toFixed(1)}h`;
};

/* ─── Row 1 ─────────────────────────────────────────────────────────── */
export function PMBusinessKPIs({ hideFinance = false }: { hideFinance?: boolean }) {
  const { data } = usePMBusinessKPIs();
  const collectionRate = data && data.rentBilled > 0
    ? Math.round((data.rentCollected / data.rentBilled) * 100) : 0;

  const cards: Array<{ label: string; value: string; sub?: string; icon: any; tone: string; to: string }> = [
    { label: 'Occupancy', value: `${data?.occupancyPct ?? 0}%`,
      sub: `${data?.occupiedUnits ?? 0} / ${data?.totalUnits ?? 0} units`,
      icon: Home, tone: 'text-emerald-600 bg-emerald-500/10', to: '/property-management/units' },
    { label: 'Active leases', value: String(data?.activeLeases ?? 0),
      sub: `${data?.expiringSoon ?? 0} expiring ≤ 60d`,
      icon: KeyRound, tone: 'text-amber-600 bg-amber-500/10', to: '/property-management/leases' },
  ];
  if (!hideFinance) {
    cards.splice(1, 0,
      { label: 'Rent collected (MTD)', value: fmt$(data?.rentCollected ?? 0),
        sub: `${collectionRate}% of ${fmt$(data?.rentBilled ?? 0)} billed`,
        icon: DollarSign, tone: 'text-teal-600 bg-teal-500/10', to: '/property-management/finance' },
      { label: 'Outstanding A/R', value: fmt$(data?.outstandingAR ?? 0),
        sub: 'All open balances',
        icon: FileText, tone: 'text-sky-600 bg-sky-500/10', to: '/property-management/finance' },
      { label: 'Overdue', value: fmt$(data?.overdueBalance ?? 0),
        sub: 'Past due date',
        icon: AlertTriangle, tone: 'text-rose-600 bg-rose-500/10', to: '/property-management/finance' },
    );
  }

  return (
    <div className={cn('grid gap-4', hideFinance ? 'grid-cols-2 md:grid-cols-2' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5')}>
      {cards.map((c) => (
        <Link key={c.label} to={c.to}
          className="group rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
          <div className="flex items-start justify-between">
            <div className={cn('p-2 rounded-lg', c.tone)}><c.icon className="h-5 w-5" strokeWidth={2.25} /></div>
            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="mt-3 text-2xl font-bold tabular-nums text-foreground">{c.value}</div>
          <div className="text-sm font-medium text-foreground/70">{c.label}</div>
          {c.sub && <div className="mt-0.5 text-xs text-muted-foreground">{c.sub}</div>}
        </Link>
      ))}
    </div>
  );
}

/* ─── Row 2 ─────────────────────────────────────────────────────────── */
export function LeasingPipelineCard() {
  const { data } = useLeasingPipeline();
  const stages = [
    { label: 'Prospects', value: data?.prospects ?? 0, to: '/pm-staff/prospects', color: 'bg-slate-500' },
    { label: 'Showings (14d)', value: data?.showings ?? 0, to: '/pm-staff/showings', color: 'bg-sky-500' },
    { label: 'Applications', value: data?.appsSubmitted ?? 0, to: '/pm-staff/applications', color: 'bg-violet-500' },
    { label: 'In review', value: data?.appsInReview ?? 0, to: '/pm-staff/applications', color: 'bg-amber-500' },
    { label: 'Approved', value: data?.appsApproved ?? 0, to: '/pm-staff/applications', color: 'bg-emerald-600' },
  ];
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Users className="h-4 w-4 text-violet-600" /> Leasing pipeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-5 gap-2">
          {stages.map((s, i) => (
            <Link key={s.label} to={s.to} className="group rounded-lg border p-3 text-center hover:bg-accent/40 transition-colors">
              <div className="text-2xl font-bold tabular-nums">{s.value}</div>
              <div className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">{s.label}</div>
              <div className={cn('mt-2 h-1 rounded-full mx-auto', s.color)} style={{ width: `${20 + i * 15}%` }} />
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Row 3 ─────────────────────────────────────────────────────────── */
export function TodayShowingsCard() {
  const { data } = useShowingsToday();
  const rows = data ?? [];
  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-sky-600" /> Showings today
        </CardTitle>
        <Badge variant="secondary">{rows.length}</Badge>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No showings scheduled today.</p>
        ) : (
          <ul className="divide-y">
            {rows.slice(0, 6).map((s) => (
              <li key={s.id} className="py-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">
                    {s.prospect?.name ?? 'Prospect'} · {s.unit?.unit_label ?? s.property?.property_name ?? '—'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(s.scheduled_at).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })}
                    {' · '}{s.status}
                  </div>
                </div>
                <Link to="/pm-staff/showings" className="text-xs text-sky-600 hover:underline shrink-0">Open</Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function StaffTasksTodayCard() {
  const { data } = useStaffTasksToday();
  const rows = data ?? [];
  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-amber-600" /> Tasks due today
        </CardTitle>
        <Badge variant="secondary">{rows.length}</Badge>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No open tasks due today.</p>
        ) : (
          <ul className="divide-y">
            {rows.slice(0, 6).map((t) => (
              <li key={t.id} className="py-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{t.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {t.priority ?? 'normal'} · due {t.due_date ?? '—'}
                  </div>
                </div>
                <Link to="/pm-staff/tasks" className="text-xs text-amber-600 hover:underline shrink-0">Open</Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Row 4 ─────────────────────────────────────────────────────────── */
export function RenewalsAttentionCard() {
  const { data } = useRenewalsAttention();
  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-emerald-600" /> Renewals needing attention
        </CardTitle>
        <div className="flex items-center gap-2">
          {data && data.overdue > 0 && (
            <Badge variant="destructive" className="text-[10px]">{data.overdue} overdue</Badge>
          )}
          <Badge variant="secondary">{data?.total ?? 0}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {(data?.rows?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No renewals needing attention.</p>
        ) : (
          <ul className="divide-y">
            {data!.rows.map((r: any) => {
              const delta = r.proposed_rent && r.current_rent
                ? Number(r.proposed_rent) - Number(r.current_rent) : null;
              return (
                <li key={r.id} className="py-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      {r.tenant?.first_name ?? ''} {r.tenant?.last_name ?? ''} · {r.unit?.unit_label ?? r.property?.property_name ?? '—'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Ends {r.current_lease_end_date ?? '—'} · {r.status}
                      {delta !== null && ` · ${delta >= 0 ? '+' : ''}${fmt$(delta)}`}
                    </div>
                  </div>
                  <Link to="/property-management/renewals" className="text-xs text-emerald-600 hover:underline shrink-0">Open</Link>
                </li>
              );
            })}
          </ul>
        )}
        <div className="mt-3 text-right">
          <Link to="/property-management/renewals" className="text-xs text-emerald-600 hover:underline">
            View all renewals →
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export function MaintenanceByPriorityCard() {
  const { data } = useMaintenanceByPriority();
  const items = [
    { label: 'Emergency', value: data?.emergency ?? 0, tone: 'bg-rose-500/10 text-rose-700 border-rose-500/30' },
    { label: 'High',      value: data?.high ?? 0,      tone: 'bg-amber-500/10 text-amber-700 border-amber-500/30' },
    { label: 'Normal',    value: data?.normal ?? 0,    tone: 'bg-sky-500/10 text-sky-700 border-sky-500/30' },
    { label: 'Low',       value: data?.low ?? 0,       tone: 'bg-slate-500/10 text-slate-700 border-slate-500/30' },
  ];
  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Wrench className="h-4 w-4 text-rose-600" /> Open maintenance by priority
        </CardTitle>
        <Badge variant="secondary">{data?.total ?? 0}</Badge>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-2">
          {items.map((i) => (
            <Link key={i.label} to="/property-management/maintenance"
              className={cn('rounded-lg border p-3 text-center hover:shadow-sm transition-shadow', i.tone)}>
              <div className="text-2xl font-bold tabular-nums">{i.value}</div>
              <div className="mt-1 text-[11px] uppercase tracking-wide font-medium">{i.label}</div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Row 5 (admin-only) ───────────────────────────────────────────── */
export function StaffActivityCard({ enabled }: { enabled: boolean }) {
  const { data, isLoading, error } = usePMStaffActivity(enabled);
  if (!enabled) return null;
  const loadError = error instanceof Error ? error.message : error ? 'Unable to load staff activity.' : null;
  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <TimerReset className="h-4 w-4 text-indigo-600" /> PM staff activity (today)
        </CardTitle>
        <Badge variant="outline" className="text-[10px]">Admin only</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {loadError && (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-700">
            Staff activity is not loading: {loadError}
          </div>
        )}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border p-3 bg-emerald-500/5">
            <div className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Clocked in</div>
            <div className="text-2xl font-bold tabular-nums">{isLoading ? '—' : (data?.clockedIn.length ?? 0)}</div>
          </div>
          <div className="rounded-lg border p-3 bg-slate-500/5">
            <div className="text-xs text-muted-foreground flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Clocked out</div>
            <div className="text-2xl font-bold tabular-nums">{isLoading ? '—' : (data?.clockedOutToday.length ?? 0)}</div>
          </div>
          <div className="rounded-lg border p-3 bg-indigo-500/5">
            <div className="text-xs text-muted-foreground">Hours logged</div>
            <div className="text-2xl font-bold tabular-nums">{isLoading ? '—' : fmtHours(data?.hoursTodayTotal ?? 0)}</div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Currently clocked in</div>
            {(data?.clockedIn.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No one clocked in.</p>
            ) : (
              <ul className="divide-y">
                {data!.clockedIn.map((r: any) => (
                  <li key={r.user_id} className="py-1.5 flex items-center justify-between text-sm">
                    <span className="truncate">{r.name} <span className="text-xs text-muted-foreground">· {r.role}</span></span>
                    <span className="tabular-nums text-emerald-600 font-medium">{fmtHours(Number(r.elapsed ?? 0))}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Clocked out today</div>
            {(data?.clockedOutToday.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No completed shifts yet.</p>
            ) : (
              <ul className="divide-y">
                {data!.clockedOutToday.map((r: any) => (
                  <li key={r.user_id} className="py-1.5 flex items-center justify-between text-sm">
                    <span className="truncate">{r.name} <span className="text-xs text-muted-foreground">· {r.role}</span></span>
                    <span className="tabular-nums text-muted-foreground">{fmtHours(Number(r.hours ?? 0))}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <Link to="/pm-staff/applications"
          className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent/40 transition-colors">
          <div>
            <div className="text-sm font-medium">Applications waiting review</div>
            <div className="text-xs text-muted-foreground">Ready for PM staff triage</div>
          </div>
          <div className="text-2xl font-bold tabular-nums text-amber-600">
            {isLoading ? '—' : (data?.appsWaiting ?? 0)}
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}
