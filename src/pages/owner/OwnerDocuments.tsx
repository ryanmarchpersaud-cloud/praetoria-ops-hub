import { useState } from 'react';
import { OwnerLayout } from '@/components/owner/OwnerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download } from 'lucide-react';
import { toast } from 'sonner';
import { useOwnerDocuments, signOwnerDocument } from '@/hooks/useOwnerPortal';

export default function OwnerDocuments() {
  const { data: docs = [], isLoading } = useOwnerDocuments();
  const [busyId, setBusyId] = useState<string | null>(null);

  const openDoc = async (id: string, path: string) => {
    setBusyId(id);
    try {
      const url = await signOwnerDocument(path);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e: any) {
      toast.error(e.message ?? 'Could not open document');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <OwnerLayout>
      <div className="p-4 space-y-3">
        <h2 className="text-lg font-semibold">Shared documents</h2>
        <p className="text-xs text-muted-foreground">
          Documents shared with you by Praetoria Group. Files are private and open via secure signed links.
        </p>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : docs.length === 0 ? (
          <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
            No documents have been shared with you yet.
          </CardContent></Card>
        ) : (
          docs.map((d: any) => (
            <Card key={d.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 mt-0.5 text-emerald-700" />
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm">{d.title}</CardTitle>
                    <p className="text-[11px] text-muted-foreground">
                      {d.property?.property_name ?? 'Owner-level'}
                      {d.category ? ` · ${d.category}` : ''}
                      {' · '}{new Date(d.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {d.description && <p className="text-xs text-muted-foreground">{d.description}</p>}
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busyId === d.id}
                  onClick={() => openDoc(d.id, d.file_path)}
                >
                  <Download className="h-3.5 w-3.5 mr-1" />
                  {busyId === d.id ? 'Opening…' : 'Open / Download'}
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </OwnerLayout>
  );
}
