import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useMyTenantContext } from '@/hooks/useTenantPortal';
import { Link } from 'react-router-dom';

export default function TenantAccount() {
  const { user } = useAuth();
  const { data } = useMyTenantContext();
  const tenant = data?.tenant;

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Account</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-2">
          <div><p className="text-xs text-muted-foreground">Signed in as</p><p className="font-medium">{user?.email}</p></div>
          {tenant && (
            <>
              <div><p className="text-xs text-muted-foreground">Tenant name</p><p className="font-medium">{tenant.first_name} {tenant.last_name}</p></div>
              {tenant.phone && <div><p className="text-xs text-muted-foreground">Phone</p><p className="font-medium">{tenant.phone}</p></div>}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Help & privacy</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <a className="text-emerald-700 block" href="mailto:support@praetoriagroup.ca">Email support@praetoriagroup.ca</a>
          <Link className="text-emerald-700 block" to="/account-privacy">Account & privacy</Link>
        </CardContent>
      </Card>

      <Button variant="outline" className="w-full" onClick={() => supabase.auth.signOut()}>
        <LogOut className="h-4 w-4 mr-1" /> Sign out
      </Button>
    </div>
  );
}
