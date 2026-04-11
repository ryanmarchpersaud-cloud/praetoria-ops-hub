import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { callEdgeFunction } from '@/lib/edgeFunctionClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { UserPlus, Paperclip, X, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

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

const DOC_CATEGORIES = [
  { key: 'drivers_license', label: "Driver's License" },
  { key: 'drivers_abstract', label: "Driver's Abstract" },
  { key: 'sin_card', label: 'SIN Card' },
  { key: 'photo_id', label: 'Photo ID' },
  { key: 'certificate', label: 'Certificate' },
  { key: 'other', label: 'Other Document' },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PendingFile {
  file: File;
  category: string;
}

const emptyForm = {
  first_name: '', last_name: '', email: '', phone: '', password: '',
  role: 'staff', department: '', employment_type: 'full-time',
  branch_location: '', primary_service_category: '', role_title: '',
  address_line_1: '', address_city: '', address_province: '', address_postal_code: '',
  date_of_birth: '', gender: '', ethnicity: '', religion: '',
  sin: '', driver_license_number: '', driver_license_class: '', driver_license_expiry: '',
  pay_type: 'hourly', pay_schedule: 'bi-weekly', hourly_rate: '',
  emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relationship: '',
  referral_source: '',
  notes: '',
};

export default function CreateEmployeeDialog({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [form, setForm] = useState({ ...emptyForm });
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [activeDocCategory, setActiveDocCategory] = useState('other');

  const uploadFilesForUser = async (userId: string) => {
    if (!pendingFiles.length || !user?.id) return;
    setUploadingDocs(true);
    for (const pf of pendingFiles) {
      const ext = pf.file.name.split('.').pop() || 'bin';
      const path = `employee/${userId}/${pf.category}_${Date.now()}_${pf.file.name}`;
      const { error: uploadError } = await supabase.storage.from('hr-documents').upload(path, pf.file);
      if (uploadError) { console.error('Upload error:', uploadError); continue; }
      await supabase.from('files').insert({
        file_name: `[${pf.category}] ${pf.file.name}`,
        file_url: path,
        file_type: ext,
        record_type: 'employee',
        record_id: userId,
        uploaded_by: user.id,
      });
    }
    setUploadingDocs(false);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const full_name = `${form.first_name.trim()} ${form.last_name.trim()}`.trim();
      const data = await callEdgeFunction('manage-team', {
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
          role_title: form.role_title || null,
          department: form.department || null,
          employment_type: form.employment_type,
          branch_location: form.branch_location || null,
          primary_service_category: form.primary_service_category || null,
          hire_date: new Date().toISOString().split('T')[0],
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
          pay_type: form.pay_type || null,
          pay_schedule: form.pay_schedule || null,
          hourly_rate: form.hourly_rate ? parseFloat(form.hourly_rate) : null,
          emergency_contact_name: form.emergency_contact_name || null,
          emergency_contact_phone: form.emergency_contact_phone || null,
          emergency_contact_relationship: form.emergency_contact_relationship || null,
          referral_source: form.referral_source || null,
      });
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: async (data) => {
      if (pendingFiles.length && data?.user_id) {
        await uploadFilesForUser(data.user_id);
      }
      toast.success(data?.message || 'Employee created successfully');
      queryClient.invalidateQueries({ queryKey: ['employees_admin'] });
      queryClient.invalidateQueries({ queryKey: ['manage_team_v2'] });
      onOpenChange(false);
      setForm({ ...emptyForm });
      setPendingFiles([]);
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const newFiles: PendingFile[] = Array.from(files).map(f => ({ file: f, category: activeDocCategory }));
    setPendingFiles(prev => [...prev, ...newFiles]);
    if (fileRef.current) fileRef.current.value = '';
  };

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <div className="pt-2">
      <Separator className="mb-3" />
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{children}</p>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setForm({ ...emptyForm }); setPendingFiles([]); } }}>
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

            {/* ── Document Attachments ── */}
            <SectionTitle>Document Attachments</SectionTitle>
            <p className="text-xs text-muted-foreground mb-2">Upload driver's license, ID, certificates, abstracts, or any other documents. Files are saved after the employee is created.</p>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label>Document Type</Label>
                <Select value={activeDocCategory} onValueChange={setActiveDocCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DOC_CATEGORIES.map(c => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="gap-1.5">
                <Paperclip className="h-4 w-4" /> Choose File
              </Button>
              <input ref={fileRef} type="file" multiple className="hidden" onChange={handleFileSelect} accept="image/*,.pdf,.doc,.docx,.txt" />
            </div>
            {pendingFiles.length > 0 && (
              <div className="space-y-1 mt-2">
                {pendingFiles.map((pf, i) => (
                  <div key={i} className="flex items-center justify-between bg-muted/50 rounded px-3 py-1.5 text-xs">
                    <span className="truncate flex-1">
                      <span className="font-medium text-muted-foreground">[{DOC_CATEGORIES.find(c => c.key === pf.category)?.label}]</span>{' '}
                      {pf.file.name}
                    </span>
                    <button onClick={() => setPendingFiles(prev => prev.filter((_, j) => j !== i))} className="ml-2 hover:text-destructive">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending || uploadingDocs}>
            {mutation.isPending || uploadingDocs ? (
              <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Creating...</>
            ) : 'Create Employee'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
