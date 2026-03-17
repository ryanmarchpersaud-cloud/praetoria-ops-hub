import { useAuth } from '@/hooks/useAuth';
import { useSubcontractorProfile } from '@/hooks/useSubcontractor';
import { Card, CardContent } from '@/components/ui/card';
import { Link, useNavigate } from 'react-router-dom';
import {
  User, Building2, ShieldCheck, DollarSign, HelpCircle, Settings, LogOut, ChevronRight, Truck,
  ShieldAlert, Receipt,
} from 'lucide-react';

export default function SubcontractorMore() {
  const { signOut } = useAuth();
  const { data: profile } = useSubcontractorProfile();
  const navigate = useNavigate();

  const handleLogout = async () => { await signOut(); navigate('/login'); };

  const items = [
    { icon: User, label: 'My Profile', to: '/subcontractor/profile', description: 'Contact info & details' },
    { icon: Building2, label: 'Company Details', to: '/subcontractor/company', description: 'Business information' },
    { icon: ShieldCheck, label: 'Compliance', to: '/subcontractor/compliance', description: 'Insurance, WCB & docs' },
    { icon: DollarSign, label: 'Payments', to: '/subcontractor/payments', description: 'Payment history & status' },
    { icon: HelpCircle, label: 'Support', to: '/subcontractor/support', description: 'Contact admin' },
    { icon: Settings, label: 'Settings', to: '/subcontractor/settings', description: 'Account settings' },
  ];

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <h1 className="text-lg font-bold text-foreground">More</h1>

      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Truck className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground truncate">{profile?.contact_name || 'Subcontractor'}</p>
            <p className="text-[11px] text-muted-foreground truncate">{profile?.company_name}</p>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full">Sub</span>
        </CardContent>
      </Card>

      <div className="space-y-1.5">
        {items.map(item => (
          <Link key={item.to} to={item.to}>
            <Card className="active:shadow-sm transition-shadow">
              <CardContent className="p-4 flex items-center gap-3">
                <item.icon className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-[11px] text-muted-foreground">{item.description}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <button onClick={handleLogout} className="w-full">
        <Card className="active:shadow-sm transition-shadow border-destructive/20">
          <CardContent className="p-4 flex items-center gap-3">
            <LogOut className="h-5 w-5 text-destructive shrink-0" />
            <p className="text-sm font-medium text-destructive">Sign Out</p>
          </CardContent>
        </Card>
      </button>
    </div>
  );
}
