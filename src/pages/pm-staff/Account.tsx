import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useAuthorization } from '@/hooks/useAuthorization';
import { usePMStaffProfile } from '@/hooks/usePMStaffProfile';
import {
  LogOut, ShieldCheck, UserCircle2, Clock, DollarSign, FileText, GraduationCap,
  HardHat, Receipt, CalendarDays,
} from 'lucide-react';

const shortcuts = [
  { to: '/pm-staff/profile', label: 'My Profile', icon: UserCircle2 },
  { to: '/pm-staff/time-clock', label: 'Time Clock', icon: Clock },
  { to: '/pm-staff/pay-stubs', label: 'My Pay Stubs', icon: DollarSign },
  { to: '/pm-staff/documents', label: 'My Documents', icon: FileText },
  { to: '/pm-staff/training', label: 'Training & Safety', icon: GraduationCap },
  { to: '/pm-staff/ppe', label: 'PPE / Equipment', icon: HardHat },
  { to: '/pm-staff/expenses', label: 'Expense Claims', icon: Receipt },
  { to: '/pm-staff/time-off', label: 'Time Off', icon: CalendarDays },
];

export default function Account() {
  const { user, signOut } = useAuth();
  const { isPropertyManager, isLeasingAgent } = useAuthorization();
  const { data: profile } = usePMStaffProfile();
  const role = isPropertyManager ? 'Property Manager' : isLeasingAgent ? 'Leasing Agent' : 'PM Staff';
  const displayName = profile?.display_name || user?.email || '';
  const initials = (displayName || '?').slice(0, 2).toUpperCase();

  return (
    <div className="p-4 space-y-3">
      <h2 className="text-lg font-semibold">Account</h2>

      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <Avatar className="h-14 w-14">
            <AvatarImage src={profile?.avatar_url || undefined} alt={displayName} />
            <AvatarFallback className="bg-emerald-100 text-emerald-800 font-semibold">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-semibold truncate">{displayName}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            <div className="flex items-center gap-1 text-xs text-emerald-700 mt-1">
              <ShieldCheck className="h-3.5 w-3.5" /> {role}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">My Staff Account</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-2">
          {shortcuts.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className="flex items-center gap-2 p-2 rounded-lg border hover:bg-emerald-50 transition-colors">
              <Icon className="h-4 w-4 text-emerald-700 shrink-0" />
              <span className="text-xs font-medium truncate">{label}</span>
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Access</CardTitle></CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <p>You have access to property-management staff tools and your own personal HR records.</p>
          <p>Finance, Stripe, saved cards, owner statements, tenant ledgers, and other employees' payroll are not available in this portal.</p>
        </CardContent>
      </Card>

      <Button variant="outline" className="w-full" onClick={() => signOut()}>
        <LogOut className="h-4 w-4 mr-2" /> Sign out
      </Button>
    </div>
  );
}
