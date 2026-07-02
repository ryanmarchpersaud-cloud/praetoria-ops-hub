import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Trash2, UserPlus, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { usePmTenant, useSavePmTenant, useDeletePmTenant, usePmLeases, usePmProperties } from '@/hooks/usePropertyManagement';
import { InviteTenantDialog } from '@/components/property-management/InviteTenantDialog';

export default function PMTenantDetail() {
  const { id } = useParams();
  const { data } = usePmTenant(id);
  const save = useSavePmTenant();
  const del = useDeletePmTenant();
  const { data: leases = [] } = usePmLeases();
  const { data: props = [] } = usePmProperties();
  const [form, setForm] = useState<any>({});
  useEffect(() => { if (data) setForm(data); }, [data]);
  if (!data) return <div className="p-6">Loading…</div>;

  const myLeases = leases.filter(l => l.tenant_id === id);
  const propMap = Object.fromEntries(props.map(p => [p.id, p]));

  return (
    <div className="p-6 space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild><Link to="/property-management/tenants"><ArrowLeft className="h-4 w-4 mr-1" />Back</Link></Button>
        <div className="ml-auto flex gap-2">
          <Button variant="destructive" size="sm" onClick={async () => { if (confirm('Delete tenant?')) { try { await del.mutateAsync(id!); toast.success('Deleted'); window.history.back(); } catch (e: any) { toast.error(e.message); } } }}><Trash2 className="h-4 w-4 mr-1" />Delete</Button>
          <Button onClick={async () => { try { await save.mutateAsync({ ...form, id }); toast.success('Saved'); } catch (e: any) { toast.error(e.message); } }}>Save</Button>
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle>{form.first_name} {form.last_name}</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><Label>First name</Label><Input value={form.first_name ?? ''} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></div>
          <div><Label>Last name</Label><Input value={form.last_name ?? ''} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></div>
          <div><Label>Email</Label><Input value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><Label>Phone</Label><Input value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{['active','pending','former'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2"><Label>Notes</Label><Textarea value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Leases ({myLeases.length})</CardTitle></CardHeader>
        <CardContent>
          {myLeases.length === 0 ? <p className="text-sm text-muted-foreground">No leases.</p> : (
            <ul className="divide-y">
              {myLeases.map(l => (
                <li key={l.id} className="py-2">
                  <Link className="text-primary hover:underline" to={`/property-management/leases/${l.id}`}>
                    {propMap[l.property_id]?.property_name ?? 'Property'} · {l.start_date} → {l.end_date ?? '—'} · ${l.monthly_rent}/mo ({l.status})
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
