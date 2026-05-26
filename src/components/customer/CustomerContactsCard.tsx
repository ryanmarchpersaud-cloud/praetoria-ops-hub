import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, Pencil, Trash2, Mail, Phone, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Contact {
  id: string;
  customer_id: string;
  first_name: string;
  last_name: string | null;
  relationship: string | null;
  title: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  notes: string | null;
  is_primary: boolean;
}

const empty = {
  first_name: '', last_name: '', relationship: '', title: '',
  email: '', phone: '', mobile: '', notes: '', is_primary: false,
};

export function CustomerContactsCard({ customerId }: { customerId: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [form, setForm] = useState<any>(empty);

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['customer_contacts', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_contacts')
        .select('*')
        .eq('customer_id', customerId)
        .order('is_primary', { ascending: false })
        .order('created_at');
      if (error) throw error;
      return data as Contact[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.first_name?.trim()) throw new Error('First name is required');
      const payload = {
        customer_id: customerId,
        first_name: form.first_name.trim(),
        last_name: form.last_name?.trim() || null,
        relationship: form.relationship?.trim() || null,
        title: form.title?.trim() || null,
        email: form.email?.trim() || null,
        phone: form.phone?.trim() || null,
        mobile: form.mobile?.trim() || null,
        notes: form.notes?.trim() || null,
        is_primary: !!form.is_primary,
      };
      if (editing) {
        const { error } = await supabase.from('customer_contacts').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('customer_contacts').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer_contacts', customerId] });
      setOpen(false);
      setEditing(null);
      setForm(empty);
      toast({ title: editing ? 'Contact updated' : 'Contact added' });
    },
    onError: (e: any) => toast({ title: 'Save failed', description: e.message, variant: 'destructive' }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('customer_contacts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer_contacts', customerId] });
      toast({ title: 'Contact removed' });
    },
  });

  const openAdd = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (c: Contact) => { setEditing(c); setForm({ ...c }); setOpen(true); };

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <Users className="h-4 w-4" /> Additional Contacts
        </CardTitle>
        <Button size="sm" variant="outline" onClick={openAdd}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Contact
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : contacts.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No additional contacts. Add a spouse, partner, or other contact for this customer.
          </p>
        ) : (
          contacts.map(c => (
            <div key={c.id} className="flex items-start justify-between gap-3 p-3 rounded-md border bg-muted/30">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold">
                    {c.first_name} {c.last_name}
                  </p>
                  {c.is_primary && (
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-200">
                      <Star className="h-2.5 w-2.5 mr-0.5" /> Primary
                    </Badge>
                  )}
                  {c.relationship && (
                    <Badge variant="secondary" className="text-[10px]">{c.relationship}</Badge>
                  )}
                  {c.title && <span className="text-[11px] text-muted-foreground">{c.title}</span>}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {c.email && (
                    <a href={`mailto:${c.email}`} className="flex items-center gap-1 hover:text-primary">
                      <Mail className="h-3 w-3" /> {c.email}
                    </a>
                  )}
                  {c.phone && (
                    <a href={`tel:${c.phone}`} className="flex items-center gap-1 hover:text-primary">
                      <Phone className="h-3 w-3" /> {c.phone}
                    </a>
                  )}
                  {c.mobile && (
                    <a href={`tel:${c.mobile}`} className="flex items-center gap-1 hover:text-primary">
                      <Phone className="h-3 w-3" /> {c.mobile} (mobile)
                    </a>
                  )}
                </div>
                {c.notes && <p className="text-[11px] text-muted-foreground italic">{c.notes}</p>}
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(c)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-destructive"
                  onClick={() => { if (confirm(`Remove ${c.first_name}?`)) remove.mutate(c.id); }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Contact' : 'Add Contact'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">First Name *</Label>
                <Input value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Last Name</Label>
                <Input value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Relationship</Label>
                <Input
                  placeholder="Spouse, Partner, Assistant…"
                  value={form.relationship}
                  onChange={e => setForm({ ...form, relationship: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Title</Label>
                <Input
                  placeholder="Optional"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Phone</Label>
                <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Mobile</Label>
                <Input value={form.mobile} onChange={e => setForm({ ...form, mobile: e.target.value })} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!form.is_primary}
                onChange={e => setForm({ ...form, is_primary: e.target.checked })}
              />
              Mark as primary contact
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
