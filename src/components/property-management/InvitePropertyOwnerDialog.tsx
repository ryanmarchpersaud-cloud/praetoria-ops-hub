import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Copy, Mail } from 'lucide-react';

interface Props {
  ownerId: string;
  defaultEmail?: string;
  ownerName?: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function InvitePropertyOwnerDialog({ ownerId, defaultEmail, ownerName, open, onOpenChange }: Props) {
  const [email, setEmail] = useState(defaultEmail ?? '');
  const [busy, setBusy] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const submit = async () => {
    if (!email.trim()) {
      toast.error('Email is required');
      return;
    }
    setBusy(true);
    setTempPassword(null);
    try {
      const { data, error } = await supabase.functions.invoke('send-owner-invite', {
        body: { owner_id: ownerId, email: email.trim() },
      });
      if (error) throw error;
      if (data?.temp_password) setTempPassword(data.temp_password);
      if (data?.warning) toast.warning(data.warning);
      else toast.success('Property owner invited');
    } catch (e: any) {
      toast.error(e.message || 'Failed to invite');
    } finally {
      setBusy(false);
    }
  };

  const copyPw = () => {
    if (tempPassword) {
      navigator.clipboard.writeText(tempPassword);
      toast.success('Password copied');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite property owner</DialogTitle>
          <DialogDescription>
            Sends {ownerName ? ownerName : 'this owner'} a welcome email with login credentials for the Property Owner Portal.
            Assigns the reserved <code>property_owner</code> role — <b>not</b> the internal owner role.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="owner@example.com" />
          </div>
          {tempPassword && (
            <div className="rounded-md border bg-amber-50 border-amber-200 p-3 text-sm">
              <p className="font-medium text-amber-900">Temporary password</p>
              <p className="text-xs text-amber-800 mb-2">Share only if the email failed to arrive. Owner should change it on first login.</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white/70 px-2 py-1 rounded font-mono text-xs">{tempPassword}</code>
                <Button size="sm" variant="outline" onClick={copyPw}><Copy className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={submit} disabled={busy}>
            <Mail className="h-4 w-4 mr-1" />
            {busy ? 'Sending…' : 'Send invite'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
