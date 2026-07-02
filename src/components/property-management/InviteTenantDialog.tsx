import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { useInviteTenant } from '@/hooks/useTenantPortal';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tenantId: string;
  defaultEmail?: string;
  tenantName?: string;
  isLinked?: boolean;
}

export function InviteTenantDialog({ open, onOpenChange, tenantId, defaultEmail, tenantName, isLinked }: Props) {
  const [email, setEmail] = useState(defaultEmail ?? '');
  const invite = useInviteTenant();

  const submit = async () => {
    if (!email.trim()) return toast.error('Email required');
    try {
      const res = await invite.mutateAsync({ tenantId, email: email.trim() });
      toast.success(res?.temp_password ? 'Invite sent with temporary password' : 'Tenant linked');
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to invite');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isLinked ? 'Re-send tenant invite' : 'Invite tenant to portal'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {tenantName && <p className="text-sm text-muted-foreground">Tenant: <span className="font-medium">{tenantName}</span></p>}
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tenant@example.com" />
          </div>
          <Alert>
            <AlertDescription className="text-xs">
              An account will be created (or linked if it already exists), the <strong>tenant</strong> role will be assigned,
              this tenant record will be linked to the user, and login instructions will be emailed.
              Tenants only see their own tenant profile, lease, and maintenance requests.
            </AlertDescription>
          </Alert>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={invite.isPending} className="bg-emerald-700 hover:bg-emerald-800">
            {invite.isPending ? 'Sending…' : (isLinked ? 'Re-send' : 'Send invite')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
