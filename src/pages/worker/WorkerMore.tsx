import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent } from '@/components/ui/card';
import { Link, useNavigate } from 'react-router-dom';
import {
  Monitor, Settings, LogOut, User, ChevronRight, HardHat, Eye,
  Briefcase, FileText, Heart, DollarSign, Award, CalendarDays, UserCheck,
  ShieldAlert, Receipt, BookOpen, CreditCard, ClipboardCheck, Trash2,
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
    { icon: ClipboardCheck, label: 'My Tasks', to: '/worker/tasks', description: 'Assigned errands, pickups & checks' },
    { icon: User, label: 'My Profile', to: '/worker/profile', description: 'Personal info & service lines' },
    { icon: Briefcase, label: 'My Employment', to: '/worker/employment', description: 'Job details & compensation' },
    { icon: ShieldAlert, label: 'Emergency & Safety', to: '/worker/emergency-safety', description: 'SOS, contacts & medical alerts' },
    { icon: Award, label: 'Training & Certifications', to: '/worker/training', description: 'License, certs & equipment' },
    { icon: BookOpen, label: 'My Courses', to: '/worker/courses', description: 'Assigned training courses & quizzes' },
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

      {/* Account & Privacy — prominent, top-level. Required by Apple
          App Review Guideline 5.1.1(v) so account deletion is easy to
          find without hunting through long settings pages. */}
      <Link to="/account-privacy">
        <Card className="border-2 border-destructive bg-destructive/10 active:shadow-sm transition-shadow">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-destructive flex items-center justify-center shrink-0">
              <Trash2 className="h-5 w-5 text-destructive-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-destructive">Delete Account</p>
              <p className="text-[11px] text-destructive/80">Account &amp; Privacy — start account deletion</p>
            </div>
            <ChevronRight className="h-4 w-4 text-destructive shrink-0" />
          </CardContent>
        </Card>
      </Link>

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
    </div>
  );
}
