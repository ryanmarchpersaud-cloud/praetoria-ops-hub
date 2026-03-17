import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCustomerProfile } from '@/hooks/useUserRole';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Settings2, Save, Clock, Snowflake, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

const SERVICE_WINDOWS = [
  { value: 'no_preference', label: 'No Preference' },
  { value: 'before_6am', label: 'Before 6:00 AM' },
  { value: 'before_7am', label: 'Before 7:00 AM' },
  { value: 'morning', label: 'Morning (7 AM – 12 PM)' },
  { value: 'afternoon', label: 'Afternoon (12 PM – 5 PM)' },
];

type Prefs = {
  preferred_service_window: string;
  before_6am_ok: boolean;
  before_7am_ok: boolean;
  morning_preference: boolean;
  afternoon_preference: boolean;
  salt_restriction_notes: string;
  hand_shovel_only_areas: string;
  restricted_access_areas: string;
  generator_access_notes: string;
  basement_window_notes: string;
  deck_patio_notes: string;
  side_entrance_notes: string;
  back_alley_garbage_access_notes: string;
  roof_access_request_notes: string;
  general_property_instructions: string;
};

const defaultPrefs: Prefs = {
  preferred_service_window: 'no_preference',
  before_6am_ok: false, before_7am_ok: false,
  morning_preference: false, afternoon_preference: false,
  salt_restriction_notes: '', hand_shovel_only_areas: '',
  restricted_access_areas: '', generator_access_notes: '',
  basement_window_notes: '', deck_patio_notes: '',
  side_entrance_notes: '', back_alley_garbage_access_notes: '',
  roof_access_request_notes: '', general_property_instructions: '',
};

export default function PortalServicePreferences() {
  const { data: customer } = useCustomerProfile();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState<Prefs>(defaultPrefs);

  const { data: existing, isLoading } = useQuery({
    queryKey: ['customer_service_preferences', customer?.id],
    queryFn: async () => {
      if (!customer) return null;
      const { data, error } = await supabase
        .from('customer_service_preferences' as any)
        .select('*')
        .eq('customer_id', customer.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!customer,
  });

  useEffect(() => {
    if (existing) {
      const e = existing as any;
      setForm({
        preferred_service_window: e.preferred_service_window || 'no_preference',
        before_6am_ok: e.before_6am_ok || false,
        before_7am_ok: e.before_7am_ok || false,
        morning_preference: e.morning_preference || false,
        afternoon_preference: e.afternoon_preference || false,
        salt_restriction_notes: e.salt_restriction_notes || '',
        hand_shovel_only_areas: e.hand_shovel_only_areas || '',
        restricted_access_areas: e.restricted_access_areas || '',
        generator_access_notes: e.generator_access_notes || '',
        basement_window_notes: e.basement_window_notes || '',
        deck_patio_notes: e.deck_patio_notes || '',
        side_entrance_notes: e.side_entrance_notes || '',
        back_alley_garbage_access_notes: e.back_alley_garbage_access_notes || '',
        roof_access_request_notes: e.roof_access_request_notes || '',
        general_property_instructions: e.general_property_instructions || '',
      });
    }
  }, [existing]);

  const save = useMutation({
    mutationFn: async () => {
      if (!customer) throw new Error('Not authenticated');
      const payload = { customer_id: customer.id, ...form };
      if (existing) {
        const { error } = await (supabase.from('customer_service_preferences' as any) as any).update(payload).eq('customer_id', customer.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from('customer_service_preferences' as any) as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer_service_preferences'] });
      toast({ title: 'Preferences saved' });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const set = (key: keyof Prefs, val: any) => setForm(f => ({ ...f, [key]: val }));

  if (isLoading) return <p className="text-sm text-muted-foreground py-6 text-center">Loading...</p>;

  return (
    <div className="space-y-4 pb-20">
      <h1 className="text-xl font-bold flex items-center gap-2">
        <Settings2 className="h-5 w-5 text-primary" /> Service Preferences
      </h1>
      <p className="text-xs text-muted-foreground">
        Set your preferred service windows and property-specific instructions. These are preferences — Praetoria will confirm availability.
      </p>

      {/* Service Window */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1.5"><Clock className="h-4 w-4" /> Preferred Service Window</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {SERVICE_WINDOWS.map(w => (
              <button
                key={w.value}
                onClick={() => set('preferred_service_window', w.value)}
                className={cn(
                  'text-xs px-3 py-1.5 rounded-full border transition-all',
                  form.preferred_service_window === w.value
                    ? 'border-primary bg-primary/10 text-primary font-medium'
                    : 'border-border text-muted-foreground hover:border-primary/40',
                )}
              >
                {w.label}
              </button>
            ))}
          </div>
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs">OK to service before 6:00 AM</Label>
              <Switch checked={form.before_6am_ok} onCheckedChange={v => set('before_6am_ok', v)} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">OK to service before 7:00 AM</Label>
              <Switch checked={form.before_7am_ok} onCheckedChange={v => set('before_7am_ok', v)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Snow & Ice Specific */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1.5"><Snowflake className="h-4 w-4" /> Snow & Ice Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Field label="Salt / De-icing Restrictions" value={form.salt_restriction_notes} onChange={v => set('salt_restriction_notes', v)} placeholder="e.g. No salt on stamped concrete..." />
          <Field label="Hand Shovel Only Areas" value={form.hand_shovel_only_areas} onChange={v => set('hand_shovel_only_areas', v)} placeholder="e.g. Front porch, interlock walkway..." />
          <Field label="Roof Access / Snow Removal Notes" value={form.roof_access_request_notes} onChange={v => set('roof_access_request_notes', v)} placeholder="e.g. Flat roof over garage, low slope..." />
        </CardContent>
      </Card>

      {/* Property Access */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1.5"><Shield className="h-4 w-4" /> Property Access & Restrictions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Field label="Restricted / No-Access Areas" value={form.restricted_access_areas} onChange={v => set('restricted_access_areas', v)} placeholder="e.g. Backyard fenced off, no entry past gate..." />
          <Field label="Generator / Utility Access" value={form.generator_access_notes} onChange={v => set('generator_access_notes', v)} placeholder="e.g. Generator on south side, keep area clear..." />
          <Field label="Basement Window / Window Well Notes" value={form.basement_window_notes} onChange={v => set('basement_window_notes', v)} placeholder="e.g. 2 basement windows on north side..." />
          <Field label="Deck / Patio Notes" value={form.deck_patio_notes} onChange={v => set('deck_patio_notes', v)} placeholder="e.g. Cedar deck, no de-icer on wood..." />
          <Field label="Side Entrance Notes" value={form.side_entrance_notes} onChange={v => set('side_entrance_notes', v)} placeholder="e.g. Narrow passage between houses..." />
          <Field label="Back Alley / Garbage Access" value={form.back_alley_garbage_access_notes} onChange={v => set('back_alley_garbage_access_notes', v)} placeholder="e.g. Alley access for bins, keep path clear..." />
        </CardContent>
      </Card>

      {/* General */}
      <Card>
        <CardContent className="pt-4">
          <Label className="text-xs font-medium">General Property Instructions</Label>
          <Textarea
            className="mt-1.5"
            rows={4}
            value={form.general_property_instructions}
            onChange={e => set('general_property_instructions', e.target.value)}
            placeholder="Any other instructions for our crews..."
          />
        </CardContent>
      </Card>

      <div className="fixed bottom-0 inset-x-0 bg-background/80 backdrop-blur border-t border-border p-3 z-40">
        <div className="max-w-lg mx-auto">
          <Button className="w-full" disabled={save.isPending} onClick={() => save.mutate()}>
            <Save className="h-4 w-4 mr-1" /> {save.isPending ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <Label className="text-xs font-medium">{label}</Label>
      <Input className="mt-1" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}
