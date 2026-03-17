import { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCustomerProfile } from '@/hooks/useUserRole';
import { MapPin, FileText, ClipboardCheck, Camera, MessageSquarePlus, User, LogOut, Shield, Menu, X, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const portalNav = [
  { title: 'My Properties', to: '/portal/properties', icon: MapPin },
  { title: 'My Plan', to: '/portal/plan', icon: ShieldCheck },
  { title: 'My Quotes', to: '/portal/quotes', icon: FileText },
  { title: 'My Visits', to: '/portal/visits', icon: ClipboardCheck },
  { title: 'My Photos', to: '/portal/photos', icon: Camera },
  { title: 'My Requests', to: '/portal/requests', icon: MessageSquarePlus },
  { title: 'My Account', to: '/portal/account', icon: User },
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
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm text-foreground">Praetoria Portal</span>
          </div>
          <div className="hidden md:flex items-center gap-1">
            {portalNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
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
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={signOut}>
              <LogOut className="h-4 w-4" />
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
          <nav className="md:hidden border-t border-border bg-card px-4 py-2 space-y-1">
            {portalNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                {item.title}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto p-4 md:p-6">
        {children}
      </main>
    </div>
  );
}
