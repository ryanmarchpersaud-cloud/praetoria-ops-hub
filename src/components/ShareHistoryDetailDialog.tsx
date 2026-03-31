import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Send, FileText, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

const recipientTypeLabels: Record<string, string> = {
  hr: 'Human Resources',
  ohs: 'OHS / Health & Safety',
  police: 'Police',
  fire: 'Fire Department',
  ems: 'EMS / Ambulance',
  government: 'Government / WCB',
  custom: 'Custom',
};

interface ShareHistoryDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  share: any;
  reportNumber?: string;
}

export function ShareHistoryDetailDialog({ open, onOpenChange, share, reportNumber }: ShareHistoryDetailDialogProps) {
  if (!share) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Share Details
          </DialogTitle>
          <DialogDescription>
            {reportNumber || 'Incident report'} shared on {format(new Date(share.shared_at), 'MMM d, yyyy')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Recipient</span>
              <Badge variant="secondary" className="text-[10px] capitalize">
                {recipientTypeLabels[share.recipient_type] || share.recipient_type}
              </Badge>
            </div>
            {share.recipient_name && (
              <div>
                <p className="text-sm font-medium">{share.recipient_name}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">{share.recipient_email}</p>
            </div>
          </div>

          <div className="rounded-lg border p-4 space-y-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Sent</span>
            <p className="text-sm">{format(new Date(share.shared_at), 'EEEE, MMMM d, yyyy · h:mm a')}</p>
          </div>

          {share.cover_note && (
            <div className="rounded-lg border p-4 space-y-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Cover Note</span>
              <p className="text-sm text-foreground whitespace-pre-wrap">{share.cover_note}</p>
            </div>
          )}

          {share.include_photos && (
            <div className="rounded-lg border bg-blue-50/50 dark:bg-blue-950/20 p-3">
              <p className="text-xs text-blue-700 dark:text-blue-300">📷 Photo links were included in this share</p>
            </div>
          )}

          {share.attachment_url && (
            <div className="rounded-lg border p-4 space-y-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Attached Document</span>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm truncate flex-1">{share.attachment_name || 'Document'}</span>
                <Button variant="outline" size="sm" className="gap-1 text-xs shrink-0" asChild>
                  <a href={share.attachment_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3 w-3" />
                    View
                  </a>
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
