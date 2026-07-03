import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Archive, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';
import {
  usePmDocuments, signPmDocument, useArchivePmDocument,
} from '@/hooks/pm/usePmDocuments';
import { PMDocumentUploadDialog } from './PMDocumentUploadDialog';

interface Props {
  title?: string;
  filters: Parameters<typeof usePmDocuments>[0];
  uploadDefaults?: React.ComponentProps<typeof PMDocumentUploadDialog>['defaults'];
  defaultVisibility?: React.ComponentProps<typeof PMDocumentUploadDialog>['defaultVisibility'];
}

export function PMDocumentsSection({
  title = 'Documents',
  filters,
  uploadDefaults,
  defaultVisibility,
}: Props) {
  const { data = [], isLoading } = usePmDocuments(filters);
  const archive = useArchivePmDocument();
  const [busy, setBusy] = useState<string | null>(null);

  const open = async (id: string, path: string) => {
    setBusy(id);
    try {
      const url = await signPmDocument(path);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e: any) {
      toast.error(e.message ?? 'Could not open document');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-emerald-700" /> {title}
        </CardTitle>
        <PMDocumentUploadDialog defaults={uploadDefaults} defaultVisibility={defaultVisibility} />
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No documents yet.</p>
        ) : (
          data.map((d: any) => (
            <div key={d.id} className="flex items-center justify-between gap-2 border rounded-md p-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <p className="font-medium text-sm truncate">{d.title}</p>
                  <Badge variant="outline" className="text-[10px]">{d.visibility.replace(/_/g, ' ')}</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground truncate">
                  {d.document_type ?? 'document'} · {d.file_name} · {new Date(d.created_at).toLocaleDateString()}
                </p>
              </div>
              <Button size="sm" variant="outline" disabled={busy === d.id} onClick={() => open(d.id, d.file_path)}>
                <Download className="h-3.5 w-3.5 mr-1" />
                {busy === d.id ? 'Opening…' : 'Open'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  try { await archive.mutateAsync(d.id); toast.success('Archived'); }
                  catch (e: any) { toast.error(e.message ?? 'Failed'); }
                }}
              >
                <Archive className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
