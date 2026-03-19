import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SettingsLayout } from '@/components/SettingsLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Inbox, CalendarCheck, Route, MessageSquare, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

type RequestBookingSettings = {
  id?: string;
  request_intake_enabled: boolean;
  online_booking_enabled: boolean;
  request_approval_required: boolean;
  booking_approval_required: boolean;
  same_day_requests: boolean;
  emergency_requests: boolean;
  require_description: boolean;
  require_service_type: boolean;
  require_photos: boolean;
  lead_time_hours: number;
  max_bookings_per_day: number;
  cancellation_hours: number;
  recurring_booking_enabled: boolean;
  default_request_owner: string;
  auto_convert_to_quote: boolean;
  triage_required: boolean;
  request_form_instructions: string;
  booking_confirmation_text: string;
  request_received_text: string;
  portal_help_text: string;
  customers_can_create: boolean;
  customers_can_cancel: boolean;
  staff_can_create: boolean;
  subcontractors_can_view: boolean;
  review_before_convert: boolean;
};

const DEFAULTS: RequestBookingSettings = {
  request_intake_enabled: true, online_booking_enabled: true,
  request_approval_required: false, booking_approval_required: true,
  same_day_requests: true, emergency_requests: true,
  require_description: true, require_service_type: true, require_photos: false,
  lead_time_hours: 24, max_bookings_per_day: 50, cancellation_hours: 24,
  recurring_booking_enabled: true,
  default_request_owner: 'ops_queue', auto_convert_to_quote: false, triage_required: false,
  request_form_instructions: 'Tell us what you need and we will get back to you promptly.',
  booking_confirmation_text: 'Your booking has been confirmed. We will be in touch with details.',
  request_received_text: 'Thank you! Your request has been received and our team is reviewing it.',
  portal_help_text: 'Need help? Contact us at ops@praetoriagroup.ca',
  customers_can_create: true, customers_can_cancel: true,
  staff_can_create: true, subcontractors_can_view: false, review_before_convert: true,
};

export default function RequestsBookingsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<RequestBookingSettings>(DEFAULTS);
  const [dirty, setDirty] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ['request_booking_settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('request_booking_settings').select('*').limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => { if (settings) setForm({ ...DEFAULTS, ...settings }); }, [settings]);

  const set = (key: keyof RequestBookingSettings, val: any) => { setForm(prev => ({ ...prev, [key]: val })); setDirty(true); };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { id, ...payload } = form as any;
      if (settings?.id) {
        const { error } = await supabase.from('request_booking_settings').update(payload).eq('id', settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('request_booking_settings').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success('Request & Booking settings saved'); setDirty(false); queryClient.invalidateQueries({ queryKey: ['request_booking_settings'] }); },
    onError: () => toast.error('Failed to save'),
  });

  const SwitchRow = ({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) => (
    <div className="flex items-center justify-between py-2">
      <div><p className="text-sm font-medium">{label}</p><p className="text-xs text-muted-foreground">{desc}</p></div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );

  return (
    <SettingsLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Requests &amp; Bookings</h1>
            <p className="text-sm text-muted-foreground">Intake rules, booking behavior, routing, and customer-facing settings.</p>
          </div>
          <Button disabled={!dirty || saveMutation.isPending} onClick={() => saveMutation.mutate()}>
            {saveMutation.isPending ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>

        {/* Intake Defaults */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2"><Inbox className="h-5 w-5 text-primary" /><CardTitle className="text-base">Request Intake Defaults</CardTitle></div>
            <CardDescription>Control how service requests are received</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            <SwitchRow label="Request intake enabled" desc="Accept service requests from customers" checked={form.request_intake_enabled} onChange={v => set('request_intake_enabled', v)} />
            <Separator />
            <SwitchRow label="Online booking enabled" desc="Allow customers to book online" checked={form.online_booking_enabled} onChange={v => set('online_booking_enabled', v)} />
            <Separator />
            <SwitchRow label="Request approval required" desc="Requests need admin approval before processing" checked={form.request_approval_required} onChange={v => set('request_approval_required', v)} />
            <Separator />
            <SwitchRow label="Booking approval required" desc="Online bookings need admin confirmation" checked={form.booking_approval_required} onChange={v => set('booking_approval_required', v)} />
            <Separator />
            <SwitchRow label="Same-day requests" desc="Allow requests for same-day service" checked={form.same_day_requests} onChange={v => set('same_day_requests', v)} />
            <Separator />
            <SwitchRow label="Emergency requests" desc="Allow emergency/urgent requests" checked={form.emergency_requests} onChange={v => set('emergency_requests', v)} />
            <Separator />
            <SwitchRow label="Description required" desc="Require a description when submitting" checked={form.require_description} onChange={v => set('require_description', v)} />
            <Separator />
            <SwitchRow label="Service type required" desc="Require selecting a service category" checked={form.require_service_type} onChange={v => set('require_service_type', v)} />
            <Separator />
            <SwitchRow label="Photos required" desc="Require photo attachments on requests" checked={form.require_photos} onChange={v => set('require_photos', v)} />
          </CardContent>
        </Card>

        {/* Booking Behavior */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2"><CalendarCheck className="h-5 w-5 text-primary" /><CardTitle className="text-base">Booking Behavior</CardTitle></div>
            <CardDescription>Lead times, limits, and recurring booking rules</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div><Label className="text-sm">Lead time (hours)</Label><Input type="number" value={form.lead_time_hours} onChange={e => set('lead_time_hours', parseInt(e.target.value) || 0)} /></div>
              <div><Label className="text-sm">Max bookings/day</Label><Input type="number" value={form.max_bookings_per_day} onChange={e => set('max_bookings_per_day', parseInt(e.target.value) || 1)} /></div>
              <div><Label className="text-sm">Cancellation window (hrs)</Label><Input type="number" value={form.cancellation_hours} onChange={e => set('cancellation_hours', parseInt(e.target.value) || 0)} /></div>
            </div>
            <SwitchRow label="Recurring bookings" desc="Allow customers to set up recurring service bookings" checked={form.recurring_booking_enabled} onChange={v => set('recurring_booking_enabled', v)} />
          </CardContent>
        </Card>

        {/* Routing / Ownership */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2"><Route className="h-5 w-5 text-primary" /><CardTitle className="text-base">Routing &amp; Ownership</CardTitle></div>
            <CardDescription>How requests are assigned and triaged</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm">Default request owner</Label>
              <Select value={form.default_request_owner} onValueChange={v => set('default_request_owner', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ops_queue">Operations queue</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="dispatcher">Dispatcher</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <SwitchRow label="Auto-convert to quote" desc="Automatically create a quote from approved requests" checked={form.auto_convert_to_quote} onChange={v => set('auto_convert_to_quote', v)} />
            <Separator />
            <SwitchRow label="Triage required" desc="Requests must be triaged before routing" checked={form.triage_required} onChange={v => set('triage_required', v)} />
            <Separator />
            <SwitchRow label="Review before converting" desc="Admin must review before converting request to job/quote" checked={form.review_before_convert} onChange={v => set('review_before_convert', v)} />
          </CardContent>
        </Card>

        {/* Customer-Facing Wording */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2"><MessageSquare className="h-5 w-5 text-primary" /><CardTitle className="text-base">Customer-Facing Text</CardTitle></div>
            <CardDescription>Messages shown to customers during the request/booking flow</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div><Label className="text-sm">Request form instructions</Label><Textarea value={form.request_form_instructions} onChange={e => set('request_form_instructions', e.target.value)} rows={2} /></div>
            <div><Label className="text-sm">Booking confirmation message</Label><Textarea value={form.booking_confirmation_text} onChange={e => set('booking_confirmation_text', e.target.value)} rows={2} /></div>
            <div><Label className="text-sm">Request received message</Label><Textarea value={form.request_received_text} onChange={e => set('request_received_text', e.target.value)} rows={2} /></div>
            <div><Label className="text-sm">Portal help text</Label><Input value={form.portal_help_text} onChange={e => set('portal_help_text', e.target.value)} /></div>
          </CardContent>
        </Card>

        {/* Access Controls */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /><CardTitle className="text-base">Access Controls</CardTitle></div>
            <CardDescription>Who can create, view, and cancel requests</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            <SwitchRow label="Customers can create requests" desc="Allow customers to submit new requests" checked={form.customers_can_create} onChange={v => set('customers_can_create', v)} />
            <Separator />
            <SwitchRow label="Customers can cancel requests" desc="Allow customers to cancel their own requests" checked={form.customers_can_cancel} onChange={v => set('customers_can_cancel', v)} />
            <Separator />
            <SwitchRow label="Staff can create requests" desc="Allow staff to create requests on behalf of customers" checked={form.staff_can_create} onChange={v => set('staff_can_create', v)} />
            <Separator />
            <SwitchRow label="Subcontractors can view requests" desc="Allow subcontractors to see assigned requests" checked={form.subcontractors_can_view} onChange={v => set('subcontractors_can_view', v)} />
          </CardContent>
        </Card>

        {dirty && (
          <div className="flex items-center gap-2 text-sm text-amber-600">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            Unsaved changes
          </div>
        )}
      </div>
    </SettingsLayout>
  );
}
