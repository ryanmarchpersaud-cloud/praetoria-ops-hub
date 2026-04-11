import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Truck } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateSubcontractorDialog({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    company_name: '', contact_name: '', email: '', phone: '', password: '',
    service_area_summary: '', business_number: '', notes: '',
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('manage-team', {
        body: {
          action: 'create_subcontractor',
          email: form.email.trim(),
          password: form.password,
          company_name: form.company_name.trim(),
          contact_name: form.contact_name.trim(),
          phone: form.phone || null,
          service_area_summary: form.service_area_summary || null,
          business_number: form.business_number || null,
          notes: form.notes || null,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'Subcontractor created');
      queryClient.invalidateQueries({ queryKey: ['all_subcontractors'] });
      queryClient.invalidateQueries({ queryKey: ['manage_team_v2'] });
      onOpenChange(false);
      resetForm();
    },
    onError: (err: any) => toast.error(err.message || 'Failed to create subcontractor'),
  });

  const resetForm = () => setForm({
    company_name: '', contact_name: '', email: '', phone: '', password: '',
    service_area_summary: '', business_number: '', notes: '',
  });

  const handleSubmit = () => {
    if (!form.company_name.trim()) { toast.error('Company name is required'); return; }
    if (!form.contact_name.trim()) { toast.error('Contact name is required'); return; }
    if (!form.email.trim()) { toast.error('Email is required'); return; }
    if (!form.password || form.password.length < 8) {
      toast.error('Password must be at least 8 characters'); return;
    }
    mutation.mutate();
  };

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" /> Add Subcontractor
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4 py-2">
            <div>
              <Label>Company Name *</Label>
              <Input value={form.company_name} onChange={e => set('company_name', e.target.value)} placeholder="ABC Plowing Inc." />
            </div>
            <div>
              <Label>Contact Name *</Label>
              <Input value={form.contact_name} onChange={e => set('contact_name', e.target.value)} placeholder="Jane Smith" />
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="contact@abcplowing.ca" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(306) 555-0200" />
            </div>
            <div>
              <Label>Temporary Password *</Label>
              <Input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Min. 8 characters" />
            </div>
            <div>
              <Label>Service Area</Label>
              <Input value={form.service_area_summary} onChange={e => set('service_area_summary', e.target.value)} placeholder="e.g. Saskatoon, Regina" />
            </div>
            <div>
              <Label>Business Number</Label>
              <Input value={form.business_number} onChange={e => set('business_number', e.target.value)} placeholder="BN 123456789" />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Internal notes..." rows={2} />
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">After creation, you can manage:</p>
              <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
                <li>Insurance & WCB status</li>
                <li>Business licence & compliance docs</li>
                <li>Payment details & invoicing</li>
                <li>Service assignments</li>
              </ul>
            </div>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? 'Creating...' : 'Create Subcontractor'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
