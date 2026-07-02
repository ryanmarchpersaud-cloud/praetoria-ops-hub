import { useAuth } from '@/hooks/useAuth';
import { useAuthorization } from '@/hooks/useAuthorization';
import { Card, CardContent } from '@/components/ui/card';
import { Link, useNavigate } from 'react-router-dom';
import { usePMStaffProfile } from '@/hooks/usePMStaffProfile';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Building2, Settings, LogOut, User, ChevronRight, Eye, Monitor,
  Briefcase, FileText, Heart, DollarSign, Award, CalendarDays, UserCheck,
  ShieldAlert, Receipt, CreditCard, ClipboardCheck, Trash2, Clock, CalendarClock,
  HardHat, Bell, GraduationCap, Home as HomeIcon,
} from 'lucide-react';

type Item = { icon: any; label: string; to?: string; description: string; soon?: boolean };

export default function More() {
  const { user, signOut } = useAuth();
  const { isAdmin, isPropertyManager, isLeasingAgent } = useAuthorization();
  const { data: profile } = usePMStaffProfile();
  const navigate = useNavigate();

  const displayName = profile?.display_name || user?.user_metadata?.full_name || user?.email || 'Staff';
  const initials = (displayName || '?').slice(0, 2).toUpperCase();
  const portalLabel = isPropertyManager ? 'Property Manager' : isLeasingAgent ? 'Leasing Agent' : 'PM Staff';

  const leasingItems: Item[] = [
    { icon: HomeIcon, label: 'Home', to: '/pm-staff', description: 'Leasing dashboard' },
    { icon: ClipboardCheck, label: 'My Tasks', to: '/pm-staff/tasks', description: 'Assigned leasing tasks, follow-ups & reminders' },
  ];

  const profileItems: Item[] = [
    { icon: User, label: 'My Profile', to: '/pm-staff/profile', description: 'Personal info, contact details & profile photo' },
    { icon: Briefcase, label: 'My Employment', to: '/pm-staff/employment', description: 'Job details, role & staff information' },
    { icon: ShieldAlert, label: 'Emergency & Safety', to: '/pm-staff/emergency-contact', description: 'Emergency contacts & alerts' },
    { icon: Award, label: 'Training & Certifications', to: '/pm-staff/training', description: 'Licences, certificates & required training' },
    { icon: GraduationCap, label: 'My Courses', to: '/pm-staff/courses', description: 'Assigned training courses & quizzes' },
    { icon: FileText, label: 'Training & Safety', to: '/pm-staff/training-safety', description: 'WHMIS, first aid & policy acknowledgements' },
    { icon: ShieldAlert, label: 'Safety & Incidents', to: '/pm-staff/incidents', description: 'Report incidents, hazards & near misses' },
    { icon: FileText, label: 'My Documents', to: '/pm-staff/documents', description: 'Certificates, policies & uploaded documents' },
    { icon: Receipt, label: 'Tax Documents', to: '/pm-staff/tax-documents', description: 'T4 slips, ROE & pay summaries' },
    { icon: CreditCard, label: 'Expense Claims', to: '/pm-staff/expenses', description: 'Submit receipts for reimbursement' },
    { icon: DollarSign, label: 'Payroll / Pay Stubs', to: '/pm-staff/pay-stubs', description: 'Pay stubs, earnings & pay history' },
    { icon: Heart, label: 'Benefits', to: '/pm-staff/benefits', description: 'Health benefits & plan information' },
    { icon: CalendarDays, label: 'Time Off', to: '/pm-staff/time-off', description: 'Vacation, sick days & leave requests' },
    { icon: HardHat, label: 'PPE & Equipment', to: '/pm-staff/ppe', description: 'Issued gear, keys, devices & replacements' },
    { icon: UserCheck, label: 'Emergency Contact', to: '/pm-staff/emergency-contact', description: 'Emergency contact information' },
    { icon: Bell, label: 'Messages', to: '/pm-staff/messages', description: 'Contact Admin and receive updates' },
  ];

  const timeItems: Item[] = [
    { icon: Clock, label: 'Time Clock', to: '/pm-staff/time-clock', description: 'Clock in, clock out & shift status' },
    { icon: CalendarClock, label: 'Timesheet', to: '/pm-staff/timesheets', description: 'View hours, entries & submitted time' },
  ];

  const switchItems: Item[] = [
    ...(isAdmin ? [
      { icon: Monitor, label: 'Admin Dashboard', to: '/', description: 'Switch to desktop admin view' },
      { icon: Eye, label: 'Preview Worker Portal', to: '/worker', description: 'Preview field-worker experience' },
    ] as Item[] : []),
    { icon: Settings, label: 'Settings', to: '/pm-staff/account', description: 'Account & app settings' },
  ];

  const renderItem = (item: Item) => {
    const inner = (
      <Card className={`active:shadow-sm transition-shadow ${item.soon ? 'opacity-60' : ''}`}>
        <CardContent className="p-4 flex items-center gap-3">
          <item.icon className="h-5 w-5 text-muted-foreground shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">{item.label}</p>
            <p className="text-[11px] text-muted-foreground">{item.description}</p>
          </div>
          {item.soon
            ? <span className="text-[10px] font-semibold uppercase text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Soon</span>
            : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
        </CardContent>
      </Card>
    );
    if (item.soon || !item.to) return <div key={item.label}>{inner}</div>;
    return <Link key={item.to + item.label} to={item.to}>{inner}</Link>;
  };

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <h1 className="text-lg font-bold text-foreground">More</h1>

      {/* User card */}
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <Avatar className="h-11 w-11">
            <AvatarImage src={profile?.avatar_url || undefined} alt={displayName} />
            <AvatarFallback className="bg-emerald-100 text-emerald-800 font-semibold">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
            <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
            {portalLabel}
          </span>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 px-1">
        <Building2 className="h-4 w-4 text-emerald-700" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">PM Staff / Leasing Portal</span>
      </div>

      {/* Delete Account — Apple 5.1.1(v) discoverability */}
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

      <Section title="Leasing Work" items={leasingItems} render={renderItem} />
      <Section title="Time & Attendance" items={timeItems} render={renderItem} />
      <Section title="My Staff Account" items={profileItems} render={renderItem} />
      <Section title="Switch View" items={switchItems} render={renderItem} />

      {/* Sign out */}
      <button onClick={async () => { await signOut(); navigate('/login'); }} className="w-full">
        <Card className="active:shadow-sm transition-shadow border-destructive/20">
          <CardContent className="p-4 flex items-center gap-3">
            <LogOut className="h-5 w-5 text-destructive shrink-0" />
            <div className="min-w-0 flex-1 text-left">
              <p className="text-sm font-medium text-destructive">Sign Out</p>
              <p className="text-[11px] text-destructive/70">Securely sign out of the portal</p>
            </div>
          </CardContent>
        </Card>
      </button>
    </div>
  );
}

function Section({ title, items, render }: { title: string; items: Item[]; render: (i: Item) => React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider px-1">{title}</p>
      {items.map(render)}
    </div>
  );
}
