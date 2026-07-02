import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download } from 'lucide-react';
import { useMyTenantContext } from '@/hooks/useTenantPortal';
import { supabase } from '@/integrations/supabase/client';

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
      {property && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Property</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p className="font-semibold text-base">{property.property_name}</p>
            {property.address_line_1 && (
              <p className="text-muted-foreground">
                {property.address_line_1}
                {property.city ? `, ${property.city}` : ''}
                {property.province ? `, ${property.province}` : ''}
                {property.postal_code ? ` ${property.postal_code}` : ''}
              </p>
            )}
            {unit && <p className="mt-2"><span className="text-muted-foreground">Unit:</span> <span className="font-medium">{unit.unit_label}</span></p>}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Lease History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {leases.length === 0 ? (
            <p className="text-sm text-muted-foreground">No leases on file.</p>
          ) : (
            leases.map((l: any) => (
              <div key={l.id} className="border rounded-md p-3 text-sm">
                <div className="flex items-center justify-between">
                  <p className="font-medium">
                    {l.start_date} → {l.end_date || 'Ongoing'}
                  </p>
                  <Badge variant="outline" className="text-xs">{l.status}</Badge>
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
                {l.id === activeLease?.id && docUrl && (
                  <Button asChild size="sm" className="mt-3 bg-emerald-700 hover:bg-emerald-800">
                    <a href={docUrl} target="_blank" rel="noreferrer">
                      <Download className="h-4 w-4 mr-1" /> View lease document
                    </a>
                  </Button>
                )}
                {l.id === activeLease?.id && !l.tenant_visible && l.lease_document_path && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Lease document is on file. Ask your property manager if you need a copy.
                  </p>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
