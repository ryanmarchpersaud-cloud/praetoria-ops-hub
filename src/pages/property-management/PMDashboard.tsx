import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Building2, DoorOpen, Users, FileSignature, Briefcase,
  KeyRound, CheckCircle2, XCircle, ArrowRight, ChevronDown, ChevronUp,
} from 'lucide-react';
import { usePmSummary } from '@/hooks/usePropertyManagement';
import { RecentTenantActivity } from '@/components/property-management/RecentTenantActivity';
import { cn } from '@/lib/utils';

type KpiTone = 'indigo' | 'emerald' | 'amber' | 'rose' | 'sky' | 'violet' | 'slate' | 'teal';

const TONE_STYLES: Record<KpiTone, { icon: string; ring: string; accent: string }> = {
  indigo:  { icon: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',   ring: 'hover:border-indigo-500/40',  accent: 'text-indigo-600 dark:text-indigo-400' },
  emerald: { icon: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', ring: 'hover:border-emerald-500/40', accent: 'text-emerald-600 dark:text-emerald-400' },
  amber:   { icon: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',       ring: 'hover:border-amber-500/40',   accent: 'text-amber-600 dark:text-amber-400' },
  rose:    { icon: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',           ring: 'hover:border-rose-500/40',    accent: 'text-rose-600 dark:text-rose-400' },
  sky:     { icon: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',              ring: 'hover:border-sky-500/40',     accent: 'text-sky-600 dark:text-sky-400' },
  violet:  { icon: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',     ring: 'hover:border-violet-500/40',  accent: 'text-violet-600 dark:text-violet-400' },
  slate:   { icon: 'bg-slate-500/10 text-slate-700 dark:text-slate-300',        ring: 'hover:border-slate-500/40',   accent: 'text-slate-700 dark:text-slate-300' },
  teal:    { icon: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',           ring: 'hover:border-teal-500/40',    accent: 'text-teal-600 dark:text-teal-400' },
};

function KpiCard({
  label, value, icon: Icon, to, tone,
}: { label: string; value: number | string; icon: any; to: string; tone: KpiTone }) {
  const t = TONE_STYLES[tone];
  return (
    <Link
      to={to}
      className={cn(
        'group relative block rounded-xl border bg-card p-5 shadow-sm transition-all',
        'hover:shadow-lg hover:-translate-y-0.5 hover:bg-accent/30',
        t.ring,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={cn('p-2.5 rounded-lg', t.icon)}>
          <Icon className="h-6 w-6" strokeWidth={2.25} />
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
      </div>
      <div className="mt-4">
        <div className={cn('text-3xl font-bold tracking-tight tabular-nums text-foreground')}>{value}</div>
        <div className="mt-1 text-sm font-medium text-foreground/70">{label}</div>
      </div>
    </Link>
  );
}


const STEPS = [
  { n: 1, title: 'Add a property owner',      to: '/property-management/owners',     icon: Briefcase,     hint: 'Landlord or LLC that owns the property.' },
  { n: 2, title: 'Add a managed property',    to: '/property-management/properties', icon: Building2,     hint: 'Address, type, and primary owner.' },
  { n: 3, title: 'Add units under it',        to: '/property-management/units',      icon: DoorOpen,      hint: 'One row per rentable door.' },
  { n: 4, title: 'Register tenants',          to: '/property-management/tenants',    icon: Users,         hint: 'Contact info for each renter.' },
  { n: 5, title: 'Create a lease',            to: '/property-management/leases',     icon: FileSignature, hint: 'Ties tenant to a unit with terms.' },
];

export default function PMDashboard() {
  const { data: s } = usePmSummary();
  const totalProperties = s?.totalProperties ?? 0;
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (totalProperties > 0) {
      setOpen(false);
    }
  }, [totalProperties]);

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <div className="rounded-xl border border-emerald-600/20 bg-gradient-to-r from-emerald-50 via-emerald-50/40 to-transparent dark:from-emerald-950/30 dark:via-emerald-950/10 dark:to-transparent p-5">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-600 text-white shadow-sm">
            <Building2 className="h-6 w-6" strokeWidth={2.25} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Property Management</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Managed properties, units, owners, tenants, and leases.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <KpiCard label="Managed properties" value={s?.totalProperties ?? 0} icon={Building2}     tone="indigo"  to="/property-management/properties" />
        <KpiCard label="Active properties"  value={s?.activeProperties ?? 0} icon={CheckCircle2} tone="emerald" to="/property-management/properties?active=true" />
        <KpiCard label="Total units"        value={s?.totalUnits ?? 0}       icon={DoorOpen}     tone="sky"     to="/property-management/units" />
        <KpiCard label="Occupied units"     value={s?.occupiedUnits ?? 0}    icon={CheckCircle2} tone="teal"    to="/property-management/units?status=occupied" />
        <KpiCard label="Vacant units"       value={s?.vacantUnits ?? 0}      icon={XCircle}      tone="rose"    to="/property-management/units?status=vacant" />
        <KpiCard label="Active tenants"     value={s?.activeTenants ?? 0}    icon={Users}        tone="violet"  to="/property-management/tenants" />
        <KpiCard label="Active leases"      value={s?.activeLeases ?? 0}     icon={KeyRound}     tone="amber"   to="/property-management/leases" />
        <KpiCard label="Property owners"    value={s?.totalOwners ?? 0}      icon={Briefcase}    tone="slate"   to="/property-management/owners" />
      </div>

      <RecentTenantActivity />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-lg font-semibold">Getting started</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Phase 1 — Admin foundation only. Tenant and owner portals are reserved for future phases.
            </p>
          </div>
          <button
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring h-8 w-8 hover:bg-accent hover:text-accent-foreground"
            aria-label={open ? 'Collapse getting started' : 'Expand getting started'}
          >
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </CardHeader>
        {open && (
          <CardContent className="space-y-6">
            <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {STEPS.map((step) => (
                <li key={step.n}>
                  <Link
                    to={step.to}
                    className="group flex h-full flex-col gap-2 rounded-lg border bg-card p-3 hover:border-primary/40 hover:bg-accent/30 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                        {step.n}
                      </span>
                      <step.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-foreground">{step.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{step.hint}</div>
                    </div>
                  </Link>
                </li>
              ))}
            </ol>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
