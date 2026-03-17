import { useAuth } from '@/hooks/useAuth';
import { useCustomerProfile } from '@/hooks/useUserRole';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Mail, Phone, Building2, MapPin, LogOut } from 'lucide-react';

export default function PortalAccount() {
  const { user, signOut } = useAuth();
  const { data: customer, isLoading } = useCustomerProfile();

  if (isLoading) return <p className="text-sm text-muted-foreground p-4">Loading...</p>;

  return (
    <div className="space-y-4 max-w-lg">
      <h1 className="text-xl font-bold">My Account</h1>

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
