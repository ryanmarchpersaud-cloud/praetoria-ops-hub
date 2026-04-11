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
import { Truck, Paperclip, X, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const PAY_TYPES = ['contract', 'hourly', 'percentage', 'fifty-fifty', 'flat-rate'];
const PAY_SCHEDULES = ['weekly', 'bi-weekly', 'semi-monthly', 'monthly'];
const GENDERS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];

const DOC_CATEGORIES = [
  { key: 'drivers_license', label: "Driver's License" },
  { key: 'drivers_abstract', label: "Driver's Abstract" },
  { key: 'sin_card', label: 'SIN Card' },
  { key: 'photo_id', label: 'Photo ID' },
  { key: 'insurance', label: 'Insurance Certificate' },
  { key: 'wcb', label: 'WCB Certificate' },
  { key: 'business_licence', label: 'Business Licence' },
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
  company_name: '', contact_name: '', email: '', phone: '', password: '',
  service_area_summary: '', business_number: '',
  mailing_address: '',
  date_of_birth: '', gender: '', ethnicity: '', religion: '',
  sin: '', driver_license_number: '', driver_license_class: '', driver_license_expiry: '',
  pay_type: 'contract', pay_schedule: 'monthly', hourly_rate: '',
  emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relationship: '',
  referral_source: '',
  notes: '',
};

export default function CreateSubcontractorDialog({ open, onOpenChange }: Props) {
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
      const path = `subcontractor/${userId}/${pf.category}_${Date.now()}_${pf.file.name}`;
      const { error: uploadError } = await supabase.storage.from('hr-documents').upload(path, pf.file);
      if (uploadError) { console.error('Upload error:', uploadError); continue; }
      await supabase.from('files').insert({
        file_name: `[${pf.category}] ${pf.file.name}`,
        file_url: path,
        file_type: ext,
        record_type: 'subcontractor',
        record_id: userId,
        uploaded_by: user.id,
      });
    }
    setUploadingDocs(false);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const data = await callEdgeFunction('manage-team', {
          action: 'create_subcontractor',
          email: form.email.trim(),
          password: form.password,
          company_name: form.company_name.trim(),
          contact_name: form.contact_name.trim(),
          phone: form.phone || null,
          service_area_summary: form.service_area_summary || null,
          business_number: form.business_number || null,
          notes: form.notes || null,
          mailing_address: form.mailing_address || null,
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
      toast.success(data?.message || 'Subcontractor created');
      queryClient.invalidateQueries({ queryKey: ['all_subcontractors'] });
      queryClient.invalidateQueries({ queryKey: ['manage_team_v2'] });
      onOpenChange(false);
      setForm({ ...emptyForm });
      setPendingFiles([]);
    },
    onError: (err: any) => toast.error(err.message || 'Failed to create subcontractor'),
  });

  const handleSubmit = () => {
    if (!form.company_name.trim()) { toast.error('Company name is required'); return; }
    if (!form.contact_name.trim()) { toast.error('Contact name is required'); return; }
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
            <Truck className="h-5 w-5" /> Add Subcontractor
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-3 py-2">
            {/* ── Company ── */}
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Company Name *</Label><Input value={form.company_name} onChange={e => set('company_name', e.target.value)} placeholder="ABC Plowing Inc." /></div>
              <div><Label>Contact Name *</Label><Input value={form.contact_name} onChange={e => set('contact_name', e.target.value)} placeholder="Jane Smith" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Email *</Label><Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="contact@abcplowing.ca" /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(306) 555-0200" /></div>
            </div>
            <div><Label>Temporary Password *</Label><Input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Min. 8 characters" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Business Number</Label><Input value={form.business_number} onChange={e => set('business_number', e.target.value)} placeholder="BN 123456789" /></div>
              <div><Label>Service Area</Label><Input value={form.service_area_summary} onChange={e => set('service_area_summary', e.target.value)} placeholder="e.g. Saskatoon, Regina" /></div>
            </div>

            {/* ── Address ── */}
            <SectionTitle>Mailing Address</SectionTitle>
            <div><Label>Full Address</Label><Input value={form.mailing_address} onChange={e => set('mailing_address', e.target.value)} placeholder="123 Industrial Dr, Saskatoon, SK S7K 0A1" /></div>

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

            {/* ── Pay ── */}
            <SectionTitle>Payment Terms</SectionTitle>
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
              <div><Label>Rate ($)</Label><Input type="number" step="0.01" value={form.hourly_rate} onChange={e => set('hourly_rate', e.target.value)} placeholder="0.00" /></div>
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
            <div><Label>How did they hear about us?</Label><Input value={form.referral_source} onChange={e => set('referral_source', e.target.value)} placeholder="e.g. Referral from John, Kijiji" /></div>
            <div><Label>Admin Notes</Label><Textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Internal notes..." rows={2} /></div>

            {/* ── Document Attachments ── */}
            <SectionTitle>Document Attachments</SectionTitle>
            <p className="text-xs text-muted-foreground mb-2">Upload driver's license, insurance, WCB, business licence, certificates, or any other documents. Files are saved after the subcontractor is created.</p>
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
            ) : 'Create Subcontractor'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
