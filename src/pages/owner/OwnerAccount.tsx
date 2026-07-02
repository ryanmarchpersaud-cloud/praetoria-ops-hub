import { OwnerLayout } from '@/components/owner/OwnerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useOwnerRecord, useOwnerProperties } from '@/hooks/useOwnerPortal';
import { LogOut, Mail, Shield } from 'lucide-react';
import { DeleteAccountSection } from '@/components/DeleteAccountSection';

export default function OwnerAccount() {
  const { user, signOut } = useAuth();
  const { data: owner } = useOwnerRecord();
  const { data: properties = [] } = useOwnerProperties();

  return (
    <OwnerLayout>
      <div className="p-4 space-y-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Account</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <div>
              <p className="text-xs text-muted-foreground">Name</p>
              <p className="font-medium">{owner?.owner_name ?? '—'}</p>
            </div>
            {owner?.company_name && (
              <div>
                <p className="text-xs text-muted-foreground">Company</p>
                <p className="font-medium">{owner.company_name}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">Signed-in email</p>
              <p className="font-medium">{user?.email}</p>
            </div>
            {owner?.phone && (
              <div>
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="font-medium">{owner.phone}</p>
              </div>
            )}
            {owner?.mailing_address && (
              <div>
                <p className="text-xs text-muted-foreground">Mailing address</p>
                <p className="font-medium">{owner.mailing_address}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">Assigned properties</p>
              <p className="font-medium">{properties.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Support</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-muted-foreground">
              To update your contact info, banking details, or property list, please contact Praetoria Group operations.
            </p>
            <Button variant="outline" className="w-full justify-start" asChild>
              <a href="mailto:ops@praetoriagroup.ca">
                <Mail className="h-4 w-4 mr-2" /> ops@praetoriagroup.ca
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" /> Privacy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
            <p>Praetoria Group protects your data. Property, unit, and financial records remain business assets managed under your property management agreement.</p>
          </CardContent>
        </Card>

        <DeleteAccountSection variant="card" />

        <Button variant="destructive" className="w-full" onClick={() => signOut()}>
          <LogOut className="h-4 w-4 mr-2" /> Sign out
        </Button>
      </div>
    </OwnerLayout>
  );
}
