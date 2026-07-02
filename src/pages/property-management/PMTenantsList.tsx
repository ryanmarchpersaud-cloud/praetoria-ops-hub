import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { usePmTenants, useSavePmTenant, type PmTenantStatus } from '@/hooks/usePropertyManagement';
import { toast } from 'sonner';

const STATUSES: PmTenantStatus[] = ['active', 'pending', 'former'];

export default function PMTenantsList() {
  const { data: tenants = [], isLoading } = usePmTenants();
  const save = useSavePmTenant();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ status: 'pending' });

  const submit = async () => {
    if (!form.first_name?.trim()) return toast.error('First name required');
    try {
      await save.mutateAsync(form);
      toast.success('Tenant saved');
      setOpen(false);
      setForm({ status: 'pending' });
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="p-6 space-y-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tenants</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />New Tenant</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Tenant</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>First name *</Label><Input value={form.first_name ?? ''} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></div>
                <div><Label>Last name</Label><Input value={form.last_name ?? ''} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Email</Label><Input type="email" value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div><Label>Phone</Label><Input value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Notes</Label><Textarea value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={submit} disabled={save.isPending}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">All tenants</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? 'Loading…' : tenants.length === 0 ? <p className="text-sm text-muted-foreground">No tenants yet.</p> : (
            <div className="divide-y">
              {tenants.map(t => (
                <Link key={t.id} to={`/property-management/tenants/${t.id}`} className="flex items-center justify-between py-3 hover:bg-muted/40 px-2 rounded">
                  <div>
                    <div className="font-medium">{t.first_name} {t.last_name ?? ''}</div>
                    <div className="text-xs text-muted-foreground">{t.email || '—'} · {t.phone || '—'}</div>
                  </div>
                  <Badge variant={t.status === 'active' ? 'default' : 'outline'}>{t.status}</Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
