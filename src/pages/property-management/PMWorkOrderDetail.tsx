import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Paperclip, Upload, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import {
  useAdminWorkOrder,
  useUpdateWorkOrderStatus,
  useCompleteWorkOrder,
  useUploadWorkOrderAttachment,
  useSetAttachmentTenantVisible,
  signWOAttachment,
  WOStatus,
} from '@/hooks/usePMWorkOrders';
import { ActivityTimeline } from '@/components/property-management/ActivityTimeline';
import { OwnerApprovalDialog } from '@/components/pm/OwnerApprovalDialog';

const STATUSES: WOStatus[] = ['created', 'assigned', 'in_progress', 'completed', 'cancelled'];

export default function PMWorkOrderDetail() {
  const { id } = useParams();
  const { data, isLoading } = useAdminWorkOrder(id);
  const statusMut = useUpdateWorkOrderStatus();
  const complete = useCompleteWorkOrder();
  const upload = useUploadWorkOrderAttachment();
  const setVisible = useSetAttachmentTenantVisible();

  const [status, setStatus] = useState<WOStatus>('created');
  const [completion, setCompletion] = useState('');
  const [tenantNote, setTenantNote] = useState('');
  const [signed, setSigned] = useState<Record<string, string>>({});
  const [approvalOpen, setApprovalOpen] = useState(false);

  useEffect(() => {
    if (data?.id) {
      setStatus(data.status);
      setCompletion(data.completion_notes ?? '');
      setTenantNote(data.tenant_visible_completion_note ?? '');
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

  if (isLoading || !data?.id) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>, kind: 'before' | 'after' | 'completion' | 'other') => {
    const files = Array.from(e.target.files ?? []);
    for (const f of files) {
      try {
        await upload.mutateAsync({ work_order_id: data.id, file: f, kind });
      } catch (err: any) {
        toast.error(err.message ?? 'Upload failed');
      }
    }
    e.target.value = '';
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/property-management/maintenance"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Requests</Link>
        </Button>
        {data.request?.id && (
          <Button variant="outline" size="sm" asChild>
            <Link to={`/property-management/maintenance/${data.request.id}`}>Open Related Request</Link>
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => setApprovalOpen(true)}>
          <ShieldCheck className="h-4 w-4 mr-1" /> Request Owner Approval
        </Button>
      </div>

      <OwnerApprovalDialog
        open={approvalOpen}
        onOpenChange={setApprovalOpen}
        defaultPropertyId={(data as any).property_id}
        defaultUnitId={(data as any).unit_id ?? null}
        workOrderId={data.id}
        defaultCategory="repair"
        defaultTitle={`Approval for work order: ${data.title || ''}`.trim()}
      />

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle>{data.work_order_number} — {data.title}</CardTitle>
            <div className="flex items-center gap-2">
              {data.is_urgent_safety && <Badge className="bg-red-600 text-white">URGENT SAFETY</Badge>}
              <Badge variant="outline" className="capitalize">{data.status.replace('_', ' ')}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div className="grid md:grid-cols-3 gap-3">
            <div><p className="text-xs text-muted-foreground">Category</p><p className="font-medium capitalize">{(data.category ?? '').replace(/_/g,' ')}</p></div>
            <div><p className="text-xs text-muted-foreground">Issue</p><p className="font-medium">{data.issue_label ?? '—'}</p></div>
            <div><p className="text-xs text-muted-foreground">Priority</p><p className="font-medium capitalize">{data.priority}</p></div>
            <div><p className="text-xs text-muted-foreground">Property</p><p className="font-medium">{data.property?.property_name}</p><p className="text-xs">{data.property?.address_line_1}</p></div>
            <div><p className="text-xs text-muted-foreground">Unit</p><p className="font-medium">{data.unit?.unit_label ?? '—'}</p></div>
            <div><p className="text-xs text-muted-foreground">Tenant contact shared?</p><p className="font-medium">{data.share_tenant_contact ? 'Yes' : 'No'}</p></div>
          </div>
          {data.description && <div className="pt-2"><p className="text-xs text-muted-foreground">Description</p><p className="whitespace-pre-wrap">{data.description}</p></div>}
          {data.access_notes && <div className="pt-2"><p className="text-xs text-muted-foreground">Access / on-site notes</p><p>{data.access_notes}</p></div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Status</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label>Work order status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as WOStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button
              onClick={async () => {
                try { await statusMut.mutateAsync({ work_order_id: data.id, status }); toast.success('Status updated'); }
                catch (e: any) { toast.error(e.message ?? 'Failed'); }
              }}
              disabled={statusMut.isPending}
              className="bg-emerald-700 hover:bg-emerald-800"
            >Update</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Attachments</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-2 rounded border px-3 py-1.5 cursor-pointer hover:bg-muted text-xs">
              <Upload className="h-4 w-4" /> Upload before photo
              <input type="file" hidden accept="image/*,application/pdf" onChange={(e) => onFile(e, 'before')} />
            </label>
            <label className="inline-flex items-center gap-2 rounded border px-3 py-1.5 cursor-pointer hover:bg-muted text-xs">
              <Upload className="h-4 w-4" /> Upload after photo
              <input type="file" hidden accept="image/*,application/pdf" onChange={(e) => onFile(e, 'after')} />
            </label>
          </div>
          {(data.attachments ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground">No attachments yet.</p>
          ) : (
            <ul className="space-y-2">
              {data.attachments.map((a: any) => (
                <li key={a.id} className="flex items-center justify-between gap-2 border rounded p-2">
                  <a href={signed[a.id] || '#'} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-emerald-700 hover:underline">
                    <Paperclip className="h-4 w-4" /> {a.file_name} <span className="text-xs text-muted-foreground">({a.kind})</span>
                  </a>
                  <label className="inline-flex items-center gap-2 text-xs">
                    <Checkbox
                      checked={!!a.tenant_visible}
                      onCheckedChange={async (v) => {
                        try { await setVisible.mutateAsync({ id: a.id, tenant_visible: !!v, table: 'pm_work_order_attachments' }); }
                        catch (e: any) { toast.error(e.message ?? 'Failed'); }
                      }}
                    />
                    Visible to tenant
                  </label>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Complete Work Order</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <Label>Internal completion notes (admin/assignee only)</Label>
            <Textarea rows={3} value={completion} onChange={(e) => setCompletion(e.target.value)} />
          </div>
          <div>
            <Label>Tenant-facing completion note</Label>
            <Textarea rows={3} value={tenantNote} onChange={(e) => setTenantNote(e.target.value)} placeholder="This will be shown to the tenant." />
          </div>
          <Button
            className="bg-emerald-700 hover:bg-emerald-800"
            onClick={async () => {
              try {
                await complete.mutateAsync({
                  work_order_id: data.id,
                  completion_notes: completion,
                  tenant_visible_completion_note: tenantNote,
                });
                toast.success('Work order completed');
              } catch (e: any) { toast.error(e.message ?? 'Failed'); }
            }}
            disabled={complete.isPending}
          >
            {complete.isPending ? 'Saving…' : 'Mark Completed'}
          </Button>
        </CardContent>
      </Card>

      {data.request?.id && <ActivityTimeline requestId={data.request.id} title="History" />}
    </div>
  );
}
