import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Heart, ShieldAlert, Save, Info } from 'lucide-react';
import { toast } from 'sonner';

interface MedicalAlertData {
  allergies?: string | null;
  carries_epipen?: boolean | null;
  carries_inhaler?: boolean | null;
  diabetes_alert?: boolean | null;
  seizure_or_fainting_alert?: boolean | null;
  blood_pressure_alert?: boolean | null;
  emergency_medical_notes?: string | null;
  medical_info_last_updated_at?: string | null;
  medical_info_consent?: boolean | null;
}

interface MedicalAlertCardProps {
  data: MedicalAlertData | null | undefined;
  onSave: (fields: Record<string, any>) => Promise<void>;
  readOnly?: boolean;
}

export function MedicalAlertCard({ data, onSave, readOnly }: MedicalAlertCardProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<MedicalAlertData>({});

  const startEdit = () => {
    setForm({
      allergies: data?.allergies || '',
      carries_epipen: data?.carries_epipen || false,
      carries_inhaler: data?.carries_inhaler || false,
      diabetes_alert: data?.diabetes_alert || false,
      seizure_or_fainting_alert: data?.seizure_or_fainting_alert || false,
      blood_pressure_alert: data?.blood_pressure_alert || false,
      emergency_medical_notes: data?.emergency_medical_notes || '',
      medical_info_consent: data?.medical_info_consent || false,
    });
    setEditing(true);
  };

  const handleSave = async () => {
    if (!form.medical_info_consent) {
      toast.error('You must consent to storing emergency medical info');
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
      setEditing(false);
      toast.success('Medical alert info updated');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const hasAlerts = data?.carries_epipen || data?.carries_inhaler || data?.diabetes_alert ||
    data?.seizure_or_fainting_alert || data?.blood_pressure_alert || data?.allergies;

  if (readOnly) {
    return (
      <Card className={hasAlerts ? 'border-rose-200 dark:border-rose-800' : ''}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Heart className="h-4 w-4 text-rose-500" /> Medical Alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-[10px] text-muted-foreground italic flex items-center gap-1">
            <Info className="h-3 w-3" /> Emergency-only information
          </p>
          {!hasAlerts ? (
            <p className="text-xs text-muted-foreground">No medical alerts on file.</p>
          ) : (
            <>
              {data?.allergies && <AlertRow label="Allergies" value={data.allergies} />}
              {data?.carries_epipen && <AlertBadge label="Carries EpiPen" />}
              {data?.carries_inhaler && <AlertBadge label="Carries Inhaler" />}
              {data?.diabetes_alert && <AlertBadge label="Diabetes Alert" />}
              {data?.seizure_or_fainting_alert && <AlertBadge label="Seizure / Fainting Risk" />}
              {data?.blood_pressure_alert && <AlertBadge label="Blood Pressure Alert" />}
              {data?.emergency_medical_notes && <AlertRow label="Notes" value={data.emergency_medical_notes} />}
            </>
          )}
          {data?.medical_info_last_updated_at && (
            <p className="text-[10px] text-muted-foreground">
              Last updated: {new Date(data.medical_info_last_updated_at).toLocaleDateString('en-CA')}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  if (!editing) {
    return (
      <Card className={hasAlerts ? 'border-rose-200 dark:border-rose-800' : ''}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Heart className="h-4 w-4 text-rose-500" /> Medical Alerts
            <span className="text-[10px] text-muted-foreground font-normal ml-auto">Emergency-only</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!hasAlerts ? (
            <p className="text-xs text-muted-foreground">No medical alerts on file. Add important emergency health info.</p>
          ) : (
            <>
              {data?.allergies && <AlertRow label="Allergies" value={data.allergies} />}
              {data?.carries_epipen && <AlertBadge label="Carries EpiPen" />}
              {data?.carries_inhaler && <AlertBadge label="Carries Inhaler" />}
              {data?.diabetes_alert && <AlertBadge label="Diabetes Alert" />}
              {data?.seizure_or_fainting_alert && <AlertBadge label="Seizure / Fainting Risk" />}
              {data?.blood_pressure_alert && <AlertBadge label="Blood Pressure Alert" />}
              {data?.emergency_medical_notes && <AlertRow label="Notes" value={data.emergency_medical_notes} />}
            </>
          )}
          {data?.medical_info_last_updated_at && (
            <p className="text-[10px] text-muted-foreground">
              Last updated: {new Date(data.medical_info_last_updated_at).toLocaleDateString('en-CA')}
            </p>
          )}
          <Button variant="outline" size="sm" className="w-full mt-2" onClick={startEdit}>
            {hasAlerts ? 'Edit Medical Info' : 'Add Medical Info'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-rose-200 dark:border-rose-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Heart className="h-4 w-4 text-rose-500" /> Edit Medical Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
          <p className="text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-1.5">
            <ShieldAlert className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            This information is only used in medical emergencies and is restricted to authorized personnel.
          </p>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Allergies</Label>
          <Input
            value={form.allergies || ''}
            onChange={e => setForm(f => ({ ...f, allergies: e.target.value }))}
            placeholder="e.g. Bee stings, Penicillin"
            className="text-sm"
          />
        </div>

        <div className="space-y-2">
          <ToggleRow label="Carries EpiPen" checked={!!form.carries_epipen} onChange={v => setForm(f => ({ ...f, carries_epipen: v }))} />
          <ToggleRow label="Carries Inhaler" checked={!!form.carries_inhaler} onChange={v => setForm(f => ({ ...f, carries_inhaler: v }))} />
          <ToggleRow label="Diabetes Alert" checked={!!form.diabetes_alert} onChange={v => setForm(f => ({ ...f, diabetes_alert: v }))} />
          <ToggleRow label="Seizure / Fainting Risk" checked={!!form.seizure_or_fainting_alert} onChange={v => setForm(f => ({ ...f, seizure_or_fainting_alert: v }))} />
          <ToggleRow label="Blood Pressure Alert" checked={!!form.blood_pressure_alert} onChange={v => setForm(f => ({ ...f, blood_pressure_alert: v }))} />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Emergency Medical Notes</Label>
          <Textarea
            value={form.emergency_medical_notes || ''}
            onChange={e => setForm(f => ({ ...f, emergency_medical_notes: e.target.value }))}
            placeholder="Any additional emergency medical information..."
            rows={2}
            className="text-sm"
          />
        </div>

        <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
          <Switch
            checked={!!form.medical_info_consent}
            onCheckedChange={v => setForm(f => ({ ...f, medical_info_consent: v }))}
            className="mt-0.5"
          />
          <Label className="text-[11px] text-muted-foreground leading-tight">
            I consent to storing this emergency medical information for use by authorized personnel in case of a medical emergency on site.
          </Label>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => setEditing(false)}>Cancel</Button>
          <Button size="sm" className="flex-1" onClick={handleSave} disabled={saving}>
            <Save className="h-3.5 w-3.5 mr-1" /> {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AlertRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-xs">
      <span className="text-muted-foreground">{label}: </span>
      <span className="text-foreground font-medium">{value}</span>
    </div>
  );
}

function AlertBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 border border-rose-200 dark:border-rose-800 mr-1">
      <ShieldAlert className="h-3 w-3" /> {label}
    </span>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <Label className="text-xs">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
