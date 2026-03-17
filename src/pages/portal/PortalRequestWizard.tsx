import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCustomerProfile } from '@/hooks/useUserRole';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft, ArrowRight, Check, ChevronRight, MapPin, Snowflake, Trees, Trash2,
  Wrench, Sparkles, Droplets, ClipboardCheck, Scale, Clock, Camera, Send,
  Building2, AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ── Service catalog ─────────────────────────────────────────────── */

const SERVICE_CATALOG = {
  'Snow & Ice': {
    icon: Snowflake,
    color: 'bg-sky-500',
    items: [
      'Snow clearing — driveway', 'Snow clearing — front walk', 'Snow clearing — public sidewalk',
      'Snow clearing — steps / stairs', 'Snow clearing — deck / patio', 'Snow clearing — side entrance',
      'Snow clearing — back alley / garbage access', 'Snow clearing — garage pad / apron',
      'Snow clearing — around basement window / window well', 'Snow clearing — around generator / utility access',
      'Snow pile relocation', 'Snow haul-away', 'De-icing application', 'Sanding / traction control',
      'Ice chop / hardpack removal', 'Roof snow removal request', 'Ice dam / roof-edge concern',
      'Emergency storm cleanup', 'Sidewalk compliance help',
    ],
  },
  'Landscaping & Grounds': {
    icon: Trees,
    color: 'bg-green-500',
    items: [
      'Lawn mowing', 'Spring cleanup', 'Fall cleanup', 'Aeration', 'Dethatching',
      'Hedge / shrub trimming', 'Weed cleanup', 'Garden bed cleanup', 'Mulch refresh',
      'Yard debris removal', 'Leaf cleanup', 'Seasonal property check',
    ],
  },
  'Junk Removal': {
    icon: Trash2,
    color: 'bg-amber-500',
    items: [
      'Household junk pickup', 'Furniture removal', 'Appliance removal', 'Mattress removal',
      'Garage cleanout', 'Basement cleanout', 'Yard waste removal', 'Construction debris removal',
      'Move-out cleanup', 'Curbside pickup request',
    ],
  },
  'Property Care & Maintenance': {
    icon: Wrench,
    color: 'bg-orange-500',
    items: [
      'General repair request', 'Fence / gate issue', 'Deck / stair concern', 'Door / lock issue',
      'Window issue', 'Caulking / sealing', 'Minor drywall / patch repair', 'Minor exterior repair',
      'Handyman visit', 'Safety / hazard correction',
    ],
  },
  'Cleaning Services': {
    icon: Sparkles,
    color: 'bg-pink-500',
    items: [
      'One-time cleaning', 'Move-in / move-out cleaning', 'Post-construction cleaning',
      'Common-area cleaning', 'Deep cleaning', 'Turnover cleaning', 'Garbage area cleanup',
    ],
  },
  'Power Washing': {
    icon: Droplets,
    color: 'bg-blue-600',
    items: [
      'Driveway washing', 'Sidewalk washing', 'Deck washing', 'Fence washing',
      'Exterior wall washing', 'Garage floor washing', 'Dumpster pad / garbage area washing',
    ],
  },
  'Property Inspection': {
    icon: ClipboardCheck,
    color: 'bg-indigo-500',
    items: [
      'Property inspection request', 'Pre-season inspection', 'Post-storm inspection',
      'Insurance photo request', 'Site condition update', 'Access change notice',
      'Restricted-area update', 'Damage concern', 'Service review request',
    ],
  },
  'Bylaw / Compliance': {
    icon: Scale,
    color: 'bg-red-500',
    items: [
      'Sidewalk snow clearing compliance', 'Ice control / slippery sidewalk',
      'Snow ridge / blocked access concern', 'Overgrown grass / yard cleanup',
      'Untidy property cleanup', 'Seasonal inspection request',
    ],
  },
} as const;

type CatalogKey = keyof typeof SERVICE_CATALOG;

const PRIORITY_OPTIONS = [
  { value: 'Routine', label: 'Routine', desc: 'Within normal schedule', icon: Clock, color: 'border-muted-foreground/30' },
  { value: 'Soon', label: 'Soon', desc: 'Within 1–3 days', icon: Clock, color: 'border-amber-500' },
  { value: 'Urgent', label: 'Urgent', desc: 'Same-day / emergency', icon: AlertTriangle, color: 'border-destructive' },
];

const SPECIAL_ISSUE_TYPES = [
  'Possible property damage', 'Access hazard', 'Update site notes',
  'Restricted / no-access area', 'Fragile surface warning', 'Narrow passage / clearance issue',
  'Hot tub / fence / deck caution area', 'Request pre-season inspection',
  'Request insurance / condition photos',
];

const CONTACT_METHODS = ['Email', 'Phone', 'Text / SMS'];

/* ── Wizard component ─────────────────────────────────────────────── */

export default function PortalRequestWizard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: customer } = useCustomerProfile();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    property_id: '',
    service_category: '' as CatalogKey | '',
    specific_request_type: '',
    requested_timing: 'Routine',
    area_of_property: '',
    access_notes: '',
    customer_notes: '',
    preferred_contact_method: 'Email',
    special_issues: [] as string[],
  });

  // Fetch customer properties
  const { data: properties = [] } = useQuery({
    queryKey: ['portal_properties_wizard', customer?.id],
    queryFn: async () => {
      if (!customer) return [];
      const { data, error } = await supabase
        .from('properties')
        .select('id, property_name, address_line_1, city, property_type')
        .eq('customer_id', customer.id)
        .order('property_name');
      if (error) throw error;
      return data;
    },
    enabled: !!customer,
  });

  const selectedProperty = useMemo(
    () => properties.find(p => p.id === form.property_id),
    [properties, form.property_id],
  );

  const catalogEntry = form.service_category ? SERVICE_CATALOG[form.service_category] : null;

  /* ── Submit mutation ─────────────────────────────────────────────── */
  const submitRequest = useMutation({
    mutationFn: async () => {
      if (!customer || !user) throw new Error('Not authenticated');
      const subject = form.specific_request_type || `${form.service_category} request`;
      const descParts = [
        form.customer_notes,
        form.special_issues.length > 0 ? `Special notes: ${form.special_issues.join(', ')}` : '',
      ].filter(Boolean).join('\n\n');

      const { error } = await supabase.from('service_requests').insert({
        customer_id: customer.id,
        user_id: user.id,
        subject,
        description: descParts || null,
        service_type: form.service_category || 'Other',
        urgency: form.requested_timing,
        property_id: form.property_id || null,
        specific_request_type: form.specific_request_type || null,
        requested_timing: form.requested_timing,
        area_of_property: form.area_of_property || null,
        access_notes: form.access_notes || null,
        preferred_contact_method: form.preferred_contact_method,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal_requests'] });
      toast({ title: 'Request submitted!', description: 'Our team will review it shortly.' });
      navigate('/portal/requests');
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  /* ── Step definitions ─────────────────────────────────────────────── */
  const steps = [
    { label: 'Property', valid: !!form.property_id },
    { label: 'Service', valid: !!form.service_category },
    { label: 'Request', valid: !!form.specific_request_type },
    { label: 'Timing', valid: !!form.requested_timing },
    { label: 'Details', valid: true },
    { label: 'Review', valid: true },
  ];

  const canNext = steps[step]?.valid;

  /* ── Render helpers ─────────────────────────────────────────────── */

  const renderStep0 = () => (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Which property is this request for?</p>
      {properties.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No properties found on your account.</p>
      ) : (
        <div className="space-y-2">
          {properties.map(p => (
            <button
              key={p.id}
              onClick={() => setForm(f => ({ ...f, property_id: p.id }))}
              className={cn(
                'w-full text-left rounded-xl border-2 p-3 transition-all',
                form.property_id === p.id
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border hover:border-primary/40',
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                  form.property_id === p.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                )}>
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{p.property_name}</p>
                  {p.address_line_1 && <p className="text-xs text-muted-foreground truncate">{p.address_line_1}{p.city ? `, ${p.city}` : ''}</p>}
                </div>
                {form.property_id === p.id && <Check className="h-5 w-5 text-primary ml-auto shrink-0" />}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">What type of service do you need?</p>
      <div className="grid grid-cols-2 gap-2">
        {(Object.keys(SERVICE_CATALOG) as CatalogKey[]).map(key => {
          const cat = SERVICE_CATALOG[key];
          const Icon = cat.icon;
          const selected = form.service_category === key;
          return (
            <button
              key={key}
              onClick={() => setForm(f => ({ ...f, service_category: key, specific_request_type: '' }))}
              className={cn(
                'flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all text-center',
                selected
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border hover:border-primary/40',
              )}
            >
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-white', cat.color)}>
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-xs font-medium leading-tight">{key}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderStep2 = () => {
    if (!catalogEntry) return null;
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">What specifically do you need?</p>
        <div className="space-y-1.5 max-h-[40vh] overflow-y-auto pr-1">
          {catalogEntry.items.map(item => (
            <button
              key={item}
              onClick={() => setForm(f => ({ ...f, specific_request_type: item }))}
              className={cn(
                'w-full text-left rounded-lg border px-3 py-2.5 text-sm transition-all flex items-center gap-2',
                form.specific_request_type === item
                  ? 'border-primary bg-primary/5 font-medium'
                  : 'border-border hover:border-primary/40',
              )}
            >
              {form.specific_request_type === item && <Check className="h-4 w-4 text-primary shrink-0" />}
              <span>{item}</span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderStep3 = () => (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">How soon do you need this done?</p>
      <div className="space-y-2">
        {PRIORITY_OPTIONS.map(opt => {
          const Icon = opt.icon;
          const selected = form.requested_timing === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setForm(f => ({ ...f, requested_timing: opt.value }))}
              className={cn(
                'w-full text-left rounded-xl border-2 p-4 transition-all flex items-center gap-3',
                selected ? 'border-primary bg-primary/5 shadow-sm' : `border-border hover:border-primary/40`,
              )}
            >
              <div className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
              )}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-sm">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.desc}</p>
              </div>
              {selected && <Check className="h-5 w-5 text-primary ml-auto shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-4">
      <div>
        <Label className="text-xs font-medium">Area of Property</Label>
        <Input
          value={form.area_of_property}
          onChange={e => setForm(f => ({ ...f, area_of_property: e.target.value }))}
          placeholder="e.g. Front driveway, backyard, north side..."
          className="mt-1"
        />
      </div>
      <div>
        <Label className="text-xs font-medium">Access Notes</Label>
        <Input
          value={form.access_notes}
          onChange={e => setForm(f => ({ ...f, access_notes: e.target.value }))}
          placeholder="e.g. Gate code 1234, dog in backyard..."
          className="mt-1"
        />
      </div>
      <div>
        <Label className="text-xs font-medium">Additional Notes</Label>
        <Textarea
          value={form.customer_notes}
          onChange={e => setForm(f => ({ ...f, customer_notes: e.target.value }))}
          rows={3}
          placeholder="Any other details we should know..."
          className="mt-1"
        />
      </div>
      <div>
        <Label className="text-xs font-medium">Special Concerns (optional)</Label>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {SPECIAL_ISSUE_TYPES.map(issue => {
            const active = form.special_issues.includes(issue);
            return (
              <button
                key={issue}
                onClick={() => setForm(f => ({
                  ...f,
                  special_issues: active
                    ? f.special_issues.filter(i => i !== issue)
                    : [...f.special_issues, issue],
                }))}
                className={cn(
                  'text-[11px] px-2.5 py-1 rounded-full border transition-all',
                  active
                    ? 'border-primary bg-primary/10 text-primary font-medium'
                    : 'border-border text-muted-foreground hover:border-primary/40',
                )}
              >
                {issue}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <Label className="text-xs font-medium">Preferred Contact Method</Label>
        <div className="flex gap-2 mt-1.5">
          {CONTACT_METHODS.map(m => (
            <button
              key={m}
              onClick={() => setForm(f => ({ ...f, preferred_contact_method: m }))}
              className={cn(
                'text-xs px-3 py-1.5 rounded-full border transition-all',
                form.preferred_contact_method === m
                  ? 'border-primary bg-primary/10 text-primary font-medium'
                  : 'border-border text-muted-foreground hover:border-primary/40',
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Please confirm everything looks correct.</p>
      <Card>
        <CardContent className="pt-4 space-y-3 text-sm">
          <Row label="Property" value={selectedProperty?.property_name || '—'} />
          <Row label="Service" value={form.service_category || '—'} />
          <Row label="Request" value={form.specific_request_type || '—'} />
          <Row label="Timing" value={form.requested_timing} />
          {form.area_of_property && <Row label="Area" value={form.area_of_property} />}
          {form.access_notes && <Row label="Access" value={form.access_notes} />}
          {form.customer_notes && <Row label="Notes" value={form.customer_notes} />}
          {form.special_issues.length > 0 && (
            <div>
              <span className="text-xs text-muted-foreground">Special Concerns</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {form.special_issues.map(i => (
                  <Badge key={i} variant="secondary" className="text-[10px]">{i}</Badge>
                ))}
              </div>
            </div>
          )}
          <Row label="Contact" value={form.preferred_contact_method} />
        </CardContent>
      </Card>
    </div>
  );

  const stepRenderers = [renderStep0, renderStep1, renderStep2, renderStep3, renderStep4, renderStep5];

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => step === 0 ? navigate('/portal/requests') : setStep(s => s - 1)} className="p-1.5 rounded-lg hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <h1 className="text-lg font-bold truncate">New Request</h1>
          <p className="text-xs text-muted-foreground">Step {step + 1} of {steps.length} — {steps[step].label}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex gap-1">
        {steps.map((s, i) => (
          <div
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors',
              i <= step ? 'bg-primary' : 'bg-muted',
            )}
          />
        ))}
      </div>

      {/* Step content */}
      <div className="min-h-[300px]">
        {stepRenderers[step]()}
      </div>

      {/* Navigation */}
      <div className="fixed bottom-0 inset-x-0 bg-background/80 backdrop-blur border-t border-border p-3 z-40">
        <div className="max-w-lg mx-auto flex gap-2">
          {step > 0 && (
            <Button variant="outline" className="flex-1" onClick={() => setStep(s => s - 1)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          )}
          {step < steps.length - 1 ? (
            <Button className="flex-1" disabled={!canNext} onClick={() => setStep(s => s + 1)}>
              Next <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button className="flex-1" disabled={submitRequest.isPending} onClick={() => submitRequest.mutate()}>
              {submitRequest.isPending ? 'Submitting...' : (
                <>Submit Request <Send className="h-4 w-4 ml-1" /></>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
