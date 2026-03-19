import { useState } from 'react';
import { useAllAnnouncements, useUpsertAnnouncement, useCancelAnnouncement, type Announcement } from '@/hooks/useAnnouncements';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Megaphone, Plus, XCircle, Send, Clock, AlertTriangle, Info, ShieldAlert, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { SettingsLayout } from '@/components/SettingsLayout';

const priorityConfig = {
  info: { label: 'Info', icon: Info, color: 'bg-primary/10 text-primary border-primary/30' },
  warning: { label: 'Warning', icon: AlertTriangle, color: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
  critical: { label: 'Critical', icon: ShieldAlert, color: 'bg-destructive/10 text-destructive border-destructive/30' },
};

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Draft', variant: 'secondary' },
  scheduled: { label: 'Scheduled', variant: 'outline' },
  active: { label: 'Active', variant: 'default' },
  expired: { label: 'Expired', variant: 'secondary' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
};

function ComposeDialog({ onClose }: { onClose: () => void }) {
  const upsert = useUpsertAnnouncement();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState<'info' | 'warning' | 'critical'>('info');
  const [publishMode, setPublishMode] = useState<'now' | 'scheduled'>('now');
  const [publishAt, setPublishAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  const handleSubmit = async (asDraft: boolean) => {
    if (!title.trim() || !body.trim()) {
      toast.error('Title and message are required');
      return;
    }

    let status: string = 'draft';
    let publish_at: string | null = null;

    if (!asDraft) {
      if (publishMode === 'now') {
        status = 'active';
        publish_at = new Date().toISOString();
      } else {
        if (!publishAt) { toast.error('Select a publish date'); return; }
        status = 'scheduled';
        publish_at = new Date(publishAt).toISOString();
      }
    }

    await upsert.mutateAsync({
      title: title.trim(),
      body: body.trim(),
      priority,
      status,
      publish_at,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
    });

    toast.success(asDraft ? 'Saved as draft' : status === 'active' ? 'Announcement published!' : 'Announcement scheduled');
    onClose();
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Title</Label>
        <Input placeholder="e.g., Scheduled Maintenance Tonight" value={title} onChange={e => setTitle(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Message</Label>
        <Textarea placeholder="Describe the announcement..." value={body} onChange={e => setBody(e.target.value)} rows={3} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Priority</Label>
          <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="info">ℹ️ Info</SelectItem>
              <SelectItem value="warning">⚠️ Warning</SelectItem>
              <SelectItem value="critical">🚨 Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>When to publish</Label>
          <Select value={publishMode} onValueChange={(v: any) => setPublishMode(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="now">Send immediately</SelectItem>
              <SelectItem value="scheduled">Schedule for later</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {publishMode === 'scheduled' && (
        <div className="space-y-2">
          <Label>Publish at</Label>
          <Input type="datetime-local" value={publishAt} onChange={e => setPublishAt(e.target.value)} />
        </div>
      )}
      <div className="space-y-2">
        <Label>Expires at <span className="text-muted-foreground text-xs">(optional)</span></Label>
        <Input type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
      </div>
      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={() => handleSubmit(true)} disabled={upsert.isPending}>
          Save Draft
        </Button>
        <Button onClick={() => handleSubmit(false)} disabled={upsert.isPending} className="gap-1.5">
          {upsert.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {publishMode === 'now' ? <><Send className="h-3.5 w-3.5" /> Publish Now</> : <><Clock className="h-3.5 w-3.5" /> Schedule</>}
        </Button>
      </div>
    </div>
  );
}

export default function SystemAnnouncementsPage() {
  const { data: announcements, isLoading } = useAllAnnouncements();
  const cancel = useCancelAnnouncement();
  const upsert = useUpsertAnnouncement();
  const [open, setOpen] = useState(false);

  const handlePublishDraft = async (ann: Announcement) => {
    await upsert.mutateAsync({ id: ann.id, status: 'active', publish_at: new Date().toISOString() });
    toast.success('Announcement published');
  };

  return (
    <SettingsLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              System Announcements
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Broadcast maintenance notices, updates, and alerts to all users
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-1.5"><Plus className="h-4 w-4" /> New Announcement</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-primary" />
                  Compose Announcement
                </DialogTitle>
              </DialogHeader>
              <ComposeDialog onClose={() => setOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !announcements?.length ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Megaphone className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No announcements yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Create your first announcement to broadcast to all users</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {announcements.map((ann) => {
              const pCfg = priorityConfig[ann.priority as keyof typeof priorityConfig] || priorityConfig.info;
              const sCfg = statusConfig[ann.status] || statusConfig.draft;
              const PIcon = pCfg.icon;

              return (
                <Card key={ann.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${pCfg.color}`}>
                          <PIcon className="h-3 w-3" /> {pCfg.label}
                        </span>
                        <CardTitle className="text-sm truncate">{ann.title}</CardTitle>
                      </div>
                      <Badge variant={sCfg.variant} className="shrink-0 text-[10px]">{sCfg.label}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">{ann.body}</p>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <div className="flex gap-4">
                        <span>Created {format(new Date(ann.created_at), 'MMM d, yyyy h:mm a')}</span>
                        {ann.publish_at && <span>Publishes {format(new Date(ann.publish_at), 'MMM d, yyyy h:mm a')}</span>}
                        {ann.expires_at && <span>Expires {format(new Date(ann.expires_at), 'MMM d, yyyy h:mm a')}</span>}
                      </div>
                      <div className="flex gap-1.5">
                        {ann.status === 'draft' && (
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handlePublishDraft(ann)}>
                            <Send className="h-3 w-3" /> Publish
                          </Button>
                        )}
                        {(ann.status === 'active' || ann.status === 'scheduled') && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                            onClick={() => { cancel.mutate(ann.id); toast.success('Announcement cancelled'); }}
                          >
                            <XCircle className="h-3 w-3" /> Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </SettingsLayout>
  );
}
