import { useAuth } from '@/hooks/useAuth';
import { useSubcontractorProfile } from '@/hooks/useSubcontractor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { AvatarUpload } from '@/components/AvatarUpload';
import {
  User, Mail, Phone, Building2, LogOut, ShieldCheck, Truck, MapPin,
  HelpCircle, CreditCard,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-sm">{value || '—'}</p>
      </div>
    </div>
  );
}

export default function SubcontractorSettings() {
  const { user, signOut } = useAuth();
  const { data: profile, isLoading } = useSubcontractorProfile();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: billing } = useQuery({
    queryKey: ['subcontractor_billing_profile', profile?.id],
    queryFn: async () => {
      if (!profile) return null;
      const { data, error } = await supabase
        .from('subcontractor_billing_profiles')
        .select('*')
        .eq('subcontractor_id', profile.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!profile,
  });

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  if (isLoading) return <p className="text-sm text-muted-foreground p-4">Loading...</p>;

  const initials = profile?.contact_name
    ? profile.contact_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.charAt(0).toUpperCase() || '?';

  return (
    <div className="px-4 pt-6 pb-4 space-y-4 max-w-lg animate-fade-in">
      {/* Profile Banner */}
      <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-5 text-primary-foreground">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary-foreground/20 flex items-center justify-center text-xl font-bold border-2 border-primary-foreground/30">
            {initials}
          </div>
          <div>
            <p className="text-lg font-bold">{profile?.contact_name || 'My Account'}</p>
            <p className="text-xs opacity-80">{profile?.company_name || 'Subcontractor'}</p>
            {profile?.email && <p className="text-[11px] opacity-60 mt-0.5">{profile.email}</p>}
          </div>
        </div>
      </div>

      {/* Profile details card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Truck className="h-4 w-4 text-primary" /> Profile Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {profile ? (
            <>
              <InfoRow icon={User} label="Contact Name" value={profile.contact_name} />
              {profile.company_name && <InfoRow icon={Building2} label="Company" value={profile.company_name} />}
              {profile.email && <InfoRow icon={Mail} label="Email" value={profile.email} />}
              {profile.phone && <InfoRow icon={Phone} label="Phone" value={profile.phone} />}
              {profile.mailing_address && <InfoRow icon={MapPin} label="Address" value={profile.mailing_address} />}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No profile found.</p>
          )}
        </CardContent>
      </Card>

      {/* Compliance summary */}
      {profile && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" /> Compliance Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center py-1.5 border-b border-border">
              <span className="text-sm text-muted-foreground">Insurance</span>
              <StatusBadge status={profile.insurance_status} showIcon={false} />
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-border">
              <span className="text-sm text-muted-foreground">WCB</span>
              <StatusBadge status={profile.wcb_status} showIcon={false} />
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-border">
              <span className="text-sm text-muted-foreground">Business License</span>
              <StatusBadge status={profile.business_license_status} showIcon={false} />
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span className="text-sm text-muted-foreground">Safety Docs</span>
              <StatusBadge status={profile.safety_doc_status} showIcon={false} />
            </div>
            <Link to="/subcontractor/compliance">
              <Button variant="outline" size="sm" className="w-full mt-2">
                <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Manage Compliance
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Payment method on file */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" /> Payment Method
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {billing?.payment_method_present ? (
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{billing.card_brand || 'Card'} •••• {billing.card_last4 || '****'}</span>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No payment method on file. Contact admin to add a credit card for refunds or charges.
            </p>
          )}
          {billing?.billing_email && (
            <InfoRow icon={Mail} label="Billing Email" value={billing.billing_email} />
          )}
        </CardContent>
      </Card>

      {/* Login info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" /> Login
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </CardContent>
      </Card>

      {/* Support quick link */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-primary" /> Support
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Need help with your account, payments, or assignments? Reach out to our operations team.
          </p>
          <div className="space-y-1.5">
            <a href="tel:306-555-0100" className="flex items-center gap-2 text-xs text-primary hover:underline">
              <Phone className="h-3.5 w-3.5" /> 306-555-0100
            </a>
            <a href="mailto:ops@praetoriagroup.ca" className="flex items-center gap-2 text-xs text-primary hover:underline">
              <Mail className="h-3.5 w-3.5" /> ops@praetoriagroup.ca
            </a>
          </div>
        </CardContent>
      </Card>

      {/* App info */}
      <Card>
        <CardContent className="p-4 space-y-1 text-sm text-muted-foreground">
          <p>Praetoria Group v1.0</p>
          <p>Subcontractor Portal</p>
        </CardContent>
      </Card>

      <Button variant="destructive" className="w-full" onClick={handleLogout}>
        <LogOut className="h-4 w-4 mr-2" /> Sign Out
      </Button>
    </div>
  );
}
