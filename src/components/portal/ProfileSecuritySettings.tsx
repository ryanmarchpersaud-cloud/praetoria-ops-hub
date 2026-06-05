import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, Loader2, Lock, Save, ShieldCheck, UserCog } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type CustomerProfile = {
  first_name: string;
  last_name: string;
  company_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address_line_1?: string | null;
  city?: string | null;
  province?: string | null;
  postal_code?: string | null;
};

type SubcontractorProfile = {
  company_name: string;
  contact_name: string;
  email?: string | null;
  phone?: string | null;
  mailing_address?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
};

type ProfileSecuritySettingsProps =
  | { portal: 'customer'; profile: CustomerProfile | null | undefined; loginEmail?: string | null }
  | { portal: 'subcontractor'; profile: SubcontractorProfile | null | undefined; loginEmail?: string | null };

type Message = { type: 'success' | 'error'; text: string } | null;

export function ProfileSecuritySettings(props: ProfileSecuritySettingsProps) {
  return (
    <div className="space-y-4">
      {props.portal === 'customer' ? (
        <CustomerProfileForm profile={props.profile} loginEmail={props.loginEmail} />
      ) : (
        <SubcontractorProfileForm profile={props.profile} loginEmail={props.loginEmail} />
      )}
      <PasswordUpdateForm />
    </div>
  );
}

function CustomerProfileForm({ profile, loginEmail }: { profile: CustomerProfile | null | undefined; loginEmail?: string | null }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    company_name: '',
    phone: '',
    address_line_1: '',
    city: '',
    province: '',
    postal_code: '',
  });

  useEffect(() => {
    if (!profile) return;
    setForm({
      first_name: profile.first_name ?? '',
      last_name: profile.last_name ?? '',
      company_name: profile.company_name ?? '',
      phone: profile.phone ?? '',
      address_line_1: profile.address_line_1 ?? '',
      city: profile.city ?? '',
      province: profile.province ?? '',
      postal_code: profile.postal_code ?? '',
    });
  }, [profile]);

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);

    if (!form.first_name.trim() || !form.last_name.trim()) {
      setMessage({ type: 'error', text: 'First and last name are required.' });
      return;
    }

    setSaving(true);
    const { error } = await (supabase as any).rpc('update_customer_portal_profile', {
      p_first_name: form.first_name,
      p_last_name: form.last_name,
      p_company_name: form.company_name,
      p_phone: form.phone,
      p_address_line_1: form.address_line_1,
      p_city: form.city,
      p_province: form.province,
      p_postal_code: form.postal_code,
    });
    setSaving(false);

    if (error) {
      const text = error.message || 'Could not save your profile. Please try again.';
      setMessage({ type: 'error', text });
      toast.error(text);
      return;
    }

    await queryClient.invalidateQueries({ queryKey: ['customer_profile'] });
    setMessage({ type: 'success', text: 'Profile details saved.' });
    toast.success('Profile details saved');
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <UserCog className="h-4 w-4 text-primary" /> Account Settings
        </CardTitle>
        <CardDescription>Update your customer contact details.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={saveProfile} className="space-y-4">
          <ReadonlyEmail email={loginEmail || profile?.email} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="First name" value={form.first_name} onChange={(value) => updateField('first_name', value)} required />
            <Field label="Last name" value={form.last_name} onChange={(value) => updateField('last_name', value)} required />
          </div>
          <Field label="Company" value={form.company_name} onChange={(value) => updateField('company_name', value)} />
          <Field label="Phone number" type="tel" value={form.phone} onChange={(value) => updateField('phone', value)} />
          <Field label="Address" value={form.address_line_1} onChange={(value) => updateField('address_line_1', value)} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="City" value={form.city} onChange={(value) => updateField('city', value)} />
            <Field label="Province" value={form.province} onChange={(value) => updateField('province', value)} />
            <Field label="Postal code" value={form.postal_code} onChange={(value) => updateField('postal_code', value)} />
          </div>
          <FormMessage message={message} />
          <Button type="submit" className="w-full" disabled={saving || !profile}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save profile
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function SubcontractorProfileForm({ profile, loginEmail }: { profile: SubcontractorProfile | null | undefined; loginEmail?: string | null }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  const [form, setForm] = useState({
    company_name: '',
    contact_name: '',
    phone: '',
    mailing_address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
  });

  useEffect(() => {
    if (!profile) return;
    setForm({
      company_name: profile.company_name ?? '',
      contact_name: profile.contact_name ?? '',
      phone: profile.phone ?? '',
      mailing_address: profile.mailing_address ?? '',
      emergency_contact_name: profile.emergency_contact_name ?? '',
      emergency_contact_phone: profile.emergency_contact_phone ?? '',
    });
  }, [profile]);

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);

    if (!form.company_name.trim() || !form.contact_name.trim()) {
      setMessage({ type: 'error', text: 'Company and contact name are required.' });
      return;
    }

    setSaving(true);
    const { error } = await (supabase as any).rpc('update_subcontractor_portal_profile', {
      p_company_name: form.company_name,
      p_contact_name: form.contact_name,
      p_phone: form.phone,
      p_mailing_address: form.mailing_address,
      p_emergency_contact_name: form.emergency_contact_name,
      p_emergency_contact_phone: form.emergency_contact_phone,
    });
    setSaving(false);

    if (error) {
      const text = error.message || 'Could not save your profile. Please try again.';
      setMessage({ type: 'error', text });
      toast.error(text);
      return;
    }

    await queryClient.invalidateQueries({ queryKey: ['subcontractor_profile'] });
    setMessage({ type: 'success', text: 'Profile details saved.' });
    toast.success('Profile details saved');
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <UserCog className="h-4 w-4 text-primary" /> Profile &amp; Security
        </CardTitle>
        <CardDescription>Update your contractor contact details.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={saveProfile} className="space-y-4">
          <ReadonlyEmail email={loginEmail || profile?.email} />
          <Field label="Company name" value={form.company_name} onChange={(value) => updateField('company_name', value)} required />
          <Field label="Contact name" value={form.contact_name} onChange={(value) => updateField('contact_name', value)} required />
          <Field label="Phone number" type="tel" value={form.phone} onChange={(value) => updateField('phone', value)} />
          <Field label="Mailing address" value={form.mailing_address} onChange={(value) => updateField('mailing_address', value)} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Emergency contact" value={form.emergency_contact_name} onChange={(value) => updateField('emergency_contact_name', value)} />
            <Field label="Emergency phone" type="tel" value={form.emergency_contact_phone} onChange={(value) => updateField('emergency_contact_phone', value)} />
          </div>
          <FormMessage message={message} />
          <Button type="submit" className="w-full" disabled={saving || !profile}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save profile
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function PasswordUpdateForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  const updatePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);

    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'New password must be at least 8 characters.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }

    if (currentPassword && currentPassword === newPassword) {
      setMessage({ type: 'error', text: 'Choose a new password that is different from your current password.' });
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);

    if (error) {
      const text = readablePasswordError(error.message);
      setMessage({ type: 'error', text });
      toast.error(text);
      return;
    }

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setMessage({ type: 'success', text: 'Password updated successfully.' });
    toast.success('Password updated successfully');
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Lock className="h-4 w-4 text-primary" /> Password
        </CardTitle>
        <CardDescription>Set a new password for this portal login.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={updatePassword} className="space-y-4">
          <Field label="Current password" type="password" value={currentPassword} onChange={setCurrentPassword} autoComplete="current-password" />
          <Field label="New password" type="password" value={newPassword} onChange={setNewPassword} autoComplete="new-password" required />
          <Field label="Confirm new password" type="password" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" required />
          <Alert>
            <ShieldCheck className="h-4 w-4" />
            <AlertDescription>Use at least 8 characters. You will keep the same login email.</AlertDescription>
          </Alert>
          <FormMessage message={message} />
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Lock className="h-4 w-4 mr-2" />}
            Update password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        autoComplete={autoComplete}
      />
    </div>
  );
}

function ReadonlyEmail({ email }: { email?: string | null }) {
  if (!email) return null;
  return (
    <div className="space-y-2">
      <Label htmlFor="portal-login-email">Login email</Label>
      <Input id="portal-login-email" value={email} readOnly className="bg-muted/40" />
    </div>
  );
}

function FormMessage({ message }: { message: Message }) {
  if (!message) return null;
  const isError = message.type === 'error';
  return (
    <Alert variant={isError ? 'destructive' : 'default'}>
      {isError ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
      <AlertDescription>{message.text}</AlertDescription>
    </Alert>
  );
}

function readablePasswordError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes('same_password')) return 'Choose a new password that is different from your current password.';
  if (lower.includes('weak') || lower.includes('password')) return message;
  return 'Could not update your password. Please sign out, sign back in, and try again.';
}