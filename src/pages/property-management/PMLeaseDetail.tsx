import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { usePmLease, useSavePmLease, useDeletePmLease, usePmTenants, usePmProperties, usePmUnits } from '@/hooks/usePropertyManagement';
import { supabase } from '@/integrations/supabase/client';
import TenantLedgerManager from '@/components/property-management/TenantLedgerManager';
import { PMDocumentsSection } from '@/components/property-management/PMDocumentsSection';

export default function PMLeaseDetail() {
  const { id } = useParams();
  const { data } = usePmLease(id);
  const save = useSavePmLease();
  const del = useDeletePmLease();
  const { data: tenants = [] } = usePmTenants();
  const { data: properties = [] } = usePmProperties();
  const { data: allUnits = [] } = usePmUnits();
  const [form, setForm] = useState<any>({});
  useEffect(() => { if (data) setForm(data); }, [data]);
  if (!data) return <div className="p-6">Loading…</div>;

  const units = allUnits.filter(u => u.property_id === form.property_id);

  const upload = async (file: File) => {
    const path = `pm/${form.property_id}/lease-${id}-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('property-management-documents').upload(path, file, { upsert: true });
    if (error) return toast.error(error.message);
    setForm({ ...form, lease_document_path: path });
    toast.success('Uploaded. Click Save to attach.');
  };

  const openDoc = async () => {
    if (!form.lease_document_path) return;
    const { data, error } = await supabase.storage.from('property-management-documents').createSignedUrl(form.lease_document_path, 300);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, '_blank');
  };

  return (
    <div className="p-6 space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild><Link to="/property-management/leases"><ArrowLeft className="h-4 w-4 mr-1" />Back</Link></Button>
        <div className="ml-auto flex gap-2">
          <Button variant="destructive" size="sm" onClick={async () => { if (confirm('Delete lease?')) { try { await del.mutateAsync(id!); toast.success('Deleted'); window.history.back(); } catch (e: any) { toast.error(e.message); } } }}><Trash2 className="h-4 w-4 mr-1" />Delete</Button>
          <Button onClick={async () => { try { await save.mutateAsync({ ...form, id }); toast.success('Saved'); } catch (e: any) { toast.error(e.message); } }}>Save</Button>
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle>Lease</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>Tenant</Label>
            <Select value={form.tenant_id ?? ''} onValueChange={(v) => setForm({ ...form, tenant_id: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{tenants.map(t => <SelectItem key={t.id} value={t.id}>{t.first_name} {t.last_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Property</Label>
            <Select value={form.property_id ?? ''} onValueChange={(v) => setForm({ ...form, property_id: v, unit_id: null })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{properties.map(p => <SelectItem key={p.id} value={p.id}>{p.property_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Unit</Label>
            <Select value={form.unit_id ?? 'none'} onValueChange={(v) => setForm({ ...form, unit_id: v === 'none' ? null : v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Whole property —</SelectItem>
                {units.map(u => <SelectItem key={u.id} value={u.id}>{u.unit_label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{['draft','active','ended','terminated'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Start date</Label><Input type="date" value={form.start_date ?? ''} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
          <div><Label>End date</Label><Input type="date" value={form.end_date ?? ''} onChange={(e) => setForm({ ...form, end_date: e.target.value || null })} /></div>
          <div><Label>Monthly rent</Label><Input type="number" step="0.01" value={form.monthly_rent ?? 0} onChange={(e) => setForm({ ...form, monthly_rent: Number(e.target.value) })} /></div>
          <div><Label>Deposit</Label><Input type="number" step="0.01" value={form.deposit_amount ?? 0} onChange={(e) => setForm({ ...form, deposit_amount: Number(e.target.value) })} /></div>
          <div><Label>Rent due day</Label><Input type="number" min={1} max={31} value={form.rent_due_day ?? 1} onChange={(e) => setForm({ ...form, rent_due_day: Number(e.target.value) })} /></div>
          <div className="md:col-span-2"><Label>Notes</Label><Textarea value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <div className="md:col-span-2 space-y-2">
            <Label>Lease document</Label>
            <div className="flex items-center gap-2">
              <Input type="file" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} accept=".pdf,.doc,.docx,image/*" />
              {form.lease_document_path && (
                <Button type="button" variant="outline" size="sm" onClick={openDoc}><Upload className="h-4 w-4 mr-1" />Open</Button>
              )}
            </div>
            {form.lease_document_path && <p className="text-xs text-muted-foreground truncate">{form.lease_document_path}</p>}
          </div>
        </CardContent>
      </Card>
      {form.tenant_id && (
        <TenantLedgerManager
          tenantId={form.tenant_id}
          leaseId={id!}
          propertyId={form.property_id ?? null}
          unitId={form.unit_id ?? null}
          defaultRentAmount={Number(form.monthly_rent ?? 0)}
          defaultRentDueDay={Number(form.rent_due_day ?? 1)}
        />
      )}

      <PMDocumentsSection
        filters={{ lease_id: id }}
        uploadDefaults={{
          lease_id: id,
          tenant_id: form.tenant_id ?? null,
          property_id: form.property_id ?? null,
          unit_id: form.unit_id ?? null,
        }}
        defaultVisibility="tenant_visible"
      />
    </div>
  );
}
