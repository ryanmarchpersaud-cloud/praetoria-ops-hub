import { Link } from 'react-router-dom';
import { OwnerLayout } from '@/components/owner/OwnerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Wrench, Mail, ExternalLink } from 'lucide-react';
import { useOwnerRecord, useOwnerProperties, useOwnerMaintenanceRequests } from '@/hooks/useOwnerPortal';
import { formatStatusLabel } from '@/lib/statusLabel';

export default function OwnerHome() {
  const { data: owner, isLoading } = useOwnerRecord();
  const { data: properties = [] } = useOwnerProperties();
  const { data: requests = [] } = useOwnerMaintenanceRequests();

  const openRequests = requests.filter((r: any) => !['completed', 'closed', 'cancelled'].includes((r.status || '').toLowerCase()));

  return (
    <OwnerLayout>
      <div className="p-4 space-y-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Welcome back</p>
            <h2 className="text-lg font-semibold mt-0.5">
              {isLoading ? '…' : (owner?.company_name || owner?.owner_name || 'Property Owner')}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              View your properties, units, active leases, and maintenance activity managed by Praetoria Group.
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Link to="/owner/properties">
            <Card className="hover:shadow-md transition h-full">
              <CardContent className="p-4">
                <Building2 className="h-6 w-6 text-slate-700" />
                <p className="mt-3 text-2xl font-bold">{properties.length}</p>
                <p className="text-xs text-muted-foreground">Properties</p>
              </CardContent>
            </Card>
          </Link>
          <Link to="/owner/maintenance">
            <Card className="hover:shadow-md transition h-full">
              <CardContent className="p-4">
                <Wrench className="h-6 w-6 text-amber-600" />
                <p className="mt-3 text-2xl font-bold">{openRequests.length}</p>
                <p className="text-xs text-muted-foreground">Open maintenance</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Recent maintenance activity</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {requests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No maintenance requests yet.</p>
            ) : (
              requests.slice(0, 5).map((r: any) => (
                <Link key={r.id} to={`/owner/maintenance`} className="block p-3 rounded-md border hover:bg-accent">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{r.title || r.category}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {r.property?.property_name}{r.unit?.unit_label ? ` · ${r.unit.unit_label}` : ''}
                      </p>
                    </div>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 shrink-0">
                      {formatStatusLabel(r.status)}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Need help?</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-muted-foreground">
              For questions about your properties, statements, or portal access, contact your Praetoria Group representative.
            </p>
            <Button variant="outline" className="w-full justify-start" asChild>
              <a href="mailto:ops@praetoriagroup.ca">
                <Mail className="h-4 w-4 mr-2" /> ops@praetoriagroup.ca
                <ExternalLink className="h-3 w-3 ml-auto opacity-60" />
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </OwnerLayout>
  );
}
