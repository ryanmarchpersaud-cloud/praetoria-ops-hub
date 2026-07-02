import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Home, Users, FileText, UserCircle } from 'lucide-react';
import { usePmSummary } from '@/hooks/usePropertyManagement';

function Kpi({ label, value, icon: Icon }: { label: string; value: number | string; icon: any }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="p-2 rounded-md bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-2xl font-semibold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PMDashboard() {
  const { data: s } = usePmSummary();
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Property Management</h1>
          <p className="text-sm text-muted-foreground">Managed properties, units, owners, tenants, and leases.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button asChild variant="outline"><Link to="/property-management/properties">Properties</Link></Button>
          <Button asChild variant="outline"><Link to="/property-management/units">Units</Link></Button>
          <Button asChild variant="outline"><Link to="/property-management/owners">Owners</Link></Button>
          <Button asChild variant="outline"><Link to="/property-management/tenants">Tenants</Link></Button>
          <Button asChild><Link to="/property-management/leases">Leases</Link></Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Managed properties" value={s?.totalProperties ?? 0} icon={Building2} />
        <Kpi label="Total units" value={s?.totalUnits ?? 0} icon={Home} />
        <Kpi label="Occupied units" value={s?.occupiedUnits ?? 0} icon={Home} />
        <Kpi label="Vacant units" value={s?.vacantUnits ?? 0} icon={Home} />
        <Kpi label="Active tenants" value={s?.activeTenants ?? 0} icon={Users} />
        <Kpi label="Active leases" value={s?.activeLeases ?? 0} icon={FileText} />
        <Kpi label="Property owners" value={s?.totalOwners ?? 0} icon={UserCircle} />
        <Kpi label="Active properties" value={s?.activeProperties ?? 0} icon={Building2} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Getting started</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>Phase 1 — Admin foundation only. Tenant and property-owner portals are reserved for future phases.</p>
          <ol className="list-decimal ml-5 space-y-1">
            <li>Create a <Link className="text-primary underline" to="/property-management/owners">property owner</Link>.</li>
            <li>Add a <Link className="text-primary underline" to="/property-management/properties">managed property</Link> and assign the owner.</li>
            <li>Add <Link className="text-primary underline" to="/property-management/units">units</Link> under the property.</li>
            <li>Register <Link className="text-primary underline" to="/property-management/tenants">tenants</Link>.</li>
            <li>Create a <Link className="text-primary underline" to="/property-management/leases">lease</Link> linking a tenant to a property/unit.</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
