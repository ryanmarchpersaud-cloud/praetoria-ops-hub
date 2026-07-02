import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Paperclip, ShieldAlert, Upload } from 'lucide-react';
import { toast } from 'sonner';
import {
  useAssigneeWorkOrder,
  useUpdateWorkOrderStatus,
  useCompleteWorkOrder,
  useUploadWorkOrderAttachment,
  signWOAttachment,
  WOStatus,
} from '@/hooks/usePMWorkOrders';

const ASSIGNEE_STATUSES: WOStatus[] = ['assigned', 'in_progress', 'completed'];

export function AssigneePMWorkOrderDetail({ backTo }: { backTo: string }) {
  const { id } = useParams();
  const { data, isLoading } = useAssigneeWorkOrder(id);
  const statusMut = useUpdateWorkOrderStatus();
  const complete = useCompleteWorkOrder();
  const upload = useUploadWorkOrderAttachment();

  const [status, setStatus] = useState<WOStatus>('assigned');
  const [notes, setNotes] = useState('');
  const [signed, setSigned] = useState<Record<string, string>>({});

  useEffect(() => {
    if (data?.id) {
      setStatus(data.status);
      setNotes(data.completion_notes ?? '');
    }
  }, [data?.id]);

  useEffect(() => {
    (async () => {
      const out: Record<string, string> = {};
      for (const a of data?.attachments ?? []) {
        try { out[a.id] = await signWOAttachment(a.storage_path); } catch {}
      }
      setSigned(out);
    })();
  }, [data?.attachments]);

  if (isLoading || !data?.id) return <div className="p-4 text-sm text-muted-foreground">Loading…</div>;

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>, kind: 'before' | 'after' | 'completion') => {
    const files = Array.from(e.target.files ?? []);
    for (const f of files) {
      try { await upload.mutateAsync({ work_order_id: data.id, file: f, kind }); }
      catch (err: any) { toast.error(err.message ?? 'Upload failed'); }
    }
    e.target.value = '';
  };

  return (
    <div className="p-4 space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link to={backTo}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link>
      </Button>

      {data.is_urgent_safety && (
        <div className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          <ShieldAlert className="h-4 w-4 mt-0.5" />
          <div>
            <p className="font-medium">Urgent safety</p>
            <p className="text-xs">Please respond as quickly as possible and follow safety protocols.</p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-base">{data.work_order_number} — {data.title}</CardTitle>
            <Badge variant="outline" className="capitalize">{data.status.replace('_',' ')}</Badge>
          </div>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p><span className="text-xs text-muted-foreground">Category:</span> {(data.category ?? '').replace(/_/g,' ')} · <span className="text-xs text-muted-foreground">Issue:</span> {data.issue_label ?? '—'} · <span className="text-xs text-muted-foreground">Priority:</span> {data.priority}</p>
          <div>
            <p className="text-xs text-muted-foreground">Property</p>
            <p className="font-medium">{data.property?.property_name}</p>
            <p className="text-xs">{data.property?.address_line_1}, {data.property?.city}</p>
          </div>
          <p><span className="text-xs text-muted-foreground">Unit:</span> {data.unit?.unit_label ?? '—'}</p>
          {data.share_tenant_contact && data.tenant?.phone && (
            <p className="text-xs">Tenant: {data.tenant.first_name} {data.tenant.last_name} · {data.tenant.phone}</p>
          )}
          {data.description && <div><p className="text-xs text-muted-foreground">Description</p><p className="whitespace-pre-wrap">{data.description}</p></div>}
          {data.access_notes && <div><p className="text-xs text-muted-foreground">Access notes</p><p>{data.access_notes}</p></div>}
          {data.preferred_contact_time && <p className="text-xs">Preferred contact time: {data.preferred_contact_time}</p>}
          <p className="text-xs">Permission to enter: <span className="font-medium">{data.permission_to_enter ? 'Yes' : 'No'}</span></p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Update Status</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Label>Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as WOStatus)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{ASSIGNEE_STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace('_',' ')}</SelectItem>)}</SelectContent>
          </Select>
          <Button
            className="bg-emerald-700 hover:bg-emerald-800 w-full"
            disabled={statusMut.isPending}
            onClick={async () => {
              try { await statusMut.mutateAsync({ work_order_id: data.id, status }); toast.success('Updated'); }
              catch (e: any) { toast.error(e.message ?? 'Failed'); }
            }}
          >Save Status</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Photos</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-2">
          <div className="flex gap-2 flex-wrap">
            <label className="inline-flex items-center gap-1 rounded border px-2 py-1 cursor-pointer text-xs hover:bg-muted">
              <Upload className="h-3 w-3" /> Before
              <input type="file" hidden accept="image/*" onChange={(e) => onFile(e, 'before')} />
            </label>
            <label className="inline-flex items-center gap-1 rounded border px-2 py-1 cursor-pointer text-xs hover:bg-muted">
              <Upload className="h-3 w-3" /> After
              <input type="file" hidden accept="image/*" onChange={(e) => onFile(e, 'after')} />
            </label>
          </div>
          {(data.attachments ?? []).map((a: any) => (
            <a key={a.id} href={signed[a.id] || '#'} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-emerald-700 hover:underline text-xs">
              <Paperclip className="h-3 w-3" /> {a.file_name} <span className="text-muted-foreground">({a.kind})</span>
            </a>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Complete Work</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Label>Completion notes</Label>
          <Textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="What was done, parts used, etc." />
          <Button
            className="bg-emerald-700 hover:bg-emerald-800 w-full"
            disabled={complete.isPending}
            onClick={async () => {
              try { await complete.mutateAsync({ work_order_id: data.id, completion_notes: notes }); toast.success('Marked completed'); }
              catch (e: any) { toast.error(e.message ?? 'Failed'); }
            }}
          >Mark Completed</Button>
        </CardContent>
      </Card>
    </div>
  );
}
