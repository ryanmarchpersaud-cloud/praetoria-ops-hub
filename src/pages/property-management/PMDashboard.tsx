import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Building2, DoorOpen, Users, FileSignature, Briefcase,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import { usePmSummary } from '@/hooks/usePropertyManagement';
import { RecentTenantActivity } from '@/components/property-management/RecentTenantActivity';
import {
  PMBusinessKPIs, LeasingPipelineCard, TodayShowingsCard, StaffTasksTodayCard,
  RenewalsAttentionCard, MaintenanceByPriorityCard, StaffActivityCard,
} from '@/components/property-management/dashboard/PMDashboardSections';
import { useUserRole } from '@/hooks/useUserRole';

const STEPS = [
  { n: 1, title: 'Add a property owner',   to: '/property-management/owners',     icon: Briefcase,     hint: 'Landlord or LLC that owns the property.' },
  { n: 2, title: 'Add a managed property', to: '/property-management/properties', icon: Building2,     hint: 'Address, type, and primary owner.' },
  { n: 3, title: 'Add units under it',     to: '/property-management/units',      icon: DoorOpen,      hint: 'One row per rentable door.' },
  { n: 4, title: 'Register tenants',       to: '/property-management/tenants',    icon: Users,         hint: 'Contact info for each renter.' },
  { n: 5, title: 'Create a lease',         to: '/property-management/leases',     icon: FileSignature, hint: 'Ties tenant to a unit with terms.' },
];

export default function PMDashboard() {
  const { data: s } = usePmSummary();
  const totalProperties = s?.totalProperties ?? 0;
  const { roles, isAdmin } = useUserRole();

  const isLeasingAgentOnly =
    roles.includes('leasing_agent') &&
    !isAdmin && !roles.includes('property_manager') && !roles.includes('ops_manager') && !roles.includes('owner');
  const canSeeStaffActivity = isAdmin || roles.includes('owner') || roles.includes('ops_manager');

  const emptyState = totalProperties === 0;
  const [open, setOpen] = useState(emptyState);
  useEffect(() => { setOpen(emptyState); }, [emptyState]);

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="rounded-xl border border-emerald-600/20 bg-gradient-to-r from-emerald-50 via-emerald-50/40 to-transparent dark:from-emerald-950/30 dark:via-emerald-950/10 dark:to-transparent p-5">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-600 text-white shadow-sm">
            <Building2 className="h-6 w-6" strokeWidth={2.25} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Property Management</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Live operational visibility across leasing, renewals, maintenance, and PM staff.
            </p>
          </div>
        </div>
      </div>

      {/* Row 1 — Business KPIs (finance hidden for leasing-agent-only) */}
      <PMBusinessKPIs hideFinance={isLeasingAgentOnly} />

      {/* Row 2 — Leasing pipeline */}
      <LeasingPipelineCard />

      {/* Row 3 — Today's ops */}
      <div className="grid gap-4 md:grid-cols-2">
        <TodayShowingsCard />
        <StaffTasksTodayCard />
      </div>

      {/* Row 4 — Renewals & Maintenance */}
      <div className="grid gap-4 md:grid-cols-2">
        <RenewalsAttentionCard />
        <MaintenanceByPriorityCard />
      </div>

      {/* Row 5 — Staff activity (admin only) */}
      <StaffActivityCard enabled={canSeeStaffActivity} />

      {/* Recent tenant activity */}
      <RecentTenantActivity />

      {/* Getting started (empty state or manual toggle) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-lg font-semibold">Getting started</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {emptyState
                ? 'Set up your first property in five quick steps.'
                : 'Onboarding checklist — expand to review or add more.'}
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
        {open && emptyState && (
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
        {open && !emptyState && (
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Onboarding complete. Use the sidebar to add more owners, properties, units, tenants, or leases.
            </p>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
