import { NavLink, useLocation } from 'react-router-dom';
import { Home, Building2, Wrench, User, FileText, Receipt, FileSpreadsheet, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { to: '/owner', icon: Home, label: 'Home', end: true },
  { to: '/owner/properties', icon: Building2, label: 'Properties', end: false },
  { to: '/owner/maintenance', icon: Wrench, label: 'Maint', end: false },
  { to: '/owner/approvals', icon: ShieldCheck, label: 'Approvals', end: false },
  { to: '/owner/statements', icon: FileSpreadsheet, label: 'Stmts', end: false },
  { to: '/owner/expenses', icon: Receipt, label: 'Exp', end: false },
  { to: '/owner/documents', icon: FileText, label: 'Docs', end: false },
  { to: '/owner/account', icon: User, label: 'Account', end: false },
];

export function OwnerBottomNav() {
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
                isActive ? 'text-emerald-700' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <tab.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
              {isActive && <span className="absolute top-0 h-0.5 w-8 rounded-b bg-emerald-600" />}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
