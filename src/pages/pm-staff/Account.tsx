import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useAuthorization } from '@/hooks/useAuthorization';
import { LogOut, ShieldCheck } from 'lucide-react';

export default function Account() {
  const { user, signOut } = useAuth();
  const { isPropertyManager, isLeasingAgent } = useAuthorization();
  const role = isPropertyManager ? 'Property Manager' : isLeasingAgent ? 'Leasing Agent' : 'PM Staff';

  return (
    <div className="p-4 space-y-3">
      <h2 className="text-lg font-semibold">Account</h2>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Signed in as</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p className="font-medium">{user?.email}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-emerald-600" /> {role}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Access</CardTitle></CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <p>You have access to property-management staff tools only.</p>
          <p>Finance, HR, payroll, Stripe, saved cards, owner statements, and tenant ledgers are not available in this portal.</p>
        </CardContent>
      </Card>
      <Button variant="outline" className="w-full" onClick={() => signOut()}>
        <LogOut className="h-4 w-4 mr-2" /> Sign out
      </Button>
    </div>
  );
}
