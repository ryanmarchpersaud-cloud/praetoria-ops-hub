import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2 } from 'lucide-react';
import { useProspects, useCreateRecord, useUpdateRecord } from '@/hooks/pm-staff/usePMStaffData';
import { formatStatusLabel } from '@/lib/statusLabel';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

const STATUSES = ['new', 'contacted', 'showing_scheduled', 'applied', 'approved', 'declined', 'converted', 'closed'];
const SOURCES = ['website', 'referral', 'phone', 'social_media', 'sign', 'walk_in', 'other'];
const ID_TYPES = [
  { v: 'drivers_license', l: "Driver's License" },
  { v: 'sk_id', l: 'SK Photo ID' },
  { v: 'passport', l: 'Passport' },
  { v: 'other', l: 'Other' },
];
const CONTACT_METHODS = ['email', 'phone', 'sms'];
const GENDERS = ['male', 'female', 'non_binary', 'prefer_not_to_say'];

const emptyForm = () => ({
  // core
  name: '', preferred_name: '', email: '', phone: '', status: 'new', source: 'other', notes: '',
  desired_move_in: '',
  // identity
  date_of_birth: '', gender: '',
  id_type: 'drivers_license', id_number: '', id_expiry: '', id_photo_path: '',
  alternate_phone: '', preferred_contact_method: 'email',
  // current housing
  current_address: '', current_move_in_date: '', current_monthly_rent: '',
  reason_for_leaving: '', current_landlord_name: '', current_landlord_phone: '',
  // previous
  previous_address: '', previous_landlord_name: '', previous_landlord_phone: '',
  // employment
  employer_name: '', job_title: '', employment_start_date: '', gross_monthly_income: '',
  supervisor_name: '', supervisor_phone: '',
  secondary_income_source: '', secondary_income_amount: '', income_proof_path: '',
  // household
  occupant_count: '', is_smoker: false, has_pets: false,
  co_applicants: [] as Array<{ name: string; relationship: string; dob: string }>,
  pets: [] as Array<{ type: string; breed: string; weight: string; name: string }>,
  vehicles: [] as Array<{ make: string; model: string; year: string; plate: string }>,
  // desired unit
  interested_property_id: '', interested_unit_id: '',
  desired_lease_term_months: '', budget_max: '',
  // consents
  credit_check_consent: false, background_check_consent: false, reference_check_consent: false,
});

type FormShape = ReturnType<typeof emptyForm>;

// ============ Sub-components (declared outside main to prevent remount) ============

function Row({ children, cols = 2 }: { children: React.ReactNode; cols?: 1 | 2 | 3 }) {
  const cls = cols === 1 ? '' : cols === 3 ? 'grid grid-cols-1 sm:grid-cols-3 gap-3' : 'grid grid-cols-1 sm:grid-cols-2 gap-3';
  return <div className={cls}>{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function IdentitySection({ f, set }: { f: FormShape; set: (p: Partial<FormShape>) => void }) {
  return (
    <div className="space-y-3 pt-2">
      <Row>
        <Field label="Full legal name *"><Input value={f.name} onChange={e => set({ name: e.target.value })} /></Field>
        <Field label="Preferred name"><Input value={f.preferred_name} onChange={e => set({ preferred_name: e.target.value })} /></Field>
      </Row>
      <Row>
        <Field label="Date of birth"><Input type="date" value={f.date_of_birth} onChange={e => set({ date_of_birth: e.target.value })} /></Field>
        <Field label="Gender (optional)">
          <Select value={f.gender || undefined} onValueChange={v => set({ gender: v })}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{GENDERS.map(g => <SelectItem key={g} value={g}>{formatStatusLabel(g)}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
      </Row>
      <Row cols={3}>
        <Field label="ID type">
          <Select value={f.id_type} onValueChange={v => set({ id_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{ID_TYPES.map(t => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="ID number"><Input value={f.id_number} onChange={e => set({ id_number: e.target.value })} /></Field>
        <Field label="ID expiry"><Input type="date" value={f.id_expiry} onChange={e => set({ id_expiry: e.target.value })} /></Field>
      </Row>
      <Field label="ID photo">
        <FileUpload path={f.id_photo_path} onChange={p => set({ id_photo_path: p })} prefix="id" />
      </Field>
    </div>
  );
}

function ContactSection({ f, set }: { f: FormShape; set: (p: Partial<FormShape>) => void }) {
  return (
    <div className="space-y-3 pt-2">
      <Row>
        <Field label="Email"><Input type="email" value={f.email} onChange={e => set({ email: e.target.value })} /></Field>
        <Field label="Mobile phone"><Input value={f.phone} onChange={e => set({ phone: e.target.value })} /></Field>
      </Row>
      <Row>
        <Field label="Alternate phone"><Input value={f.alternate_phone} onChange={e => set({ alternate_phone: e.target.value })} /></Field>
        <Field label="Preferred contact">
          <Select value={f.preferred_contact_method} onValueChange={v => set({ preferred_contact_method: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CONTACT_METHODS.map(m => <SelectItem key={m} value={m}>{formatStatusLabel(m)}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
      </Row>
      <Row>
        <Field label="Source">
          <Select value={f.source} onValueChange={v => set({ source: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{SOURCES.map(s => <SelectItem key={s} value={s}>{formatStatusLabel(s)}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Status">
          <Select value={f.status} onValueChange={v => set({ status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{formatStatusLabel(s)}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
      </Row>
    </div>
  );
}

function CurrentHousingSection({ f, set }: { f: FormShape; set: (p: Partial<FormShape>) => void }) {
  return (
    <div className="space-y-3 pt-2">
      <Field label="Current address"><Input value={f.current_address} onChange={e => set({ current_address: e.target.value })} /></Field>
      <Row cols={3}>
        <Field label="Move-in date"><Input type="date" value={f.current_move_in_date} onChange={e => set({ current_move_in_date: e.target.value })} /></Field>
        <Field label="Monthly rent ($)"><Input type="number" step="0.01" value={f.current_monthly_rent} onChange={e => set({ current_monthly_rent: e.target.value })} /></Field>
        <Field label="Reason for leaving"><Input value={f.reason_for_leaving} onChange={e => set({ reason_for_leaving: e.target.value })} /></Field>
      </Row>
      <Row>
        <Field label="Current landlord name"><Input value={f.current_landlord_name} onChange={e => set({ current_landlord_name: e.target.value })} /></Field>
        <Field label="Current landlord phone"><Input value={f.current_landlord_phone} onChange={e => set({ current_landlord_phone: e.target.value })} /></Field>
      </Row>
    </div>
  );
}

function PreviousHousingSection({ f, set }: { f: FormShape; set: (p: Partial<FormShape>) => void }) {
  return (
    <div className="space-y-3 pt-2">
      <Field label="Previous address"><Input value={f.previous_address} onChange={e => set({ previous_address: e.target.value })} /></Field>
      <Row>
        <Field label="Previous landlord name"><Input value={f.previous_landlord_name} onChange={e => set({ previous_landlord_name: e.target.value })} /></Field>
        <Field label="Previous landlord phone"><Input value={f.previous_landlord_phone} onChange={e => set({ previous_landlord_phone: e.target.value })} /></Field>
      </Row>
    </div>
  );
}

function EmploymentSection({ f, set }: { f: FormShape; set: (p: Partial<FormShape>) => void }) {
  return (
    <div className="space-y-3 pt-2">
      <Row>
        <Field label="Employer"><Input value={f.employer_name} onChange={e => set({ employer_name: e.target.value })} /></Field>
        <Field label="Job title"><Input value={f.job_title} onChange={e => set({ job_title: e.target.value })} /></Field>
      </Row>
      <Row cols={3}>
        <Field label="Start date"><Input type="date" value={f.employment_start_date} onChange={e => set({ employment_start_date: e.target.value })} /></Field>
        <Field label="Gross monthly income ($)"><Input type="number" step="0.01" value={f.gross_monthly_income} onChange={e => set({ gross_monthly_income: e.target.value })} /></Field>
        <Field label="Supervisor name"><Input value={f.supervisor_name} onChange={e => set({ supervisor_name: e.target.value })} /></Field>
      </Row>
      <Row>
        <Field label="Supervisor phone"><Input value={f.supervisor_phone} onChange={e => set({ supervisor_phone: e.target.value })} /></Field>
        <Field label="Secondary income source"><Input value={f.secondary_income_source} onChange={e => set({ secondary_income_source: e.target.value })} /></Field>
      </Row>
      <Row>
        <Field label="Secondary income ($/mo)"><Input type="number" step="0.01" value={f.secondary_income_amount} onChange={e => set({ secondary_income_amount: e.target.value })} /></Field>
        <Field label="Income proof (pay stub / LOE)">
          <FileUpload path={f.income_proof_path} onChange={p => set({ income_proof_path: p })} prefix="income" />
        </Field>
      </Row>
    </div>
  );
}

function HouseholdSection({ f, set }: { f: FormShape; set: (p: Partial<FormShape>) => void }) {
  const addCo = () => set({ co_applicants: [...f.co_applicants, { name: '', relationship: '', dob: '' }] });
  const rmCo = (i: number) => set({ co_applicants: f.co_applicants.filter((_, x) => x !== i) });
  const upCo = (i: number, k: string, v: string) => set({ co_applicants: f.co_applicants.map((c, x) => x === i ? { ...c, [k]: v } : c) });

  const addPet = () => set({ pets: [...f.pets, { type: '', breed: '', weight: '', name: '' }], has_pets: true });
  const rmPet = (i: number) => {
    const next = f.pets.filter((_, x) => x !== i);
    set({ pets: next, has_pets: next.length > 0 });
  };
  const upPet = (i: number, k: string, v: string) => set({ pets: f.pets.map((p, x) => x === i ? { ...p, [k]: v } : p) });

  const addVeh = () => set({ vehicles: [...f.vehicles, { make: '', model: '', year: '', plate: '' }] });
  const rmVeh = (i: number) => set({ vehicles: f.vehicles.filter((_, x) => x !== i) });
  const upVeh = (i: number, k: string, v: string) => set({ vehicles: f.vehicles.map((v2, x) => x === i ? { ...v2, [k]: v } : v2) });

  return (
    <div className="space-y-4 pt-2">
      <Row cols={3}>
        <Field label="Total occupants"><Input type="number" value={f.occupant_count} onChange={e => set({ occupant_count: e.target.value })} /></Field>
        <div className="flex items-end gap-2 pb-2">
          <Checkbox id="smoker" checked={f.is_smoker} onCheckedChange={c => set({ is_smoker: !!c })} />
          <Label htmlFor="smoker" className="text-xs">Smoker</Label>
        </div>
        <div className="flex items-end gap-2 pb-2">
          <Checkbox id="pets" checked={f.has_pets} onCheckedChange={c => set({ has_pets: !!c })} />
          <Label htmlFor="pets" className="text-xs">Has pets</Label>
        </div>
      </Row>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold">Co-applicants</Label>
          <Button type="button" size="sm" variant="outline" onClick={addCo}><Plus className="h-3 w-3 mr-1" />Add</Button>
        </div>
        {f.co_applicants.map((c, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
            <Input placeholder="Name" value={c.name} onChange={e => upCo(i, 'name', e.target.value)} />
            <Input placeholder="Relationship" value={c.relationship} onChange={e => upCo(i, 'relationship', e.target.value)} />
            <Input type="date" value={c.dob} onChange={e => upCo(i, 'dob', e.target.value)} />
            <Button type="button" variant="ghost" size="icon" onClick={() => rmCo(i)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold">Pets</Label>
          <Button type="button" size="sm" variant="outline" onClick={addPet}><Plus className="h-3 w-3 mr-1" />Add</Button>
        </div>
        {f.pets.map((p, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 items-end">
            <Input placeholder="Type (dog/cat)" value={p.type} onChange={e => upPet(i, 'type', e.target.value)} />
            <Input placeholder="Breed" value={p.breed} onChange={e => upPet(i, 'breed', e.target.value)} />
            <Input placeholder="Weight (lb)" value={p.weight} onChange={e => upPet(i, 'weight', e.target.value)} />
            <Input placeholder="Name" value={p.name} onChange={e => upPet(i, 'name', e.target.value)} />
            <Button type="button" variant="ghost" size="icon" onClick={() => rmPet(i)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold">Vehicles</Label>
          <Button type="button" size="sm" variant="outline" onClick={addVeh}><Plus className="h-3 w-3 mr-1" />Add</Button>
        </div>
        {f.vehicles.map((v, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 items-end">
            <Input placeholder="Make" value={v.make} onChange={e => upVeh(i, 'make', e.target.value)} />
            <Input placeholder="Model" value={v.model} onChange={e => upVeh(i, 'model', e.target.value)} />
            <Input placeholder="Year" value={v.year} onChange={e => upVeh(i, 'year', e.target.value)} />
            <Input placeholder="Plate" value={v.plate} onChange={e => upVeh(i, 'plate', e.target.value)} />
            <Button type="button" variant="ghost" size="icon" onClick={() => rmVeh(i)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function DesiredUnitSection({ f, set, properties, units }: {
  f: FormShape; set: (p: Partial<FormShape>) => void;
  properties: Array<{ id: string; name: string }>;
  units: Array<{ id: string; unit_number: string; property_id: string }>;
}) {
  const filteredUnits = f.interested_property_id ? units.filter(u => u.property_id === f.interested_property_id) : [];
  return (
    <div className="space-y-3 pt-2">
      <Row>
        <Field label="Interested property">
          <Select value={f.interested_property_id || undefined} onValueChange={v => set({ interested_property_id: v, interested_unit_id: '' })}>
            <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
            <SelectContent>{properties.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Interested unit">
          <Select value={f.interested_unit_id || undefined} onValueChange={v => set({ interested_unit_id: v })} disabled={!f.interested_property_id}>
            <SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger>
            <SelectContent>{filteredUnits.map(u => <SelectItem key={u.id} value={u.id}>{u.unit_number}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
      </Row>
      <Row cols={3}>
        <Field label="Desired move-in"><Input type="date" value={f.desired_move_in} onChange={e => set({ desired_move_in: e.target.value })} /></Field>
        <Field label="Lease term (months)"><Input type="number" value={f.desired_lease_term_months} onChange={e => set({ desired_lease_term_months: e.target.value })} /></Field>
        <Field label="Max budget ($/mo)"><Input type="number" step="0.01" value={f.budget_max} onChange={e => set({ budget_max: e.target.value })} /></Field>
      </Row>
    </div>
  );
}

function ConsentsSection({ f, set }: { f: FormShape; set: (p: Partial<FormShape>) => void }) {
  return (
    <div className="space-y-3 pt-2">
      <p className="text-xs text-muted-foreground">Consent is recorded with a timestamp when saved.</p>
      <div className="flex items-start gap-2">
        <Checkbox id="cc" checked={f.credit_check_consent} onCheckedChange={c => set({ credit_check_consent: !!c })} />
        <Label htmlFor="cc" className="text-xs leading-snug">Applicant consents to a <strong>credit check</strong>.</Label>
      </div>
      <div className="flex items-start gap-2">
        <Checkbox id="bg" checked={f.background_check_consent} onCheckedChange={c => set({ background_check_consent: !!c })} />
        <Label htmlFor="bg" className="text-xs leading-snug">Applicant consents to a <strong>background check</strong>.</Label>
      </div>
      <div className="flex items-start gap-2">
        <Checkbox id="ref" checked={f.reference_check_consent} onCheckedChange={c => set({ reference_check_consent: !!c })} />
        <Label htmlFor="ref" className="text-xs leading-snug">Applicant consents to <strong>reference checks</strong> (current & previous landlords, employer).</Label>
      </div>
    </div>
  );
}

function FileUpload({ path, onChange, prefix }: { path: string; onChange: (p: string) => void; prefix: string }) {
  const [uploading, setUploading] = useState(false);
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'bin';
      const key = `${prefix}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('pm-prospect-docs').upload(key, file);
      if (error) throw error;
      onChange(key);
      toast.success('Uploaded');
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };
  return (
    <div className="space-y-1">
      <Input type="file" onChange={handleFile} disabled={uploading} accept="image/*,.pdf" />
      {path && <p className="text-[10px] text-muted-foreground truncate">Stored: {path}</p>}
    </div>
  );
}

// ============ Page ============

export default function Prospects() {
  const { user } = useAuth();
  const { data = [], isLoading } = useProspects();
  const createMut = useCreateRecord('pm_prospects', ['pm_prospects']);
  const updateMut = useUpdateRecord('pm_prospects', ['pm_prospects']);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormShape>(emptyForm());
  const set = (p: Partial<FormShape>) => setForm(prev => ({ ...prev, ...p }));

  const { data: properties = [] } = useQuery({
    queryKey: ['properties-lite'],
    queryFn: async () => {
      const { data } = await supabase.from('properties').select('id,property_name').order('property_name');
      return ((data as any[]) || []).map(r => ({ id: r.id, name: r.property_name })) as Array<{ id: string; name: string }>;
    },
    enabled: open,
  });
  const { data: units = [] } = useQuery({
    queryKey: ['pm-units-lite'],
    queryFn: async () => {
      const { data } = await supabase.from('pm_units').select('id,unit_label,property_id');
      return ((data as any[]) || []).map(r => ({ id: r.id, unit_number: r.unit_label, property_id: r.property_id })) as Array<{ id: string; unit_number: string; property_id: string }>;
    },
    enabled: open,
  });

  const submit = async () => {
    if (!form.name?.trim()) return toast.error('Name is required');
    const now = new Date().toISOString();
    const num = (v: string) => v === '' ? null : Number(v);
    const dt = (v: string) => v || null;
    try {
      await createMut.mutateAsync({
        // core
        name: form.name.trim(),
        preferred_name: form.preferred_name || null,
        email: form.email || null,
        phone: form.phone || null,
        status: form.status,
        source: form.source,
        notes: form.notes || null,
        desired_move_in: dt(form.desired_move_in),
        // identity
        date_of_birth: dt(form.date_of_birth),
        gender: form.gender || null,
        id_type: form.id_type || null,
        id_number: form.id_number || null,
        id_expiry: dt(form.id_expiry),
        id_photo_path: form.id_photo_path || null,
        alternate_phone: form.alternate_phone || null,
        preferred_contact_method: form.preferred_contact_method || null,
        // current housing
        current_address: form.current_address || null,
        current_move_in_date: dt(form.current_move_in_date),
        current_monthly_rent: num(form.current_monthly_rent),
        reason_for_leaving: form.reason_for_leaving || null,
        current_landlord_name: form.current_landlord_name || null,
        current_landlord_phone: form.current_landlord_phone || null,
        // previous
        previous_address: form.previous_address || null,
        previous_landlord_name: form.previous_landlord_name || null,
        previous_landlord_phone: form.previous_landlord_phone || null,
        // employment
        employer_name: form.employer_name || null,
        job_title: form.job_title || null,
        employment_start_date: dt(form.employment_start_date),
        gross_monthly_income: num(form.gross_monthly_income),
        supervisor_name: form.supervisor_name || null,
        supervisor_phone: form.supervisor_phone || null,
        secondary_income_source: form.secondary_income_source || null,
        secondary_income_amount: num(form.secondary_income_amount),
        income_proof_path: form.income_proof_path || null,
        // household
        occupant_count: form.occupant_count === '' ? null : Number(form.occupant_count),
        is_smoker: form.is_smoker,
        has_pets: form.has_pets,
        co_applicants: form.co_applicants,
        pets: form.pets,
        vehicles: form.vehicles,
        // desired unit
        interested_property_id: form.interested_property_id || null,
        interested_unit_id: form.interested_unit_id || null,
        desired_lease_term_months: form.desired_lease_term_months === '' ? null : Number(form.desired_lease_term_months),
        budget_max: num(form.budget_max),
        // consents (stamp when true)
        credit_check_consent: form.credit_check_consent,
        credit_check_consent_at: form.credit_check_consent ? now : null,
        background_check_consent: form.background_check_consent,
        background_check_consent_at: form.background_check_consent ? now : null,
        reference_check_consent: form.reference_check_consent,
        reference_check_consent_at: form.reference_check_consent ? now : null,
        // ownership
        created_by: user?.id,
        assigned_to: user?.id,
      });
      toast.success('Prospect added');
      setOpen(false);
      setForm(emptyForm());
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Prospects</h2>
        <Button size="sm" onClick={() => setOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!isLoading && data.length === 0 && (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No prospects yet. Tap Add to create one.</CardContent></Card>
      )}
      <div className="space-y-2">
        {data.map(p => (
          <Card key={p.id}>
            <CardContent className="p-3 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {[p.email, p.phone].filter(Boolean).join(' · ') || 'No contact'}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge variant="outline" className="text-[10px]">{formatStatusLabel(p.status)}</Badge>
                <Select value={p.status} onValueChange={v => updateMut.mutate({ id: p.id, patch: { status: v } })}>
                  <SelectTrigger className="h-7 text-xs w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{formatStatusLabel(s)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New prospect — screening intake</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">Only the name is required. Fill in the sections you have information for now — you can edit and complete the rest later.</p>
          <Accordion type="multiple" defaultValue={['identity', 'contact']} className="w-full">
            <AccordionItem value="identity"><AccordionTrigger className="text-sm">Identity & ID</AccordionTrigger>
              <AccordionContent><IdentitySection f={form} set={set} /></AccordionContent>
            </AccordionItem>
            <AccordionItem value="contact"><AccordionTrigger className="text-sm">Contact & source</AccordionTrigger>
              <AccordionContent><ContactSection f={form} set={set} /></AccordionContent>
            </AccordionItem>
            <AccordionItem value="current"><AccordionTrigger className="text-sm">Current housing</AccordionTrigger>
              <AccordionContent><CurrentHousingSection f={form} set={set} /></AccordionContent>
            </AccordionItem>
            <AccordionItem value="previous"><AccordionTrigger className="text-sm">Previous housing</AccordionTrigger>
              <AccordionContent><PreviousHousingSection f={form} set={set} /></AccordionContent>
            </AccordionItem>
            <AccordionItem value="employment"><AccordionTrigger className="text-sm">Employment & income</AccordionTrigger>
              <AccordionContent><EmploymentSection f={form} set={set} /></AccordionContent>
            </AccordionItem>
            <AccordionItem value="household"><AccordionTrigger className="text-sm">Household, pets & vehicles</AccordionTrigger>
              <AccordionContent><HouseholdSection f={form} set={set} /></AccordionContent>
            </AccordionItem>
            <AccordionItem value="desired"><AccordionTrigger className="text-sm">Desired unit</AccordionTrigger>
              <AccordionContent><DesiredUnitSection f={form} set={set} properties={properties} units={units} /></AccordionContent>
            </AccordionItem>
            <AccordionItem value="consents"><AccordionTrigger className="text-sm">Screening consents</AccordionTrigger>
              <AccordionContent><ConsentsSection f={form} set={set} /></AccordionContent>
            </AccordionItem>
            <AccordionItem value="notes"><AccordionTrigger className="text-sm">Notes</AccordionTrigger>
              <AccordionContent><Textarea rows={4} value={form.notes} onChange={e => set({ notes: e.target.value })} /></AccordionContent>
            </AccordionItem>
          </Accordion>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={submit} disabled={createMut.isPending}>Save prospect</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
