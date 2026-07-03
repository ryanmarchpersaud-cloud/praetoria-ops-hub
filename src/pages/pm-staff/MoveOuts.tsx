import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, KeyRound, Upload, Image as ImageIcon } from 'lucide-react';
import {
  useMoveOutChecklists, useCreateRecord, useUpdateRecord, usePMStaffUsers,
} from '@/hooks/pm-staff/usePMStaffData';
import { supabase } from '@/integrations/supabase/client';
import { formatStatusLabel } from '@/lib/statusLabel';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useAuthorization } from '@/hooks/useAuthorization';

const STATUSES = [
  'notice_received', 'scheduled', 'inspection_pending', 'inspection_completed',
  'cleaning_required', 'repairs_required', 'deposit_review', 'completed', 'cancelled',
];

export default function MoveOuts() {
  const { user } = useAuth();
  const auth = useAuthorization();
  const canCreate = auth.isAdmin || auth.isManager || auth.isOpsManager || auth.isPropertyManager;
  const { data = [] } = useMoveOutChecklists();
  const { data: staff = [] } = usePMStaffUsers();
  const createMut = useCreateRecord('pm_move_out_checklists', ['pm_move_out_checklists']);
  const updateMut = useUpdateRecord('pm_move_out_checklists', ['pm_move_out_checklists']);
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({
    status: 'notice_received',
    move_out_date: '',
    notice_received_date: '',
    inspection_date: '',
    assigned_to: '',
    admin_notes: '',
  });

  const submit = async () => {
    try {
      await createMut.mutateAsync({
        status: form.status,
        move_out_date: form.move_out_date || null,
        notice_received_date: form.notice_received_date || null,
        inspection_date: form.inspection_date || null,
        assigned_to: form.assigned_to || null,
        admin_notes: form.admin_notes || null,
        created_by: user?.id,
      });
      toast.success('Move-out created');
      setOpen(false);
      setForm({ status: 'notice_received', move_out_date: '', notice_received_date: '', inspection_date: '', assigned_to: '', admin_notes: '' });
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Move-Outs</h2>
        {canCreate && (
          <Button size="sm" onClick={() => setOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4 mr-1" /> New Move-Out
          </Button>
        )}
      </div>

      {data.length === 0 && (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
          No move-outs assigned to you yet.
        </CardContent></Card>
      )}

      <div className="space-y-2">
        {data.map((m: any) => {
          const tenantName = m.tenant ? `${m.tenant.first_name ?? ''} ${m.tenant.last_name ?? ''}`.trim() : '—';
          const propUnit = [m.property?.property_name, m.unit?.unit_number].filter(Boolean).join(' · ');
          const isMine = m.assigned_to === user?.id;
          return (
            <Card key={m.id}>
              <CardContent className="p-3">
                <button className="w-full flex items-center gap-3 text-left" onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}>
                  <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                    <KeyRound className="h-5 w-5 text-emerald-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{propUnit || 'Move-out'}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {tenantName} · {m.move_out_date ? `Move-out ${m.move_out_date}` : 'No date'}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge variant="outline" className="text-[10px]">{formatStatusLabel(m.status)}</Badge>
                    {isMine && <span className="text-[9px] font-semibold text-emerald-700">MINE</span>}
                  </div>
                </button>
                {expandedId === m.id && (
                  <MoveOutDetail
                    moveOut={m}
                    staff={staff}
                    canManage={canCreate || isMine}
                    onUpdate={(patch) => updateMut.mutate({ id: m.id, patch })}
                  />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {canCreate && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>New move-out</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{formatStatusLabel(s)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Notice received</Label><Input type="date" value={form.notice_received_date} onChange={e => setForm({ ...form, notice_received_date: e.target.value })} /></div>
                <div><Label>Move-out date</Label><Input type="date" value={form.move_out_date} onChange={e => setForm({ ...form, move_out_date: e.target.value })} /></div>
              </div>
              <div><Label>Inspection date</Label><Input type="date" value={form.inspection_date} onChange={e => setForm({ ...form, inspection_date: e.target.value })} /></div>
              <div>
                <Label>Assign to staff</Label>
                <Select value={form.assigned_to} onValueChange={v => setForm({ ...form, assigned_to: v })}>
                  <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>
                    {staff.map((s: any) => <SelectItem key={s.user_id} value={s.user_id}>{s.display_name} ({formatStatusLabel(s.role)})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Admin notes</Label><Textarea value={form.admin_notes} onChange={e => setForm({ ...form, admin_notes: e.target.value })} rows={2} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={submit} disabled={createMut.isPending}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function MoveOutDetail({ moveOut, staff, canManage, onUpdate }: any) {
  const { user } = useAuth();
  const { isOpsStaff, isPropertyManager } = useAuthorization();
  const canReassign = isOpsStaff || isPropertyManager;
  const itemUpdate = useUpdateRecord('pm_move_out_checklist_items', ['pm_move_out_items', moveOut.id]);

  const { data: items = [] } = useQuery({
    queryKey: ['pm_move_out_items', moveOut.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('pm_move_out_checklist_items' as any)
        .select('*').eq('checklist_id', moveOut.id).order('sort_order');
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="mt-3 border-t pt-3 space-y-4">
      {canReassign && (
        <div>
          <Label className="text-xs">Assigned staff</Label>
          <Select value={moveOut.assigned_to ?? ''} onValueChange={v => onUpdate({ assigned_to: v || null })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Unassigned" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__" disabled>—</SelectItem>
              {staff.map((s: any) => <SelectItem key={s.user_id} value={s.user_id}>{s.display_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {canManage && (
        <div>
          <Label className="text-xs">Status</Label>
          <Select value={moveOut.status} onValueChange={v => onUpdate({ status: v })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{formatStatusLabel(s)}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <ReturnToggle label="Keys" value={!!moveOut.keys_returned} disabled={!canManage} onChange={v => onUpdate({ keys_returned: v })} />
        <ReturnToggle label="Garage" value={!!moveOut.garage_opener_returned} disabled={!canManage} onChange={v => onUpdate({ garage_opener_returned: v })} />
        <ReturnToggle label="Parking" value={!!moveOut.parking_pass_returned} disabled={!canManage} onChange={v => onUpdate({ parking_pass_returned: v })} />
      </div>

      <div>
        <Label className="text-xs">Final meter reading</Label>
        <Input className="h-8 text-xs" value={moveOut.final_meter_reading ?? ''} disabled={!canManage}
          onChange={e => onUpdate({ final_meter_reading: e.target.value })} />
      </div>

      <div>
        <Label className="text-xs">Tenant-visible notes</Label>
        <Textarea rows={2} className="text-xs" value={moveOut.tenant_visible_notes ?? ''} disabled={!canManage}
          onChange={e => onUpdate({ tenant_visible_notes: e.target.value })} />
      </div>

      <div>
        <Label className="text-xs">Checklist</Label>
        <div className="space-y-1">
          {items.map((it: any) => (
            <label key={it.id} className="flex items-start gap-2 py-1 cursor-pointer">
              <Checkbox
                checked={it.completed}
                disabled={!canManage}
                onCheckedChange={(c) => itemUpdate.mutate({
                  id: it.id,
                  patch: {
                    completed: !!c,
                    completed_by: c ? user?.id : null,
                    completed_at: c ? new Date().toISOString() : null,
                  },
                })}
              />
              <span className={`text-xs ${it.completed ? 'line-through text-muted-foreground' : ''}`}>{it.label}</span>
            </label>
          ))}
        </div>
      </div>

      <InspectionBlock moveOut={moveOut} canManage={canManage} />
    </div>
  );
}

function ReturnToggle({ label, value, disabled, onChange }: any) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!value)}
      className={`p-2 rounded-md border text-[11px] font-medium transition ${value ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-muted/40 border-border text-muted-foreground'} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
    >
      {label}: {value ? 'Returned' : 'Pending'}
    </button>
  );
}

function InspectionBlock({ moveOut, canManage }: { moveOut: any; canManage: boolean }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: inspection } = useQuery({
    queryKey: ['pm_move_out_inspection', moveOut.id],
    queryFn: async () => {
      const { data } = await supabase.from('pm_move_out_inspections' as any)
        .select('*').eq('move_out_id', moveOut.id).maybeSingle();
      return data;
    },
  });

  const { data: photos = [] } = useQuery({
    queryKey: ['pm_move_out_photos', inspection?.id],
    queryFn: async () => {
      if (!inspection?.id) return [];
      const { data } = await supabase.from('pm_move_out_inspection_photos' as any)
        .select('*').eq('inspection_id', inspection.id).order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!inspection?.id,
  });

  const upsert = useMutation({
    mutationFn: async (patch: any) => {
      if (inspection?.id) {
        const { error } = await supabase.from('pm_move_out_inspections' as any).update(patch).eq('id', inspection.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('pm_move_out_inspections' as any).insert({ move_out_id: moveOut.id, inspected_by: user?.id, inspected_at: new Date().toISOString(), ...patch });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pm_move_out_inspection', moveOut.id] }),
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    let insp = inspection;
    if (!insp?.id) {
      const { data, error } = await supabase.from('pm_move_out_inspections' as any)
        .insert({ move_out_id: moveOut.id, inspected_by: user?.id, inspected_at: new Date().toISOString() })
        .select().single();
      if (error) { toast.error(error.message); return; }
      insp = data;
    }
    const path = `${moveOut.id}/${insp.id}/${Date.now()}_${file.name}`;
    const { error: upErr } = await supabase.storage.from('pm-move-out-photos').upload(path, file);
    if (upErr) { toast.error(upErr.message); return; }
    const { error: rowErr } = await supabase.from('pm_move_out_inspection_photos' as any)
      .insert({ inspection_id: insp.id, storage_path: path, uploaded_by: user?.id });
    if (rowErr) { toast.error(rowErr.message); return; }
    toast.success('Photo uploaded');
    qc.invalidateQueries({ queryKey: ['pm_move_out_inspection', moveOut.id] });
    qc.invalidateQueries({ queryKey: ['pm_move_out_photos', insp.id] });
    e.target.value = '';
  };

  return (
    <div className="bg-muted/30 rounded-md p-3 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Inspection</p>
      <div>
        <Label className="text-xs">General condition</Label>
        <Textarea rows={2} className="text-xs" defaultValue={inspection?.general_condition_notes ?? ''} disabled={!canManage}
          onBlur={e => upsert.mutate({ general_condition_notes: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Damage</Label>
          <Textarea rows={2} className="text-xs" defaultValue={inspection?.damage_notes ?? ''} disabled={!canManage}
            onBlur={e => upsert.mutate({ damage_notes: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Cleaning</Label>
          <Textarea rows={2} className="text-xs" defaultValue={inspection?.cleaning_notes ?? ''} disabled={!canManage}
            onBlur={e => upsert.mutate({ cleaning_notes: e.target.value })} />
        </div>
      </div>

      {canManage && (
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-emerald-600 text-white">
            <Upload className="h-3 w-3" /> Upload photo
          </span>
        </label>
      )}

      {photos.length > 0 && (
        <div className="grid grid-cols-4 gap-1">
          {photos.map((p: any) => <PhotoThumb key={p.id} path={p.storage_path} />)}
        </div>
      )}
    </div>
  );
}

function PhotoThumb({ path }: { path: string }) {
  const { data } = useQuery({
    queryKey: ['pm_moveout_thumb', path],
    queryFn: async () => {
      const { data } = await supabase.storage.from('pm-move-out-photos').createSignedUrl(path, 60 * 60);
      return data?.signedUrl;
    },
  });
  if (!data) return <div className="aspect-square bg-muted rounded flex items-center justify-center"><ImageIcon className="h-4 w-4 text-muted-foreground" /></div>;
  return <a href={data} target="_blank" rel="noreferrer"><img src={data} alt="" className="aspect-square object-cover rounded" /></a>;
}
