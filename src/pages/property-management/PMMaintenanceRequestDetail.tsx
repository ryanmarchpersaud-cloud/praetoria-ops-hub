import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Paperclip, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useAdminMaintenanceRequest, useUpdateMaintenanceRequest, signMaintenanceAttachment } from '@/hooks/useTenantPortal';

const STATUSES = ['new', 'reviewed', 'in_progress', 'completed', 'cancelled'];

export default function PMMaintenanceRequestDetail() {
  const { id } = useParams();
  const { data, isLoading } = useAdminMaintenanceRequest(id);
  const update = useUpdateMaintenanceRequest();
  const [status, setStatus] = useState('new');
  const [internalNotes, setInternalNotes] = useState('');
  const [tenantUpdate, setTenantUpdate] = useState('');
  const [signed, setSigned] = useState<Record<string, string>>({});

  useEffect(() => {
    if (data?.id) {
      setStatus(data.status);
      setInternalNotes(data.internal_notes ?? '');
      setTenantUpdate(data.tenant_facing_update ?? '');
    }
  }, [data?.id]);

  useEffect(() => {
    (async () => {
      const out: Record<string, string> = {};
      for (const a of data?.attachments ?? []) {
        try { out[a.id] = await signMaintenanceAttachment(a.storage_path); } catch {}
      }
      setSigned(out);
    })();
  }, [data?.attachments]);

  if (isLoading || !data?.id) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  const save = async () => {
    try {
      await update.mutateAsync({
        id: data.id,
        patch: {
          status,
          internal_notes: internalNotes,
          tenant_facing_update: tenantUpdate,
          completed_at: status === 'completed' ? new Date().toISOString() : null,
        },
      });
      toast.success('Saved');
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to save');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/property-management/maintenance"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link>
        </Button>
        <div className="ml-auto">
          <Button onClick={save} disabled={update.isPending} className="bg-emerald-700 hover:bg-emerald-800">
            <Save className="h-4 w-4 mr-1" />{update.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle>{data.title}</CardTitle>
            <Badge variant="outline">{status.replace('_', ' ')}</Badge>
          </div>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p className="text-xs text-muted-foreground">
            Submitted {new Date(data.created_at).toLocaleString()} · {data.category.replace('_', ' ')} · Priority: {data.priority}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            <div>
              <p className="text-xs text-muted-foreground">Tenant</p>
              <p className="font-medium">{data.tenant?.first_name} {data.tenant?.last_name}</p>
              {data.tenant?.phone && <p className="text-xs">{data.tenant.phone}</p>}
              {data.tenant?.email && <p className="text-xs">{data.tenant.email}</p>}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Property</p>
              <p className="font-medium">{data.property?.property_name}</p>
              {data.property?.address_line_1 && <p className="text-xs">{data.property.address_line_1}</p>}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Unit</p>
              <p className="font-medium">{data.unit?.unit_label ?? '—'}</p>
            </div>
          </div>
          {data.description && (
            <div className="pt-2">
              <p className="text-xs text-muted-foreground">Description</p>
              <p className="whitespace-pre-wrap">{data.description}</p>
            </div>
          )}
          {data.contact_notes && (
            <div className="pt-2"><p className="text-xs text-muted-foreground">Contact notes</p><p>{data.contact_notes}</p></div>
          )}
          {data.preferred_contact_time && (
            <div className="pt-2"><p className="text-xs text-muted-foreground">Preferred contact time</p><p>{data.preferred_contact_time}</p></div>
          )}
          <p className="text-xs pt-2">Permission to enter: <span className="font-medium">{data.permission_to_enter ? 'Yes' : 'No'}</span></p>
        </CardContent>
      </Card>

      {(data.attachments?.length ?? 0) > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Attachments</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.attachments.map((a: any) => (
              <a key={a.id} href={signed[a.id] || '#'} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-emerald-700 hover:underline">
                <Paperclip className="h-4 w-4" /> {a.file_name || 'Attachment'}
              </a>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Manage</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Internal notes (admin only)</Label>
            <Textarea rows={3} value={internalNotes} onChange={e => setInternalNotes(e.target.value)} />
          </div>
          <div>
            <Label>Tenant-facing update</Label>
            <Textarea rows={3} value={tenantUpdate} onChange={e => setTenantUpdate(e.target.value)} placeholder="Shown to the tenant in their portal." />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
