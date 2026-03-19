import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent } from '@/components/ui/card';
import { Link, useNavigate } from 'react-router-dom';
import {
  Monitor, Settings, LogOut, User, ChevronRight, HardHat, Eye,
  Briefcase, FileText, Heart, DollarSign, Award, CalendarDays, UserCheck,
  ShieldAlert, Receipt, BookOpen, CreditCard,
} from 'lucide-react';

export default function WorkerMore() {
  const { user, signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const profileItems = [
    { icon: User, label: 'My Profile', to: '/worker/profile', description: 'Personal info & service lines' },
    { icon: Briefcase, label: 'My Employment', to: '/worker/employment', description: 'Job details & compensation' },
    { icon: Award, label: 'Training & Certifications', to: '/worker/training', description: 'License, certs & equipment' },
    { icon: BookOpen, label: 'Training & Safety', to: '/worker/training-safety', description: 'WHMIS, first aid & acknowledgements' },
    { icon: ShieldAlert, label: 'Safety & Incidents', to: '/worker/incidents', description: 'Report incidents & near misses' },
    { icon: FileText, label: 'My Documents', to: '/worker/documents', description: 'Certificates, policies & uploads' },
    { icon: Receipt, label: 'Tax Documents', to: '/worker/tax-documents', description: 'T4 slips, ROE & pay summaries' },
    { icon: CreditCard, label: 'Expense Claims', to: '/worker/expenses', description: 'Submit receipts for reimbursement' },
    { icon: DollarSign, label: 'Payroll', to: '/worker/payroll', description: 'Pay stubs & earnings' },
    { icon: Heart, label: 'Benefits', to: '/worker/benefits', description: 'Health benefits & plan info' },
    { icon: CalendarDays, label: 'Time Off', to: '/worker/time-off', description: 'Balances & requests' },
    { icon: HardHat, label: 'PPE & Equipment', to: '/worker/ppe', description: 'Issued gear & replacements' },
    { icon: UserCheck, label: 'Emergency Contact', to: '/worker/emergency-contact', description: 'Emergency contact info' },
  ];

  const switchItems = [
    ...(isAdmin ? [
      { icon: Monitor, label: 'Admin Dashboard', to: '/', description: 'Switch to desktop admin view' },
      { icon: Eye, label: 'Customer Portal Preview', to: '/portal/properties', description: 'Preview the customer experience' },
    ] : []),
    { icon: Settings, label: 'Settings', to: isAdmin ? '/settings' : '/worker/settings', description: 'Account & app settings' },
  ];

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <h1 className="text-lg font-bold text-foreground">More</h1>

      {/* User info */}
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground truncate">
              {user?.user_metadata?.full_name || user?.email || 'Worker'}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
          </div>
           <span className="text-[10px] font-semibold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full">
            Worker Portal
          </span>
        </CardContent>
      </Card>

      {/* Current mode indicator */}
      <div className="flex items-center gap-2 px-1">
        <HardHat className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Worker Portal</span>
      </div>

      {/* Profile & Employment */}
      <div className="space-y-1.5">
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider px-1">My Info</p>
        {profileItems.map(item => (
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

      {/* Switch portals / Settings */}
      <div className="space-y-1.5">
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider px-1">Switch View</p>
        {switchItems.map(item => (
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

      {/* Logout */}
      <button onClick={handleLogout} className="w-full">
        <Card className="active:shadow-sm transition-shadow border-destructive/20">
          <CardContent className="p-4 flex items-center gap-3">
            <LogOut className="h-5 w-5 text-destructive shrink-0" />
            <p className="text-sm font-medium text-destructive">Sign Out</p>
          </CardContent>
        </Card>
      </button>

      {/* Test credentials helper */}
      <div className="rounded-lg border border-dashed border-amber-500/30 bg-amber-500/5 p-3 space-y-1.5">
        <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">🧪 Testing Tip</p>
        <p className="text-[11px] text-muted-foreground">
          Sign out and use the <strong>Dev · Role Testing</strong> panel on the login page to switch between Admin, Worker, and Customer accounts.
        </p>
        <div className="text-[10px] text-muted-foreground/80 space-y-0.5">
          <p>• <strong>Admin</strong> → admin@praetoriagroup.ca</p>
          <p>• <strong>Worker</strong> → worker@praetoriagroup.ca</p>
          <p>• <strong>Customer</strong> → customer@praetoriagroup.ca</p>
        </div>
      </div>
    </div>
  );
}
