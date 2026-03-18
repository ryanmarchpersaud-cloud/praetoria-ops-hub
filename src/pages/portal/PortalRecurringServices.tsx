import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCustomerProfile } from '@/hooks/useUserRole';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { StatusBadge } from '@/components/StatusBadge';
import {
  RefreshCw, Plus, Snowflake, Trees, Sparkles, ClipboardCheck, Droplets, Wrench, Scale, Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* icon + color lookup per category */
const CATEGORY_META: Record<string, { icon: React.ElementType; color: string }> = {
  'Snow & Ice': { icon: Snowflake, color: 'bg-sky-500' },
  'Landscaping & Grounds': { icon: Trees, color: 'bg-green-500' },
  'Cleaning Services': { icon: Sparkles, color: 'bg-pink-500' },
  'Property Inspection': { icon: ClipboardCheck, color: 'bg-indigo-500' },
  'Power Washing': { icon: Droplets, color: 'bg-blue-600' },
  'Property Care & Maintenance': { icon: Wrench, color: 'bg-orange-500' },
  'Bylaw / Compliance': { icon: Scale, color: 'bg-red-500' },
  'Property Management': { icon: Building2, color: 'bg-teal-600' },
};
const DEFAULT_META = { icon: RefreshCw, color: 'bg-muted-foreground' };

const FREQUENCIES = ['Weekly', 'Biweekly', 'Monthly', 'Seasonal', 'On-demand'];
const PAYMENT_PREFS = ['Invoice per visit', 'Monthly invoice', 'Seasonal flat rate'];
const SERVICE_WINDOWS = ['No preference', 'Before 7 AM', 'Morning', 'Afternoon'];

export default function PortalRecurringServices() {
  const { data: customer } = useCustomerProfile();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [form, setForm] = useState({
    frequency: 'Weekly',
    preferred_start_date: '',
    preferred_service_window: 'No preference',
    special_instructions: '',
    payment_preference: 'Monthly invoice',
    property_id: '',
  });

  /* ── Fetch recurring-eligible catalog items (live from DB) ── */
  const { data: catalogItems = [] } = useQuery({
    queryKey: ['portal_recurring_catalog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products_services')
        .select('id, name, service_category, portal_display_description, price_type, unit_price')
        .eq('status', 'Active')
        .eq('customer_visible', true)
        .eq('recurring_eligible', true)
        .order('sort_order')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  /* Group catalog items by category for plan cards */
  const planCategories = useMemo(() => {
    const map = new Map<string, { names: string[]; desc: string }>();
    for (const item of catalogItems) {
      if (!map.has(item.service_category)) {
        map.set(item.service_category, { names: [], desc: '' });
      }
      const entry = map.get(item.service_category)!;
      entry.names.push(item.name);
      if (!entry.desc && item.portal_display_description) {
        entry.desc = item.portal_display_description;
      }
    }
    return Array.from(map.entries()).map(([category, { names, desc }]) => ({
      category,
      items: names,
      desc: desc || `Recurring ${category.toLowerCase()} services`,
      ...(CATEGORY_META[category] || DEFAULT_META),
    }));
  }, [catalogItems]);

  const { data: requests = [] } = useQuery({
    queryKey: ['customer_recurring_requests', customer?.id],
    queryFn: async () => {
      if (!customer) return [];
      const { data, error } = await (supabase.from('customer_recurring_requests' as any) as any)
        .select('*, properties(property_name)')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!customer,
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['portal_properties_recurring', customer?.id],
    queryFn: async () => {
      if (!customer) return [];
      const { data, error } = await supabase.from('properties').select('id, property_name').eq('customer_id', customer.id).order('property_name');
      if (error) throw error;
      return data;
    },
    enabled: !!customer,
  });

  const submitRequest = useMutation({
    mutationFn: async () => {
      if (!customer) throw new Error('Not authenticated');
      const { error } = await (supabase.from('customer_recurring_requests' as any) as any).insert({
        customer_id: customer.id,
        service_category: selectedCategory,
        frequency: form.frequency,
        preferred_start_date: form.preferred_start_date || null,
        preferred_service_window: form.preferred_service_window,
        special_instructions: form.special_instructions || null,
        payment_preference: form.payment_preference,
        property_id: form.property_id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer_recurring_requests'] });
      setDialogOpen(false);
      setSelectedCategory('');
      setForm({ frequency: 'Weekly', preferred_start_date: '', preferred_service_window: 'No preference', special_instructions: '', payment_preference: 'Monthly invoice', property_id: '' });
      toast({ title: 'Enrollment request submitted', description: 'Our team will follow up to confirm your plan.' });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const openEnroll = (category: string) => {
    setSelectedCategory(category);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold flex items-center gap-2">
        <RefreshCw className="h-5 w-5 text-primary" /> Recurring Services
      </h1>
      <p className="text-xs text-muted-foreground">
        Sign up for recurring service plans. Submit your request and our team will confirm details and pricing.
      </p>

      {/* Available plans — driven by live catalog */}
      {planCategories.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            No recurring plans are currently available. Check back soon!
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {planCategories.map(plan => {
            const Icon = plan.icon;
            return (
              <Card key={plan.category} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-start gap-3">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white', plan.color)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm">{plan.category}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{plan.desc}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{plan.items.length} service{plan.items.length !== 1 ? 's' : ''} available</p>
                    <Button size="sm" variant="outline" className="mt-2 text-xs h-7" onClick={() => openEnroll(plan.category)}>
                      <Plus className="h-3 w-3 mr-1" /> Enroll
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Existing enrollments */}
      {requests.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold">My Enrollments</h2>
          {requests.map((r: any) => (
            <Card key={r.id}>
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{r.service_category}</span>
                  <StatusBadge status={r.status} />
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>{r.frequency}</span>
                  {r.properties?.property_name && <><span>·</span><span>{r.properties.property_name}</span></>}
                  {r.preferred_start_date && <><span>·</span><span>Start: {r.preferred_start_date}</span></>}
                </div>
                {r.special_instructions && <p className="text-xs text-muted-foreground line-clamp-2">{r.special_instructions}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Enrollment dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md mx-3">
          <DialogHeader>
            <DialogTitle>Enroll in {selectedCategory}</DialogTitle>
            <DialogDescription>Fill in your preferences and we'll confirm your plan.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {properties.length > 0 && (
              <div>
                <Label className="text-xs">Property</Label>
                <select value={form.property_id} onChange={e => setForm(f => ({ ...f, property_id: e.target.value }))} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-10 mt-1">
                  <option value="">All properties</option>
                  {properties.map((p: any) => <option key={p.id} value={p.id}>{p.property_name}</option>)}
                </select>
              </div>
            )}
            <div>
              <Label className="text-xs">Frequency</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {FREQUENCIES.map(f => (
                  <button key={f} onClick={() => setForm(prev => ({ ...prev, frequency: f }))}
                    className={cn('text-xs px-2.5 py-1 rounded-full border transition-all', form.frequency === f ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-border text-muted-foreground hover:border-primary/40')}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs">Preferred Start Date</Label>
              <Input type="date" className="mt-1" value={form.preferred_start_date} onChange={e => setForm(f => ({ ...f, preferred_start_date: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Service Window Preference</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {SERVICE_WINDOWS.map(w => (
                  <button key={w} onClick={() => setForm(f => ({ ...f, preferred_service_window: w }))}
                    className={cn('text-xs px-2.5 py-1 rounded-full border transition-all', form.preferred_service_window === w ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-border text-muted-foreground hover:border-primary/40')}>
                    {w}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs">Payment Preference</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {PAYMENT_PREFS.map(p => (
                  <button key={p} onClick={() => setForm(f => ({ ...f, payment_preference: p }))}
                    className={cn('text-xs px-2.5 py-1 rounded-full border transition-all', form.payment_preference === p ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-border text-muted-foreground hover:border-primary/40')}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs">Special Instructions</Label>
              <Textarea className="mt-1" rows={3} value={form.special_instructions} onChange={e => setForm(f => ({ ...f, special_instructions: e.target.value }))} placeholder="Any special requests..." />
            </div>
            <Button className="w-full" disabled={submitRequest.isPending} onClick={() => submitRequest.mutate()}>
              {submitRequest.isPending ? 'Submitting...' : 'Submit Enrollment Request'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
