import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { usePmOwners, useSavePmOwner } from '@/hooks/usePropertyManagement';
import { toast } from 'sonner';

export default function PMOwnersList() {
  const { data: owners = [], isLoading } = usePmOwners();
  const save = useSavePmOwner();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ owner_name: '', is_active: true });

  const submit = async () => {
    if (!form.owner_name?.trim()) return toast.error('Owner name is required');
    try {
      await save.mutateAsync(form);
      toast.success('Owner saved');
      setOpen(false);
      setForm({ owner_name: '', is_active: true });
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="p-6 space-y-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Property Owners</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />New Owner</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Property Owner</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Owner name *</Label><Input value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} /></div>
              <div><Label>Company</Label><Input value={form.company_name ?? ''} onChange={(e) => setForm({ ...form, company_name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Email</Label><Input type="email" value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div><Label>Phone</Label><Input value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              </div>
              <div><Label>Mailing address</Label><Input value={form.mailing_address ?? ''} onChange={(e) => setForm({ ...form, mailing_address: e.target.value })} /></div>
              <div><Label>Notes</Label><Textarea value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={submit} disabled={save.isPending}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">All owners</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? 'Loading…' : owners.length === 0 ? (
            <p className="text-sm text-muted-foreground">No property owners yet.</p>
          ) : (
            <div className="divide-y">
              {owners.map((o) => (
                <Link key={o.id} to={`/property-management/owners/${o.id}`} className="flex items-center justify-between py-3 hover:bg-muted/40 px-2 rounded">
                  <div>
                    <div className="font-medium">{o.owner_name}{o.company_name ? ` — ${o.company_name}` : ''}</div>
                    <div className="text-xs text-muted-foreground">{o.email || '—'} · {o.phone || '—'}</div>
                  </div>
                  {!o.is_active && <Badge variant="secondary">Inactive</Badge>}
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
