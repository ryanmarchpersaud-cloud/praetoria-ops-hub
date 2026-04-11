import { useParams, Link } from 'react-router-dom';
import {
  useSubcontractorById, useSubcontractorDocuments,
  useSubcontractorInvoices, useSubcontractorPayments,
} from '@/hooks/useSubcontractor';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, Building2, ShieldCheck, FileText, Receipt, DollarSign, Briefcase, Pencil, Upload, Plus, Save, Loader2, ClipboardCheck, Ban, ShieldOff, Landmark } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { useState, useRef } from 'react';
import { toast } from 'sonner';

function StatusChip({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    signed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    submitted: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    paid: 'bg-primary/10 text-primary',
    expired: 'bg-destructive/10 text-destructive',
    missing: 'bg-muted text-muted-foreground',
    rejected: 'bg-destructive/10 text-destructive',
    inactive: 'bg-muted text-muted-foreground',
    passed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    failed: 'bg-destructive/10 text-destructive',
    scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${colors[status] || 'bg-muted text-muted-foreground'}`}>{status}</span>;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground text-right max-w-[60%]">{value || '—'}</span>
    </div>
  );
}

const COMPLIANCE_FIELDS = [
  { key: 'insurance', label: 'Insurance', statusKey: 'insurance_status', expiryKey: 'insurance_expiry' },
  { key: 'wcb', label: 'WCB / Workers Comp', statusKey: 'wcb_status', expiryKey: 'wcb_expiry' },
  { key: 'business_license', label: 'Business License', statusKey: 'business_license_status', expiryKey: 'business_license_expiry' },
  { key: 'agreement', label: 'Signed Agreement', statusKey: 'agreement_signed_status', expiryKey: null },
  { key: 'safety', label: 'Safety Documentation', statusKey: 'safety_doc_status', expiryKey: null },
] as const;

const DOC_TYPES = [
  { value: 'insurance', label: 'Insurance Certificate' },
  { value: 'wcb', label: 'WCB / Workers Comp' },
  { value: 'business_license', label: 'Business License' },
  { value: 'agreement', label: 'Signed Agreement' },
  { value: 'safety', label: 'Safety Documentation' },
  { value: 'certificate', label: 'Trade Certificate' },
  { value: 'drivers_license', label: "Driver's License" },
  { value: 'photo_id', label: 'Photo ID' },
  { value: 'other', label: 'Other' },
];

const STATUS_OPTIONS = ['active', 'pending', 'expired', 'missing', 'signed'];

export default function SubcontractorDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: sub, isLoading } = useSubcontractorById(id);
  const { data: docs = [] } = useSubcontractorDocuments(id);
  const { data: invoices = [] } = useSubcontractorInvoices(id);
  const { data: payments = [] } = useSubcontractorPayments(id);

  const { data: assignments = [] } = useQuery({
    queryKey: ['sub_assignments_admin', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from('subcontractor_assignments')
        .select('*, visits(visit_number, visit_status, service_date, properties(property_name))')
        .eq('subcontractor_id', id)
        .order('assigned_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!id,
  });

  // ── Edit Dialog State ──
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, any>>({});

  // ── Compliance Edit State ──
  const [compEditOpen, setCompEditOpen] = useState(false);
  const [compSaving, setCompSaving] = useState(false);
  const [compForm, setCompForm] = useState<Record<string, any>>({});

  // ── Doc Upload State ──
  const [docOpen, setDocOpen] = useState(false);
  const [docUploading, setDocUploading] = useState(false);
  const [docType, setDocType] = useState('');
  const [docName, setDocName] = useState('');
  const [docExpiry, setDocExpiry] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);
  const docFileRef = useRef<HTMLInputElement>(null);

  // ── Assessment State ──
  const [assessOpen, setAssessOpen] = useState(false);
  const [assessSaving, setAssessSaving] = useState(false);
  const [assessType, setAssessType] = useState('');
  const [assessDate, setAssessDate] = useState('');
  const [assessResult, setAssessResult] = useState('');
  const [assessNotes, setAssessNotes] = useState('');

  // ── Block/Unblock State ──
  const [blockOpen, setBlockOpen] = useState(false);
  const [blockSaving, setBlockSaving] = useState(false);
  const [blockReason, setBlockReason] = useState('');

  // Assessment list stored as documents with type "assessment"
  const assessments = docs.filter((d: any) => d.document_type === 'assessment');
  const regularDocs = docs.filter((d: any) => d.document_type !== 'assessment');

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  if (!sub) return <div className="p-8 text-center text-muted-foreground">Subcontractor not found.</div>;

  // ── Edit Handlers ──
  const openEdit = () => {
    setEditForm({
      company_name: sub.company_name || '',
      operating_name: sub.operating_name || '',
      contact_name: sub.contact_name || '',
      email: sub.email || '',
      phone: sub.phone || '',
      mailing_address: sub.mailing_address || '',
      business_number: sub.business_number || '',
      service_area_summary: sub.service_area_summary || '',
      status: sub.status || 'active',
      onboarding_status: sub.onboarding_status || 'pending',
      date_of_birth: sub.date_of_birth || '',
      gender: sub.gender || '',
      ethnicity: sub.ethnicity || '',
      religion: sub.religion || '',
      driver_license_number: sub.driver_license_number || '',
      driver_license_class: sub.driver_license_class || '',
      driver_license_expiry: sub.driver_license_expiry || '',
      sin_encrypted: sub.sin_encrypted || '',
      emergency_contact_name: sub.emergency_contact_name || '',
      emergency_contact_phone: sub.emergency_contact_phone || '',
      emergency_contact_relationship: sub.emergency_contact_relationship || '',
      hourly_rate: sub.hourly_rate ?? '',
      pay_type: sub.pay_type || '',
      pay_schedule: sub.pay_schedule || '',
      referral_source: sub.referral_source || '',
      notes_admin_only: sub.notes_admin_only || '',
      bank_name: sub.bank_name || '',
      bank_institution_number: sub.bank_institution_number || '',
      bank_transit_number: sub.bank_transit_number || '',
      bank_account_number: sub.bank_account_number || '',
      e_transfer_email: sub.e_transfer_email || '',
      preferred_payment_method: sub.preferred_payment_method || 'e-transfer',
    });
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('subcontractors')
        .update({
          ...editForm,
          hourly_rate: editForm.hourly_rate ? Number(editForm.hourly_rate) : null,
          date_of_birth: editForm.date_of_birth || null,
          driver_license_expiry: editForm.driver_license_expiry || null,
        })
        .eq('id', id);
      if (error) throw error;
      toast.success('Subcontractor updated.');
      queryClient.invalidateQueries({ queryKey: ['subcontractor_by_id', id] });
      setEditOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  // ── Block/Unblock Handler ──
  const handleToggleBlock = async () => {
    if (!id) return;
    setBlockSaving(true);
    try {
      const isCurrentlyBlocked = sub.is_blocked;
      const updates: Record<string, any> = {
        is_blocked: !isCurrentlyBlocked,
        blocked_reason: isCurrentlyBlocked ? null : (blockReason || 'Blocked by admin'),
        blocked_at: isCurrentlyBlocked ? null : new Date().toISOString(),
        active_flag: isCurrentlyBlocked ? true : false,
        status: isCurrentlyBlocked ? 'active' : 'inactive',
      };
      const { error } = await supabase.from('subcontractors').update(updates).eq('id', id);
      if (error) throw error;
      toast.success(isCurrentlyBlocked ? 'Subcontractor unblocked.' : 'Subcontractor blocked.');
      queryClient.invalidateQueries({ queryKey: ['subcontractor_by_id', id] });
      setBlockOpen(false);
      setBlockReason('');
    } catch (err: any) {
      toast.error(err.message || 'Action failed.');
    } finally {
      setBlockSaving(false);
    }
  };

  // ── Compliance Handlers ──
  const openCompEdit = () => {
    const f: Record<string, any> = {};
    COMPLIANCE_FIELDS.forEach(c => {
      f[c.statusKey] = (sub as any)[c.statusKey] || 'missing';
      if (c.expiryKey) f[c.expiryKey] = (sub as any)[c.expiryKey] || '';
    });
    setCompForm(f);
    setCompEditOpen(true);
  };

  const handleSaveCompliance = async () => {
    if (!id) return;
    setCompSaving(true);
    try {
      const { error } = await supabase.from('subcontractors').update(compForm).eq('id', id);
      if (error) throw error;
      toast.success('Compliance updated.');
      queryClient.invalidateQueries({ queryKey: ['subcontractor_by_id', id] });
      setCompEditOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Save failed.');
    } finally {
      setCompSaving(false);
    }
  };

  // ── Document Upload ──
  const resetDocForm = () => { setDocType(''); setDocName(''); setDocExpiry(''); setDocFile(null); if (docFileRef.current) docFileRef.current.value = ''; };

  const handleDocUpload = async () => {
    if (!docFile || !docType || !docName || !id) {
      toast.error('Please fill name, type, and select a file.');
      return;
    }
    setDocUploading(true);
    try {
      const ext = docFile.name.split('.').pop();
      const filePath = `${id}/${Date.now()}-${docName.replace(/\s+/g, '_')}.${ext}`;
      const { error: storageErr } = await supabase.storage.from('subcontractor-documents').upload(filePath, docFile);
      if (storageErr) throw storageErr;

      const { data: { publicUrl } } = supabase.storage.from('subcontractor-documents').getPublicUrl(filePath);

      const { error: dbErr } = await supabase.from('subcontractor_documents').insert({
        subcontractor_id: id,
        document_name: docName,
        document_type: docType,
        file_url: publicUrl,
        file_name: docFile.name,
        status: 'pending',
        uploaded_by: user?.id,
        expiry_date: docExpiry || null,
      });
      if (dbErr) throw dbErr;
      toast.success('Document uploaded.');
      queryClient.invalidateQueries({ queryKey: ['subcontractor_documents'] });
      resetDocForm();
      setDocOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Upload failed.');
    } finally {
      setDocUploading(false);
    }
  };

  // ── Assessment ──
  const handleAddAssessment = async () => {
    if (!assessType || !assessDate || !id) {
      toast.error('Please fill assessment type and date.');
      return;
    }
    setAssessSaving(true);
    try {
      const { error } = await supabase.from('subcontractor_documents').insert({
        subcontractor_id: id,
        document_name: assessType,
        document_type: 'assessment',
        file_url: 'n/a',
        file_name: 'assessment-record',
        status: assessResult || 'pending',
        uploaded_by: user?.id,
        expiry_date: assessDate || null,
        notes: assessNotes || null,
      });
      if (error) throw error;
      toast.success('Assessment added.');
      queryClient.invalidateQueries({ queryKey: ['subcontractor_documents'] });
      setAssessType(''); setAssessDate(''); setAssessResult(''); setAssessNotes('');
      setAssessOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to add assessment.');
    } finally {
      setAssessSaving(false);
    }
  };

  const ef = (key: string) => editForm[key] ?? '';
  const setEf = (key: string, val: string) => setEditForm(p => ({ ...p, [key]: val }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/subcontractors" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-foreground truncate">{sub.company_name}</h1>
          <p className="text-sm text-muted-foreground">{sub.contact_name} · {sub.email}</p>
        </div>
        {sub.is_blocked && <Badge variant="destructive" className="gap-1"><Ban className="h-3 w-3" /> Blocked</Badge>}
        <StatusChip status={sub.status} />
        <Button size="sm" variant="outline" className="gap-1.5" onClick={openEdit}>
          <Pencil className="h-3.5 w-3.5" /> Edit
        </Button>
        <Button
          size="sm"
          variant={sub.is_blocked ? 'outline' : 'destructive'}
          className="gap-1.5"
          onClick={() => { if (sub.is_blocked) { handleToggleBlock(); } else { setBlockOpen(true); } }}
        >
          {sub.is_blocked ? <><ShieldOff className="h-3.5 w-3.5" /> Unblock</> : <><Ban className="h-3.5 w-3.5" /> Block</>}
        </Button>
      </div>

      <Tabs defaultValue="company" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="company" className="gap-1.5"><Building2 className="h-3.5 w-3.5" /> Company</TabsTrigger>
          <TabsTrigger value="compliance" className="gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Compliance</TabsTrigger>
          <TabsTrigger value="assessments" className="gap-1.5"><ClipboardCheck className="h-3.5 w-3.5" /> Assessments</TabsTrigger>
          <TabsTrigger value="assignments" className="gap-1.5"><Briefcase className="h-3.5 w-3.5" /> Assignments</TabsTrigger>
          <TabsTrigger value="documents" className="gap-1.5"><FileText className="h-3.5 w-3.5" /> Docs</TabsTrigger>
          <TabsTrigger value="invoices" className="gap-1.5"><Receipt className="h-3.5 w-3.5" /> Invoices</TabsTrigger>
          <TabsTrigger value="payments" className="gap-1.5"><DollarSign className="h-3.5 w-3.5" /> Payments</TabsTrigger>
        </TabsList>

        {/* ── Company Tab ── */}
        <TabsContent value="company">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Company Info</CardTitle></CardHeader>
              <CardContent>
                <InfoRow label="Company Name" value={sub.company_name} />
                <InfoRow label="Operating Name" value={sub.operating_name} />
                <InfoRow label="Contact" value={sub.contact_name} />
                <InfoRow label="Email" value={sub.email} />
                <InfoRow label="Phone" value={sub.phone} />
                <InfoRow label="Address" value={sub.mailing_address} />
                <InfoRow label="Business Number" value={sub.business_number} />
                <InfoRow label="Service Area" value={sub.service_area_summary} />
                <InfoRow label="Status" value={<StatusChip status={sub.status} />} />
                <InfoRow label="Onboarding" value={<StatusChip status={sub.onboarding_status} />} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Personal & Compensation</CardTitle></CardHeader>
              <CardContent>
                <InfoRow label="Date of Birth" value={sub.date_of_birth ? format(new Date(sub.date_of_birth), 'MMM d, yyyy') : null} />
                <InfoRow label="Gender" value={sub.gender} />
                <InfoRow label="Ethnicity" value={sub.ethnicity} />
                <InfoRow label="Religion" value={sub.religion} />
                <InfoRow label="Driver's License #" value={sub.driver_license_number} />
                <InfoRow label="License Class" value={sub.driver_license_class} />
                <InfoRow label="License Expiry" value={sub.driver_license_expiry ? format(new Date(sub.driver_license_expiry), 'MMM d, yyyy') : null} />
                <InfoRow label="SIN" value={sub.sin_encrypted ? '••••••' + sub.sin_encrypted.slice(-3) : null} />
                <InfoRow label="Pay Type" value={sub.pay_type} />
                <InfoRow label="Hourly Rate" value={sub.hourly_rate ? `$${Number(sub.hourly_rate).toFixed(2)}` : null} />
                <InfoRow label="Pay Schedule" value={sub.pay_schedule} />
                <InfoRow label="Referral Source" value={sub.referral_source} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Landmark className="h-4 w-4" /> Banking Information</CardTitle></CardHeader>
              <CardContent>
                <InfoRow label="Preferred Payment" value={sub.preferred_payment_method} />
                <InfoRow label="E-Transfer Email" value={sub.e_transfer_email} />
                <InfoRow label="Bank Name" value={sub.bank_name} />
                <InfoRow label="Institution #" value={sub.bank_institution_number} />
                <InfoRow label="Transit #" value={sub.bank_transit_number} />
                <InfoRow label="Account #" value={sub.bank_account_number ? '••••' + sub.bank_account_number.slice(-4) : null} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Emergency Contact</CardTitle></CardHeader>
              <CardContent>
                <InfoRow label="Name" value={sub.emergency_contact_name} />
                <InfoRow label="Phone" value={sub.emergency_contact_phone} />
                <InfoRow label="Relationship" value={sub.emergency_contact_relationship} />
              </CardContent>
            </Card>
            {sub.notes_admin_only && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Admin Notes</CardTitle></CardHeader>
                <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{sub.notes_admin_only}</p></CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ── Compliance Tab ── */}
        <TabsContent value="compliance">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Compliance Status</CardTitle>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={openCompEdit}>
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
            </CardHeader>
            <CardContent className="p-4">
              {COMPLIANCE_FIELDS.map(item => (
                <div key={item.key} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm text-foreground">{item.label}</p>
                    {item.expiryKey && (sub as any)[item.expiryKey] && (
                      <p className="text-[10px] text-muted-foreground">Expires: {format(new Date((sub as any)[item.expiryKey]), 'MMM d, yyyy')}</p>
                    )}
                  </div>
                  <StatusChip status={(sub as any)[item.statusKey]} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Assessments Tab ── */}
        <TabsContent value="assessments">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Assessments ({assessments.length})</CardTitle>
              <Dialog open={assessOpen} onOpenChange={setAssessOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Add Assessment</Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader><DialogTitle>Add Assessment</DialogTitle></DialogHeader>
                  <div className="space-y-3 pt-2">
                    <div className="space-y-1.5">
                      <Label>Assessment Type *</Label>
                      <Select value={assessType} onValueChange={setAssessType}>
                        <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Safety Orientation">Safety Orientation</SelectItem>
                          <SelectItem value="Skills Assessment">Skills Assessment</SelectItem>
                          <SelectItem value="Equipment Competency">Equipment Competency</SelectItem>
                          <SelectItem value="Site Inspection">Site Inspection</SelectItem>
                          <SelectItem value="Performance Review">Performance Review</SelectItem>
                          <SelectItem value="Drug & Alcohol Test">Drug & Alcohol Test</SelectItem>
                          <SelectItem value="Background Check">Background Check</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Date *</Label>
                      <Input type="date" value={assessDate} onChange={e => setAssessDate(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Result</Label>
                      <Select value={assessResult} onValueChange={setAssessResult}>
                        <SelectTrigger><SelectValue placeholder="Select result..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="passed">Passed</SelectItem>
                          <SelectItem value="failed">Failed</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="scheduled">Scheduled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Notes</Label>
                      <Textarea value={assessNotes} onChange={e => setAssessNotes(e.target.value)} placeholder="Optional notes..." rows={3} />
                    </div>
                    <Button onClick={handleAddAssessment} disabled={assessSaving} className="w-full gap-2">
                      {assessSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      {assessSaving ? 'Saving...' : 'Add Assessment'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="p-0">
              {assessments.length === 0 ? <p className="p-4 text-sm text-muted-foreground">No assessments recorded.</p> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Date</TableHead><TableHead>Result</TableHead><TableHead>Notes</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {assessments.map((a: any) => (
                      <TableRow key={a.id}>
                        <TableCell className="text-sm font-medium">{a.document_name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{a.expiry_date ? format(new Date(a.expiry_date), 'MMM d, yyyy') : '—'}</TableCell>
                        <TableCell><StatusChip status={a.status} /></TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{a.notes || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Assignments Tab ── */}
        <TabsContent value="assignments">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Assignments ({assignments.length})</CardTitle></CardHeader>
            <CardContent className="p-0">
              {assignments.length === 0 ? <p className="p-4 text-sm text-muted-foreground">No assignments.</p> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Visit</TableHead><TableHead>Property</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {assignments.map((a: any) => (
                      <TableRow key={a.id}>
                        <TableCell className="text-sm font-medium">{a.visits?.visit_number || '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{a.visits?.properties?.property_name || '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{a.visits?.service_date ? format(new Date(a.visits.service_date), 'MMM d, yyyy') : '—'}</TableCell>
                        <TableCell><StatusChip status={a.assignment_status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Documents Tab ── */}
        <TabsContent value="documents">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Documents ({regularDocs.length})</CardTitle>
              <Dialog open={docOpen} onOpenChange={(v) => { setDocOpen(v); if (!v) resetDocForm(); }}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1.5"><Upload className="h-3.5 w-3.5" /> Upload</Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
                  <div className="space-y-3 pt-2">
                    <div className="space-y-1.5">
                      <Label>Document Type *</Label>
                      <Select value={docType} onValueChange={setDocType}>
                        <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                        <SelectContent>
                          {DOC_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Document Name *</Label>
                      <Input placeholder="e.g. 2025 Liability Insurance" value={docName} onChange={e => setDocName(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Expiry Date</Label>
                      <Input type="date" value={docExpiry} onChange={e => setDocExpiry(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>File *</Label>
                      <Input ref={docFileRef} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp" onChange={e => setDocFile(e.target.files?.[0] || null)} />
                      {docFile && <p className="text-xs text-muted-foreground">{docFile.name} ({(docFile.size / 1024).toFixed(0)} KB)</p>}
                    </div>
                    <Button onClick={handleDocUpload} disabled={docUploading} className="w-full gap-2">
                      {docUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {docUploading ? 'Uploading...' : 'Upload Document'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="p-0">
              {regularDocs.length === 0 ? <p className="p-4 text-sm text-muted-foreground">No documents.</p> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {regularDocs.map((d: any) => (
                      <TableRow key={d.id}>
                        <TableCell className="text-sm font-medium">
                          {d.file_url && d.file_url !== 'n/a' ? (
                            <a href={d.file_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{d.document_name}</a>
                          ) : d.document_name}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground capitalize">{d.document_type}</TableCell>
                        <TableCell><StatusChip status={d.status} /></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{format(new Date(d.created_at), 'MMM d, yyyy')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Invoices Tab ── */}
        <TabsContent value="invoices">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Invoices ({invoices.length})</CardTitle></CardHeader>
            <CardContent className="p-0">
              {invoices.length === 0 ? <p className="p-4 text-sm text-muted-foreground">No invoices.</p> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Invoice #</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {invoices.map((inv: any) => (
                      <TableRow key={inv.id}>
                        <TableCell className="text-sm font-medium">{inv.invoice_number}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{format(new Date(inv.invoice_date), 'MMM d, yyyy')}</TableCell>
                        <TableCell className="text-sm text-right">${Number(inv.amount).toFixed(2)}</TableCell>
                        <TableCell><StatusChip status={inv.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Payments Tab ── */}
        <TabsContent value="payments">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Payments ({payments.length})</CardTitle></CardHeader>
            <CardContent className="p-0">
              {payments.length === 0 ? <p className="p-4 text-sm text-muted-foreground">No payments.</p> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Date</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Method</TableHead><TableHead>Reference</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {payments.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-sm">{p.payment_date ? format(new Date(p.payment_date), 'MMM d, yyyy') : '—'}</TableCell>
                        <TableCell className="text-sm text-right font-medium">${Number(p.amount).toFixed(2)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p.payment_method || '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground font-mono">{p.reference_number || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── EDIT SUBCONTRACTOR DIALOG ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Subcontractor</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-1.5">
              <Label>Company Name *</Label>
              <Input value={ef('company_name')} onChange={e => setEf('company_name', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Operating Name</Label>
              <Input value={ef('operating_name')} onChange={e => setEf('operating_name', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Contact Name *</Label>
              <Input value={ef('contact_name')} onChange={e => setEf('contact_name', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={ef('email')} onChange={e => setEf('email', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={ef('phone')} onChange={e => setEf('phone', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Input value={ef('mailing_address')} onChange={e => setEf('mailing_address', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Business Number</Label>
              <Input value={ef('business_number')} onChange={e => setEf('business_number', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Service Area</Label>
              <Input value={ef('service_area_summary')} onChange={e => setEf('service_area_summary', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={ef('status')} onValueChange={v => setEf('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Onboarding Status</Label>
              <Select value={ef('onboarding_status')} onValueChange={v => setEf('onboarding_status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="complete">Complete</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-full border-t border-border pt-3 mt-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Personal Details</p>
            </div>
            <div className="space-y-1.5">
              <Label>Date of Birth</Label>
              <Input type="date" value={ef('date_of_birth')} onChange={e => setEf('date_of_birth', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Gender</Label>
              <Select value={ef('gender')} onValueChange={v => setEf('gender', v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="non_binary">Non-Binary</SelectItem>
                  <SelectItem value="prefer_not_to_say">Prefer Not to Say</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Ethnicity</Label>
              <Input value={ef('ethnicity')} onChange={e => setEf('ethnicity', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Religion</Label>
              <Input value={ef('religion')} onChange={e => setEf('religion', e.target.value)} />
            </div>

            <div className="col-span-full border-t border-border pt-3 mt-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Driver's License & ID</p>
            </div>
            <div className="space-y-1.5">
              <Label>License Number</Label>
              <Input value={ef('driver_license_number')} onChange={e => setEf('driver_license_number', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>License Class</Label>
              <Input value={ef('driver_license_class')} onChange={e => setEf('driver_license_class', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>License Expiry</Label>
              <Input type="date" value={ef('driver_license_expiry')} onChange={e => setEf('driver_license_expiry', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>SIN (encrypted)</Label>
              <Input value={ef('sin_encrypted')} onChange={e => setEf('sin_encrypted', e.target.value)} placeholder="•••••••••" />
            </div>

            <div className="col-span-full border-t border-border pt-3 mt-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Emergency Contact</p>
            </div>
            <div className="space-y-1.5">
              <Label>Contact Name</Label>
              <Input value={ef('emergency_contact_name')} onChange={e => setEf('emergency_contact_name', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Contact Phone</Label>
              <Input value={ef('emergency_contact_phone')} onChange={e => setEf('emergency_contact_phone', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Relationship</Label>
              <Input value={ef('emergency_contact_relationship')} onChange={e => setEf('emergency_contact_relationship', e.target.value)} />
            </div>

            <div className="col-span-full border-t border-border pt-3 mt-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Compensation</p>
            </div>
            <div className="space-y-1.5">
              <Label>Pay Type</Label>
              <Select value={ef('pay_type')} onValueChange={v => setEf('pay_type', v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="per_visit">Per Visit</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Hourly Rate ($)</Label>
              <Input type="number" step="0.01" value={ef('hourly_rate')} onChange={e => setEf('hourly_rate', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Pay Schedule</Label>
              <Select value={ef('pay_schedule')} onValueChange={v => setEf('pay_schedule', v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="bi_weekly">Bi-Weekly</SelectItem>
                  <SelectItem value="semi_monthly">Semi-Monthly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Referral Source</Label>
              <Input value={ef('referral_source')} onChange={e => setEf('referral_source', e.target.value)} />
            </div>

            <div className="col-span-full border-t border-border pt-3 mt-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Banking Information</p>
            </div>
            <div className="space-y-1.5">
              <Label>Preferred Payment Method</Label>
              <Select value={ef('preferred_payment_method')} onValueChange={v => setEf('preferred_payment_method', v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="e-transfer">E-Transfer</SelectItem>
                  <SelectItem value="direct-deposit">Direct Deposit</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="wire">Wire Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>E-Transfer Email</Label>
              <Input type="email" value={ef('e_transfer_email')} onChange={e => setEf('e_transfer_email', e.target.value)} placeholder="payments@company.ca" />
            </div>
            <div className="space-y-1.5">
              <Label>Bank Name</Label>
              <Input value={ef('bank_name')} onChange={e => setEf('bank_name', e.target.value)} placeholder="e.g. TD Bank" />
            </div>
            <div className="space-y-1.5">
              <Label>Institution #</Label>
              <Input value={ef('bank_institution_number')} onChange={e => setEf('bank_institution_number', e.target.value)} placeholder="3 digits" />
            </div>
            <div className="space-y-1.5">
              <Label>Transit #</Label>
              <Input value={ef('bank_transit_number')} onChange={e => setEf('bank_transit_number', e.target.value)} placeholder="5 digits" />
            </div>
            <div className="space-y-1.5">
              <Label>Account #</Label>
              <Input value={ef('bank_account_number')} onChange={e => setEf('bank_account_number', e.target.value)} placeholder="Account number" />
            </div>

            <div className="col-span-full space-y-1.5">
              <Label>Admin Notes</Label>
              <Textarea value={ef('notes_admin_only')} onChange={e => setEf('notes_admin_only', e.target.value)} rows={3} />
            </div>

            <div className="col-span-full pt-2">
              <Button onClick={handleSaveEdit} disabled={saving} className="w-full gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── COMPLIANCE EDIT DIALOG ── */}
      <Dialog open={compEditOpen} onOpenChange={setCompEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Compliance Status</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            {COMPLIANCE_FIELDS.map(c => (
              <div key={c.key} className="space-y-2 pb-3 border-b border-border last:border-0">
                <p className="text-sm font-medium text-foreground">{c.label}</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Status</Label>
                    <Select value={compForm[c.statusKey] || 'missing'} onValueChange={v => setCompForm(p => ({ ...p, [c.statusKey]: v }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {c.expiryKey && (
                    <div className="space-y-1">
                      <Label className="text-xs">Expiry</Label>
                      <Input type="date" className="h-8 text-xs" value={compForm[c.expiryKey] || ''} onChange={e => setCompForm(p => ({ ...p, [c.expiryKey!]: e.target.value }))} />
                    </div>
                  )}
                </div>
              </div>
            ))}
            <Button onClick={handleSaveCompliance} disabled={compSaving} className="w-full gap-2">
              {compSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {compSaving ? 'Saving...' : 'Save Compliance'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── BLOCK CONFIRMATION DIALOG ── */}
      <Dialog open={blockOpen} onOpenChange={setBlockOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-destructive"><Ban className="h-5 w-5" /> Block Subcontractor</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This will deactivate <strong>{sub.company_name}</strong> and prevent them from accessing the portal. You can unblock them later.</p>
          <div className="space-y-1.5 pt-2">
            <Label>Reason for blocking</Label>
            <Textarea value={blockReason} onChange={e => setBlockReason(e.target.value)} placeholder="e.g. Repeated no-shows, safety violations..." rows={3} />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setBlockOpen(false)}>Cancel</Button>
            <Button variant="destructive" className="flex-1 gap-1.5" onClick={handleToggleBlock} disabled={blockSaving}>
              {blockSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
              {blockSaving ? 'Blocking...' : 'Block'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
