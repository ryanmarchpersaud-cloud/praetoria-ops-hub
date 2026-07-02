import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogOut, Mail, ShieldAlert, User as UserIcon, Building2, ChevronRight, HelpCircle, UserCog } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useMyTenantContext } from '@/hooks/useTenantPortal';
import { Link } from 'react-router-dom';
import { DeleteAccountSection } from '@/components/DeleteAccountSection';

const SUPPORT_EMAIL = 'ops@praetoriagroup.ca';

export default function TenantAccount() {
  const { user } = useAuth();
  const { data } = useMyTenantContext();
  const tenant = data?.tenant;
  const property = data?.property;
  const unit = data?.unit;
  const fullName = tenant ? [tenant.first_name, tenant.last_name].filter(Boolean).join(' ') : '';

  return (
    <div className="p-4 space-y-4">
      {/* Account */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <UserIcon className="h-4 w-4 text-emerald-700" /> Account
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-3">
          <div>
            <p className="text-xs text-muted-foreground">Signed in as</p>
            <p className="font-medium break-all">{user?.email}</p>
          </div>
          {tenant && (
            <>
              <div>
                <p className="text-xs text-muted-foreground">Tenant name</p>
                <p className="font-medium">{fullName}</p>
              </div>
              {tenant.phone && (
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="font-medium">{tenant.phone}</p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Property */}
      {property && (
        <Card className="border-emerald-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-emerald-800 flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Linked Property
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p className="font-semibold">{property.property_name}</p>
            {unit && <p className="text-muted-foreground">Unit {unit.unit_label}</p>}
            {property.address_line_1 && (
              <p className="text-xs text-muted-foreground">
                {property.address_line_1}
                {property.city ? `, ${property.city}` : ''}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Profile records */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <UserCog className="h-4 w-4 text-emerald-700" /> Profile Records
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm divide-y">
          <Link to="/tenant/profile" className="flex items-center justify-between py-2 text-emerald-700 font-medium">
            <span>Emergency contacts, insurance, occupants, vehicles, pets</span>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </CardContent>
      </Card>

      {/* Help & privacy */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-emerald-700" /> Help &amp; Privacy
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm divide-y">
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="flex items-center justify-between py-2 text-emerald-700 font-medium"
          >
            <span className="flex items-center gap-2">
              <Mail className="h-4 w-4" /> Email {SUPPORT_EMAIL}
            </span>
            <ChevronRight className="h-4 w-4" />
          </a>
          <Link
            to="/account-privacy"
            className="flex items-center justify-between py-2 text-emerald-700 font-medium"
          >
            <span>Account &amp; privacy</span>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </CardContent>
      </Card>

      {/* Sign out */}
      <Button
        variant="outline"
        className="w-full h-11"
        onClick={() => supabase.auth.signOut()}
      >
        <LogOut className="h-4 w-4 mr-1" /> Sign out
      </Button>

      {/* Delete account (App Store / Play Store compliance) */}
      <div className="pt-2">
        <div className="flex items-center gap-2 mb-2 text-destructive">
          <ShieldAlert className="h-4 w-4" />
          <p className="text-sm font-semibold">Delete Account</p>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Submit a request to delete your Praetoria Group tenant account. Your request will be
          reviewed by Praetoria before removal. Lease, payment, and legal records that
          Praetoria is required to retain may be kept in anonymized form to comply with
          Canadian record-keeping laws.
        </p>
        <DeleteAccountSection />
      </div>
    </div>
  );
}
