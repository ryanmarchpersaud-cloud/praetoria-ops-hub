import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: any;
}

const genderOptions = ['Male', 'Female', 'Non-Binary', 'Prefer not to say'];
const ethnicityOptions = [
  'Indigenous', 'White', 'Black', 'South Asian', 'East Asian', 'Southeast Asian',
  'Latin American', 'Middle Eastern', 'Mixed / Multi-Racial', 'Prefer not to say', 'Other',
];
const religionOptions = [
  'Christianity', 'Islam', 'Hinduism', 'Sikhism', 'Buddhism', 'Judaism',
  'Indigenous Spirituality', 'No Religion', 'Prefer not to say', 'Other',
];

export function WorkerEditProfileDialog({ open, onOpenChange, profile }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [workEmail, setWorkEmail] = useState(profile?.work_email ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(profile?.date_of_birth ?? '');
  const [gender, setGender] = useState(profile?.gender ?? '');
  const [ethnicity, setEthnicity] = useState(profile?.ethnicity ?? '');
  const [religion, setReligion] = useState(profile?.religion ?? '');
  const [addressLine1, setAddressLine1] = useState(profile?.address_line_1 ?? '');
  const [addressCity, setAddressCity] = useState(profile?.address_city ?? '');
  const [addressProvince, setAddressProvince] = useState(profile?.address_province ?? '');
  const [addressPostalCode, setAddressPostalCode] = useState(profile?.address_postal_code ?? '');
  const [emergencyContactName, setEmergencyContactName] = useState(profile?.emergency_contact_name ?? '');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(profile?.emergency_contact_phone ?? '');
  const [emergencyContactRelationship, setEmergencyContactRelationship] = useState(profile?.emergency_contact_relationship ?? '');

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from('worker_profiles')
      .update({
        phone,
        work_email: workEmail,
        date_of_birth: dateOfBirth || null,
        gender: gender || null,
        ethnicity: ethnicity || null,
        religion: religion || null,
        address_line_1: addressLine1 || null,
        address_city: addressCity || null,
        address_province: addressProvince || null,
        address_postal_code: addressPostalCode || null,
        emergency_contact_name: emergencyContactName || null,
        emergency_contact_phone: emergencyContactPhone || null,
        emergency_contact_relationship: emergencyContactRelationship || null,
      })
      .eq('user_id', user.id);

    setSaving(false);
    if (error) {
      toast.error('Failed to update profile');
    } else {
      toast.success('Profile updated');
      queryClient.invalidateQueries({ queryKey: ['worker_profile'] });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit My Profile</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Contact */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact</legend>
            <div className="space-y-1.5">
              <Label htmlFor="wp-phone" className="text-xs">Phone</Label>
              <Input id="wp-phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="306-555-0100" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wp-email" className="text-xs">Work Email</Label>
              <Input id="wp-email" type="email" value={workEmail} onChange={e => setWorkEmail(e.target.value)} />
            </div>
          </fieldset>

          {/* Address */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Address</legend>
            <div className="space-y-1.5">
              <Label className="text-xs">Street</Label>
              <Input value={addressLine1} onChange={e => setAddressLine1(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">City</Label>
                <Input value={addressCity} onChange={e => setAddressCity(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Province</Label>
                <Input value={addressProvince} onChange={e => setAddressProvince(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Postal Code</Label>
              <Input value={addressPostalCode} onChange={e => setAddressPostalCode(e.target.value)} className="max-w-[140px]" />
            </div>
          </fieldset>

          {/* Personal */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Personal</legend>
            <div className="space-y-1.5">
              <Label className="text-xs">Date of Birth</Label>
              <Input type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Gender</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {genderOptions.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Ethnicity</Label>
              <Select value={ethnicity} onValueChange={setEthnicity}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {ethnicityOptions.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Religion</Label>
              <Select value={religion} onValueChange={setReligion}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {religionOptions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </fieldset>

          {/* Emergency Contact */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Emergency Contact</legend>
            <div className="space-y-1.5">
              <Label className="text-xs">Name</Label>
              <Input value={emergencyContactName} onChange={e => setEmergencyContactName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Phone</Label>
              <Input value={emergencyContactPhone} onChange={e => setEmergencyContactPhone(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Relationship</Label>
              <Input value={emergencyContactRelationship} onChange={e => setEmergencyContactRelationship(e.target.value)} placeholder="e.g. Spouse, Parent" />
            </div>
          </fieldset>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
