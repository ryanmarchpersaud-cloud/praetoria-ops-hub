import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import {
  useEmergencyContacts, useOccupants, useVehicles, usePets, useInsurance,
  useSaveRow, useDeleteRow, signInsuranceProof,
} from '@/hooks/useTenantProfile';

const INS_STATUSES = ['not_provided', 'requested', 'provided', 'expired', 'waived'];

export function TenantProfileAdminPanel({ tenantId }: { tenantId: string }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Tenant Profile Records</CardTitle></CardHeader>
      <CardContent>
        <Tabs defaultValue="emergency">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="emergency">Emergency</TabsTrigger>
            <TabsTrigger value="insurance">Insurance</TabsTrigger>
            <TabsTrigger value="occupants">Occupants</TabsTrigger>
            <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
            <TabsTrigger value="pets">Pets</TabsTrigger>
          </TabsList>
          <TabsContent value="emergency"><EmergencyList tenantId={tenantId} /></TabsContent>
          <TabsContent value="insurance"><InsuranceAdmin tenantId={tenantId} /></TabsContent>
          <TabsContent value="occupants"><OccupantsList tenantId={tenantId} /></TabsContent>
          <TabsContent value="vehicles"><VehiclesList tenantId={tenantId} /></TabsContent>
          <TabsContent value="pets"><PetsList tenantId={tenantId} /></TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function useRowState<T extends Record<string, any>>(initial: T) {
  const [state, setState] = useState<T>(initial);
  return [state, (patch: Partial<T>) => setState({ ...state, ...patch }), () => setState(initial)] as const;
}

function EmergencyList({ tenantId }: { tenantId: string }) {
  const { data = [] } = useEmergencyContacts(tenantId);
  const save = useSaveRow('pm_tenant_emergency_contacts', 'emergency');
  const del = useDeleteRow('pm_tenant_emergency_contacts', 'emergency');
  const [row, patch, reset] = useRowState<any>({ contact_name: '', relationship: '', phone: '', email: '', notes: '', is_primary: false });
  return (
    <div className="space-y-3 pt-3">
      <ul className="divide-y">
        {data.map((r: any) => (
          <li key={r.id} className="py-2 flex items-start gap-2">
            <div className="flex-1">
              <p className="font-medium text-sm">{r.contact_name}{r.is_primary && <Badge className="ml-2 bg-emerald-100 text-emerald-800">Primary</Badge>}</p>
              <p className="text-xs text-muted-foreground">{[r.relationship, r.phone, r.email].filter(Boolean).join(' · ')}</p>
              {r.notes && <p className="text-xs mt-1">{r.notes}</p>}
            </div>
            <Button size="icon" variant="ghost" onClick={() => del.mutate(r.id)}><Trash2 className="h-4 w-4" /></Button>
          </li>
        ))}
      </ul>
      <div className="border rounded p-3 grid grid-cols-1 md:grid-cols-2 gap-2">
        <div><Label>Name*</Label><Input value={row.contact_name} onChange={e => patch({ contact_name: e.target.value })} /></div>
        <div><Label>Relationship</Label><Input value={row.relationship} onChange={e => patch({ relationship: e.target.value })} /></div>
        <div><Label>Phone</Label><Input value={row.phone} onChange={e => patch({ phone: e.target.value })} /></div>
        <div><Label>Email</Label><Input value={row.email} onChange={e => patch({ email: e.target.value })} /></div>
        <div className="md:col-span-2"><Label>Notes</Label><Textarea rows={2} value={row.notes} onChange={e => patch({ notes: e.target.value })} /></div>
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={row.is_primary} onCheckedChange={v => patch({ is_primary: !!v })} /> Primary contact</label>
        <div className="md:col-span-2 flex justify-end">
          <Button size="sm" disabled={!row.contact_name} onClick={async () => {
            try { await save.mutateAsync({ ...row, tenant_id: tenantId }); toast.success('Saved'); reset(); }
            catch (e: any) { toast.error(e.message); }
          }}><Plus className="h-4 w-4 mr-1" />Add contact</Button>
        </div>
      </div>
    </div>
  );
}

function InsuranceAdmin({ tenantId }: { tenantId: string }) {
  const { data } = useInsurance(tenantId);
  const save = useSaveRow('pm_tenant_insurance', 'insurance');
  const [row, patch] = useRowState<any>({});
  const current = { ...(data ?? {}), ...row };
  return (
    <div className="pt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
      <div>
        <Label>Status</Label>
        <Select value={current.status ?? 'not_provided'} onValueChange={v => patch({ status: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{INS_STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div><Label>Provider</Label><Input value={current.provider ?? ''} onChange={e => patch({ provider: e.target.value })} /></div>
      <div><Label>Policy number</Label><Input value={current.policy_number ?? ''} onChange={e => patch({ policy_number: e.target.value })} /></div>
      <div><Label>Coverage start</Label><Input type="date" value={current.coverage_start ?? ''} onChange={e => patch({ coverage_start: e.target.value })} /></div>
      <div><Label>Coverage expiry</Label><Input type="date" value={current.coverage_expiry ?? ''} onChange={e => patch({ coverage_expiry: e.target.value })} /></div>
      <label className="flex items-center gap-2 text-sm md:col-span-2"><Checkbox checked={!!current.admin_verified} onCheckedChange={v => patch({ admin_verified: !!v })} /><ShieldCheck className="h-4 w-4 text-emerald-700" /> Admin verified</label>
      <div className="md:col-span-2"><Label>Admin notes (never shown to tenant)</Label><Textarea rows={2} value={current.admin_notes ?? ''} onChange={e => patch({ admin_notes: e.target.value })} /></div>
      {current.storage_path && (
        <div className="md:col-span-2 text-xs">
          <button className="text-emerald-700 underline" onClick={async () => window.open(await signInsuranceProof(current.storage_path), '_blank')}>
            View uploaded proof
          </button>
        </div>
      )}
      <div className="md:col-span-2 flex justify-end">
        <Button size="sm" onClick={async () => {
          try {
            await save.mutateAsync({ id: data?.id, tenant_id: tenantId, ...current });
            toast.success('Saved');
          } catch (e: any) { toast.error(e.message); }
        }}>Save insurance</Button>
      </div>
    </div>
  );
}

function OccupantsList({ tenantId }: { tenantId: string }) {
  const { data = [] } = useOccupants(tenantId);
  const save = useSaveRow('pm_tenant_occupants', 'occupants');
  const del = useDeleteRow('pm_tenant_occupants', 'occupants');
  const [row, patch, reset] = useRowState<any>({ occupant_name: '', relationship: '', is_minor: false, notes: '', is_active: true });
  return (
    <div className="pt-3 space-y-3">
      <ul className="divide-y">
        {data.map((r: any) => (
          <li key={r.id} className="py-2 flex items-start gap-2">
            <div className="flex-1">
              <p className="font-medium text-sm">{r.occupant_name} {r.is_minor && <Badge variant="outline" className="ml-1">Minor</Badge>} {!r.is_active && <Badge variant="secondary" className="ml-1">Inactive</Badge>}</p>
              <p className="text-xs text-muted-foreground">{r.relationship}</p>
              {r.notes && <p className="text-xs mt-1">{r.notes}</p>}
            </div>
            <Button size="icon" variant="ghost" onClick={() => del.mutate(r.id)}><Trash2 className="h-4 w-4" /></Button>
          </li>
        ))}
      </ul>
      <div className="border rounded p-3 grid grid-cols-1 md:grid-cols-2 gap-2">
        <div><Label>Name*</Label><Input value={row.occupant_name} onChange={e => patch({ occupant_name: e.target.value })} /></div>
        <div><Label>Relationship</Label><Input value={row.relationship} onChange={e => patch({ relationship: e.target.value })} /></div>
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={row.is_minor} onCheckedChange={v => patch({ is_minor: !!v })} /> Minor</label>
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={row.is_active} onCheckedChange={v => patch({ is_active: !!v })} /> Active</label>
        <div className="md:col-span-2"><Label>Notes</Label><Textarea rows={2} value={row.notes} onChange={e => patch({ notes: e.target.value })} /></div>
        <div className="md:col-span-2 flex justify-end">
          <Button size="sm" disabled={!row.occupant_name} onClick={async () => {
            try { await save.mutateAsync({ ...row, tenant_id: tenantId }); toast.success('Added'); reset(); }
            catch (e: any) { toast.error(e.message); }
          }}><Plus className="h-4 w-4 mr-1" />Add occupant</Button>
        </div>
      </div>
    </div>
  );
}

function VehiclesList({ tenantId }: { tenantId: string }) {
  const { data = [] } = useVehicles(tenantId);
  const save = useSaveRow('pm_tenant_vehicles', 'vehicles');
  const del = useDeleteRow('pm_tenant_vehicles', 'vehicles');
  const [row, patch, reset] = useRowState<any>({ make_model: '', colour: '', plate: '', parking_note: '', is_active: true });
  return (
    <div className="pt-3 space-y-3">
      <ul className="divide-y">
        {data.map((r: any) => (
          <li key={r.id} className="py-2 flex items-start gap-2">
            <div className="flex-1">
              <p className="font-medium text-sm">{r.make_model} {r.colour && <span className="text-muted-foreground">· {r.colour}</span>}</p>
              <p className="text-xs text-muted-foreground">{[r.plate, r.parking_note].filter(Boolean).join(' · ')}</p>
              {!r.is_active && <Badge variant="secondary">Inactive</Badge>}
            </div>
            <Button size="icon" variant="ghost" onClick={() => del.mutate(r.id)}><Trash2 className="h-4 w-4" /></Button>
          </li>
        ))}
      </ul>
      <div className="border rounded p-3 grid grid-cols-1 md:grid-cols-2 gap-2">
        <div><Label>Make / model*</Label><Input value={row.make_model} onChange={e => patch({ make_model: e.target.value })} /></div>
        <div><Label>Colour</Label><Input value={row.colour} onChange={e => patch({ colour: e.target.value })} /></div>
        <div><Label>Plate</Label><Input value={row.plate} onChange={e => patch({ plate: e.target.value })} /></div>
        <div><Label>Parking / stall</Label><Input value={row.parking_note} onChange={e => patch({ parking_note: e.target.value })} /></div>
        <label className="flex items-center gap-2 text-sm md:col-span-2"><Checkbox checked={row.is_active} onCheckedChange={v => patch({ is_active: !!v })} /> Active</label>
        <div className="md:col-span-2 flex justify-end">
          <Button size="sm" disabled={!row.make_model} onClick={async () => {
            try { await save.mutateAsync({ ...row, tenant_id: tenantId }); toast.success('Added'); reset(); }
            catch (e: any) { toast.error(e.message); }
          }}><Plus className="h-4 w-4 mr-1" />Add vehicle</Button>
        </div>
      </div>
    </div>
  );
}

function PetsList({ tenantId }: { tenantId: string }) {
  const { data = [] } = usePets(tenantId);
  const save = useSaveRow('pm_tenant_pets', 'pets');
  const del = useDeleteRow('pm_tenant_pets', 'pets');
  const [row, patch, reset] = useRowState<any>({ pet_name: '', pet_type: '', breed: '', notes: '', is_approved: false, is_active: true });
  return (
    <div className="pt-3 space-y-3">
      <ul className="divide-y">
        {data.map((r: any) => (
          <li key={r.id} className="py-2 flex items-start gap-2">
            <div className="flex-1">
              <p className="font-medium text-sm">{r.pet_name} {r.is_approved ? <Badge className="ml-1 bg-emerald-100 text-emerald-800">Approved</Badge> : <Badge variant="outline" className="ml-1">Pending</Badge>}</p>
              <p className="text-xs text-muted-foreground">{[r.pet_type, r.breed].filter(Boolean).join(' · ')}</p>
              {r.notes && <p className="text-xs mt-1">{r.notes}</p>}
            </div>
            <Button size="icon" variant="ghost" onClick={() => del.mutate(r.id)}><Trash2 className="h-4 w-4" /></Button>
          </li>
        ))}
      </ul>
      <div className="border rounded p-3 grid grid-cols-1 md:grid-cols-2 gap-2">
        <div><Label>Name*</Label><Input value={row.pet_name} onChange={e => patch({ pet_name: e.target.value })} /></div>
        <div><Label>Type</Label><Input value={row.pet_type} onChange={e => patch({ pet_type: e.target.value })} /></div>
        <div><Label>Breed</Label><Input value={row.breed} onChange={e => patch({ breed: e.target.value })} /></div>
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={row.is_approved} onCheckedChange={v => patch({ is_approved: !!v })} /> Approved</label>
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={row.is_active} onCheckedChange={v => patch({ is_active: !!v })} /> Active</label>
        <div className="md:col-span-2"><Label>Notes</Label><Textarea rows={2} value={row.notes} onChange={e => patch({ notes: e.target.value })} /></div>
        <div className="md:col-span-2 flex justify-end">
          <Button size="sm" disabled={!row.pet_name} onClick={async () => {
            try { await save.mutateAsync({ ...row, tenant_id: tenantId }); toast.success('Added'); reset(); }
            catch (e: any) { toast.error(e.message); }
          }}><Plus className="h-4 w-4 mr-1" />Add pet</Button>
        </div>
      </div>
    </div>
  );
}
