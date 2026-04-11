import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useCustomers } from '@/hooks/useCustomers';
import { useProperties } from '@/hooks/useProperties';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { SERVICE_CATEGORIES } from '@/lib/constants';
import { useQueryClient } from '@tanstack/react-query';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCustomerId?: string;
}

const URGENCY_OPTIONS = ['Low', 'Normal', 'High', 'Urgent'];

export function CreateRequestDialog({ open, onOpenChange, defaultCustomerId }: Props) {
  const { toast } = useToast();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: customers = [] } = useCustomers();
  const { data: allProperties = [] } = useProperties();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    customer_id: defaultCustomerId || '',
    property_id: '',
    subject: '',
    description: '',
    service_type: '',
    urgency: 'Normal',
    requested_timing: '',
  });

  useEffect(() => {
    if (defaultCustomerId) setForm(f => ({ ...f, customer_id: defaultCustomerId }));
  }, [defaultCustomerId]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const filteredProperties = form.customer_id
    ? allProperties.filter((p: any) => p.customer_id === form.customer_id)
    : allProperties;

  const handleCreate = async () => {
    if (!form.customer_id || !form.subject) {
      toast({ title: 'Error', description: 'Customer and subject are required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('service_requests').insert({
        customer_id: form.customer_id,
        property_id: form.property_id || null,
        subject: form.subject,
        description: form.description || null,
        service_type: form.service_type || 'Other',
        urgency: form.urgency.toLowerCase(),
        requested_timing: form.requested_timing || null,
        user_id: user?.id || '',
        status: 'Open',
      } as any);
      if (error) throw error;

      // Notify admin/ops about the new request
      const cust = customers.find((c: any) => c.id === form.customer_id);
      const custName = cust ? `${cust.first_name} ${cust.last_name}` : 'A customer';
      try {
        await supabase.functions.invoke('send-notification', {
          body: {
            event: 'new_service_request',
            customer_id: form.customer_id,
            record_type: 'service_request',
            variables: {
              subject: `New Request: ${form.subject}`,
              body: `${custName} — ${form.subject}`,
              customer_name: custName,
              to_email: 'ops@praetoriagroup.ca',
              reply_to: 'ops@praetoriagroup.ca',
            },
            channels: ['in_app', 'email'],
            audience: 'admin',
          },
        });
      } catch (_) { /* non-blocking */ }
      toast({ title: 'Request created' });
      qc.invalidateQueries({ queryKey: ['service_requests'] });
      qc.invalidateQueries({ queryKey: ['customer_requests'] });
      onOpenChange(false);
      setForm({ customer_id: defaultCustomerId || '', property_id: '', subject: '', description: '', service_type: '', urgency: 'Normal', requested_timing: '' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md mx-3">
        <DialogHeader>
          <DialogTitle className="text-base">New Service Request</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Customer *</Label>
            <Select value={form.customer_id} onValueChange={v => set('customer_id', v)}>
              <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
              <SelectContent>
                {customers.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}{c.company_name ? ` (${c.company_name})` : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Property</Label>
            <Select value={form.property_id} onValueChange={v => set('property_id', v)}>
              <SelectTrigger><SelectValue placeholder="Select property (optional)" /></SelectTrigger>
              <SelectContent>
                {filteredProperties.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{p.property_name}{p.city ? ` — ${p.city}` : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Subject *</Label>
            <Input value={form.subject} onChange={e => set('subject', e.target.value)} placeholder="e.g. Snow removal needed" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Service Type</Label>
              <Select value={form.service_type} onValueChange={v => set('service_type', v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {SERVICE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Urgency</Label>
              <Select value={form.urgency} onValueChange={v => set('urgency', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {URGENCY_OPTIONS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Preferred Timing</Label>
            <Input value={form.requested_timing} onChange={e => set('requested_timing', e.target.value)} placeholder="e.g. ASAP, Next week" />
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} placeholder="Details about the request..." />
          </div>
          <Button className="w-full h-11" disabled={saving || !form.customer_id || !form.subject} onClick={handleCreate}>
            {saving ? 'Creating...' : 'Create Request'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
