import { Link } from 'react-router-dom';
import { OwnerLayout } from '@/components/owner/OwnerLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, ChevronRight } from 'lucide-react';
import { useOwnerProperties } from '@/hooks/useOwnerPortal';

export default function OwnerProperties() {
  const { data: properties = [], isLoading } = useOwnerProperties();

  return (
    <OwnerLayout>
      <div className="p-4 space-y-3">
        <h2 className="text-lg font-semibold">Your properties</h2>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : properties.length === 0 ? (
          <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
            No properties linked to your account yet. Please contact Praetoria Group.
          </CardContent></Card>
        ) : (
          properties.map((p: any) => (
            <Link key={p.id} to={`/owner/properties/${p.id}`}>
              <Card className="hover:shadow-md transition">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-md bg-slate-100 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-slate-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{p.property_name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {[p.address_line_1, p.city, p.province].filter(Boolean).join(', ')}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </OwnerLayout>
  );
}
