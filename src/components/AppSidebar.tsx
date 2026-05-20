import {
  FileSignature,
  LayoutDashboard, Users, FileText, Building2, Activity, Settings, LogOut, Trash2,
  MapPin, Briefcase, ClipboardCheck, CalendarDays, Smartphone, Receipt,
  MessageSquarePlus, Eye, HardHat, MessageSquare, Wallet, ShieldAlert, BookOpen, Mail, Lock, DollarSign,
} from 'lucide-react';
import praetoriaLogo from '@/assets/praetoria-logo-white.png';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadCount } from '@/hooks/useMessaging';
import { useSidebarCounts } from '@/hooks/useSidebarCounts';
import { useSidebarAccess } from '@/hooks/useModuleAccess';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';
import { ServiceLinksSection } from '@/components/ServiceLinksSection';

type CountKey = 'leads' | 'quotes' | 'jobs' | 'visits' | 'invoices' | 'requests' | 'messages' | 'incidents';
type SidebarKey = 'dashboard' | 'leads' | 'quotes' | 'customers' | 'properties'
  | 'jobs' | 'visits' | 'invoices' | 'schedule' | 'requests'
  | 'activity' | 'employees' | 'subcontractors' | 'messaging' | 'finance' | 'incidents' | 'hr';

const opsItems: { title: string; url: string; icon: any; countKey?: CountKey; accessKey: SidebarKey }[] = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard, accessKey: 'dashboard' },
  { title: 'Leads', url: '/leads', icon: Users, countKey: 'leads', accessKey: 'leads' },
  { title: 'Quotes', url: '/quotes', icon: FileText, countKey: 'quotes', accessKey: 'quotes' },
  { title: 'Customers', url: '/customers', icon: Building2, accessKey: 'customers' },
  { title: 'Properties', url: '/properties', icon: MapPin, accessKey: 'properties' },
  { title: 'Jobs', url: '/jobs', icon: Briefcase, countKey: 'jobs', accessKey: 'jobs' },
  { title: 'Visits', url: '/visits', icon: ClipboardCheck, countKey: 'visits', accessKey: 'visits' },
  { title: 'Snow Log Archive', url: '/snow-logs', icon: ClipboardCheck, accessKey: 'visits' as SidebarKey },
  { title: 'Labour Price List', url: '/price-list', icon: DollarSign, accessKey: 'quotes' as SidebarKey },
  { title: 'Invoices', url: '/invoices', icon: Receipt, countKey: 'invoices', accessKey: 'invoices' },
  { title: 'Schedule', url: '/schedule', icon: CalendarDays, accessKey: 'schedule' },
  { title: 'Requests', url: '/requests', icon: MessageSquarePlus, countKey: 'requests', accessKey: 'requests' },
  { title: 'Activity', url: '/activity', icon: Activity, accessKey: 'activity' },
  { title: 'Incidents', url: '/incidents', icon: ShieldAlert, countKey: 'incidents' as CountKey, accessKey: 'incidents' as SidebarKey },
  { title: 'Tasks', url: '/tasks', icon: ClipboardCheck, accessKey: 'jobs' as SidebarKey },
  { title: 'HR Workspace', url: '/hr', icon: BookOpen, accessKey: 'hr' as SidebarKey },
  { title: 'Employees', url: '/employees', icon: HardHat, accessKey: 'employees' },
  { title: 'Subcontractors', url: '/subcontractors', icon: Users, accessKey: 'subcontractors' },
  { title: 'Messages', url: '/messaging', icon: MessageSquare, countKey: 'messages', accessKey: 'messaging' },
  { title: 'Finance', url: '/finance', icon: Wallet, accessKey: 'finance' },
  { title: 'Agreements', url: '/agreements', icon: FileSignature, accessKey: 'finance' as SidebarKey },
  { title: 'Email Directory', url: '/email-directory', icon: Mail, accessKey: 'customers' as SidebarKey },
  { title: 'Personal Accounts 🔒', url: '/personal-accounts', icon: Lock, accessKey: 'finance' as SidebarKey },
];

const viewAsItems = [
  { title: 'Worker Portal', url: '/worker', icon: Smartphone, badge: 'Worker view' },
  { title: 'Subcontractor Portal', url: '/subcontractor', icon: HardHat, badge: 'Subcontractor view' },
  { title: 'Customer Portal', url: '/portal/properties', icon: Eye, badge: 'Customer view' },
];

function BadgeCount({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center px-1">
      {count > 99 ? '99+' : count}
    </span>
  );
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { signOut, user } = useAuth();
  const { data: unreadCount } = useUnreadCount();
  const { data: sidebarCounts } = useSidebarCounts();
  const access = useSidebarAccess();

  const getBadgeCount = (key?: CountKey): number => {
    if (!key) return 0;
    if (key === 'messages') return unreadCount ?? 0;
    return sidebarCounts?.[key] ?? 0;
  };

  // Filter items by role-based access
  const visibleOpsItems = opsItems.filter(item => access[item.accessKey]);
  // Only owner/admin can view-as other portals
  const visibleViewAs = access.dashboard ? viewAsItems : [];
  const showSettings = access.settings;

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <div className="flex items-center gap-2 px-3 py-4">
            <img src={praetoriaLogo} alt="Praetoria" className="w-8 h-8 object-contain shrink-0" />
            {!collapsed && (
              <span className="font-semibold text-sidebar-accent-foreground text-sm">Praetoria Group</span>
            )}
          </div>
        </SidebarGroup>

        {/* Current mode badge */}
        {!collapsed && (
          <div className="px-4 pb-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full">
              🛡️ Admin Portal
            </span>
          </div>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>Admin Portal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleOpsItems.map((item) => {
                const count = getBadgeCount(item.countKey);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.url === '/'}
                        className="hover:bg-sidebar-accent/50"
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                      >
                        <div className="relative mr-2">
                          <item.icon className="h-4 w-4" />
                          <BadgeCount count={count} />
                        </div>
                        {!collapsed && (
                          <span className="flex items-center justify-between flex-1">
                            <span>{item.title}</span>
                            {count > 0 && (
                              <span className="ml-auto text-[10px] font-semibold text-destructive">
                                {count > 99 ? '99+' : count}
                              </span>
                            )}
                          </span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {visibleViewAs.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>View As</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleViewAs.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className="hover:bg-sidebar-accent/50"
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                      >
                        <item.icon className="mr-2 h-4 w-4" />
                        {!collapsed && (
                          <span className="flex items-center gap-2">
                            {item.title}
                            <span className="text-[9px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              {item.badge}
                            </span>
                          </span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {showSettings && (
          <SidebarGroup>
            <SidebarGroupLabel>System</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/settings"
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      {!collapsed && <span>Settings</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {!collapsed && (
        <SidebarGroup>
          <SidebarGroupLabel>Service Hub</SidebarGroupLabel>
          <SidebarGroupContent>
            <ServiceLinksSection variant="sidebar" />
          </SidebarGroupContent>
        </SidebarGroup>
      )}

      <SidebarFooter>
        <div className="px-3 py-2 space-y-1">
          {!collapsed && (
            <p className="text-xs text-sidebar-foreground truncate">{user?.email}</p>
          )}
          <NavLink to="/account-privacy">
            {({ isActive }) => (
              <SidebarMenuButton
                isActive={isActive}
                className="w-full hover:bg-sidebar-accent/50"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {!collapsed && <span>Account &amp; Privacy</span>}
              </SidebarMenuButton>
            )}
          </NavLink>
          <SidebarMenuButton onClick={signOut} className="w-full hover:bg-sidebar-accent/50">
            <LogOut className="mr-2 h-4 w-4" />
            {!collapsed && <span>Sign Out</span>}
          </SidebarMenuButton>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
