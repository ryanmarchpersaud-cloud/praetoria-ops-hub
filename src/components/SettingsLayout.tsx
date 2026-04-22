import { NavLink } from '@/components/NavLink';
import { useSettingsAccess } from '@/hooks/useModuleAccess';
import {
  Settings, Webhook, Plug, Users, ShieldCheck, ScrollText, Gauge,
  Building2, Package, CreditCard, Receipt, Zap, Briefcase, CalendarCog,
  MapPinned, ClipboardList, MessageSquare, Mail, BookOpen, Globe, Megaphone,
  KeyRound, HeartPulse, Activity,
} from 'lucide-react';

type SettingsAccessKey =
  | 'companySettings' | 'productsServices' | 'payments' | 'expenseTracking' | 'automations'
  | 'manageTeam' | 'rolesPermissions' | 'workSettings' | 'scheduleSettings' | 'routeOptimization' | 'jobForms'
  | 'clientHub' | 'emailsTexts' | 'requestsBookings' | 'portalSettings'
  | 'integrations' | 'connectedApps'
  | 'systemAnnouncements' | 'auditLog' | 'seatUsage';

interface SettingsItem {
  title: string;
  url: string;
  icon: any;
  accessKey?: SettingsAccessKey;
  alwaysShow?: boolean;
}

const settingsNav: { group: string; items: SettingsItem[] }[] = [
  {
    group: 'Business Management',
    items: [
      { title: 'Company Settings', url: '/settings', icon: Building2, accessKey: 'companySettings' },
      { title: 'Products & Services', url: '/settings/products', icon: Package, accessKey: 'productsServices' },
      { title: 'Payments', url: '/settings/payments', icon: CreditCard, accessKey: 'payments' },
      { title: 'Expense Tracking', url: '/settings/expenses', icon: Receipt, accessKey: 'expenseTracking' },
      { title: 'Automations', url: '/settings/automations', icon: Zap, accessKey: 'automations' },
    ],
  },
  {
    group: 'Team Organization',
    items: [
      { title: 'Manage Team', url: '/settings/team', icon: Users, accessKey: 'manageTeam' },
      { title: 'Roles & Permissions', url: '/settings/roles', icon: ShieldCheck, accessKey: 'rolesPermissions' },
      { title: 'Work Settings', url: '/settings/work', icon: Briefcase, accessKey: 'workSettings' },
      { title: 'Schedule Settings', url: '/settings/schedule-settings', icon: CalendarCog, accessKey: 'scheduleSettings' },
      { title: 'Route Optimization', url: '/settings/routes', icon: MapPinned, accessKey: 'routeOptimization' },
      { title: 'Job Forms', url: '/settings/job-forms', icon: ClipboardList, accessKey: 'jobForms' },
    ],
  },
  {
    group: 'Client Communication',
    items: [
      { title: 'Client Hub', url: '/settings/client-hub', icon: MessageSquare, accessKey: 'clientHub' },
      { title: 'Emails & Texts', url: '/settings/messaging', icon: Mail, accessKey: 'emailsTexts' },
      { title: 'Requests & Bookings', url: '/settings/requests-config', icon: BookOpen, accessKey: 'requestsBookings' },
      { title: 'Portal Settings', url: '/settings/portal', icon: Globe, accessKey: 'portalSettings' },
    ],
  },
  {
    group: 'Connected Apps',
    items: [
      { title: 'Integrations', url: '/settings/integrations', icon: Webhook, accessKey: 'integrations' },
      { title: 'Connected Apps', url: '/settings/connected-apps', icon: Plug, accessKey: 'connectedApps' },
    ],
  },
  {
    group: 'Administration',
    items: [
      { title: 'System Announcements', url: '/settings/announcements', icon: Megaphone, accessKey: 'systemAnnouncements' },
      { title: 'Audit Log', url: '/settings/audit-log', icon: ScrollText, accessKey: 'auditLog' },
      { title: 'Seat Usage', url: '/settings/usage', icon: Gauge, accessKey: 'seatUsage' },
    ],
  },
  {
    group: 'User & Auth Diagnostics',
    items: [
      { title: 'Users', url: '/settings/users', icon: KeyRound, alwaysShow: true },
      { title: 'Auth Email Health', url: '/settings/auth-email-health', icon: HeartPulse, alwaysShow: true },
      { title: 'Auth Activity', url: '/settings/auth-activity', icon: Activity, alwaysShow: true },
    ],
  },
];

export function SettingsLayout({ children }: { children: React.ReactNode }) {
  const access = useSettingsAccess();

  // Filter groups/items by access
  const visibleNav = settingsNav
    .map(group => ({
      ...group,
      items: group.items.filter(item => item.alwaysShow || (item.accessKey && access[item.accessKey])),
    }))
    .filter(group => group.items.length > 0);

  const allItems = visibleNav.flatMap(g => g.items);

  return (
    <div className="space-y-4">
      {/* Mobile/tablet horizontal tab bar */}
      <div className="md:hidden flex gap-1 overflow-x-auto border-b border-border pb-2">
        {allItems.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            end={item.url === '/settings'}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm whitespace-nowrap text-muted-foreground hover:bg-muted/50 transition-colors"
            activeClassName="bg-primary/10 text-primary font-medium"
          >
            <item.icon className="h-4 w-4" />
            {item.title}
          </NavLink>
        ))}
      </div>

      <div className="flex gap-6">
        {/* Desktop left sidebar */}
        <aside className="hidden md:block w-56 shrink-0">
          <div className="sticky top-6 space-y-5 max-h-[calc(100vh-4rem)] overflow-y-auto pb-8">
            <h2 className="text-sm font-semibold text-foreground px-3">Settings</h2>
            {visibleNav.map((group) => (
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
    </div>
  );
}
