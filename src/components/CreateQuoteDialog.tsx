import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useCustomers } from '@/hooks/useCustomers';
import { useCreateQuote } from '@/hooks/useQuotes';
import { SERVICE_CATEGORIES } from '@/lib/constants';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCustomerId?: string;
}

export function CreateQuoteDialog({ open, onOpenChange, defaultCustomerId }: Props) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: customers = [] } = useCustomers();
  const createQuote = useCreateQuote();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    customer_id: defaultCustomerId || '',
    service_category: '',
    scope_of_work: '',
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleCreate = async () => {
    if (!form.customer_id) {
      toast({ title: 'Error', description: 'A customer is required to create a quote', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const data = await createQuote.mutateAsync({
        customer_id: form.customer_id,
        quote_number: 'AUTO',
        service_category: (form.service_category || 'Other') as any,
        scope_of_work: form.scope_of_work || null,
      });
      toast({ title: 'Quote created' });
      onOpenChange(false);
      navigate(`/quotes/${data.id}`);
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
          <DialogTitle className="text-base">New Quote</DialogTitle>
          <DialogDescription>Create a new quote for a customer.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Customer *</Label>
            <Select value={form.customer_id} onValueChange={v => set('customer_id', v)}>
              <SelectTrigger><SelectValue placeholder="Select a customer" /></SelectTrigger>
              <SelectContent>
                {customers.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.first_name} {c.last_name}{c.company_name ? ` (${c.company_name})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Service Category</Label>
            <Select value={form.service_category} onValueChange={v => set('service_category', v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {SERVICE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Scope of Work</Label>
            <Textarea value={form.scope_of_work} onChange={e => set('scope_of_work', e.target.value)} rows={3} placeholder="Describe the scope..." />
          </div>
          <Button className="w-full h-11" disabled={saving || !form.customer_id} onClick={handleCreate}>
            {saving ? 'Creating...' : 'Create Quote'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
