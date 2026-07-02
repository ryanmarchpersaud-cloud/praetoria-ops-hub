import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { useInviteTenant } from '@/hooks/useTenantPortal';
import { Copy, KeyRound } from 'lucide-react';

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
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const invite = useInviteTenant();

  const submit = async () => {
    if (!email.trim()) return toast.error('Email required');
    try {
      const res = await invite.mutateAsync({ tenantId, email: email.trim() });
      const password = res?.temp_password ? String(res.temp_password) : null;
      setTempPassword(password);
      toast.success(password ? 'Invite reset — copy the temporary password below' : 'Tenant linked');
      if (!password) onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to invite');
    }
  };

  const copyPassword = async () => {
    if (!tempPassword) return;
    await navigator.clipboard.writeText(tempPassword);
    toast.success('Temporary password copied');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setTempPassword(null); }}>
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
          {tempPassword && (
            <Alert className="border-emerald-200 bg-emerald-50 text-emerald-950">
              <KeyRound className="h-4 w-4 text-emerald-700" />
              <AlertDescription className="space-y-3 text-xs">
                <p>
                  Use <strong>{email.trim().toLowerCase()}</strong> with this temporary password. The tenant will be asked to change it after signing in.
                </p>
                <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-background p-2">
                  <code className="min-w-0 flex-1 break-all text-sm font-semibold text-foreground">{tempPassword}</code>
                  <Button type="button" size="icon" variant="outline" onClick={copyPassword} aria-label="Copy temporary password">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
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
