import { useState } from 'react';
import { useWorkerEmergencyContacts } from '@/hooks/useWorkerProfile';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Phone, Mail, UserCheck, Plus, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export default function WorkerEmergencyContactPage() {
  const { data: contacts = [], isLoading } = useWorkerEmergencyContacts();
  const [editContact, setEditContact] = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);

  if (isLoading) {
    return (
      <div className="px-4 pt-3 pb-4 space-y-4">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-36 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-3 pb-4 space-y-4 animate-fade-in">
      <div className="page-header-row">
        <h1 className="text-lg font-bold page-header-title">Emergency Contacts</h1>
        {contacts.length < 3 && (
          <Button size="sm" variant="outline" className="page-header-action" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        )}
      </div>

      {contacts.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <UserCheck className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm font-medium">No emergency contacts</p>
            <p className="text-xs mt-1">Please add at least one emergency contact.</p>
            <Button size="sm" className="mt-3" onClick={() => setShowAdd(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Contact
            </Button>
          </CardContent>
        </Card>
      ) : (
        contacts.map(c => (
          <Card key={c.id}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">{c.contact_name}</p>
                  {c.relationship && <p className="text-xs text-muted-foreground">{c.relationship}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {c.is_primary && (
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-200">Primary</Badge>
                  )}
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditContact(c)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                {c.phone_primary && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{c.phone_primary}</span>
                  </div>
                )}
                {c.phone_secondary && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">{c.phone_secondary}</span>
                  </div>
                )}
                {c.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{c.email}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))
      )}

      <ContactDialog
        open={showAdd || !!editContact}
        onClose={() => { setShowAdd(false); setEditContact(null); }}
        existing={editContact}
      />
    </div>
  );
}

function ContactDialog({ open, onClose, existing }: { open: boolean; onClose: () => void; existing?: any }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [name, setName] = useState(existing?.contact_name ?? '');
  const [rel, setRel] = useState(existing?.relationship ?? '');
  const [phone1, setPhone1] = useState(existing?.phone_primary ?? '');
  const [phone2, setPhone2] = useState(existing?.phone_secondary ?? '');
  const [email, setEmail] = useState(existing?.email ?? '');
  const [submitting, setSubmitting] = useState(false);

  // Reset on open/close
  const resetForm = () => {
    setName(existing?.contact_name ?? '');
    setRel(existing?.relationship ?? '');
    setPhone1(existing?.phone_primary ?? '');
    setPhone2(existing?.phone_secondary ?? '');
    setEmail(existing?.email ?? '');
  };

  const handleSave = async () => {
    if (!name.trim() || !user) {
      toast({ title: 'Name is required', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        contact_name: name.trim(),
        relationship: rel.trim() || null,
        phone_primary: phone1.trim() || null,
        phone_secondary: phone2.trim() || null,
        email: email.trim() || null,
      };

      if (existing?.id) {
        const { error } = await supabase.from('employee_emergency_contacts')
          .update(payload)
          .eq('id', existing.id);
        if (error) throw error;
        toast({ title: 'Contact updated' });
      } else {
        const { error } = await supabase.from('employee_emergency_contacts').insert([{
          ...payload,
          user_id: user.id,
          is_primary: false,
        }]);
        if (error) throw error;
        toast({ title: 'Contact added' });
      }
      qc.invalidateQueries({ queryKey: ['worker_emergency_contacts'] });
      onClose();
    } catch (e: any) {
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => { resetForm(); onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{existing ? 'Edit Contact' : 'Add Emergency Contact'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Name *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" />
          </div>
          <div>
            <Label>Relationship</Label>
            <Input value={rel} onChange={e => setRel(e.target.value)} placeholder="e.g. Spouse, Parent" />
          </div>
          <div>
            <Label>Phone (Primary)</Label>
            <Input value={phone1} onChange={e => setPhone1(e.target.value)} placeholder="306-555-0000" />
          </div>
          <div>
            <Label>Phone (Secondary)</Label>
            <Input value={phone2} onChange={e => setPhone2(e.target.value)} placeholder="Optional" />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Optional" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onClose(); }}>Cancel</Button>
          <Button onClick={handleSave} disabled={submitting}>{submitting ? 'Saving…' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
