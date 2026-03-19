import { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCustomerProfile } from '@/hooks/useUserRole';
import { MapPin, FileText, ClipboardCheck, Camera, MessageSquarePlus, User, LogOut, Menu, X, ShieldCheck, Receipt, ChevronRight, Home, Settings2, RefreshCw, Gift } from 'lucide-react';
import praetoriaLogo from '@/assets/praetoria-logo-white.png';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { PortalFAB } from '@/components/portal/PortalFAB';

const portalNav = [
  { title: 'Home', to: '/portal', icon: Home, tileColor: 'action-tile-green', iconColor: 'text-emerald-600', exact: true },
  { title: 'My Properties', to: '/portal/properties', icon: MapPin, tileColor: 'action-tile-blue', iconColor: 'text-blue-600' },
  { title: 'My Plan', to: '/portal/plan', icon: ShieldCheck, tileColor: 'action-tile-emerald', iconColor: 'text-emerald-600' },
  { title: 'My Quotes', to: '/portal/quotes', icon: FileText, tileColor: 'action-tile-amber', iconColor: 'text-amber-600' },
  { title: 'My Visits', to: '/portal/visits', icon: ClipboardCheck, tileColor: 'action-tile-cyan', iconColor: 'text-cyan-600' },
  { title: 'Billing', to: '/portal/billing', icon: Receipt, tileColor: 'action-tile-violet', iconColor: 'text-violet-600' },
  { title: 'My Photos', to: '/portal/photos', icon: Camera, tileColor: 'action-tile-rose', iconColor: 'text-rose-600' },
  { title: 'My Requests', to: '/portal/requests', icon: MessageSquarePlus, tileColor: 'action-tile-orange', iconColor: 'text-orange-600' },
  { title: 'Recurring', to: '/portal/recurring', icon: RefreshCw, tileColor: 'action-tile-green', iconColor: 'text-green-600' },
  { title: 'Preferences', to: '/portal/preferences', icon: Settings2, tileColor: 'action-tile-slate', iconColor: 'text-slate-600' },
  { title: 'Referrals', to: '/portal/referrals', icon: Gift, tileColor: 'action-tile-amber', iconColor: 'text-amber-600' },
  { title: 'My Account', to: '/portal/account', icon: User, tileColor: 'action-tile-slate', iconColor: 'text-slate-600' },
];

export function PortalLayout({ children }: { children: ReactNode }) {
  const { signOut, user } = useAuth();
  const { data: customer } = useCustomerProfile();
  const [mobileOpen, setMobileOpen] = useState(false);

  const displayName = customer
    ? `${customer.first_name} ${customer.last_name}`
    : user?.email;

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-border bg-card shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center p-1">
              <img src={praetoriaLogo} alt="Praetoria" className="w-full h-full object-contain" />
            </div>
            <span className="font-semibold text-sm text-foreground">Praetoria Group</span>
          </div>
          <div className="hidden md:flex items-center gap-1">
            {portalNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )
                }
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.title.replace('My ', '')}
              </NavLink>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:block text-xs text-muted-foreground truncate max-w-[140px]">
              {displayName}
            </span>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-destructive" onClick={signOut}>
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 md:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <nav className="md:hidden border-t border-border bg-card px-4 py-3">
            <div className="grid grid-cols-4 gap-2">
              {portalNav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'action-tile',
                      item.tileColor,
                      isActive && 'ring-2 ring-primary/30'
                    )
                  }
                >
                  <item.icon className={cn('h-5 w-5', item.iconColor)} />
                  <span className="text-[10px] font-medium text-foreground leading-tight">
                    {item.title.replace('My ', '')}
                  </span>
                </NavLink>
              ))}
            </div>
          </nav>
        )}
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto p-4 md:p-6">
        {children}
      </main>

      {/* Customer Quick Actions FAB */}
      <PortalFAB />
    </div>
  );
}
