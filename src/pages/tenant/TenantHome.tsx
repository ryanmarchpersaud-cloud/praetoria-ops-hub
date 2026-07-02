import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wrench, Building2, DoorOpen, CalendarDays, DollarSign, Phone, Mail } from 'lucide-react';
import { useMyTenantContext } from '@/hooks/useTenantPortal';

export default function TenantHome() {
  const { data, isLoading } = useMyTenantContext();

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  if (!data?.tenant) {
    return (
      <div className="p-6 space-y-3">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="font-medium">Your tenant profile isn't linked yet.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Please contact your property manager to have your account linked.
            </p>
            <p className="text-sm mt-4">
              <a className="text-emerald-700 font-medium" href="mailto:ops@praetoriagroup.ca">
                ops@praetoriagroup.ca
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { tenant, activeLease, property, unit } = data;
  const fullName = [tenant.first_name, tenant.last_name].filter(Boolean).join(' ');

  return (
    <div className="p-4 space-y-4">
      <Card className="border-emerald-100">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Welcome back</p>
          <p className="text-xl font-bold">{fullName}</p>
          {activeLease && (
            <Badge className="mt-2 bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
              Lease {activeLease.status}
            </Badge>
          )}
        </CardContent>
      </Card>

      <Button asChild size="lg" className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold">
        <Link to="/tenant/maintenance/new">
          <Wrench className="h-5 w-5 mr-2" /> Submit Maintenance Request
        </Link>
      </Button>

      {property && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-emerald-800 flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Your Property
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p className="font-semibold">{property.property_name}</p>
            {property.address_line_1 && (
              <p className="text-muted-foreground">
                {property.address_line_1}
                {property.city ? `, ${property.city}` : ''}
                {property.province ? `, ${property.province}` : ''}
                {property.postal_code ? ` ${property.postal_code}` : ''}
              </p>
            )}
            {unit && (
              <p className="mt-2 flex items-center gap-1">
                <DoorOpen className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Unit:</span> {unit.unit_label}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {activeLease && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-emerald-800 flex items-center gap-2">
              <CalendarDays className="h-4 w-4" /> Lease Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Start</p>
              <p className="font-medium">{activeLease.start_date}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">End</p>
              <p className="font-medium">{activeLease.end_date || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <DollarSign className="h-3 w-3" /> Monthly rent
              </p>
              <p className="font-medium">${Number(activeLease.monthly_rent).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Rent due day</p>
              <p className="font-medium">Day {activeLease.rent_due_day}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-emerald-50/40 border-emerald-100">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-emerald-800">Property Manager</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p className="font-medium">Praetoria Group</p>
          <a href="mailto:ops@praetoriagroup.ca" className="flex items-center gap-2 text-emerald-700">
            <Mail className="h-4 w-4" /> ops@praetoriagroup.ca
          </a>
          <a href="tel:+13069999999" className="flex items-center gap-2 text-emerald-700">
            <Phone className="h-4 w-4" /> Call property manager
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
