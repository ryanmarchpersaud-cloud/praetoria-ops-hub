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
import { Camera, ClipboardCheck, Users, Clock, Settings2 } from 'lucide-react';
import { toast } from 'sonner';

type WorkSettings = {
  id?: string;
  photo_before_required: boolean;
  photo_after_required: boolean;
  notes_required: boolean;
  worker_checkin_required: boolean;
  worker_checkout_required: boolean;
  signature_required: boolean;
  damage_reporting_required: boolean;
  internal_approval_required: boolean;
  subcontractor_assignment_allowed: boolean;
  team_lead_required: boolean;
  max_workers_per_job: number;
  default_labor_unit: string;
  default_estimated_duration: number;
  overtime_threshold_hours: number;
  break_duration_minutes: number;
  oncall_enabled: boolean;
  after_hours_work_allowed: boolean;
  weekend_work_allowed: boolean;
  weather_sensitive_toggle: boolean;
  dispatch_notes_default: string;
  worker_instruction_visibility: string;
};

const DEFAULTS: WorkSettings = {
  photo_before_required: false, photo_after_required: false, notes_required: false,
  worker_checkin_required: false, worker_checkout_required: false, signature_required: false,
  damage_reporting_required: true, internal_approval_required: false,
  subcontractor_assignment_allowed: true, team_lead_required: false, max_workers_per_job: 10,
  default_labor_unit: 'hours', default_estimated_duration: 60, overtime_threshold_hours: 8,
  break_duration_minutes: 30, oncall_enabled: false, after_hours_work_allowed: true,
  weekend_work_allowed: true, weather_sensitive_toggle: false, dispatch_notes_default: '',
  worker_instruction_visibility: 'assigned_only',
};

export default function WorkSettingsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<WorkSettings>(DEFAULTS);
  const [dirty, setDirty] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['work_settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('work_settings').select('*').limit(1).maybeSingle();
      if (error) throw error;
      return data as WorkSettings | null;
    },
  });

  useEffect(() => {
    if (settings) {
      setForm({ ...DEFAULTS, ...settings });
    }
  }, [settings]);

  const set = (key: keyof WorkSettings, val: any) => {
    setForm(prev => ({ ...prev, [key]: val }));
    setDirty(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { id, ...payload } = form;
      if (settings?.id) {
        const { error } = await supabase.from('work_settings').update(payload).eq('id', settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('work_settings').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Work settings saved');
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ['work_settings'] });
    },
    onError: () => toast.error('Failed to save'),
  });

  const SwitchRow = ({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) => (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );

  return (
    <SettingsLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Work Settings</h1>
            <p className="text-sm text-muted-foreground">Default rules for job execution, staffing, and labor.</p>
          </div>
          <Button disabled={!dirty || saveMutation.isPending} onClick={() => saveMutation.mutate()}>
            {saveMutation.isPending ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>

        {/* Job Execution */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Job Execution Defaults</CardTitle>
            </div>
            <CardDescription>Requirements for completing jobs and visits</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            <SwitchRow label="Before photo required" desc="Workers must submit a photo before starting work" checked={form.photo_before_required} onChange={v => set('photo_before_required', v)} />
            <Separator />
            <SwitchRow label="After photo required" desc="Workers must submit a completion photo" checked={form.photo_after_required} onChange={v => set('photo_after_required', v)} />
            <Separator />
            <SwitchRow label="Completion notes required" desc="Notes must be added before marking done" checked={form.notes_required} onChange={v => set('notes_required', v)} />
            <Separator />
            <SwitchRow label="Worker check-in required" desc="Workers must check in on arrival" checked={form.worker_checkin_required} onChange={v => set('worker_checkin_required', v)} />
            <Separator />
            <SwitchRow label="Worker check-out required" desc="Workers must check out on departure" checked={form.worker_checkout_required} onChange={v => set('worker_checkout_required', v)} />
            <Separator />
            <SwitchRow label="Signature required" desc="Customer or foreman signature on completion" checked={form.signature_required} onChange={v => set('signature_required', v)} />
            <Separator />
            <SwitchRow label="Damage/incident reporting" desc="Require workers to report damage or incidents" checked={form.damage_reporting_required} onChange={v => set('damage_reporting_required', v)} />
            <Separator />
            <SwitchRow label="Internal approval required" desc="Jobs require admin approval before dispatch" checked={form.internal_approval_required} onChange={v => set('internal_approval_required', v)} />
          </CardContent>
        </Card>

        {/* Staffing */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Staffing Rules</CardTitle>
            </div>
            <CardDescription>Worker assignment and team structure defaults</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            <SwitchRow label="Allow subcontractor assignment" desc="Jobs can be assigned to subcontractors" checked={form.subcontractor_assignment_allowed} onChange={v => set('subcontractor_assignment_allowed', v)} />
            <Separator />
            <SwitchRow label="Team lead required" desc="Each crew must have a designated lead" checked={form.team_lead_required} onChange={v => set('team_lead_required', v)} />
            <Separator />
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium">Max workers per job</p>
                <p className="text-xs text-muted-foreground">Maximum allowed crew size</p>
              </div>
              <Input type="number" className="w-20" value={form.max_workers_per_job} onChange={e => set('max_workers_per_job', parseInt(e.target.value) || 1)} />
            </div>
          </CardContent>
        </Card>

        {/* Time & Labor */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Time &amp; Labor Rules</CardTitle>
            </div>
            <CardDescription>Duration, overtime, and schedule defaults</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-sm">Default labor unit</Label>
                <Select value={form.default_labor_unit} onValueChange={v => set('default_labor_unit', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hours">Hours</SelectItem>
                    <SelectItem value="minutes">Minutes</SelectItem>
                    <SelectItem value="days">Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Default estimated duration (min)</Label>
                <Input type="number" value={form.default_estimated_duration} onChange={e => set('default_estimated_duration', parseInt(e.target.value) || 15)} />
              </div>
              <div>
                <Label className="text-sm">Overtime threshold (hours)</Label>
                <Input type="number" step="0.5" value={form.overtime_threshold_hours} onChange={e => set('overtime_threshold_hours', parseFloat(e.target.value) || 8)} />
              </div>
              <div>
                <Label className="text-sm">Break duration (minutes)</Label>
                <Input type="number" value={form.break_duration_minutes} onChange={e => set('break_duration_minutes', parseInt(e.target.value) || 0)} />
              </div>
            </div>
            <Separator />
            <SwitchRow label="On-call / emergency work" desc="Enable on-call scheduling mode" checked={form.oncall_enabled} onChange={v => set('oncall_enabled', v)} />
            <Separator />
            <SwitchRow label="After-hours work allowed" desc="Allow scheduling outside business hours" checked={form.after_hours_work_allowed} onChange={v => set('after_hours_work_allowed', v)} />
            <Separator />
            <SwitchRow label="Weekend work allowed" desc="Allow scheduling on weekends" checked={form.weekend_work_allowed} onChange={v => set('weekend_work_allowed', v)} />
          </CardContent>
        </Card>

        {/* Operational Controls */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Operational Controls</CardTitle>
            </div>
            <CardDescription>Dispatch and instruction defaults</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SwitchRow label="Weather-sensitive services" desc="Flag weather-dependent service lines" checked={form.weather_sensitive_toggle} onChange={v => set('weather_sensitive_toggle', v)} />
            <Separator />
            <div>
              <Label className="text-sm">Worker instruction visibility</Label>
              <Select value={form.worker_instruction_visibility} onValueChange={v => set('worker_instruction_visibility', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="assigned_only">Assigned workers only</SelectItem>
                  <SelectItem value="all_workers">All workers</SelectItem>
                  <SelectItem value="team_leads">Team leads only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Default dispatch notes</Label>
              <Textarea value={form.dispatch_notes_default} onChange={e => set('dispatch_notes_default', e.target.value)} placeholder="Standard instructions included on all dispatches…" rows={3} />
            </div>
          </CardContent>
        </Card>

        {dirty && (
          <div className="flex items-center gap-2 text-sm text-amber-600">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            Unsaved changes — click Save to apply.
          </div>
        )}
      </div>
    </SettingsLayout>
  );
}
