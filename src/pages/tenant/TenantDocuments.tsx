import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, Download } from 'lucide-react';
import { useMyTenantDocuments, signTenantDocument } from '@/hooks/useTenantPortalExt';
import { TenantPMDocumentsSection } from '@/components/tenant/TenantPMDocumentsSection';

export default function TenantDocuments() {
  const { data = [], isLoading } = useMyTenantDocuments();
  const [signed, setSigned] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const out: Record<string, string> = {};
      for (const d of data as any[]) {
        try { out[d.id] = await signTenantDocument(d.storage_path); } catch {}
      }
      setSigned(out);
    })();
  }, [data]);

  return (
    <div className="p-4 space-y-4">
      <Button asChild variant="ghost" size="sm">
        <Link to="/tenant/lease"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link>
      </Button>

      <h2 className="text-lg font-bold flex items-center gap-2">
        <FileText className="h-5 w-5 text-emerald-700" /> Documents
      </h2>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (data as any[]).length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="font-medium">No documents shared yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Your property manager will share notices, forms, and lease documents here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {(data as any[]).map(d => (
            <Card key={d.id}>
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{d.title}</p>
                  <p className="text-[11px] text-muted-foreground capitalize">
                    {d.category} · shared {new Date(d.shared_at).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  disabled={!signed[d.id]}
                  className="shrink-0"
                >
                  <a href={signed[d.id] || '#'} target="_blank" rel="noreferrer">
                    <Download className="h-4 w-4 mr-1" /> Open
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
