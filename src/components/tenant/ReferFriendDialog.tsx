import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Info } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tenantId?: string | null;
  referrerName?: string;
  referrerContact?: string;
}

const SERVICES = [
  'Snow & Ice',
  'Landscaping & Grounds',
  'Junk Removal',
  'Property Maintenance',
  'Fencing & Decking',
  'Roofing & Exterior',
  'Cleaning Services',
  'Construction & Renovations',
  'Property Management',
  'Not sure / other',
];

export default function ReferFriendDialog({ open, onOpenChange, tenantId, referrerName, referrerContact }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    friend_name: '',
    friend_phone: '',
    friend_email: '',
    service_interest: '',
    notes: '',
  });

  const reset = () => setForm({ friend_name: '', friend_phone: '', friend_email: '', service_interest: '', notes: '' });

  const submit = async () => {
    if (!form.friend_name.trim()) {
      toast.error("Please enter your friend or neighbour's name");
      return;
    }
    if (!form.friend_phone.trim() && !form.friend_email.trim()) {
      toast.error('Please provide a phone number or email');
      return;
    }
    setSubmitting(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from('pm_tenant_referrals').insert({
      tenant_id: tenantId ?? null,
      referrer_user_id: userData.user?.id,
      referrer_name: referrerName ?? null,
      referrer_contact: referrerContact ?? null,
      friend_name: form.friend_name.trim(),
      friend_phone: form.friend_phone.trim() || null,
      friend_email: form.friend_email.trim() || null,
      service_interest: form.service_interest || null,
      notes: form.notes.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error('Could not submit referral. Please try again.');
      return;
    }
    toast.success('Thank you! Your referral has been sent to Praetoria Group.');
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Refer a Friend or Neighbour</DialogTitle>
          <DialogDescription>
            Know someone who might need Praetoria Group's services? Share their info and we'll reach out.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 flex gap-2">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <p>
            This is a <strong>referral only</strong>. It is not a maintenance request for your rental
            and does not book any service at your property.
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <Label htmlFor="fn">Friend / neighbour name *</Label>
            <Input id="fn" value={form.friend_name} onChange={(e) => setForm({ ...form, friend_name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="fp">Phone</Label>
              <Input id="fp" value={form.friend_phone} onChange={(e) => setForm({ ...form, friend_phone: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="fe">Email</Label>
              <Input id="fe" type="email" value={form.friend_email} onChange={(e) => setForm({ ...form, friend_email: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Service they may be interested in</Label>
            <Select value={form.service_interest} onValueChange={(v) => setForm({ ...form, service_interest: v })}>
              <SelectTrigger><SelectValue placeholder="Select a service" /></SelectTrigger>
              <SelectContent>
                {SERVICES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="nt">Notes (optional)</Label>
            <Textarea id="nt" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={submitting} className="bg-emerald-700 hover:bg-emerald-800 text-white">
            {submitting ? 'Sending…' : 'Send Referral'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
