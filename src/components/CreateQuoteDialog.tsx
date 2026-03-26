import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useLeads } from '@/hooks/useLeads';
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
  const { data: leads = [] } = useLeads();
  const createQuote = useCreateQuote();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    lead_id: '',
    service_category: '',
    scope_of_work: '',
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  // Filter leads by customer if defaultCustomerId provided
  const filteredLeads = defaultCustomerId
    ? leads.filter((l: any) => l.customer_id === defaultCustomerId)
    : leads;

  const handleCreate = async () => {
    if (!form.lead_id) {
      toast({ title: 'Error', description: 'A lead is required to create a quote', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const data = await createQuote.mutateAsync({
        lead_id: form.lead_id,
        quote_number: 'AUTO',
        service_category: (form.service_category || 'Other') as any,
        scope_of_work: form.scope_of_work || null,
        customer_id: defaultCustomerId || null,
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
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Lead *</Label>
            <Select value={form.lead_id} onValueChange={v => set('lead_id', v)}>
              <SelectTrigger><SelectValue placeholder="Select a lead" /></SelectTrigger>
              <SelectContent>
                {(filteredLeads.length > 0 ? filteredLeads : leads).map((l: any) => (
                  <SelectItem key={l.id} value={l.id}>{l.first_name} {l.last_name}{l.company_name ? ` (${l.company_name})` : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {filteredLeads.length === 0 && defaultCustomerId && (
              <p className="text-[10px] text-muted-foreground mt-1">No leads linked to this customer. Showing all leads.</p>
            )}
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
          <Button className="w-full h-11" disabled={saving || !form.lead_id} onClick={handleCreate}>
            {saving ? 'Creating...' : 'Create Quote'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
