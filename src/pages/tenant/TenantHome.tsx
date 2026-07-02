import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Wrench, Building2, DoorOpen, CalendarDays, DollarSign, Phone, Mail,
  Sparkles, ChevronRight, ClipboardList,
} from 'lucide-react';
import { useMyTenantContext, useMyMaintenanceRequests } from '@/hooks/useTenantPortal';

const SUPPORT_EMAIL = 'ops@praetoriagroup.ca';

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  reviewed: 'bg-amber-100 text-amber-800',
  in_progress: 'bg-emerald-100 text-emerald-800',
  completed: 'bg-slate-200 text-slate-700',
  cancelled: 'bg-rose-100 text-rose-800',
};

export default function TenantHome() {
  const { data, isLoading } = useMyTenantContext();
  const { data: requests = [] } = useMyMaintenanceRequests();

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  if (!data?.tenant) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="p-6 text-center space-y-2">
            <Sparkles className="h-8 w-8 mx-auto text-emerald-600" />
            <p className="font-medium">Your tenant profile isn't linked yet.</p>
            <p className="text-sm text-muted-foreground">
              Please contact your property manager to have your account linked.
            </p>
            <a className="text-emerald-700 font-medium block pt-2" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { tenant, activeLease, property, unit } = data;
  const fullName = [tenant.first_name, tenant.last_name].filter(Boolean).join(' ');
  const recent = requests.slice(0, 2);

  return (
    <div className="p-4 space-y-4">
      {/* Welcome */}
      <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-white border border-emerald-100 p-4">
        <p className="text-[11px] uppercase tracking-wider text-emerald-700 font-semibold">
          Welcome back
        </p>
        <p className="text-2xl font-bold text-slate-900 mt-0.5">{fullName}</p>
        {activeLease && (
          <Badge className="mt-2 bg-emerald-600 hover:bg-emerald-600 text-white capitalize">
            Lease {activeLease.status}
          </Badge>
        )}
      </div>

      {/* Primary CTA */}
      <Button
        asChild
        size="lg"
        className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-md h-12"
      >
        <Link to="/tenant/maintenance/new">
          <Wrench className="h-5 w-5 mr-2" /> Submit Maintenance Request
        </Link>
      </Button>

      {/* Property */}
      {property && (
        <Card className="border-emerald-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-emerald-800 flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Your Property
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1.5">
            <p className="font-semibold text-base text-slate-900">{property.property_name}</p>
            {property.address_line_1 && (
              <p className="text-muted-foreground">
                {property.address_line_1}
                {property.city ? `, ${property.city}` : ''}
                {property.province ? `, ${property.province}` : ''}
                {property.postal_code ? ` ${property.postal_code}` : ''}
              </p>
            )}
            {unit && (
              <div className="mt-2 flex items-center gap-2 text-slate-700">
                <DoorOpen className="h-4 w-4 text-emerald-700" />
                <span className="text-xs text-muted-foreground">Unit</span>
                <span className="font-semibold">{unit.unit_label}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Lease summary */}
      {activeLease && (
        <Card className="border-emerald-100">
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-sm text-emerald-800 flex items-center gap-2">
              <CalendarDays className="h-4 w-4" /> Lease Summary
            </CardTitle>
            <Link
              to="/tenant/lease"
              className="text-xs text-emerald-700 font-medium flex items-center"
            >
              Details <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="text-sm grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Start</p>
              <p className="font-semibold">{activeLease.start_date}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">End</p>
              <p className="font-semibold">{activeLease.end_date || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <DollarSign className="h-3 w-3" /> Monthly rent
              </p>
              <p className="font-semibold">${Number(activeLease.monthly_rent).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Rent due</p>
              <p className="font-semibold">Day {activeLease.rent_due_day}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent maintenance */}
      {recent.length > 0 && (
        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-emerald-700" /> Recent Requests
            </CardTitle>
            <Link
              to="/tenant/maintenance"
              className="text-xs text-emerald-700 font-medium flex items-center"
            >
              View all <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {recent.map((r: any) => (
              <Link
                key={r.id}
                to={`/tenant/maintenance/${r.id}`}
                className="flex items-center justify-between border rounded-lg px-3 py-2 hover:border-emerald-300 transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{r.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Badge className={STATUS_COLORS[r.status] || ''}>
                  {String(r.status).replace('_', ' ')}
                </Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Property Manager Contact */}
      <Card className="bg-emerald-50/50 border-emerald-100">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-emerald-800">Property Manager</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p className="font-medium">Praetoria Group</p>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="flex items-center gap-2 text-emerald-700 font-medium">
            <Mail className="h-4 w-4" /> {SUPPORT_EMAIL}
          </a>
          <a href="tel:+13069999999" className="flex items-center gap-2 text-emerald-700 font-medium">
            <Phone className="h-4 w-4" /> Call property manager
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
