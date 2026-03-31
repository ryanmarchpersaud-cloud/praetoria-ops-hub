import { useRef, useState } from 'react';
import { useHRFiles } from '@/hooks/useHRFiles';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Upload, FileText, Trash2, Download, Paperclip } from 'lucide-react';

interface HRFileAttachmentsProps {
  recordType: string;
  recordId: string;
  label?: string;
  compact?: boolean;
}

export function HRFileAttachments({ recordType, recordId, label = 'Documents', compact = false }: HRFileAttachmentsProps) {
  const { files, isLoading, upload, remove } = useHRFiles(recordType, recordId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error('File too large (max 20MB)');
      return;
    }
    try {
      await upload.mutateAsync(file);
      toast.success(`${file.name} uploaded`);
    } catch {
      toast.error('Upload failed');
    }
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleDownload = async (file: any) => {
    setDownloading(file.id);
    try {
      const { data, error } = await supabase.storage
        .from('hr-documents')
        .createSignedUrl(file.file_url, 300);
      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch {
      toast.error('Could not generate download link');
    } finally {
      setDownloading(null);
    }
  };

  const handleDelete = async (file: any) => {
    if (!confirm(`Delete ${file.file_name}?`)) return;
    try {
      await remove.mutateAsync({ id: file.id, filePath: file.file_url });
      toast.success('File deleted');
    } catch {
      toast.error('Delete failed');
    }
  };

  const fileTypeIcon = (type: string) => {
    const t = type?.toLowerCase();
    if (['pdf'].includes(t)) return '📄';
    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(t)) return '🖼️';
    if (['doc', 'docx'].includes(t)) return '📝';
    if (['xls', 'xlsx', 'csv'].includes(t)) return '📊';
    return '📎';
  };

  if (compact) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          <Badge variant="secondary" className="text-[10px] px-1">{files.length}</Badge>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs ml-auto" onClick={() => inputRef.current?.click()} disabled={upload.isPending}>
            <Upload className="h-3 w-3 mr-1" />{upload.isPending ? 'Uploading...' : 'Add'}
          </Button>
        </div>
        <input ref={inputRef} type="file" className="hidden" onChange={handleUpload} accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.webp,.txt" />
        {isLoading && <Skeleton className="h-5 w-32" />}
        {files.map((f: any) => (
          <div key={f.id} className="flex items-center gap-1.5 text-xs px-1 py-0.5 rounded hover:bg-muted/50 group">
            <span>{fileTypeIcon(f.file_type)}</span>
            <span className="truncate flex-1 text-foreground">{f.file_name}</span>
            <Button variant="ghost" size="sm" className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100" onClick={() => handleDownload(f)} disabled={downloading === f.id}>
              <Download className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => handleDelete(f)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">{label}</span>
          {files.length > 0 && <Badge variant="secondary" className="text-xs">{files.length}</Badge>}
        </div>
        <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={upload.isPending}>
          <Upload className="h-3.5 w-3.5 mr-1" />{upload.isPending ? 'Uploading...' : 'Upload'}
        </Button>
      </div>
      <input ref={inputRef} type="file" className="hidden" onChange={handleUpload} accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.webp,.txt" />

      {isLoading && <div className="space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>}

      {!isLoading && files.length === 0 && (
        <div className="border border-dashed rounded-lg p-4 text-center text-sm text-muted-foreground">
          No documents attached yet
        </div>
      )}

      {files.length > 0 && (
        <div className="border rounded-lg divide-y">
          {files.map((f: any) => (
            <div key={f.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/30 group">
              <span className="text-lg">{fileTypeIcon(f.file_type)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{f.file_name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(f.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => handleDownload(f)} disabled={downloading === f.id}>
                  <Download className="h-3.5 w-3.5 mr-1" />{downloading === f.id ? '...' : 'Download'}
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive opacity-0 group-hover:opacity-100" onClick={() => handleDelete(f)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
