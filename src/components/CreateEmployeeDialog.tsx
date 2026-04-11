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
const SERVICE_CATEGORIES = [
  'Snow & Ice', 'Landscaping & Grounds', 'Junk Removal',
  'Property Care & Maintenance', 'Cleaning Services', 'Power Washing',
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateEmployeeDialog({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '', password: '',
    role: 'staff', department: '', employment_type: 'full-time',
    branch_location: '', primary_service_category: '', role_title: '',
    notes: '',
  });

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
          role_title: form.role_title || null,
          department: form.department || null,
          employment_type: form.employment_type,
          branch_location: form.branch_location || null,
          primary_service_category: form.primary_service_category || null,
          hire_date: new Date().toISOString().split('T')[0],
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
      resetForm();
    },
    onError: (err: any) => toast.error(err.message || 'Failed to create employee'),
  });

  const resetForm = () => setForm({
    first_name: '', last_name: '', email: '', phone: '', password: '',
    role: 'staff', department: '', employment_type: 'full-time',
    branch_location: '', primary_service_category: '', role_title: '',
    notes: '',
  });

  const handleSubmit = () => {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      toast.error('First and last name are required'); return;
    }
    if (!form.email.trim()) { toast.error('Email is required'); return; }
    if (!form.password || form.password.length < 8) {
      toast.error('Password must be at least 8 characters'); return;
    }
    mutation.mutate();
  };

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" /> Add Employee
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4 py-2">
            {/* Name */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>First Name *</Label>
                <Input value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="John" />
              </div>
              <div>
                <Label>Last Name *</Label>
                <Input value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Doe" />
              </div>
            </div>

            {/* Contact */}
            <div>
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="john@company.com" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(306) 555-0100" />
            </div>
            <div>
              <Label>Temporary Password *</Label>
              <Input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Min. 8 characters" />
            </div>

            {/* Role & employment */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>System Role *</Label>
                <Select value={form.role} onValueChange={v => set('role', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Employment Type</Label>
                <Select value={form.employment_type} onValueChange={v => set('employment_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EMPLOYMENT_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Job Title</Label>
              <Input value={form.role_title} onChange={e => set('role_title', e.target.value)} placeholder="e.g. Field Technician" />
            </div>
            <div>
              <Label>Department / Team</Label>
              <Input value={form.department} onChange={e => set('department', e.target.value)} placeholder="e.g. Operations" />
            </div>
            <div>
              <Label>Branch Location</Label>
              <Input value={form.branch_location} onChange={e => set('branch_location', e.target.value)} placeholder="e.g. Saskatoon" />
            </div>
            <div>
              <Label>Primary Service Line</Label>
              <Select value={form.primary_service_category} onValueChange={v => set('primary_service_category', v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {SERVICE_CATEGORIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Internal notes..." rows={2} />
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
