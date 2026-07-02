import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { usePmOwner, useSavePmOwner, useDeletePmOwner, usePmProperties } from '@/hooks/usePropertyManagement';
import { toast } from 'sonner';
import { ArrowLeft, Trash2, Mail } from 'lucide-react';
import { InvitePropertyOwnerDialog } from '@/components/property-management/InvitePropertyOwnerDialog';

export default function PMOwnerDetail() {
  const { id } = useParams();
  const { data } = usePmOwner(id);
  const save = useSavePmOwner();
  const del = useDeletePmOwner();
  const { data: props = [] } = usePmProperties();
  const [form, setForm] = useState<any>({});
  const [inviteOpen, setInviteOpen] = useState(false);
  useEffect(() => { if (data) setForm(data); }, [data]);
  if (!data) return <div className="p-6">Loading…</div>;

  const linkedProps = props.filter(p => p.primary_owner_id === id);

  const submit = async () => {
    try { await save.mutateAsync({ ...form, id }); toast.success('Saved'); }
    catch (e: any) { toast.error(e.message); }
  };
  const remove = async () => {
    if (!confirm('Delete this owner? Properties will be unlinked.')) return;
    try { await del.mutateAsync(id!); toast.success('Deleted'); window.history.back(); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="p-6 space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild><Link to="/property-management/owners"><ArrowLeft className="h-4 w-4 mr-1" />Back</Link></Button>
        <div className="ml-auto flex gap-2">
          <Button variant="destructive" size="sm" onClick={remove}><Trash2 className="h-4 w-4 mr-1" />Delete</Button>
          <Button onClick={submit} disabled={save.isPending}>Save</Button>
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle>{form.owner_name}</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><Label>Owner name</Label><Input value={form.owner_name ?? ''} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} /></div>
          <div><Label>Company</Label><Input value={form.company_name ?? ''} onChange={(e) => setForm({ ...form, company_name: e.target.value })} /></div>
          <div><Label>Email</Label><Input value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><Label>Phone</Label><Input value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div className="md:col-span-2"><Label>Mailing address</Label><Input value={form.mailing_address ?? ''} onChange={(e) => setForm({ ...form, mailing_address: e.target.value })} /></div>
          <div className="md:col-span-2"><Label>Notes</Label><Textarea value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <div className="flex items-center gap-2"><Switch checked={!!form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>Active</Label></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Linked properties ({linkedProps.length})</CardTitle></CardHeader>
        <CardContent>
          {linkedProps.length === 0 ? <p className="text-sm text-muted-foreground">None yet.</p> : (
            <ul className="divide-y">
              {linkedProps.map(p => (
                <li key={p.id} className="py-2"><Link className="text-primary hover:underline" to={`/property-management/properties/${p.id}`}>{p.property_name}</Link></li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
