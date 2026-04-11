import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  ArrowLeft, ArrowRight, Check, MapPin, Snowflake, Trees, Trash2,
  Wrench, Sparkles, Droplets, ClipboardCheck, Scale, Clock, Camera, Send,
  Building2, AlertTriangle, X, Upload, RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ── Constants ─────────────────────────────────────────────── */

import {
  SERVICE_CATALOG, CatalogKey, PRIORITY_OPTIONS, SPECIAL_ISSUE_TYPES,
  CONTACT_METHODS, SERVICE_WINDOW_OPTIONS, PAYMENT_PREF_OPTIONS, RECURRING_UPSELL_OPTIONS,
} from '@/lib/requestWizardConstants';

/* ── Wizard component ─────────────────────────────────────────────── */

export default function PortalRequestWizard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { data: customer } = useCustomerProfile();
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Prefill from query params (reorder flow)
  const prefillPropertyId = searchParams.get('property_id') || '';
  const prefillCategory = searchParams.get('service_category') || '';
  const prefillSpecific = searchParams.get('specific_request_type') || '';
  const prefillTiming = searchParams.get('requested_timing') || 'Routine';

  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    property_id: prefillPropertyId,
    service_category: (prefillCategory || '') as CatalogKey | '',
    specific_request_type: prefillSpecific,
    requested_timing: prefillTiming,
    area_of_property: '',
    access_notes: '',
    customer_notes: '',
    preferred_contact_method: 'Email',
    special_issues: [] as string[],
    preferred_service_window: 'No preference',
    payment_preference: 'Ask me before charging',
    recurring_interest: '' as string,
  });
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [uploading, setUploading] = useState(false);

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

  // Fetch bookable catalog items from DB
  const { data: catalogItems = [] } = useQuery({
    queryKey: ['portal_catalog_items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products_services')
        .select('id, name, service_category, portal_display_description, product_type, price_type, unit_price')
        .eq('status', 'Active')
        .eq('customer_visible', true)
        .eq('online_booking_enabled', true)
        .order('sort_order')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const selectedProperty = useMemo(
    () => properties.find(p => p.id === form.property_id),
    [properties, form.property_id],
  );

  // Use ONLY DB catalog items — enforces customer_visible + online_booking_enabled + Active status
  const availableCategories = useMemo(() => {
    const cats = new Set(catalogItems.map(i => i.service_category));
    return Array.from(cats).sort();
  }, [catalogItems]);

  const mergedItems = useMemo(() => {
    if (!form.service_category) return [];
    return catalogItems
      .filter(i => i.service_category === form.service_category)
      .map(i => i.name);
  }, [form.service_category, catalogItems]);

  /* ── Photo handling ─────────────────────────────────────────────── */
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = 5 - photos.length;
    const toAdd = files.slice(0, remaining);
    const newPhotos = toAdd.map(file => ({ file, preview: URL.createObjectURL(file) }));
    setPhotos(prev => [...prev, ...newPhotos]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const uploadPhotos = async (): Promise<string[]> => {
    if (photos.length === 0 || !user) return [];
    setUploading(true);
    const urls: string[] = [];
    for (const { file } of photos) {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('request-attachments').upload(path, file);
      if (!error) {
        // Store the storage path, not a public URL (bucket is private)
        urls.push(path);
      }
    }
    setUploading(false);
    return urls;
  };

  /* ── Submit mutation ─────────────────────────────────────────────── */
  const submitRequest = useMutation({
    mutationFn: async () => {
      if (!customer || !user) throw new Error('Not authenticated');
      const attachmentUrls = await uploadPhotos();
      const subject = form.specific_request_type || `${form.service_category} request`;
      const descParts = [
        form.customer_notes,
        form.special_issues.length > 0 ? `Special notes: ${form.special_issues.join(', ')}` : '',
        form.preferred_service_window !== 'No preference' ? `Preferred window: ${form.preferred_service_window}` : '',
        form.payment_preference ? `Payment preference: ${form.payment_preference}` : '',
        form.recurring_interest ? `Recurring interest: ${form.recurring_interest}` : '',
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
        attachments: attachmentUrls.length > 0 ? attachmentUrls : [],
      } as any);
      if (error) throw error;

      // Notify admin/ops staff about the new request
      try {
        await supabase.functions.invoke('send-notification', {
          body: {
            event: 'new_service_request',
            customer_id: customer.id,
            record_type: 'service_request',
            variables: {
              subject: `New Request: ${subject}`,
              body: `${customer.first_name} ${customer.last_name} submitted a service request: ${subject}`,
              customer_name: `${customer.first_name} ${customer.last_name}`,
            },
            channels: ['in_app'],
            audience: 'admin',
          },
        });
      } catch (_) { /* non-blocking */ }
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
                form.property_id === p.id ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/40',
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', form.property_id === p.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
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
      {availableCategories.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No services are currently available for online booking.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {availableCategories.map(key => {
            const cat = SERVICE_CATALOG[key as CatalogKey];
            const Icon = cat?.icon || ClipboardCheck;
            const color = cat?.color || 'bg-muted-foreground';
            const selected = form.service_category === key;
            return (
              <button
                key={key}
                onClick={() => setForm(f => ({ ...f, service_category: key as CatalogKey | '', specific_request_type: '' }))}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all text-center',
                  selected ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/40',
                )}
              >
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-white', color)}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium leading-tight">{key}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderStep2 = () => {
    if (!form.service_category) return null;
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">What specifically do you need?</p>
        <div className="space-y-1.5 max-h-[40vh] overflow-y-auto pr-1">
          {mergedItems.map(item => (
            <button
              key={item}
              onClick={() => setForm(f => ({ ...f, specific_request_type: item }))}
              className={cn(
                'w-full text-left rounded-lg border px-3 py-2.5 text-sm transition-all flex items-center gap-2',
                form.specific_request_type === item ? 'border-primary bg-primary/5 font-medium' : 'border-border hover:border-primary/40',
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
                selected ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/40',
              )}
            >
              <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
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
        <Input value={form.area_of_property} onChange={e => setForm(f => ({ ...f, area_of_property: e.target.value }))} placeholder="e.g. Front driveway, backyard, north side..." className="mt-1" />
      </div>
      <div>
        <Label className="text-xs font-medium">Access Notes</Label>
        <Input value={form.access_notes} onChange={e => setForm(f => ({ ...f, access_notes: e.target.value }))} placeholder="e.g. Gate code 1234, dog in backyard..." className="mt-1" />
      </div>
      <div>
        <Label className="text-xs font-medium">Additional Notes</Label>
        <Textarea value={form.customer_notes} onChange={e => setForm(f => ({ ...f, customer_notes: e.target.value }))} rows={3} placeholder="Any other details we should know..." className="mt-1" />
      </div>

      {/* Photo Upload */}
      <div>
        <Label className="text-xs font-medium flex items-center gap-1.5">
          <Camera className="h-3.5 w-3.5" /> Photos (optional, up to 5)
        </Label>
        <div className="flex flex-wrap gap-2 mt-1.5">
          {photos.map((p, i) => (
            <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted border border-border">
              <img src={p.preview} alt="" className="w-full h-full object-cover" />
              <button onClick={() => removePhoto(i)} className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {photos.length < 5 && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-16 h-16 rounded-lg border-2 border-dashed border-border hover:border-primary/40 flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:text-primary transition-colors"
            >
              <Upload className="h-4 w-4" />
              <span className="text-[9px]">Add</span>
            </button>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoSelect} />
      </div>

      {/* Preferred Service Window */}
      <div>
        <Label className="text-xs font-medium">Preferred Service Window</Label>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {SERVICE_WINDOW_OPTIONS.map(opt => {
            const active = form.preferred_service_window === opt;
            return (
              <button key={opt} onClick={() => setForm(f => ({ ...f, preferred_service_window: opt }))}
                className={cn('text-[11px] px-2.5 py-1 rounded-full border transition-all', active ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-border text-muted-foreground hover:border-primary/40')}>
                {opt}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">Service windows are a preference, not a guarantee unless confirmed by our team.</p>
      </div>

      {/* Payment Preference */}
      <div>
        <Label className="text-xs font-medium">Payment Preference</Label>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {PAYMENT_PREF_OPTIONS.map(opt => {
            const active = form.payment_preference === opt;
            return (
              <button key={opt} onClick={() => setForm(f => ({ ...f, payment_preference: opt }))}
                className={cn('text-[11px] px-2.5 py-1 rounded-full border transition-all', active ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-border text-muted-foreground hover:border-primary/40')}>
                {opt}
              </button>
            );
          })}
        </div>
      </div>

      {/* Recurring Upsell */}
      <div>
        <Label className="text-xs font-medium flex items-center gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Interested in a recurring plan?
        </Label>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {RECURRING_UPSELL_OPTIONS.map(opt => {
            const active = form.recurring_interest === opt;
            return (
              <button key={opt} onClick={() => setForm(f => ({ ...f, recurring_interest: active ? '' : opt }))}
                className={cn('text-[11px] px-2.5 py-1 rounded-full border transition-all', active ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-border text-muted-foreground hover:border-primary/40')}>
                {opt}
              </button>
            );
          })}
        </div>
      </div>

      {/* Special Concerns */}
      <div>
        <Label className="text-xs font-medium">Special Concerns (optional)</Label>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {SPECIAL_ISSUE_TYPES.map(issue => {
            const active = form.special_issues.includes(issue);
            return (
              <button key={issue} onClick={() => setForm(f => ({ ...f, special_issues: active ? f.special_issues.filter(i => i !== issue) : [...f.special_issues, issue] }))}
                className={cn('text-[11px] px-2.5 py-1 rounded-full border transition-all', active ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-border text-muted-foreground hover:border-primary/40')}>
                {issue}
              </button>
            );
          })}
        </div>
      </div>

      {/* Contact Method */}
      <div>
        <Label className="text-xs font-medium">Preferred Contact Method</Label>
        <div className="flex gap-2 mt-1.5">
          {CONTACT_METHODS.map(m => (
            <button key={m} onClick={() => setForm(f => ({ ...f, preferred_contact_method: m }))}
              className={cn('text-xs px-3 py-1.5 rounded-full border transition-all', form.preferred_contact_method === m ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-border text-muted-foreground hover:border-primary/40')}>
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
          <Row label="Service Window" value={form.preferred_service_window} />
          <Row label="Payment" value={form.payment_preference} />
          {form.recurring_interest && <Row label="Recurring" value={form.recurring_interest} />}
          {form.area_of_property && <Row label="Area" value={form.area_of_property} />}
          {form.access_notes && <Row label="Access" value={form.access_notes} />}
          {form.customer_notes && <Row label="Notes" value={form.customer_notes} />}
          {photos.length > 0 && <Row label="Photos" value={`${photos.length} attached`} />}
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
        {steps.map((_, i) => (
          <div key={i} className={cn('h-1 flex-1 rounded-full transition-colors', i <= step ? 'bg-primary' : 'bg-muted')} />
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
            <Button className="flex-1" disabled={submitRequest.isPending || uploading} onClick={() => submitRequest.mutate()}>
              {submitRequest.isPending || uploading ? 'Submitting...' : (
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
