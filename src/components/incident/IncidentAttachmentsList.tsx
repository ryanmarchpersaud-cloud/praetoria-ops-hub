import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, FileImage, ExternalLink, Paperclip } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export type StoredIncidentAttachment = {
  url?: string;
  path: string;
  name: string;
  mime?: string;
  size?: number;
  category?: string;
};

interface Props {
  attachments: StoredIncidentAttachment[] | null | undefined;
}

export function IncidentAttachmentsList({ attachments }: Props) {
  const { toast } = useToast();
  if (!attachments || attachments.length === 0) return null;

  const open = async (att: StoredIncidentAttachment) => {
    try {
      const { data, error } = await supabase.storage
        .from('incident-attachments')
        .createSignedUrl(att.path, 60 * 10);
      if (error) throw error;
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (e: any) {
      toast({
        title: 'Could not open document',
        description: e.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
        <Paperclip className="h-4 w-4" /> Documents ({attachments.length})
      </h2>
      <ul className="space-y-2">
        {attachments.map((att, i) => {
          const isImage = att.mime?.startsWith('image/');
          return (
            <li
              key={i}
              className="flex items-center gap-3 rounded-md border border-border bg-muted/30 p-2"
            >
              {isImage ? (
                <FileImage className="h-5 w-5 shrink-0 text-muted-foreground" />
              ) : (
                <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{att.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {att.category && (
                    <Badge variant="secondary" className="text-[10px]">
                      {att.category}
                    </Badge>
                  )}
                  {att.size != null && (
                    <span className="text-[10px] text-muted-foreground">
                      {(att.size / 1024).toFixed(0)} KB
                    </span>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => open(att)}
                className="h-8"
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1" /> Open
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
