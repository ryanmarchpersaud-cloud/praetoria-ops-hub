import { NavLink, useLocation } from 'react-router-dom';
import { Home, DoorOpen, Users, CalendarClock, ListChecks, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { to: '/pm-staff', icon: Home, label: 'Home', end: true },
  { to: '/pm-staff/vacancies', icon: DoorOpen, label: 'Vacancies', end: false },
  { to: '/pm-staff/prospects', icon: Users, label: 'Prospects', end: false },
  { to: '/pm-staff/showings', icon: CalendarClock, label: 'Showings', end: false },
  { to: '/pm-staff/tasks', icon: ListChecks, label: 'Tasks', end: false },
  { to: '/pm-staff/more', icon: MoreHorizontal, label: 'More', end: false },
];

export function PMStaffBottomNav() {
  const location = useLocation();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur border-t border-border safe-area-bottom shadow-[0_-2px_10px_rgba(0,0,0,0.04)]">
      <div className="max-w-lg mx-auto flex items-stretch">
        {tabs.map(tab => {
          const isActive = tab.end
            ? location.pathname === tab.to
            : location.pathname.startsWith(tab.to);
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={cn(
                'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors min-h-[56px] relative',
                isActive ? 'text-indigo-700' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <tab.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
              {isActive && <span className="absolute top-0 h-0.5 w-8 rounded-b bg-indigo-600" />}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
