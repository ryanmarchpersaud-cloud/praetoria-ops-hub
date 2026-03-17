import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCustomerProfile } from '@/hooks/useUserRole';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Mail, Phone, Building2, MapPin, LogOut, Home, ShieldCheck } from 'lucide-react';
import { NotificationPreferencesCard } from '@/components/NotificationPreferencesCard';
import { StatusBadge } from '@/components/StatusBadge';

export default function PortalAccount() {
  const { user, signOut } = useAuth();
  const { data: customer, isLoading } = useCustomerProfile();

  // Properties for this customer
  const { data: properties = [] } = useQuery({
    queryKey: ['portal_account_properties', customer?.id],
    queryFn: async () => {
      if (!customer) return [];
      const { data, error } = await supabase
        .from('properties')
        .select('id, property_name, address_line_1, city, property_type, status')
        .eq('customer_id', customer.id)
        .order('property_name');
      if (error) throw error;
      return data;
    },
    enabled: !!customer,
  });

  if (isLoading) return <p className="text-sm text-muted-foreground p-4">Loading...</p>;

  return (
    <div className="space-y-4 max-w-lg animate-fade-in">
      <h1 className="text-xl font-bold flex items-center gap-2">
        <User className="h-5 w-5 text-primary" /> My Account
      </h1>

      {/* Profile card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <User className="h-4 w-4" /> Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {customer ? (
            <>
              <InfoRow icon={User} label="Name" value={`${customer.first_name} ${customer.last_name}`} />
              {customer.company_name && <InfoRow icon={Building2} label="Company" value={customer.company_name} />}
              {customer.email && <InfoRow icon={Mail} label="Email" value={customer.email} />}
              {customer.phone && <InfoRow icon={Phone} label="Phone" value={customer.phone} />}
              {customer.address_line_1 && (
                <InfoRow
                  icon={MapPin}
                  label="Address"
                  value={[customer.address_line_1, customer.city, customer.province, customer.postal_code].filter(Boolean).join(', ')}
                />
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No customer profile linked to this account.</p>
          )}
        </CardContent>
      </Card>

      {/* Properties */}
      {properties.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Home className="h-4 w-4" /> My Properties
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {properties.map((p: any) => (
              <div key={p.id} className="flex items-start justify-between gap-2 py-2 border-b border-border last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{p.property_name}</p>
                  {p.address_line_1 && (
                    <p className="text-xs text-muted-foreground">
                      {p.address_line_1}{p.city ? `, ${p.city}` : ''}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground">{p.property_type}</p>
                </div>
                <StatusBadge status={p.status} showIcon={false} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Login info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Mail className="h-4 w-4" /> Login
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </CardContent>
      </Card>

      {/* Notification preferences */}
      {customer && <NotificationPreferencesCard customerId={customer.id} />}

      {/* Support card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> Support
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Need help? Our team is available to assist with any questions about your service.
          </p>
          <div className="space-y-1.5">
            <a href="tel:+18005551234" className="flex items-center gap-2 text-xs text-primary hover:underline">
              <Phone className="h-3.5 w-3.5" /> 1-800-555-1234
            </a>
            <a href="mailto:support@praetoriagroup.ca" className="flex items-center gap-2 text-xs text-primary hover:underline">
              <Mail className="h-3.5 w-3.5" /> support@praetoriagroup.ca
            </a>
          </div>
        </CardContent>
      </Card>

      <Button variant="outline" className="w-full" onClick={signOut}>
        <LogOut className="h-4 w-4 mr-2" /> Sign Out
      </Button>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-sm">{value}</p>
      </div>
    </div>
  );
}
