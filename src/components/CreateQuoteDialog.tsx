import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useCustomers, useCreateCustomer } from '@/hooks/useCustomers';
import { useCreateQuote } from '@/hooks/useQuotes';
import { SERVICE_CATEGORIES, PROVINCES } from '@/lib/constants';
import { UserPlus, ArrowLeft } from 'lucide-react';

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
  const createCustomer = useCreateCustomer();
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<'select' | 'quick-add'>('select');

  const [form, setForm] = useState({
    customer_id: defaultCustomerId || '',
    service_category: '',
    scope_of_work: '',
  });

  // Quick-add customer form (lightweight prospect — for quoting)
  const [newCustomer, setNewCustomer] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address_line_1: '',
    city: '',
    province: '',
    postal_code: '',
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const setNc = (k: string, v: string) => setNewCustomer(c => ({ ...c, [k]: v }));

  const handleQuickAddCustomer = async () => {
    if (!newCustomer.first_name.trim()) {
      toast({ title: 'First name required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const created = await createCustomer.mutateAsync({
        first_name: newCustomer.first_name.trim(),
        last_name: newCustomer.last_name.trim() || '',
        email: newCustomer.email.trim() || null,
        phone: newCustomer.phone.trim() || null,
        address_line_1: newCustomer.address_line_1.trim() || null,
        city: newCustomer.city.trim() || null,
        province: newCustomer.province || null,
        postal_code: newCustomer.postal_code.trim() || null,
        customer_type: 'Residential',
        account_type: 'Individual',
        customer_status: 'Active',
      } as any);
      set('customer_id', created.id);
      setMode('select');
      toast({ title: 'Customer added', description: `${created.first_name} ${created.last_name || ''}`.trim() });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!form.customer_id) {
      toast({ title: 'Error', description: 'A customer is required to create a quote', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const data = await createQuote.mutateAsync({
        customer_id: form.customer_id,
        quote_number: '',
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
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setMode('select'); }}>
      <DialogContent className="max-w-md mx-3 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">
            {mode === 'quick-add' ? 'Quick Add Customer' : 'New Quote'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'quick-add'
              ? 'Add a prospect to attach this quote to. They can be converted to a full customer later.'
              : 'Create a new quote for a customer.'}
          </DialogDescription>
        </DialogHeader>

        {mode === 'quick-add' ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">First Name *</Label>
                <Input value={newCustomer.first_name} onChange={e => setNc('first_name', e.target.value)} autoFocus />
              </div>
              <div>
                <Label className="text-xs">Last Name</Label>
                <Input value={newCustomer.last_name} onChange={e => setNc('last_name', e.target.value)} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input type="email" value={newCustomer.email} onChange={e => setNc('email', e.target.value)} placeholder="customer@example.com" />
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input value={newCustomer.phone} onChange={e => setNc('phone', e.target.value)} placeholder="(306) 555-0123" />
            </div>
            <Separator />
            <p className="text-[11px] text-muted-foreground -mb-1">Service Address (optional)</p>
            <div>
              <Label className="text-xs">Address</Label>
              <Input value={newCustomer.address_line_1} onChange={e => setNc('address_line_1', e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">City</Label>
                <Input value={newCustomer.city} onChange={e => setNc('city', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Province</Label>
                <select
                  value={newCustomer.province}
                  onChange={e => setNc('province', e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-2 py-2 text-sm h-10"
                >
                  <option value="">—</option>
                  {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs">Postal</Label>
                <Input value={newCustomer.postal_code} onChange={e => setNc('postal_code', e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 h-11" onClick={() => setMode('select')} disabled={saving}>
                <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
              </Button>
              <Button className="flex-1 h-11" onClick={handleQuickAddCustomer} disabled={saving || !newCustomer.first_name.trim()}>
                {saving ? 'Adding...' : 'Add & Continue'}
              </Button>
            </div>
          </div>
        ) : (
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
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 mt-1.5 text-xs text-primary"
                onClick={() => setMode('quick-add')}
                type="button"
              >
                <UserPlus className="h-3 w-3 mr-1" /> Quick add new customer
              </Button>
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
        )}
      </DialogContent>
    </Dialog>
  );
}
