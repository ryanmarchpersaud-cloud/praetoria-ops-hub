import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  ShieldAlert, Accessibility, Heart, Dog, Lock, Mountain, Zap,
  Wrench, Shovel, Crown, Save, Loader2, Snowflake, X
} from 'lucide-react';

const PRIORITY_TIERS = ['standard', 'vip', 'economy'];
const EQUIPMENT_OPTIONS = ['salt spreader', 'bobcat', 'hand tools only', 'snow blower', 'plow truck', 'wheelbarrow', 'pressure washer'];

interface PropertySiteAlertsEditorProps {
  propertyId: string;
}

export function PropertySiteAlertsEditor({ propertyId }: PropertySiteAlertsEditorProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    has_wheelchair_ramp: false,
    has_elderly_resident: false,
    has_mobility_impaired: false,
    accessibility_notes: '',
    medical_alert: false,
    medical_alert_text: '',
    has_dog: false,
    dog_notes: '',
    has_locked_gate: false,
    gate_access_notes: '',
    has_steep_grade: false,
    has_low_wires: false,
    has_icy_spots: false,
    hazard_notes: '',
    required_equipment: [] as string[],
    hand_shovel_only: false,
    equipment_notes: '',
    priority_tier: 'standard',
  });
  const [existingId, setExistingId] = useState<string | null>(null);
  const [equipmentInput, setEquipmentInput] = useState('');

  useEffect(() => {
    supabase
      .from('property_site_alerts')
      .select('*')
      .eq('property_id', propertyId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setExistingId(data.id);
          setForm({
            has_wheelchair_ramp: data.has_wheelchair_ramp || false,
            has_elderly_resident: data.has_elderly_resident || false,
            has_mobility_impaired: data.has_mobility_impaired || false,
            accessibility_notes: data.accessibility_notes || '',
            medical_alert: data.medical_alert || false,
            medical_alert_text: data.medical_alert_text || '',
            has_dog: data.has_dog || false,
            dog_notes: data.dog_notes || '',
            has_locked_gate: data.has_locked_gate || false,
            gate_access_notes: data.gate_access_notes || '',
            has_steep_grade: data.has_steep_grade || false,
            has_low_wires: data.has_low_wires || false,
            has_icy_spots: data.has_icy_spots || false,
            hazard_notes: data.hazard_notes || '',
            required_equipment: (data.required_equipment as string[]) || [],
            hand_shovel_only: data.hand_shovel_only || false,
            equipment_notes: data.equipment_notes || '',
            priority_tier: data.priority_tier || 'standard',
          });
        }
        setLoading(false);
      });
  }, [propertyId]);

  const set = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const addEquipment = (item: string) => {
    if (item && !form.required_equipment.includes(item)) {
      set('required_equipment', [...form.required_equipment, item]);
    }
    setEquipmentInput('');
  };

  const removeEquipment = (item: string) => {
    set('required_equipment', form.required_equipment.filter(e => e !== item));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...form, property_id: propertyId } as any;
      if (existingId) {
        const { error } = await supabase.from('property_site_alerts').update(payload).eq('id', existingId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('property_site_alerts').insert(payload).select().single();
        if (error) throw error;
        setExistingId(data.id);
      }
      toast({ title: 'Site alerts saved' });
    } catch (err: any) {
      toast({ title: 'Error saving', description: err.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  if (loading) return <p className="text-sm text-muted-foreground p-4">Loading site alerts...</p>;

  return (
    <div className="space-y-3">
      {/* Priority Tier */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Crown className="h-3.5 w-3.5" /> Priority Tier
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {PRIORITY_TIERS.map(tier => (
              <button
                key={tier}
                onClick={() => set('priority_tier', tier)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                  form.priority_tier === tier
                    ? tier === 'vip'
                      ? 'bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700'
                      : 'bg-primary/10 border-primary text-primary'
                    : 'bg-card border-border text-muted-foreground hover:bg-muted/50'
                }`}
              >
                {tier === 'vip' ? '⭐ VIP' : tier.charAt(0).toUpperCase() + tier.slice(1)}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Accessibility */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Accessibility className="h-3.5 w-3.5" /> Accessibility
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs flex items-center gap-1.5">♿ Wheelchair Ramp</Label>
            <Switch checked={form.has_wheelchair_ramp} onCheckedChange={v => set('has_wheelchair_ramp', v)} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs flex items-center gap-1.5">👴 Elderly Resident</Label>
            <Switch checked={form.has_elderly_resident} onCheckedChange={v => set('has_elderly_resident', v)} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs flex items-center gap-1.5">🦽 Mobility Impaired</Label>
            <Switch checked={form.has_mobility_impaired} onCheckedChange={v => set('has_mobility_impaired', v)} />
          </div>
          <div>
            <Label className="text-xs">Accessibility Notes</Label>
            <Textarea value={form.accessibility_notes} onChange={e => set('accessibility_notes', e.target.value)} rows={2} placeholder="e.g. Front entrance has ramp — do not block" />
          </div>
        </CardContent>
      </Card>

      {/* Medical Alerts */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Heart className="h-3.5 w-3.5 text-red-500" /> Medical Alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs flex items-center gap-1.5">🏥 Medical Alert Active</Label>
            <Switch checked={form.medical_alert} onCheckedChange={v => set('medical_alert', v)} />
          </div>
          {form.medical_alert && (
            <div>
              <Label className="text-xs">Medical Details</Label>
              <Textarea value={form.medical_alert_text} onChange={e => set('medical_alert_text', e.target.value)} rows={2} placeholder="e.g. Resident uses oxygen tank — no exhaust near front door" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Site Hazards */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <ShieldAlert className="h-3.5 w-3.5" /> Site Hazards
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs flex items-center gap-1.5"><Dog className="h-3 w-3" /> Dog on Property</Label>
            <Switch checked={form.has_dog} onCheckedChange={v => set('has_dog', v)} />
          </div>
          {form.has_dog && (
            <div>
              <Label className="text-xs">Dog Notes</Label>
              <Input value={form.dog_notes} onChange={e => set('dog_notes', e.target.value)} placeholder="e.g. Large German Shepherd — stays in backyard" />
            </div>
          )}
          <div className="flex items-center justify-between">
            <Label className="text-xs flex items-center gap-1.5"><Lock className="h-3 w-3" /> Locked Gate</Label>
            <Switch checked={form.has_locked_gate} onCheckedChange={v => set('has_locked_gate', v)} />
          </div>
          {form.has_locked_gate && (
            <div>
              <Label className="text-xs">Gate Access Notes</Label>
              <Input value={form.gate_access_notes} onChange={e => set('gate_access_notes', e.target.value)} placeholder="e.g. Code: 4521#" />
            </div>
          )}
          <div className="flex items-center justify-between">
            <Label className="text-xs flex items-center gap-1.5"><Mountain className="h-3 w-3" /> Steep Grade</Label>
            <Switch checked={form.has_steep_grade} onCheckedChange={v => set('has_steep_grade', v)} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs flex items-center gap-1.5"><Zap className="h-3 w-3" /> Low-Hanging Wires</Label>
            <Switch checked={form.has_low_wires} onCheckedChange={v => set('has_low_wires', v)} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs flex items-center gap-1.5"><Snowflake className="h-3 w-3" /> Icy Spots</Label>
            <Switch checked={form.has_icy_spots} onCheckedChange={v => set('has_icy_spots', v)} />
          </div>
          <div>
            <Label className="text-xs">General Hazard Notes</Label>
            <Textarea value={form.hazard_notes} onChange={e => set('hazard_notes', e.target.value)} rows={2} placeholder="e.g. Driveway ices over quickly in morning" />
          </div>
        </CardContent>
      </Card>

      {/* Equipment */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Wrench className="h-3.5 w-3.5" /> Equipment Requirements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs flex items-center gap-1.5"><Shovel className="h-3 w-3" /> Hand Shovel Only</Label>
            <Switch checked={form.hand_shovel_only} onCheckedChange={v => set('hand_shovel_only', v)} />
          </div>
          <div>
            <Label className="text-xs mb-1 block">Required Equipment</Label>
            {form.required_equipment.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {form.required_equipment.map(eq => (
                  <Badge key={eq} variant="secondary" className="gap-1 pr-1 text-xs">
                    {eq}
                    <button onClick={() => removeEquipment(eq)} className="ml-0.5 rounded-full hover:bg-muted p-0.5">
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <div className="flex gap-2 flex-wrap">
              {EQUIPMENT_OPTIONS.filter(e => !form.required_equipment.includes(e)).map(eq => (
                <button
                  key={eq}
                  onClick={() => addEquipment(eq)}
                  className="text-[10px] px-2 py-1 rounded border border-dashed border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                >
                  + {eq}
                </button>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <Input
                value={equipmentInput}
                onChange={e => setEquipmentInput(e.target.value)}
                placeholder="Add custom equipment..."
                className="h-8 text-xs"
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEquipment(equipmentInput); } }}
              />
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => addEquipment(equipmentInput)}>Add</Button>
            </div>
          </div>
          <div>
            <Label className="text-xs">Equipment Notes</Label>
            <Textarea value={form.equipment_notes} onChange={e => set('equipment_notes', e.target.value)} rows={2} placeholder="e.g. Bobcat needed for back lane" />
          </div>
        </CardContent>
      </Card>

      {/* Save button */}
      <Button onClick={handleSave} className="w-full h-11" disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
        Save Site Alerts
      </Button>
    </div>
  );
}
