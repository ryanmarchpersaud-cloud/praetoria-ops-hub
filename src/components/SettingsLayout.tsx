import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import { Users, Settings, Webhook, Shield, Building2, Bell } from 'lucide-react';

const settingsNav = [
  {
    group: 'Business Management',
    items: [
      { title: 'General', url: '/settings', icon: Settings },
      { title: 'Integrations', url: '/settings/integrations', icon: Webhook },
    ],
  },
  {
    group: 'Team Organization',
    items: [
      { title: 'Manage Team', url: '/settings/team', icon: Users },
    ],
  },
];

export function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-6 min-h-[calc(100vh-6rem)]">
      {/* Left settings sidebar */}
      <aside className="hidden lg:block w-56 shrink-0">
        <div className="sticky top-6 space-y-6">
          <h2 className="text-sm font-semibold text-foreground px-3">Settings</h2>
          {settingsNav.map((group) => (
            <div key={group.group}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-3 mb-1.5">
                {group.group}
              </p>
              <nav className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.url}
                    to={item.url}
                    end={item.url === '/settings'}
                    className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
                    activeClassName="bg-primary/10 text-primary font-medium"
                  >
                    <item.icon className="h-4 w-4" />
                    {item.title}
                  </NavLink>
                ))}
              </nav>
            </div>
          ))}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
}
