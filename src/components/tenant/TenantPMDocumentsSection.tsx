import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, FolderOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { signPmDocument } from '@/hooks/pm/usePmDocuments';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

export function TenantPMDocumentsSection() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['tenant_pm_documents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pm_documents')
        .select('*')
        .eq('status', 'active')
        .in('visibility', ['tenant_visible', 'tenant_and_owner_visible'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const [busy, setBusy] = useState<string | null>(null);

  const openDoc = async (doc: any) => {
    if (doc.document_type === 'inspection' && doc.inspection_id) {
      window.open(`/tenant/inspections/${doc.inspection_id}/print`, '_blank', 'noopener,noreferrer');
      return;
    }
    setBusy(doc.id);
    try {
      const url = await signPmDocument(doc.file_path);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e: any) { toast.error(e.message ?? 'Could not open'); }
    finally { setBusy(null); }
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold flex items-center gap-2 mt-4">
        <FolderOpen className="h-4 w-4 text-emerald-700" /> Shared property management documents
      </h3>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : data.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-4 text-center text-xs text-muted-foreground">
            No property management documents shared with you yet.
          </CardContent>
        </Card>
      ) : (
        data.map((d: any) => (
          <Card key={d.id}>
            <CardContent className="p-3 flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <p className="font-medium text-sm truncate">{d.title}</p>
                </div>
                <p className="text-[11px] text-muted-foreground truncate">
                  {d.document_type ?? 'document'} · {new Date(d.created_at).toLocaleDateString()}
                </p>
                {d.description && <p className="text-xs text-muted-foreground mt-1">{d.description}</p>}
              </div>
              <Button size="sm" variant="outline" disabled={busy === d.id} onClick={() => openDoc(d)}>
                <Download className="h-3.5 w-3.5 mr-1" />
                {busy === d.id ? 'Opening…' : 'Open'}
              </Button>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
