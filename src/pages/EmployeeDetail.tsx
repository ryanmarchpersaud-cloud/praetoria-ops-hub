import { useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  useEmployee, useEmployeeCertifications, useEmployeeDocuments,
  useEmployeePayStubs, useEmployeeTimeOff, useEmployeeEmergencyContacts,
  useEmployeeEquipment, useIssueEquipment, useUpdateEquipment,
  useEmployeeTrainingRecords, useAssignTraining, useApproveCertificate,
} from '@/hooks/useEmployees';
import { useBenefitEnrollments, useUpsertEnrollment, useInsuranceProviders } from '@/hooks/useHRModules';
import { useActionPermissions } from '@/hooks/useActionPermissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { ArrowLeft, User, Briefcase, Award, FileText, DollarSign, Heart, CalendarDays, UserCheck, MapPin, HardHat, Plus, BookOpen, CheckCircle2, XCircle, RotateCcw, Ban, ShieldOff, Landmark, Loader2, Pencil, Send, ClipboardCheck } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { callEdgeFunction } from '@/lib/edgeFunctionClient';
import { useQueryClient } from '@tanstack/react-query';
import PayStubDetailDialog from '@/components/PayStubDetailDialog';

/* ── Predefined PPE / Safety item suggestions ── */
const PPE_SUGGESTIONS = [
  // Winter gear
  { name: 'Winter Gloves (Insulated)', type: 'ppe' },
  { name: 'Winter Toque / Beanie', type: 'ppe' },
  { name: 'Winter Balaclava / Face Mask', type: 'ppe' },
  { name: 'Winter Safety Cleats (Traction)', type: 'ppe' },
  { name: 'Insulated Winter Coveralls', type: 'ppe' },
  { name: 'Heated Vest / Liner', type: 'ppe' },
  // General PPE
  { name: 'Safety Vest (Hi-Vis Orange)', type: 'ppe' },
  { name: 'Safety Vest (Hi-Vis Yellow)', type: 'ppe' },
  { name: 'Hard Hat', type: 'ppe' },
  { name: 'Safety Glasses (Clear)', type: 'ppe' },
  { name: 'Safety Glasses (Tinted)', type: 'ppe' },
  { name: 'Safety Goggles (Splash-Proof)', type: 'ppe' },
  { name: 'Steel-Toe Boots', type: 'ppe' },
  { name: 'Steel-Toe Rubber Boots', type: 'ppe' },
  { name: 'Work Gloves (Leather)', type: 'ppe' },
  { name: 'Cut-Resistant Gloves', type: 'ppe' },
  { name: 'Nitrile Disposable Gloves (Box)', type: 'ppe' },
  { name: 'Hearing Protection (Earmuffs)', type: 'ppe' },
  { name: 'Hearing Protection (Ear Plugs)', type: 'ppe' },
  { name: 'Dust Mask / N95 Respirator', type: 'ppe' },
  { name: 'Half-Face Respirator', type: 'ppe' },
  { name: 'Full-Face Respirator', type: 'ppe' },
  { name: 'Fall Arrest Harness', type: 'ppe' },
  { name: 'Lanyard (Shock-Absorbing)', type: 'ppe' },
  { name: 'Rain Jacket (Hi-Vis)', type: 'ppe' },
  { name: 'Rain Pants', type: 'ppe' },
  { name: 'Knee Pads', type: 'ppe' },
  { name: 'Face Shield', type: 'ppe' },
  { name: 'Welding Helmet', type: 'ppe' },
  { name: 'Fire-Resistant Coveralls', type: 'ppe' },
  { name: 'First Aid Kit (Personal)', type: 'ppe' },
  { name: 'Sun Hat / Wide Brim', type: 'ppe' },
  { name: 'Sunscreen (SPF 50)', type: 'ppe' },
  { name: 'Insect Repellent', type: 'ppe' },
  // Vehicle / tools
  { name: 'Amber/Orange Flashing Light (Vehicle)', type: 'device' },
  { name: 'LED Warning Light Bar', type: 'device' },
  { name: 'Reflective Traffic Cones (Set)', type: 'tool' },
  { name: 'Headlamp / Flashlight', type: 'tool' },
  { name: 'Two-Way Radio', type: 'device' },
  { name: 'Company Smartphone', type: 'device' },
  { name: 'Tablet (Field Use)', type: 'device' },
  { name: 'GPS Tracker (Vehicle)', type: 'device' },
  { name: 'Snow Shovel (Ergonomic)', type: 'tool' },
  { name: 'Ice Scraper / Chipper', type: 'tool' },
  { name: 'Salt / Sand Spreader (Hand)', type: 'tool' },
  { name: 'Backpack Blower', type: 'tool' },
  { name: 'Snow Blower', type: 'tool' },
];

const PLAN_TYPES = ['Health', 'Dental', 'Vision', 'Life / Disability', 'Group Benefits', 'Other'];
const CHANGE_TYPES = ['new_enrollment', 'life_event', 'plan_change', 'termination'];
const ENROLLMENT_STATUSES = ['active', 'pending', 'terminated', 'on_hold'];

function EmployeeBenefitsTab({ userId, canManage }: { userId: string; canManage: boolean }) {
  const { data: allEnrollments = [] } = useBenefitEnrollments();
  const { data: providers = [] } = useInsuranceProviders();
  const upsertEnrollment = useUpsertEnrollment();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});

  const enrollments = allEnrollments.filter((e: any) => e.employee_user_id === userId);

  const openNew = () => {
    setForm({
      employee_user_id: userId,
      enrollment_status: 'active',
      change_type: 'new_enrollment',
      plan_type: '',
      provider_id: '',
      effective_date: '',
      dependent_count: 0,
      notes: '',
      change_reason: '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const payload = { ...form };
      if (!payload.provider_id) delete payload.provider_id;
      if (!payload.effective_date) delete payload.effective_date;
      await upsertEnrollment.mutateAsync(payload);
      setDialogOpen(false);
    } catch (err: any) {
      // error handled by hook
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Benefit Enrollments ({enrollments.length})</h3>
        {canManage && (
          <Button size="sm" onClick={openNew}><Plus className="h-3.5 w-3.5 mr-1" /> Enroll in Benefits</Button>
        )}
      </div>

      {enrollments.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            No benefit enrollments yet.{canManage ? ' Click "Enroll in Benefits" to add one.' : ''}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {enrollments.map((enr: any) => (
            <Card key={enr.id}>
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{enr.plan_type || 'Benefit Plan'}</span>
                  <StatusChip status={enr.enrollment_status} />
                </div>
                <div className="grid grid-cols-2 gap-x-4 text-sm text-muted-foreground">
                  <span>Provider: {enr.hr_insurance_providers?.provider_name || '—'}</span>
                  <span>Change: <span className="capitalize">{enr.change_type?.replace(/_/g, ' ')}</span></span>
                  <span>Effective: {enr.effective_date ? format(new Date(enr.effective_date), 'MMM d, yyyy') : '—'}</span>
                  <span>Dependents: {enr.dependent_count ?? 0}</span>
                </div>
                {enr.notes && <p className="text-xs text-muted-foreground mt-1">{enr.notes}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Enroll in Benefits</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Plan Type</Label>
              <Select value={form.plan_type || ''} onValueChange={v => setForm({ ...form, plan_type: v })}>
                <SelectTrigger><SelectValue placeholder="Select plan type" /></SelectTrigger>
                <SelectContent>{PLAN_TYPES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Provider</Label>
              <Select value={form.provider_id || ''} onValueChange={v => setForm({ ...form, provider_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select provider" /></SelectTrigger>
                <SelectContent>
                  {providers.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.provider_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Change Type</Label>
                <Select value={form.change_type || 'new_enrollment'} onValueChange={v => setForm({ ...form, change_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CHANGE_TYPES.map(c => <SelectItem key={c} value={c} className="capitalize">{c.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.enrollment_status || 'active'} onValueChange={v => setForm({ ...form, enrollment_status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ENROLLMENT_STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Effective Date</Label><Input type="date" value={form.effective_date || ''} onChange={e => setForm({ ...form, effective_date: e.target.value })} /></div>
              <div><Label>Dependents</Label><Input type="number" min={0} value={form.dependent_count ?? 0} onChange={e => setForm({ ...form, dependent_count: parseInt(e.target.value) || 0 })} /></div>
            </div>
            <div><Label>Change Reason</Label><Input value={form.change_reason || ''} onChange={e => setForm({ ...form, change_reason: e.target.value })} placeholder="e.g. New hire, marriage, etc." /></div>
            <div><Label>Notes</Label><Textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
            <Button className="w-full" onClick={handleSave} disabled={upsertEnrollment.isPending}>
              {upsertEnrollment.isPending ? 'Saving...' : 'Save Enrollment'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    valid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    good: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    inactive: 'bg-muted text-muted-foreground',
    returned: 'bg-muted text-muted-foreground',
    expired: 'bg-destructive/10 text-destructive',
    damaged: 'bg-destructive/10 text-destructive',
    revoked: 'bg-destructive/10 text-destructive',
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    fair: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    denied: 'bg-destructive/10 text-destructive',
    'on-leave': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    'not-enrolled': 'bg-muted text-muted-foreground',
    terminated: 'bg-destructive/10 text-destructive',
    on_hold: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${colors[status] || colors.inactive}`}>{status}</span>;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">{value || '—'}</span>
    </div>
  );
}

export default function EmployeeDetail() {
  const { id: userId } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { canManageWorkerAdmin: canManageWorkers } = useActionPermissions();
  const { data: emp, isLoading } = useEmployee(userId);
  const { data: certs = [] } = useEmployeeCertifications(userId);
  const { data: docs = [] } = useEmployeeDocuments(userId);
  const { data: payStubs = [] } = useEmployeePayStubs(userId);
  const { data: timeOff = [] } = useEmployeeTimeOff(userId);
  const { data: contacts = [] } = useEmployeeEmergencyContacts(userId);
  const { data: equipment = [] } = useEmployeeEquipment(userId);
  const { data: trainingRecords = [] } = useEmployeeTrainingRecords(userId);
  const issueEquipment = useIssueEquipment();
  const updateEquipment = useUpdateEquipment();
  const assignTraining = useAssignTraining();
  const approveCert = useApproveCertificate();
  const [showIssueDialog, setShowIssueDialog] = useState(false);
  const [showTrainingDialog, setShowTrainingDialog] = useState(false);
  const queryClient = useQueryClient();
  const [blockOpen, setBlockOpen] = useState(false);
  const [blockSaving, setBlockSaving] = useState(false);
  const [blockReason, setBlockReason] = useState('');
   const [editOpen, setEditOpen] = useState(false);
   const [editSaving, setEditSaving] = useState(false);
   const [showDocUpload, setShowDocUpload] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [editEquipOpen, setEditEquipOpen] = useState(false);
  const [editEquipItem, setEditEquipItem] = useState<any>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteSending, setInviteSending] = useState(false);
  const [selectedPayStub, setSelectedPayStub] = useState<any>(null);
  // Password is always "praetoria" — handled server-side

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  if (!emp) return <div className="p-8 text-center text-muted-foreground">Employee not found.</div>;

  const openEditDialog = () => {
    setEditForm({
      full_name: emp.full_name || '',
      employee_id: emp.employee_id || '',
      work_email: emp.work_email || '',
      phone: emp.phone || '',
      role_title: emp.role_title || '',
      team: emp.team || '',
      branch_location: emp.branch_location || '',
      primary_service_category: emp.primary_service_category || '',
      secondary_service_category: emp.secondary_service_category || '',
      employment_type: emp.employment_type || '',
      hire_date: emp.hire_date || '',
      supervisor_name: emp.supervisor_name || '',
      manager_name: emp.manager_name || '',
      pay_type: emp.pay_type || '',
      hourly_rate: emp.hourly_rate ?? '',
      driver_license_class: emp.driver_license_class || '',
      driver_license_expiry: emp.driver_license_expiry || '',
      date_of_birth: emp.date_of_birth || '',
      gender: emp.gender || '',
      ethnicity: emp.ethnicity || '',
      religion: emp.religion || '',
      sin_encrypted: emp.sin_encrypted || '',
      bank_name: emp.bank_name || '',
      bank_institution_number: emp.bank_institution_number || '',
      bank_transit_number: emp.bank_transit_number || '',
      bank_account_number: emp.bank_account_number || '',
      e_transfer_email: emp.e_transfer_email || '',
      preferred_payment_method: emp.preferred_payment_method || 'e-transfer',
    });
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!userId) return;
    setEditSaving(true);
    try {
      const { error } = await supabase.from('worker_profiles').update({
        ...editForm,
        hourly_rate: editForm.hourly_rate ? Number(editForm.hourly_rate) : null,
        date_of_birth: editForm.date_of_birth || null,
        driver_license_expiry: editForm.driver_license_expiry || null,
        hire_date: editForm.hire_date || null,
        employee_id: editForm.employee_id || null,
      }).eq('user_id', userId);
      if (error) throw error;
      toast({ title: 'Employee updated successfully.' });
      queryClient.invalidateQueries({ queryKey: ['employee'] });
      setEditOpen(false);
    } catch (err: any) {
      toast({ title: err.message || 'Save failed.', variant: 'destructive' });
    } finally {
      setEditSaving(false);
    }
  };

  const handleMarkReturned = (item: any) => {
    updateEquipment.mutate({ id: item.id, user_id: item.user_id, condition: 'returned', return_date: new Date().toISOString().split('T')[0] }, {
      onSuccess: () => toast({ title: 'Marked as returned' }),
    });
  };

  const handleApproveCert = (cert: any, status: 'valid' | 'revoked') => {
    approveCert.mutate({ id: cert.id, status, user_id: cert.user_id }, {
      onSuccess: () => toast({ title: `Certificate ${status === 'valid' ? 'approved' : 'revoked'}` }),
    });
  };

  const openEditEquipment = (item: any) => {
    setEditEquipItem({ ...item });
    setEditEquipOpen(true);
  };

  const handleSaveEquipment = async () => {
    if (!editEquipItem) return;
    const { error } = await supabase.from('worker_equipment_items').update({
      item_name: editEquipItem.item_name,
      item_type: editEquipItem.item_type,
      serial_number: editEquipItem.serial_number || null,
      condition: editEquipItem.condition,
      notes: editEquipItem.notes || null,
      replacement_requested: editEquipItem.replacement_requested ?? false,
    }).eq('id', editEquipItem.id);
    if (error) {
      toast({ title: 'Failed to update equipment', variant: 'destructive' });
    } else {
      toast({ title: 'Equipment updated' });
      queryClient.invalidateQueries({ queryKey: ['employee_equipment'] });
      setEditEquipOpen(false);
    }
  };

  const handleToggleBlock = async () => {
    if (!userId) return;
    setBlockSaving(true);
    try {
      const isCurrentlyBlocked = emp.is_blocked;
      const updates: Record<string, any> = {
        is_blocked: !isCurrentlyBlocked,
        blocked_reason: isCurrentlyBlocked ? null : (blockReason || 'Blocked by admin'),
        blocked_at: isCurrentlyBlocked ? null : new Date().toISOString(),
        employment_status: isCurrentlyBlocked ? 'active' : 'inactive',
      };
      const { error } = await supabase.from('worker_profiles').update(updates).eq('user_id', userId);
      if (error) throw error;
      toast({ title: isCurrentlyBlocked ? 'Employee unblocked.' : 'Employee blocked.' });
      queryClient.invalidateQueries({ queryKey: ['employee'] });
      setBlockOpen(false);
      setBlockReason('');
    } catch (err: any) {
      toast({ title: err.message || 'Action failed.', variant: 'destructive' });
    } finally {
      setBlockSaving(false);
    }
  };

  const ef = (field: string) => editForm[field] ?? '';
  const setEf = (field: string, val: any) => setEditForm(prev => ({ ...prev, [field]: val }));

  const handleSendInvite = async () => {
    if (!userId) return;
    setInviteSending(true);
    try {
      const result = await callEdgeFunction('send-portal-invite', {
        portal_type: 'worker',
        user_id: userId,
      });
      if (result?.error) throw new Error(result.error);
      toast({ title: result.message || 'Invite sent successfully!' });
      setInviteOpen(false);
    } catch (err: any) {
      toast({ title: err.message || 'Failed to send invite', variant: 'destructive' });
    } finally {
      setInviteSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/employees" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-foreground truncate">{emp.full_name || 'Employee'}</h1>
          <p className="text-sm text-muted-foreground">{emp.role_title || 'No role'} · {emp.employee_id || 'No ID'}</p>
        </div>
        {emp.is_blocked && <Badge variant="destructive" className="gap-1"><Ban className="h-3 w-3" /> Blocked</Badge>}
        <StatusChip status={emp.employment_status} />
        {canManageWorkers && (
          <>
            <Button size="sm" variant="default" className="gap-1.5" onClick={() => setInviteOpen(true)}>
              <Send className="h-3.5 w-3.5" /> Send Invite
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={openEditDialog}>
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Button>
            <Button
              size="sm"
              variant={emp.is_blocked ? 'outline' : 'destructive'}
              className="gap-1.5"
              onClick={() => { if (emp.is_blocked) { handleToggleBlock(); } else { setBlockOpen(true); } }}
            >
              {emp.is_blocked ? <><ShieldOff className="h-3.5 w-3.5" /> Unblock</> : <><Ban className="h-3.5 w-3.5" /> Block</>}
            </Button>
          </>
        )}
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="profile" className="gap-1.5"><User className="h-3.5 w-3.5" /> Profile</TabsTrigger>
          <TabsTrigger value="employment" className="gap-1.5"><Briefcase className="h-3.5 w-3.5" /> Employment</TabsTrigger>
          <TabsTrigger value="training" className="gap-1.5"><Award className="h-3.5 w-3.5" /> Training</TabsTrigger>
          <TabsTrigger value="documents" className="gap-1.5"><FileText className="h-3.5 w-3.5" /> Docs</TabsTrigger>
          <TabsTrigger value="payroll" className="gap-1.5"><DollarSign className="h-3.5 w-3.5" /> Payroll</TabsTrigger>
          <TabsTrigger value="benefits" className="gap-1.5"><Heart className="h-3.5 w-3.5" /> Benefits</TabsTrigger>
          <TabsTrigger value="timeoff" className="gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> Time Off</TabsTrigger>
          <TabsTrigger value="emergency" className="gap-1.5"><UserCheck className="h-3.5 w-3.5" /> Emergency</TabsTrigger>
          <TabsTrigger value="equipment" className="gap-1.5"><HardHat className="h-3.5 w-3.5" /> Equipment</TabsTrigger>
          <TabsTrigger value="visits" className="gap-1.5"><ClipboardCheck className="h-3.5 w-3.5" /> Visits</TabsTrigger>
        </TabsList>

        {/* Profile */}
        <TabsContent value="profile">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><User className="h-4 w-4" /> Personal Info</CardTitle></CardHeader>
              <CardContent>
                <InfoRow label="Full Name" value={emp.full_name} />
                <InfoRow label="Employee ID" value={emp.employee_id} />
                <InfoRow label="Work Email" value={emp.work_email} />
                <InfoRow label="Phone" value={emp.phone} />
                <InfoRow label="Date of Birth" value={emp.date_of_birth ? format(new Date(emp.date_of_birth), 'MMM d, yyyy') : null} />
                <InfoRow label="Gender" value={emp.gender} />
                <InfoRow label="Ethnicity" value={emp.ethnicity} />
                <InfoRow label="Religion" value={emp.religion} />
                <InfoRow label="SIN" value={emp.sin_encrypted ? '•••-•••-•••' : null} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><MapPin className="h-4 w-4" /> Role & Location</CardTitle></CardHeader>
              <CardContent>
                <InfoRow label="Role Title" value={emp.role_title} />
                <InfoRow label="Team" value={emp.team} />
                <InfoRow label="Branch" value={emp.branch_location} />
                <InfoRow label="Primary Service" value={emp.primary_service_category} />
                <InfoRow label="Secondary Service" value={emp.secondary_service_category} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Employment */}
        <TabsContent value="employment">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Employment Details</CardTitle></CardHeader>
              <CardContent>
                <InfoRow label="Status" value={<StatusChip status={emp.employment_status} />} />
                <InfoRow label="Type" value={emp.employment_type} />
                <InfoRow label="Hire Date" value={emp.hire_date ? format(new Date(emp.hire_date), 'MMM d, yyyy') : null} />
                <InfoRow label="Supervisor" value={emp.supervisor_name} />
                <InfoRow label="Manager" value={emp.manager_name} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Compensation</CardTitle></CardHeader>
              <CardContent>
                <InfoRow label="Pay Type" value={emp.pay_type} />
                <InfoRow label="Hourly Rate" value={emp.hourly_rate != null ? `$${Number(emp.hourly_rate).toFixed(2)}/hr` : null} />
                <InfoRow label="Equipment" value={emp.equipment_permissions?.length ? emp.equipment_permissions.join(', ') : '—'} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Landmark className="h-4 w-4" /> Banking Information</CardTitle></CardHeader>
              <CardContent>
                <InfoRow label="Preferred Payment" value={emp.preferred_payment_method} />
                <InfoRow label="E-Transfer Email" value={emp.e_transfer_email} />
                <InfoRow label="Bank Name" value={emp.bank_name} />
                <InfoRow label="Institution #" value={emp.bank_institution_number} />
                <InfoRow label="Transit #" value={emp.bank_transit_number} />
                <InfoRow label="Account #" value={emp.bank_account_number ? '••••' + emp.bank_account_number.slice(-4) : null} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Training & Certifications */}
        <TabsContent value="training">
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Driver's License</CardTitle></CardHeader>
              <CardContent>
                <InfoRow label="Class" value={emp.driver_license_class} />
                <InfoRow label="Expiry" value={emp.driver_license_expiry ? format(new Date(emp.driver_license_expiry), 'MMM d, yyyy') : null} />
                <InfoRow label="Verified" value={emp.license_verified ? 'Yes' : 'No'} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Certifications ({certs.length})</CardTitle></CardHeader>
              <CardContent className="p-0">
                {certs.length === 0 ? <p className="p-4 text-sm text-muted-foreground">No certifications recorded.</p> : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Issuer</TableHead><TableHead>Status</TableHead><TableHead>Expiry</TableHead><TableHead>File</TableHead>{canManageWorkers && <TableHead>Actions</TableHead>}</TableRow></TableHeader>
                    <TableBody>
                      {certs.map((c: any) => (
                        <TableRow key={c.id}>
                          <TableCell className="text-sm font-medium">{c.cert_name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{c.issuer || '—'}</TableCell>
                          <TableCell><StatusChip status={c.status} /></TableCell>
                          <TableCell className="text-sm text-muted-foreground">{c.expiry_date ? format(new Date(c.expiry_date), 'MMM d, yyyy') : '—'}</TableCell>
                          <TableCell>
                            {c.file_url ? (
                              <a href={c.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">View File</a>
                            ) : <span className="text-xs text-muted-foreground">—</span>}
                          </TableCell>
                          {canManageWorkers && (
                            <TableCell>
                              <div className="flex gap-1">
                                {c.status === 'pending' && (
                                  <>
                                    <Button size="sm" variant="ghost" className="h-7 text-xs text-emerald-600" onClick={() => handleApproveCert(c, 'valid')}>
                                      <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => handleApproveCert(c, 'revoked')}>
                                      <XCircle className="h-3 w-3 mr-1" /> Revoke
                                    </Button>
                                  </>
                                )}
                                {c.status === 'valid' && (
                                  <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => handleApproveCert(c, 'revoked')}>
                                    <XCircle className="h-3 w-3 mr-1" /> Revoke
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2"><BookOpen className="h-4 w-4" /> Training Records ({trainingRecords.length})</CardTitle>
                {canManageWorkers && (
                  <Button size="sm" onClick={() => setShowTrainingDialog(true)} className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" /> Assign Training
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-0">
                {trainingRecords.length === 0 ? <p className="p-4 text-sm text-muted-foreground">No training assigned.</p> : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Training</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead>Material</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {trainingRecords.map((t: any) => (
                        <TableRow key={t.id}>
                          <TableCell className="text-sm font-medium">{t.training_name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground capitalize">{t.training_type}</TableCell>
                          <TableCell><StatusChip status={t.status} /></TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {t.completed_date ? format(new Date(t.completed_date), 'MMM d, yyyy') : t.expiry_date ? `Due: ${format(new Date(t.expiry_date), 'MMM d, yyyy')}` : '—'}
                          </TableCell>
                          <TableCell>
                            {t.file_url ? (
                              <a href={t.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">Open</a>
                            ) : <span className="text-xs text-muted-foreground">—</span>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Documents */}
        <TabsContent value="documents">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Documents ({docs.length})</CardTitle>
              {canManageWorkers && (
                <Button size="sm" onClick={() => setShowDocUpload(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Upload Document
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {docs.length === 0 ? <p className="p-4 text-sm text-muted-foreground">No documents uploaded.</p> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Document</TableHead><TableHead>Type</TableHead><TableHead>Date</TableHead><TableHead className="w-10" /></TableRow></TableHeader>
                  <TableBody>
                    {docs.map((d: any) => (
                      <TableRow key={d.id}>
                        <TableCell className="text-sm font-medium">{d.document_name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground capitalize">{d.document_type}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{format(new Date(d.created_at), 'MMM d, yyyy')}</TableCell>
                        <TableCell>
                          {d.file_url && (
                            <a href={d.file_url} target="_blank" rel="noopener noreferrer">
                              <Button size="icon" variant="ghost" className="h-7 w-7"><FileText className="h-3.5 w-3.5" /></Button>
                            </a>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Admin Upload Document Dialog */}
          <AdminDocUploadDialog
            open={showDocUpload}
            onClose={() => setShowDocUpload(false)}
            userId={userId!}
          />
        </TabsContent>

        {/* Payroll */}
        <TabsContent value="payroll">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Pay Stubs ({payStubs.length})</CardTitle></CardHeader>
            <CardContent className="p-0">
              {payStubs.length === 0 ? <p className="p-4 text-sm text-muted-foreground">No pay stubs recorded.</p> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Pay Date</TableHead><TableHead>Period</TableHead><TableHead className="text-right">Gross</TableHead><TableHead className="text-right">Net</TableHead><TableHead /></TableRow></TableHeader>
                  <TableBody>
                    {payStubs.map((p: any) => (
                      <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedPayStub(p)}>
                        <TableCell className="text-sm font-medium">{format(new Date(p.pay_date), 'MMM d, yyyy')}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{format(new Date(p.pay_period_start), 'MMM d')} – {format(new Date(p.pay_period_end), 'MMM d')}</TableCell>
                        <TableCell className="text-sm text-right">${Number(p.gross_pay).toFixed(2)}</TableCell>
                        <TableCell className="text-sm text-right font-medium">${Number(p.net_pay).toFixed(2)}</TableCell>
                        <TableCell className="text-right"><Button variant="ghost" size="sm" className="text-xs">View</Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          <PayStubDetailDialog
            stub={selectedPayStub}
            open={!!selectedPayStub}
            onOpenChange={(o) => { if (!o) setSelectedPayStub(null); }}
            employeeName={emp.full_name}
            employeeRole={emp.role_title}
          />
        </TabsContent>

        {/* Benefits */}
        <TabsContent value="benefits">
          <EmployeeBenefitsTab userId={userId!} canManage={canManageWorkers} />
        </TabsContent>

        {/* Time Off */}
        <TabsContent value="timeoff">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-foreground">{emp.vacation_balance ?? 0}</p><p className="text-xs text-muted-foreground">Vacation Days</p></CardContent></Card>
              <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-foreground">{emp.sick_balance ?? 0}</p><p className="text-xs text-muted-foreground">Sick Days</p></CardContent></Card>
              <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-foreground">{emp.personal_days_balance ?? 0}</p><p className="text-xs text-muted-foreground">Personal Days</p></CardContent></Card>
            </div>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Requests ({timeOff.length})</CardTitle></CardHeader>
              <CardContent className="p-0">
                {timeOff.length === 0 ? <p className="p-4 text-sm text-muted-foreground">No time off requests.</p> : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Dates</TableHead><TableHead>Days</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {timeOff.map((t: any) => (
                        <TableRow key={t.id}>
                          <TableCell className="text-sm font-medium capitalize">{t.request_type}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{format(new Date(t.start_date), 'MMM d')} – {format(new Date(t.end_date), 'MMM d')}</TableCell>
                          <TableCell className="text-sm">{t.days_requested}</TableCell>
                          <TableCell><StatusChip status={t.status} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Emergency Contacts */}
        <TabsContent value="emergency">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Emergency Contacts ({contacts.length})</CardTitle></CardHeader>
            <CardContent className="p-0">
              {contacts.length === 0 ? <p className="p-4 text-sm text-muted-foreground">No emergency contacts.</p> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Relationship</TableHead><TableHead>Phone</TableHead><TableHead>Primary</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {contacts.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="text-sm font-medium">{c.contact_name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{c.relationship || '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{c.phone_primary || '—'}</TableCell>
                        <TableCell>{c.is_primary ? <Badge variant="default" className="text-[10px]">Primary</Badge> : '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Equipment / PPE */}
        <TabsContent value="equipment">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2"><HardHat className="h-4 w-4" /> Issued Equipment ({equipment.length})</CardTitle>
              {canManageWorkers && (
                <Button size="sm" onClick={() => setShowIssueDialog(true)} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Issue Item
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {equipment.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No equipment issued to this worker yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Serial #</TableHead>
                      <TableHead>Condition</TableHead>
                      <TableHead>Issued</TableHead>
                      <TableHead>Replacement</TableHead>
                      {canManageWorkers && <TableHead>Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {equipment.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-sm font-medium">{item.item_name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground capitalize">{item.item_type}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{item.serial_number || '—'}</TableCell>
                        <TableCell><StatusChip status={item.condition} /></TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.issued_date ? format(new Date(item.issued_date), 'MMM d, yyyy') : '—'}
                        </TableCell>
                        <TableCell>
                          {item.replacement_requested ? (
                            <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 border-amber-200">Requested</Badge>
                          ) : '—'}
                        </TableCell>
                        {canManageWorkers && (
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => openEditEquipment(item)}>
                                <Pencil className="h-3 w-3 mr-1" /> Edit
                              </Button>
                              {item.condition !== 'returned' && (
                                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => handleMarkReturned(item)}>
                                  <RotateCcw className="h-3 w-3 mr-1" /> Return
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Visits */}
        <TabsContent value="visits">
          <EmployeeVisitsTab userId={userId!} />
        </TabsContent>
      </Tabs>

      {/* Issue Equipment Dialog */}
      <IssueEquipmentDialog
        open={showIssueDialog}
        onClose={() => setShowIssueDialog(false)}
        userId={userId!}
        onIssue={issueEquipment}
        toast={toast}
      />

      {/* Assign Training Dialog */}
      <AssignTrainingDialog
        open={showTrainingDialog}
        onClose={() => setShowTrainingDialog(false)}
        userId={userId!}
        onAssign={assignTraining}
        toast={toast}
      />

      {/* ── EDIT EMPLOYEE DIALOG ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Pencil className="h-5 w-5 text-primary" /> Edit Employee</DialogTitle>
            <DialogDescription>Update employee profile, compensation, and banking details.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><Label>Full Name</Label><Input value={ef('full_name')} onChange={e => setEf('full_name', e.target.value)} /></div>
            <div><Label>Employee ID</Label><Input value={ef('employee_id')} onChange={e => setEf('employee_id', e.target.value)} placeholder="e.g. EMP-001" /></div>
            <div><Label>Work Email</Label><Input value={ef('work_email')} onChange={e => setEf('work_email', e.target.value)} /></div>
            <div><Label>Phone</Label><Input value={ef('phone')} onChange={e => setEf('phone', e.target.value)} /></div>
            <div><Label>Role Title</Label>
              <Select value={ef('role_title')} onValueChange={v => setEf('role_title', v)}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  {['Field Technician', 'Lead Worker', 'Crew Lead', 'Supervisor', 'Dispatcher', 'Equipment Operator', 'Snow Plow Driver', 'Landscaper', 'General Labourer', 'Cleaner', 'Site Inspector', 'Safety Officer', 'Maintenance Worker', 'Driver', 'Foreman', 'Operations Manager', 'Admin Assistant', 'Estimator'].map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Team / Strengths</Label>
              <Select value={ef('team')} onValueChange={v => setEf('team', v)}>
                <SelectTrigger><SelectValue placeholder="Select team / strength" /></SelectTrigger>
                <SelectContent>
                  {['Snow & Ice Crew', 'Landscaping Crew', 'Maintenance Crew', 'Cleaning Crew', 'Junk Removal Crew', 'Inspection Team', 'Communication', 'Collaboration', 'Reliable & Accountable', 'Problem Solver', 'Active Listener', 'Flexible & Adaptable', 'Proactive', 'Positive Attitude', 'Leadership'].map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Branch</Label><Input value={ef('branch_location')} onChange={e => setEf('branch_location', e.target.value)} /></div>
            <div><Label>Primary Service</Label>
              <Select value={ef('primary_service_category')} onValueChange={v => setEf('primary_service_category', v)}>
                <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
                <SelectContent>
                  {['Snow & Ice', 'Landscaping & Grounds', 'Junk Removal', 'Property Care & Maintenance', 'Cleaning Services', 'Power Washing', 'Gutter Cleaning', 'Property Inspection', 'Bylaw / Compliance', 'Property Management'].map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Secondary Service</Label>
              <Select value={ef('secondary_service_category')} onValueChange={v => setEf('secondary_service_category', v)}>
                <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
                <SelectContent>
                  {['Snow & Ice', 'Landscaping & Grounds', 'Junk Removal', 'Property Care & Maintenance', 'Cleaning Services', 'Power Washing', 'Gutter Cleaning', 'Property Inspection', 'Bylaw / Compliance', 'Property Management'].map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Employment Type</Label>
              <Select value={ef('employment_type')} onValueChange={v => setEf('employment_type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full-time">Full-Time</SelectItem>
                  <SelectItem value="part-time">Part-Time</SelectItem>
                  <SelectItem value="seasonal">Seasonal</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Hire Date</Label><Input type="date" value={ef('hire_date')} onChange={e => setEf('hire_date', e.target.value)} /></div>
            <div><Label>Supervisor</Label><Input value={ef('supervisor_name')} onChange={e => setEf('supervisor_name', e.target.value)} /></div>
            <div><Label>Manager</Label><Input value={ef('manager_name')} onChange={e => setEf('manager_name', e.target.value)} /></div>
            <div><Label>Pay Type</Label>
              <Select value={ef('pay_type')} onValueChange={v => setEf('pay_type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="salary">Salary</SelectItem>
                  <SelectItem value="per-visit">Per Visit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Hourly Rate ($)</Label><Input type="number" step="0.01" value={ef('hourly_rate')} onChange={e => setEf('hourly_rate', e.target.value)} /></div>

            <div className="col-span-full"><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-2">Personal / Demographics</p></div>
            <div><Label>Date of Birth</Label><Input type="date" value={ef('date_of_birth')} onChange={e => setEf('date_of_birth', e.target.value)} /></div>
            <div><Label>Gender</Label><Input value={ef('gender')} onChange={e => setEf('gender', e.target.value)} /></div>
            <div><Label>Ethnicity</Label><Input value={ef('ethnicity')} onChange={e => setEf('ethnicity', e.target.value)} /></div>
            <div><Label>Religion</Label><Input value={ef('religion')} onChange={e => setEf('religion', e.target.value)} /></div>
            <div><Label>SIN (encrypted)</Label><Input value={ef('sin_encrypted')} onChange={e => setEf('sin_encrypted', e.target.value)} placeholder="###-###-###" /></div>
            <div><Label>Driver's License Class</Label><Input value={ef('driver_license_class')} onChange={e => setEf('driver_license_class', e.target.value)} /></div>
            <div><Label>License Expiry</Label><Input type="date" value={ef('driver_license_expiry')} onChange={e => setEf('driver_license_expiry', e.target.value)} /></div>

            <div className="col-span-full"><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-2">Banking Information</p></div>
            <div><Label>Preferred Payment</Label>
              <Select value={ef('preferred_payment_method')} onValueChange={v => setEf('preferred_payment_method', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="e-transfer">E-Transfer</SelectItem>
                  <SelectItem value="direct-deposit">Direct Deposit</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>E-Transfer Email</Label><Input value={ef('e_transfer_email')} onChange={e => setEf('e_transfer_email', e.target.value)} /></div>
            <div><Label>Bank Name</Label><Input value={ef('bank_name')} onChange={e => setEf('bank_name', e.target.value)} /></div>
            <div><Label>Institution #</Label><Input value={ef('bank_institution_number')} onChange={e => setEf('bank_institution_number', e.target.value)} /></div>
            <div><Label>Transit #</Label><Input value={ef('bank_transit_number')} onChange={e => setEf('bank_transit_number', e.target.value)} /></div>
            <div><Label>Account #</Label><Input value={ef('bank_account_number')} onChange={e => setEf('bank_account_number', e.target.value)} /></div>
          </div>
          <DialogFooter className="pt-3">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={editSaving}>
              {editSaving ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Saving...</> : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── EDIT EQUIPMENT DIALOG ── */}
      <Dialog open={editEquipOpen} onOpenChange={setEditEquipOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Pencil className="h-5 w-5 text-primary" /> Edit Equipment</DialogTitle>
          </DialogHeader>
          {editEquipItem && (
            <div className="space-y-3">
              <div><Label>Item Name</Label><Input value={editEquipItem.item_name} onChange={e => setEditEquipItem((p: any) => ({ ...p, item_name: e.target.value }))} /></div>
              <div><Label>Type</Label>
                <Select value={editEquipItem.item_type} onValueChange={v => setEditEquipItem((p: any) => ({ ...p, item_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ppe">PPE</SelectItem>
                    <SelectItem value="tool">Tool</SelectItem>
                    <SelectItem value="device">Device</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Serial Number</Label><Input value={editEquipItem.serial_number || ''} onChange={e => setEditEquipItem((p: any) => ({ ...p, serial_number: e.target.value }))} /></div>
              <div><Label>Condition</Label>
                <Select value={editEquipItem.condition} onValueChange={v => setEditEquipItem((p: any) => ({ ...p, condition: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="fair">Fair</SelectItem>
                    <SelectItem value="damaged">Damaged</SelectItem>
                    <SelectItem value="returned">Returned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Notes</Label><Textarea rows={2} value={editEquipItem.notes || ''} onChange={e => setEditEquipItem((p: any) => ({ ...p, notes: e.target.value }))} /></div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={editEquipItem.replacement_requested || false} onChange={e => setEditEquipItem((p: any) => ({ ...p, replacement_requested: e.target.checked }))} id="replReq" className="rounded" />
                <Label htmlFor="replReq" className="text-sm">Replacement Requested</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditEquipOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEquipment}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── BLOCK CONFIRMATION DIALOG ── */}
      <Dialog open={blockOpen} onOpenChange={setBlockOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-destructive"><Ban className="h-5 w-5" /> Block Employee</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This will deactivate <strong>{emp.full_name}</strong> and prevent them from accessing the worker portal. You can unblock them later.</p>
          <div className="space-y-1.5 pt-2">
            <Label>Reason for blocking</Label>
            <Textarea value={blockReason} onChange={e => setBlockReason(e.target.value)} placeholder="e.g. Misconduct, policy violation..." rows={3} />
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

      {/* Send Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Send className="h-5 w-5" /> Send Worker Invite</DialogTitle>
            <DialogDescription>Send login credentials to <strong>{emp.full_name}</strong> via email at <strong>{emp.work_email || 'no email set'}</strong>.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="rounded-lg border border-border bg-muted/50 p-3 space-y-1">
              <p className="text-xs font-medium text-foreground">What the worker will receive:</p>
              <ul className="text-xs text-muted-foreground list-disc list-inside space-y-0.5">
                <li>Welcome email with login instructions</li>
                <li>Their email address for login</li>
                <li>Temporary password: <strong>praetoria</strong></li>
                <li>Link to log into the Worker Portal + app download</li>
              </ul>
              <p className="text-xs text-muted-foreground mt-2">They will be asked to change their password after first login.</p>
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button onClick={handleSendInvite} disabled={inviteSending || !emp.work_email}>
              {inviteSending ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Sending...</> : 'Send Invite Email'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── Issue Equipment Dialog with PPE Suggestions ── */
function IssueEquipmentDialog({ open, onClose, userId, onIssue, toast }: {
  open: boolean;
  onClose: () => void;
  userId: string;
  onIssue: ReturnType<typeof useIssueEquipment>;
  toast: ReturnType<typeof useToast>['toast'];
}) {
  const [itemName, setItemName] = useState('');
  const [itemType, setItemType] = useState('ppe');
  const [serialNumber, setSerialNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredSuggestions = PPE_SUGGESTIONS.filter(s =>
    s.name.toLowerCase().includes(itemName.toLowerCase())
  ).slice(0, 10);

  const reset = () => { setItemName(''); setItemType('ppe'); setSerialNumber(''); setNotes(''); setShowSuggestions(false); };

  const selectSuggestion = (s: typeof PPE_SUGGESTIONS[0]) => {
    setItemName(s.name);
    setItemType(s.type);
    setShowSuggestions(false);
  };

  const handleSubmit = () => {
    if (!itemName.trim()) {
      toast({ title: 'Enter an item name', variant: 'destructive' });
      return;
    }
    onIssue.mutate({
      user_id: userId,
      item_name: itemName.trim(),
      item_type: itemType,
      serial_number: serialNumber.trim() || undefined,
      condition: 'good',
      issued_date: new Date().toISOString().split('T')[0],
      notes: notes.trim() || undefined,
    }, {
      onSuccess: () => {
        toast({ title: 'Equipment issued', description: `${itemName} has been issued.` });
        reset();
        onClose();
      },
      onError: (err: any) => {
        toast({ title: 'Failed to issue equipment', description: err.message, variant: 'destructive' });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={() => { reset(); onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HardHat className="h-5 w-5 text-primary" /> Issue Equipment
          </DialogTitle>
          <DialogDescription>Select from common safety items or type a custom name.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Label>Item Name *</Label>
            <Input
              placeholder="Start typing or browse suggestions…"
              value={itemName}
              onChange={e => { setItemName(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
            />
            {showSuggestions && itemName.length === 0 && (
              <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                <p className="px-3 py-1.5 text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Common PPE & Safety Items</p>
                {PPE_SUGGESTIONS.map((s, i) => (
                  <button key={i} type="button" className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors" onClick={() => selectSuggestion(s)}>
                    {s.name} <span className="text-[10px] text-muted-foreground ml-1 capitalize">({s.type})</span>
                  </button>
                ))}
              </div>
            )}
            {showSuggestions && itemName.length > 0 && filteredSuggestions.length > 0 && (
              <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                {filteredSuggestions.map((s, i) => (
                  <button key={i} type="button" className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors" onClick={() => selectSuggestion(s)}>
                    {s.name} <span className="text-[10px] text-muted-foreground ml-1 capitalize">({s.type})</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <Label>Type</Label>
            <Select value={itemType} onValueChange={setItemType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ppe">PPE</SelectItem>
                <SelectItem value="tool">Tool</SelectItem>
                <SelectItem value="device">Device</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Serial Number (optional)</Label>
            <Input placeholder="S/N if applicable" value={serialNumber} onChange={e => setSerialNumber(e.target.value)} />
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Textarea rows={2} placeholder="Size, color, brand, etc." value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={onIssue.isPending}>
            {onIssue.isPending ? 'Issuing…' : 'Issue Item'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssignTrainingDialog({ open, onClose, userId, onAssign, toast }: {
  open: boolean;
  onClose: () => void;
  userId: string;
  onAssign: ReturnType<typeof useAssignTraining>;
  toast: ReturnType<typeof useToast>['toast'];
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState('other');
  const [expiryDate, setExpiryDate] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [notes, setNotes] = useState('');

  const reset = () => { setName(''); setType('other'); setExpiryDate(''); setFileUrl(''); setNotes(''); };

  const handleSubmit = () => {
    if (!name.trim()) {
      toast({ title: 'Enter training name', variant: 'destructive' });
      return;
    }
    onAssign.mutate({
      user_id: userId,
      training_name: name.trim(),
      training_type: type,
      expiry_date: expiryDate || undefined,
      file_url: fileUrl.trim() || undefined,
      notes: notes.trim() || undefined,
    }, {
      onSuccess: () => {
        toast({ title: 'Training assigned', description: `${name} has been assigned.` });
        reset();
        onClose();
      },
      onError: (err: any) => {
        toast({ title: 'Failed to assign training', description: err.message, variant: 'destructive' });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={() => { reset(); onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" /> Assign Training
          </DialogTitle>
          <DialogDescription>Assign a training course or safety document to this worker.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Training Name *</Label>
            <Input placeholder="e.g. WHMIS 2025, Fall Protection" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="whmis">WHMIS</SelectItem>
                <SelectItem value="first_aid">First Aid</SelectItem>
                <SelectItem value="equipment_cert">Equipment Cert</SelectItem>
                <SelectItem value="ppe_ack">PPE Acknowledgement</SelectItem>
                <SelectItem value="handbook">Handbook / Policy</SelectItem>
                <SelectItem value="toolbox_talk">Toolbox Talk</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Due / Expiry Date (optional)</Label>
            <Input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} />
          </div>
          <div>
            <Label>Training Material URL (optional)</Label>
            <Input placeholder="https://..." value={fileUrl} onChange={e => setFileUrl(e.target.value)} />
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={onAssign.isPending}>
            {onAssign.isPending ? 'Assigning…' : 'Assign Training'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Admin Document Upload Dialog ── */
function AdminDocUploadDialog({ open, onClose, userId }: { open: boolean; onClose: () => void; userId: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState('other');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => { setDocName(''); setDocType('other'); setFile(null); };

  const handleUpload = async () => {
    if (!file || !docName.trim()) {
      toast({ title: 'Please fill all fields', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error: storageError } = await supabase.storage.from('worker-documents').upload(path, file);
      if (storageError) throw storageError;

      const { data: { publicUrl } } = supabase.storage.from('worker-documents').getPublicUrl(path);

      const { error: dbError } = await supabase.from('worker_documents').insert([{
        user_id: userId,
        document_name: docName.trim(),
        document_type: docType,
        file_url: publicUrl,
        file_name: file.name,
        uploaded_by: userId,
      }]);
      if (dbError) throw dbError;

      toast({ title: 'Document uploaded for employee' });
      qc.invalidateQueries({ queryKey: ['employee_documents'] });
      reset();
      onClose();
    } catch (e: any) {
      toast({ title: 'Upload failed', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => { reset(); onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Upload Document for Employee</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Document Name</Label>
            <Input placeholder="e.g. Offer Letter" value={docName} onChange={e => setDocName(e.target.value)} />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="certificate">Certificate</SelectItem>
                <SelectItem value="policy">Signed Policy</SelectItem>
                <SelectItem value="id">ID Document</SelectItem>
                <SelectItem value="training">Training</SelectItem>
                <SelectItem value="payroll">Payroll</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>File</Label>
            <Input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={e => setFile(e.target.files?.[0] ?? null)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button onClick={handleUpload} disabled={submitting}>{submitting ? 'Uploading…' : 'Upload'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
