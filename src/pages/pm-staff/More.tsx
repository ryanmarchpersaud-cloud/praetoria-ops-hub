import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import {
  FileText, LogIn, LogOut, User, Home,
  Clock, CalendarClock, DollarSign, GraduationCap, HardHat,
  Receipt, CalendarDays, Bell, UserCircle2,
} from 'lucide-react';

const leasingItems = [
  { to: '/pm-staff/applications', label: 'Applications', icon: FileText },
  { to: '/pm-staff/move-ins', label: 'Move-In Checklists', icon: LogIn },
  { to: '/pm-staff/move-outs', label: 'Move-Out (Phase 6B)', icon: LogOut },
  { to: '/pm-staff', label: 'Home', icon: Home },
];

const staffItems = [
  { to: '/pm-staff/profile', label: 'My Profile', icon: UserCircle2 },
  { to: '/pm-staff/time-clock', label: 'Time Clock', icon: Clock },
  { to: '/pm-staff/timesheets', label: 'My Timesheets', icon: CalendarClock },
  { to: '/pm-staff/pay-stubs', label: 'My Pay Stubs', icon: DollarSign },
  { to: '/pm-staff/documents', label: 'My Documents', icon: FileText },
  { to: '/pm-staff/training', label: 'Training & Safety', icon: GraduationCap },
  { to: '/pm-staff/ppe', label: 'My PPE / Equipment', icon: HardHat },
  { to: '/pm-staff/expenses', label: 'Expense Claims', icon: Receipt },
  { to: '/pm-staff/time-off', label: 'Time Off / Sick Days', icon: CalendarDays },
  { to: '/pm-staff/messages', label: 'Messages', icon: Bell },
  { to: '/pm-staff/account', label: 'Account', icon: User },
];

function Row({ to, label, Icon, accent }: { to: string; label: string; Icon: any; accent: 'indigo' | 'emerald' }) {
  const bg = accent === 'indigo' ? 'bg-indigo-50' : 'bg-emerald-50';
  const fg = accent === 'indigo' ? 'text-indigo-700' : 'text-emerald-700';
  return (
    <Link to={to}>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-3 flex items-center gap-3">
          <div className={`h-9 w-9 rounded-lg ${bg} flex items-center justify-center`}>
            <Icon className={`h-5 w-5 ${fg}`} />
          </div>
          <span className="font-medium">{label}</span>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function More() {
  return (
    <div className="p-4 space-y-4">
      <section className="space-y-2">
        <p className="text-[11px] uppercase tracking-[0.15em] font-semibold text-indigo-700">Leasing Work</p>
        <div className="space-y-2">
          {leasingItems.map((i) => <Row key={i.to} to={i.to} label={i.label} Icon={i.icon} accent="indigo" />)}
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-[11px] uppercase tracking-[0.15em] font-semibold text-emerald-700">My Staff Account</p>
        <div className="space-y-2">
          {staffItems.map((i) => <Row key={i.to} to={i.to} label={i.label} Icon={i.icon} accent="emerald" />)}
        </div>
      </section>
    </div>
  );
}
