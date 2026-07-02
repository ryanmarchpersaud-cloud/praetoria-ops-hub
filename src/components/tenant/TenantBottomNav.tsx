import { NavLink, useLocation } from 'react-router-dom';
import { Home, Wrench, FileText, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { to: '/tenant', icon: Home, label: 'Home', end: true },
  { to: '/tenant/lease', icon: FileText, label: 'Lease', end: false },
  { to: '/tenant/maintenance', icon: Wrench, label: 'Maintenance', end: false },
  { to: '/tenant/account', icon: User, label: 'Account', end: false },
];

export function TenantBottomNav() {
  const location = useLocation();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-card border-t border-border safe-area-bottom">
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
                'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors min-h-[52px]',
                isActive ? 'text-emerald-700' : 'text-muted-foreground active:text-foreground'
              )}
            >
              <tab.icon className={cn('h-5 w-5', isActive && 'stroke-[2.5]')} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
