import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SettingsLayout } from '@/components/SettingsLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Calendar, Clock, MapPin, CalendarCheck } from 'lucide-react';
import { toast } from 'sonner';

type ScheduleSettings = {
  id?: string;
  default_view: string;
  default_duration_minutes: number;
  time_slot_increment: number;
  workday_start: string;
  workday_end: string;
  first_day_of_week: number;
  after_hours_available: boolean;
  emergency_scheduling: boolean;
  weekend_scheduling: boolean;
  travel_buffer_minutes: number;
  setup_buffer_minutes: number;
  prevent_double_booking: boolean;
  allow_overlapping: boolean;
  enforce_worker_availability: boolean;
  subcontractor_scheduling: boolean;
  lead_time_hours: number;
  same_day_booking: boolean;
  cancellation_window_hours: number;
  admin_approval_for_changes: boolean;
  auto_create_visits: boolean;
};

const DEFAULTS: ScheduleSettings = {
  default_view: 'week', default_duration_minutes: 60, time_slot_increment: 15,
  workday_start: '07:00', workday_end: '18:00', first_day_of_week: 1,
  after_hours_available: false, emergency_scheduling: true, weekend_scheduling: true,
  travel_buffer_minutes: 15, setup_buffer_minutes: 10, prevent_double_booking: true,
  allow_overlapping: false, enforce_worker_availability: true, subcontractor_scheduling: true,
  lead_time_hours: 24, same_day_booking: false, cancellation_window_hours: 24,
  admin_approval_for_changes: false, auto_create_visits: true,
};

export default function ScheduleSettingsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ScheduleSettings>(DEFAULTS);
  const [dirty, setDirty] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ['schedule_settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('schedule_settings').select('*').limit(1).maybeSingle();
      if (error) throw error;
      return data as ScheduleSettings | null;
    },
  });

  useEffect(() => { if (settings) setForm({ ...DEFAULTS, ...settings }); }, [settings]);

  const set = (key: keyof ScheduleSettings, val: any) => {
    setForm(prev => ({ ...prev, [key]: val }));
    setDirty(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { id, ...payload } = form;
      if (settings?.id) {
        const { error } = await supabase.from('schedule_settings').update(payload).eq('id', settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('schedule_settings').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success('Schedule settings saved'); setDirty(false); queryClient.invalidateQueries({ queryKey: ['schedule_settings'] }); },
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
            <h1 className="text-2xl font-bold">Schedule Settings</h1>
            <p className="text-sm text-muted-foreground">Calendar defaults, availability, dispatch, and booking rules.</p>
          </div>
          <Button disabled={!dirty || saveMutation.isPending} onClick={() => saveMutation.mutate()}>
            {saveMutation.isPending ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>

        {/* Calendar Defaults */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2"><Calendar className="h-5 w-5 text-primary" /><CardTitle className="text-base">Calendar Defaults</CardTitle></div>
            <CardDescription>Default view, time slots, and workday boundaries</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <Label className="text-sm">Default view</Label>
                <Select value={form.default_view} onValueChange={v => set('default_view', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Day</SelectItem>
                    <SelectItem value="week">Week</SelectItem>
                    <SelectItem value="month">Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Default duration (min)</Label>
                <Select value={String(form.default_duration_minutes)} onValueChange={v => set('default_duration_minutes', parseInt(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[15,30,45,60,90,120,180,240].map(m => <SelectItem key={m} value={String(m)}>{m >= 60 ? `${m/60}h` : `${m}m`}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Time slot increment (min)</Label>
                <Select value={String(form.time_slot_increment)} onValueChange={v => set('time_slot_increment', parseInt(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[5,10,15,30,60].map(m => <SelectItem key={m} value={String(m)}>{m} min</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Workday start</Label>
                <Input type="time" value={form.workday_start} onChange={e => set('workday_start', e.target.value)} />
              </div>
              <div>
                <Label className="text-sm">Workday end</Label>
                <Input type="time" value={form.workday_end} onChange={e => set('workday_end', e.target.value)} />
              </div>
              <div>
                <Label className="text-sm">First day of week</Label>
                <Select value={String(form.first_day_of_week)} onValueChange={v => set('first_day_of_week', parseInt(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Sunday</SelectItem>
                    <SelectItem value="1">Monday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Availability */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2"><Clock className="h-5 w-5 text-primary" /><CardTitle className="text-base">Availability Rules</CardTitle></div>
            <CardDescription>When scheduling is allowed</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            <SwitchRow label="After-hours availability" desc="Allow scheduling outside business hours" checked={form.after_hours_available} onChange={v => set('after_hours_available', v)} />
            <Separator />
            <SwitchRow label="Emergency scheduling" desc="Enable emergency/priority scheduling" checked={form.emergency_scheduling} onChange={v => set('emergency_scheduling', v)} />
            <Separator />
            <SwitchRow label="Weekend scheduling" desc="Allow scheduling on Saturdays and Sundays" checked={form.weekend_scheduling} onChange={v => set('weekend_scheduling', v)} />
          </CardContent>
        </Card>

        {/* Dispatch Rules */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /><CardTitle className="text-base">Dispatch Rules</CardTitle></div>
            <CardDescription>Travel, buffer, and conflict settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-sm">Travel buffer (minutes)</Label>
                <Input type="number" value={form.travel_buffer_minutes} onChange={e => set('travel_buffer_minutes', parseInt(e.target.value) || 0)} />
              </div>
              <div>
                <Label className="text-sm">Setup/cleanup buffer (minutes)</Label>
                <Input type="number" value={form.setup_buffer_minutes} onChange={e => set('setup_buffer_minutes', parseInt(e.target.value) || 0)} />
              </div>
            </div>
            <Separator />
            <SwitchRow label="Prevent double-booking" desc="Block overlapping assignments for the same worker" checked={form.prevent_double_booking} onChange={v => set('prevent_double_booking', v)} />
            <Separator />
            <SwitchRow label="Allow overlapping visits" desc="Allow multiple visits at the same time slot" checked={form.allow_overlapping} onChange={v => set('allow_overlapping', v)} />
            <Separator />
            <SwitchRow label="Enforce worker availability" desc="Only schedule workers during their available hours" checked={form.enforce_worker_availability} onChange={v => set('enforce_worker_availability', v)} />
            <Separator />
            <SwitchRow label="Subcontractor scheduling" desc="Allow subcontractors to be scheduled" checked={form.subcontractor_scheduling} onChange={v => set('subcontractor_scheduling', v)} />
          </CardContent>
        </Card>

        {/* Booking Behavior */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2"><CalendarCheck className="h-5 w-5 text-primary" /><CardTitle className="text-base">Booking Behavior</CardTitle></div>
            <CardDescription>Lead times, cancellations, and automation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-sm">Minimum lead time (hours)</Label>
                <Input type="number" value={form.lead_time_hours} onChange={e => set('lead_time_hours', parseInt(e.target.value) || 0)} />
              </div>
              <div>
                <Label className="text-sm">Cancellation window (hours)</Label>
                <Input type="number" value={form.cancellation_window_hours} onChange={e => set('cancellation_window_hours', parseInt(e.target.value) || 0)} />
              </div>
            </div>
            <Separator />
            <SwitchRow label="Same-day booking" desc="Allow booking for today" checked={form.same_day_booking} onChange={v => set('same_day_booking', v)} />
            <Separator />
            <SwitchRow label="Admin approval for changes" desc="Require admin approval for schedule modifications" checked={form.admin_approval_for_changes} onChange={v => set('admin_approval_for_changes', v)} />
            <Separator />
            <SwitchRow label="Auto-create visit records" desc="Automatically create visit records when scheduling" checked={form.auto_create_visits} onChange={v => set('auto_create_visits', v)} />
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
