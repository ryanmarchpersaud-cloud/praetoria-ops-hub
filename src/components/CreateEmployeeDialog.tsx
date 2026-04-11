import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { UserPlus } from 'lucide-react';

const ROLES = [
  { value: 'staff', label: 'Staff / Worker' },
  { value: 'lead_worker', label: 'Lead Worker' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'dispatcher', label: 'Dispatcher' },
  { value: 'manager', label: 'Manager' },
  { value: 'admin', label: 'Admin' },
  { value: 'hr_admin', label: 'HR Admin' },
  { value: 'ops_manager', label: 'Ops Manager' },
  { value: 'accountant', label: 'Accountant' },
];

const EMPLOYMENT_TYPES = ['full-time', 'part-time', 'seasonal', 'contract', 'casual'];
const PAY_TYPES = ['hourly', 'salary', 'contract', 'percentage', 'fifty-fifty'];
const PAY_SCHEDULES = ['weekly', 'bi-weekly', 'semi-monthly', 'monthly'];
const GENDERS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];
const SERVICE_CATEGORIES = [
  'Snow & Ice', 'Landscaping & Grounds', 'Junk Removal',
  'Property Care & Maintenance', 'Cleaning Services', 'Power Washing',
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const emptyForm = {
  first_name: '', last_name: '', email: '', phone: '', password: '',
  role: 'staff', department: '', employment_type: 'full-time',
  branch_location: '', primary_service_category: '', role_title: '',
  // Address
  address_line_1: '', address_city: '', address_province: '', address_postal_code: '',
  // Personal
  date_of_birth: '', gender: '', ethnicity: '', religion: '',
  sin: '', driver_license_number: '', driver_license_class: '', driver_license_expiry: '',
  // Pay
  pay_type: 'hourly', pay_schedule: 'bi-weekly', hourly_rate: '',
  // Emergency contact
  emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relationship: '',
  // Referral
  referral_source: '',
  notes: '',
};

export default function CreateEmployeeDialog({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ ...emptyForm });

  const mutation = useMutation({
    mutationFn: async () => {
      const full_name = `${form.first_name.trim()} ${form.last_name.trim()}`.trim();
      const { data, error } = await supabase.functions.invoke('manage-team', {
        body: {
          action: 'create_user',
          email: form.email.trim(),
          password: form.password,
          full_name,
          role: form.role,
          phone: form.phone || null,
          team_type: form.role === 'admin' ? 'Admin' : form.role === 'manager' ? 'Manager' : 'Worker',
          service_categories: form.primary_service_category ? [form.primary_service_category] : [],
          notes: form.notes || null,
          portal_admin: ['admin', 'owner', 'ops_manager', 'accountant', 'hr_admin'].includes(form.role),
          portal_worker: ['staff', 'lead_worker', 'supervisor', 'dispatcher'].includes(form.role),
          portal_subcontractor: false,
          // Extended fields
          role_title: form.role_title || null,
          department: form.department || null,
          employment_type: form.employment_type,
          branch_location: form.branch_location || null,
          primary_service_category: form.primary_service_category || null,
          hire_date: new Date().toISOString().split('T')[0],
          // Personal
          address_line_1: form.address_line_1 || null,
          address_city: form.address_city || null,
          address_province: form.address_province || null,
          address_postal_code: form.address_postal_code || null,
          date_of_birth: form.date_of_birth || null,
          gender: form.gender || null,
          ethnicity: form.ethnicity || null,
          religion: form.religion || null,
          sin_encrypted: form.sin || null,
          driver_license_number: form.driver_license_number || null,
          driver_license_class: form.driver_license_class || null,
          driver_license_expiry: form.driver_license_expiry || null,
          // Pay
          pay_type: form.pay_type || null,
          pay_schedule: form.pay_schedule || null,
          hourly_rate: form.hourly_rate ? parseFloat(form.hourly_rate) : null,
          // Emergency
          emergency_contact_name: form.emergency_contact_name || null,
          emergency_contact_phone: form.emergency_contact_phone || null,
          emergency_contact_relationship: form.emergency_contact_relationship || null,
          // Referral
          referral_source: form.referral_source || null,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'Employee created successfully');
      queryClient.invalidateQueries({ queryKey: ['employees_admin'] });
      queryClient.invalidateQueries({ queryKey: ['manage_team_v2'] });
      onOpenChange(false);
      setForm({ ...emptyForm });
    },
    onError: (err: any) => toast.error(err.message || 'Failed to create employee'),
  });

  const handleSubmit = () => {
    if (!form.first_name.trim() || !form.last_name.trim()) { toast.error('First and last name are required'); return; }
    if (!form.email.trim()) { toast.error('Email is required'); return; }
    if (!form.password || form.password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    mutation.mutate();
  };

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <div className="pt-2">
      <Separator className="mb-3" />
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{children}</p>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setForm({ ...emptyForm }); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" /> Add Employee
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-3 py-2">
            {/* ── Identity ── */}
            <div className="grid grid-cols-2 gap-3">
              <div><Label>First Name *</Label><Input value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="John" /></div>
              <div><Label>Last Name *</Label><Input value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Doe" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Email *</Label><Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="john@company.com" /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(306) 555-0100" /></div>
            </div>
            <div><Label>Temporary Password *</Label><Input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Min. 8 characters" /></div>

            {/* ── Address ── */}
            <SectionTitle>Address</SectionTitle>
            <div><Label>Street Address</Label><Input value={form.address_line_1} onChange={e => set('address_line_1', e.target.value)} placeholder="123 Main St" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>City</Label><Input value={form.address_city} onChange={e => set('address_city', e.target.value)} placeholder="Saskatoon" /></div>
              <div><Label>Province</Label><Input value={form.address_province} onChange={e => set('address_province', e.target.value)} placeholder="SK" /></div>
              <div><Label>Postal Code</Label><Input value={form.address_postal_code} onChange={e => set('address_postal_code', e.target.value)} placeholder="S7K 0A1" /></div>
            </div>

            {/* ── Personal ── */}
            <SectionTitle>Personal Information</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Date of Birth</Label><Input type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} /></div>
              <div>
                <Label>Gender</Label>
                <Select value={form.gender} onValueChange={v => set('gender', v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{GENDERS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Ethnicity</Label><Input value={form.ethnicity} onChange={e => set('ethnicity', e.target.value)} placeholder="e.g. Black, White, Indigenous..." /></div>
              <div><Label>Religion</Label><Input value={form.religion} onChange={e => set('religion', e.target.value)} placeholder="Optional" /></div>
            </div>
            <div><Label>SIN (Social Insurance Number)</Label><Input value={form.sin} onChange={e => set('sin', e.target.value)} placeholder="XXX-XXX-XXX" /></div>

            {/* ── Driver's License ── */}
            <SectionTitle>Driver's License</SectionTitle>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>License Number</Label><Input value={form.driver_license_number} onChange={e => set('driver_license_number', e.target.value)} /></div>
              <div><Label>Class</Label><Input value={form.driver_license_class} onChange={e => set('driver_license_class', e.target.value)} placeholder="e.g. 5, 1A" /></div>
              <div><Label>Expiry Date</Label><Input type="date" value={form.driver_license_expiry} onChange={e => set('driver_license_expiry', e.target.value)} /></div>
            </div>

            {/* ── Role & Employment ── */}
            <SectionTitle>Role & Employment</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>System Role *</Label>
                <Select value={form.role} onValueChange={v => set('role', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Employment Type</Label>
                <Select value={form.employment_type} onValueChange={v => set('employment_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{EMPLOYMENT_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Job Title</Label><Input value={form.role_title} onChange={e => set('role_title', e.target.value)} placeholder="e.g. Field Technician" /></div>
              <div><Label>Department / Team</Label><Input value={form.department} onChange={e => set('department', e.target.value)} placeholder="e.g. Operations" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Branch Location</Label><Input value={form.branch_location} onChange={e => set('branch_location', e.target.value)} placeholder="e.g. Saskatoon" /></div>
              <div>
                <Label>Primary Service Line</Label>
                <Select value={form.primary_service_category} onValueChange={v => set('primary_service_category', v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{SERVICE_CATEGORIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {/* ── Pay ── */}
            <SectionTitle>Compensation</SectionTitle>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Pay Type</Label>
                <Select value={form.pay_type} onValueChange={v => set('pay_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PAY_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Pay Schedule</Label>
                <Select value={form.pay_schedule} onValueChange={v => set('pay_schedule', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PAY_SCHEDULES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Hourly Rate ($)</Label><Input type="number" step="0.01" value={form.hourly_rate} onChange={e => set('hourly_rate', e.target.value)} placeholder="0.00" /></div>
            </div>

            {/* ── Emergency Contact ── */}
            <SectionTitle>Emergency Contact</SectionTitle>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Contact Name</Label><Input value={form.emergency_contact_name} onChange={e => set('emergency_contact_name', e.target.value)} /></div>
              <div><Label>Phone</Label><Input value={form.emergency_contact_phone} onChange={e => set('emergency_contact_phone', e.target.value)} /></div>
              <div><Label>Relationship</Label><Input value={form.emergency_contact_relationship} onChange={e => set('emergency_contact_relationship', e.target.value)} placeholder="e.g. Spouse" /></div>
            </div>

            {/* ── Referral ── */}
            <SectionTitle>Referral & Notes</SectionTitle>
            <div><Label>Who referred them / How did they hear about the job?</Label><Input value={form.referral_source} onChange={e => set('referral_source', e.target.value)} placeholder="e.g. John Smith, Indeed, Walk-in" /></div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Internal notes..." rows={2} /></div>

            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1 mt-2">
              <p className="text-xs font-medium text-muted-foreground">After creation you can also manage:</p>
              <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
                <li>Certificate & document uploads</li>
                <li>Driver's abstract uploads</li>
                <li>Training assignments</li>
                <li>Equipment issuance</li>
              </ul>
            </div>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? 'Creating...' : 'Create Employee'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
