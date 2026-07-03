import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Building2, DoorOpen, CalendarDays, DollarSign, FileText } from 'lucide-react';
import { useMyTenantContext } from '@/hooks/useTenantPortal';
import { supabase } from '@/integrations/supabase/client';
import { TenantRenewalCard } from '@/components/tenant/TenantRenewalCard';

export default function TenantLease() {
  const { data, isLoading } = useMyTenantContext();
  const [docUrl, setDocUrl] = useState<string | null>(null);

  const activeLease = data?.activeLease;

  useEffect(() => {
    let cancelled = false;
    async function sign() {
      if (activeLease?.tenant_visible && activeLease?.lease_document_path) {
        const { data: signed } = await supabase.storage
          .from('property-management-documents')
          .createSignedUrl(activeLease.lease_document_path, 60 * 60);
        if (!cancelled) setDocUrl(signed?.signedUrl ?? null);
      } else {
        setDocUrl(null);
      }
    }
    sign();
    return () => { cancelled = true; };
  }, [activeLease?.tenant_visible, activeLease?.lease_document_path]);

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  if (!data?.tenant) {
    return <div className="p-6 text-sm text-muted-foreground">No tenant record linked.</div>;
  }

  const { property, unit, leases } = data;

  return (
    <div className="p-4 space-y-4">
      {/* Property */}
      {property && (
        <Card className="border-emerald-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-emerald-800 flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Property
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1.5">
            <p className="font-semibold text-base">{property.property_name}</p>
            {property.address_line_1 && (
              <p className="text-muted-foreground">
                {property.address_line_1}
                {property.city ? `, ${property.city}` : ''}
                {property.province ? `, ${property.province}` : ''}
                {property.postal_code ? ` ${property.postal_code}` : ''}
              </p>
            )}
            {unit && (
              <div className="mt-2 flex items-center gap-2">
                <DoorOpen className="h-4 w-4 text-emerald-700" />
                <span className="text-xs text-muted-foreground">Unit</span>
                <span className="font-semibold">{unit.unit_label}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Active lease highlight */}
      {activeLease && (
        <Card className="border-emerald-200 bg-emerald-50/40">
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-sm text-emerald-800 flex items-center gap-2">
              <CalendarDays className="h-4 w-4" /> Current Lease
            </CardTitle>
            <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white capitalize">
              {activeLease.status}
            </Badge>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Start date</p>
              <p className="font-semibold">{activeLease.start_date}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">End date</p>
              <p className="font-semibold">{activeLease.end_date || 'Ongoing'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <DollarSign className="h-3 w-3" /> Monthly rent
              </p>
              <p className="font-semibold">${Number(activeLease.monthly_rent).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Rent due day</p>
              <p className="font-semibold">Day {activeLease.rent_due_day}</p>
            </div>
            {docUrl && (
              <div className="col-span-2 pt-1">
                <Button asChild size="sm" className="bg-emerald-700 hover:bg-emerald-800 w-full">
                  <a href={docUrl} target="_blank" rel="noreferrer">
                    <Download className="h-4 w-4 mr-1" /> View lease document
                  </a>
                </Button>
              </div>
            )}
            {!docUrl && activeLease.lease_document_path && !activeLease.tenant_visible && (
              <p className="col-span-2 text-xs text-muted-foreground pt-1">
                Lease document is on file. Ask your property manager if you need a copy.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Documents link */}
      <Card className="hover:border-emerald-300 transition-colors">
        <a href="/tenant/documents" className="block p-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-sm flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-700" /> Shared Documents
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Notices, forms, and lease documents shared by your property manager.
            </p>
          </div>
          <span className="text-emerald-700 text-sm font-medium">Open ›</span>
        </a>
      </Card>



      {/* Lease history */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4 text-emerald-700" /> Lease History
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {leases.length === 0 ? (
            <p className="text-sm text-muted-foreground">No leases on file.</p>
          ) : (
            leases.map((l: any) => (
              <div key={l.id} className="border rounded-lg p-3 text-sm">
                <div className="flex items-center justify-between">
                  <p className="font-medium">
                    {l.start_date} → {l.end_date || 'Ongoing'}
                  </p>
                  <Badge variant="outline" className="text-xs capitalize">{l.status}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Monthly rent</p>
                    <p className="font-medium text-sm">${Number(l.monthly_rent).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Rent due day</p>
                    <p className="font-medium text-sm">Day {l.rent_due_day}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
