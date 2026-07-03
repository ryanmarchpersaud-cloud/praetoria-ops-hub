import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Upload, Download, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import {
  usePmInspection, useUpdatePmInspection, useUpsertInspectionItem,
  useDeleteInspectionItem, useUploadInspectionPhoto, useUpdateInspectionPhoto,
  useDeleteInspectionPhoto, signInspectionPhoto,
  INSPECTION_AREAS, INSPECTION_CONDITIONS, INSPECTION_STATUSES,
  PmInspectionCondition, PmInspectionStatus,
} from '@/hooks/pm/usePmInspections';

interface Props {
  id: string;
  mode: 'admin' | 'staff';
}

export function InspectionEditor({ id, mode }: Props) {
  const { data, isLoading } = usePmInspection(id);
  const update = useUpdatePmInspection();
  const upsertItem = useUpsertInspectionItem();
  const delItem = useDeleteInspectionItem();
  const uploadPhoto = useUploadInspectionPhoto();
  const updatePhoto = useUpdatePhoto();
  const delPhoto = useDeleteInspectionPhoto();

  const [signed, setSigned] = useState<Record<string, string>>({});
  useEffect(() => {
    (async () => {
      const out: Record<string, string> = {};
      for (const p of data?.photos ?? []) {
        try { out[p.id] = await signInspectionPhoto(p.file_path); } catch {}
      }
      setSigned(out);
    })();
  }, [data?.photos]);

  if (isLoading || !data?.inspection) return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;
  const insp = data.inspection;
  const isAdmin = mode === 'admin';

  const setStatus = async (s: PmInspectionStatus) => {
    const patch: any = { status: s };
    if (s === 'in_progress' && !insp.inspected_at) patch.inspected_at = new Date().toISOString();
    if (s === 'completed') patch.completed_at = new Date().toISOString();
    if (s === 'reviewed') patch.reviewed_at = new Date().toISOString();
    try {
      await update.mutateAsync({ id, patch, activity: { action: `status_${s}` } });
      toast.success('Updated');
    } catch (e: any) { toast.error(e.message ?? 'Failed'); }
  };

  const [newArea, setNewArea] = useState('Living room');
  const addItem = async () => {
    try {
      await upsertItem.mutateAsync({
        inspection_id: id,
        area: newArea,
        condition: 'not_applicable',
        sort_order: (data.items?.length ?? 0),
      });
    } catch (e: any) { toast.error(e.message ?? 'Failed'); }
  };

  const uploadRef = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    uploadPhoto.mutate({ inspection_id: id, file: f }, {
      onSuccess: () => toast.success('Photo uploaded'),
      onError: (err: any) => toast.error(err.message ?? 'Upload failed'),
    });
    e.target.value = '';
  };

  return (
    <div className="space-y-4">
      {/* Header + status */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div className="min-w-0">
            <CardTitle className="text-base truncate">{insp.title}</CardTitle>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <Badge variant="secondary">{insp.inspection_type.replace(/_/g, ' ')}</Badge>
              <Badge variant="outline">{insp.status.replace(/_/g, ' ')}</Badge>
              {insp.tenant_visible && <Badge className="bg-blue-600 text-white">Tenant visible</Badge>}
              {insp.owner_visible && <Badge className="bg-purple-600 text-white">Owner visible</Badge>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {mode === 'staff' && insp.status === 'scheduled' && (
              <Button size="sm" onClick={() => setStatus('in_progress')}>Start</Button>
            )}
            {mode === 'staff' && ['in_progress','draft','scheduled'].includes(insp.status) && (
              <Button size="sm" variant="secondary" onClick={() => setStatus('completed')}>Submit for review</Button>
            )}
            {isAdmin && (
              <Select value={insp.status} onValueChange={(v) => setStatus(v as PmInspectionStatus)}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INSPECTION_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Notes / summary */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Summary & Notes</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Summary</Label>
            <Textarea
              rows={2}
              defaultValue={insp.summary ?? ''}
              onBlur={(e) => update.mutate({ id, patch: { summary: e.target.value } })}
            />
          </div>
          {isAdmin && (
            <div>
              <Label>Admin-only notes (never shown to tenant/owner)</Label>
              <Textarea
                rows={2}
                defaultValue={insp.admin_notes ?? ''}
                onBlur={(e) => update.mutate({ id, patch: { admin_notes: e.target.value } })}
              />
            </div>
          )}
          <div>
            <Label>Tenant-visible notes</Label>
            <Textarea
              rows={2}
              defaultValue={insp.tenant_visible_notes ?? ''}
              onBlur={(e) => update.mutate({ id, patch: { tenant_visible_notes: e.target.value } })}
            />
          </div>
          <div>
            <Label>Owner-visible notes</Label>
            <Textarea
              rows={2}
              defaultValue={insp.owner_visible_notes ?? ''}
              onBlur={(e) => update.mutate({ id, patch: { owner_visible_notes: e.target.value } })}
            />
          </div>
          {isAdmin && (
            <div className="flex items-center gap-6 pt-1">
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={!!insp.tenant_visible}
                  onCheckedChange={(v) => update.mutate({ id, patch: { tenant_visible: v }, activity: { action: v ? 'marked_tenant_visible' : 'unmarked_tenant_visible' } })}
                />
                Share with tenant
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={!!insp.owner_visible}
                  onCheckedChange={(v) => update.mutate({ id, patch: { owner_visible: v }, activity: { action: v ? 'marked_owner_visible' : 'unmarked_owner_visible' } })}
                />
                Share with owner
              </label>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Checklist */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm">Checklist</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={newArea} onValueChange={setNewArea}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {INSPECTION_AREAS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={addItem}><Plus className="h-4 w-4 mr-1" />Add area</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {(data.items ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No checklist items yet.</p>
          ) : (
            (data.items ?? []).map((it: any) => (
              <div key={it.id} className="border rounded-md p-3 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary">{it.area}</Badge>
                  <Input
                    className="w-56 h-8 text-sm"
                    placeholder="Item (e.g. Living room floor)"
                    defaultValue={it.item_label ?? ''}
                    onBlur={(e) => upsertItem.mutate({ id: it.id, inspection_id: id, area: it.area, item_label: e.target.value })}
                  />
                  <Select
                    value={it.condition}
                    onValueChange={(v) => upsertItem.mutate({ id: it.id, inspection_id: id, area: it.area, condition: v as PmInspectionCondition })}
                  >
                    <SelectTrigger className="w-40 h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {INSPECTION_CONDITIONS.map((c) => (
                        <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="icon" variant="ghost" onClick={() => delItem.mutate({ id: it.id, inspection_id: id })}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Textarea
                  rows={1}
                  placeholder="Notes"
                  defaultValue={it.notes ?? ''}
                  onBlur={(e) => upsertItem.mutate({ id: it.id, inspection_id: id, area: it.area, notes: e.target.value })}
                />
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                  <label className="flex items-center gap-1">
                    <Switch checked={!!it.issue_found} onCheckedChange={(v) => upsertItem.mutate({ id: it.id, inspection_id: id, area: it.area, issue_found: v })} /> Issue
                  </label>
                  <label className="flex items-center gap-1">
                    <Switch checked={!!it.repair_needed} onCheckedChange={(v) => upsertItem.mutate({ id: it.id, inspection_id: id, area: it.area, repair_needed: v })} /> Repair
                  </label>
                  <label className="flex items-center gap-1">
                    <Switch checked={!!it.cleaning_needed} onCheckedChange={(v) => upsertItem.mutate({ id: it.id, inspection_id: id, area: it.area, cleaning_needed: v })} /> Cleaning
                  </label>
                  {isAdmin && (
                    <>
                      <label className="flex items-center gap-1">
                        <Switch checked={!!it.tenant_visible} onCheckedChange={(v) => upsertItem.mutate({ id: it.id, inspection_id: id, area: it.area, tenant_visible: v })} /> Tenant
                      </label>
                      <label className="flex items-center gap-1">
                        <Switch checked={!!it.owner_visible} onCheckedChange={(v) => upsertItem.mutate({ id: it.id, inspection_id: id, area: it.area, owner_visible: v })} /> Owner
                      </label>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Photos */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm">Photos</CardTitle>
          <label className="inline-flex">
            <input type="file" accept="image/*" className="hidden" onChange={uploadRef} />
            <span className="inline-flex items-center gap-1 border rounded-md px-2 py-1 text-xs cursor-pointer hover:bg-muted">
              <Upload className="h-3.5 w-3.5" /> Upload
            </span>
          </label>
        </CardHeader>
        <CardContent>
          {(data.photos ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No photos yet.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {(data.photos ?? []).map((p: any) => (
                <div key={p.id} className="border rounded-md overflow-hidden">
                  <div className="aspect-video bg-muted flex items-center justify-center">
                    {signed[p.id] ? (
                      <img src={signed[p.id]} alt={p.caption ?? p.file_name} className="object-cover w-full h-full" />
                    ) : (
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="p-2 space-y-1">
                    <Input
                      className="h-7 text-xs"
                      placeholder="Caption"
                      defaultValue={p.caption ?? ''}
                      onBlur={(e) => updatePhoto.mutate({ id: p.id, inspection_id: id, patch: { caption: e.target.value } })}
                    />
                    {isAdmin && (
                      <div className="flex items-center gap-3 text-[11px]">
                        <label className="flex items-center gap-1">
                          <Switch checked={!!p.tenant_visible} onCheckedChange={(v) => updatePhoto.mutate({ id: p.id, inspection_id: id, patch: { tenant_visible: v } })} /> Tenant
                        </label>
                        <label className="flex items-center gap-1">
                          <Switch checked={!!p.owner_visible} onCheckedChange={(v) => updatePhoto.mutate({ id: p.id, inspection_id: id, patch: { owner_visible: v } })} /> Owner
                        </label>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <a href={signed[p.id] ?? '#'} target="_blank" rel="noreferrer" className="text-xs inline-flex items-center gap-1 text-muted-foreground hover:underline">
                        <Download className="h-3 w-3" /> Open
                      </a>
                      <Button size="icon" variant="ghost" onClick={() => delPhoto.mutate({ id: p.id, file_path: p.file_path, inspection_id: id })}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Activity</CardTitle></CardHeader>
        <CardContent>
          {(data.activity ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <ul className="text-xs space-y-1">
              {data.activity.map((a: any) => (
                <li key={a.id} className="flex items-center gap-2">
                  <span className="text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
                  <Badge variant="outline" className="text-[10px]">{a.action.replace(/_/g, ' ')}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// tiny local wrapper — the hook name is long
function useUpdatePhoto() { return useUpdateInspectionPhoto(); }
