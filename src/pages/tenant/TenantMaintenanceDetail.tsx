import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Paperclip } from 'lucide-react';
import { useMyMaintenanceRequest, signMaintenanceAttachment } from '@/hooks/useTenantPortal';
import { useMyRequestVisibleWOAttachments, useRequestActivity, signWOAttachment } from '@/hooks/usePMWorkOrders';

export default function TenantMaintenanceDetail() {
  const { id } = useParams();
  const { data: r, isLoading } = useMyMaintenanceRequest(id);
  const [signed, setSigned] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const out: Record<string, string> = {};
      for (const a of r?.attachments ?? []) {
        try { out[a.id] = await signMaintenanceAttachment(a.storage_path); } catch {}
      }
      setSigned(out);
    })();
  }, [r?.attachments]);

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  if (!r?.id) return <div className="p-6 text-sm text-muted-foreground">Not found.</div>;

  return (
    <div className="p-4 space-y-4">
      <Button asChild variant="ghost" size="sm">
        <Link to="/tenant/maintenance"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link>
      </Button>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{r.title}</CardTitle>
            <Badge variant="outline">{r.status.replace('_', ' ')}</Badge>
          </div>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p className="text-xs text-muted-foreground">
            Submitted {new Date(r.created_at).toLocaleString()} · {r.category.replace('_', ' ')} · Priority: {r.priority}
          </p>
          {r.description && <p className="whitespace-pre-wrap">{r.description}</p>}
          {r.contact_notes && (
            <div><p className="text-xs font-medium text-muted-foreground">Contact notes</p><p>{r.contact_notes}</p></div>
          )}
          {r.preferred_contact_time && (
            <div><p className="text-xs font-medium text-muted-foreground">Preferred contact time</p><p>{r.preferred_contact_time}</p></div>
          )}
          <p className="text-xs">Permission to enter: <span className="font-medium">{r.permission_to_enter ? 'Yes' : 'No'}</span></p>
        </CardContent>
      </Card>

      {r.tenant_facing_update && (
        <Card className="border-emerald-200 bg-emerald-50/40">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-emerald-800">Update from Property Manager</CardTitle></CardHeader>
          <CardContent className="text-sm whitespace-pre-wrap">{r.tenant_facing_update}</CardContent>
        </Card>
      )}

      {(r.attachments?.length ?? 0) > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Attachments</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {r.attachments.map((a: any) => (
              <a key={a.id} href={signed[a.id] || '#'} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-emerald-700 hover:underline">
                <Paperclip className="h-4 w-4" /> {a.file_name || 'Attachment'}
              </a>
            ))}
          </CardContent>
        </Card>
      )}

      {r.completed_at && (
        <p className="text-xs text-center text-muted-foreground">Completed {new Date(r.completed_at).toLocaleString()}</p>
      )}
    </div>
  );
}
