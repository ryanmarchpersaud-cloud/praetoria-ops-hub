import {
  LayoutDashboard, Users, FileText, Building2, Activity, Settings, LogOut,
  MapPin, Briefcase, ClipboardCheck, CalendarDays, Smartphone, Receipt,
  MessageSquarePlus, Eye, HardHat, MessageSquare, Wallet,
} from 'lucide-react';
import praetoriaLogo from '@/assets/praetoria-logo-white.png';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadCount } from '@/hooks/useMessaging';
import { useSidebarCounts } from '@/hooks/useSidebarCounts';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';

type CountKey = 'leads' | 'quotes' | 'jobs' | 'visits' | 'invoices' | 'requests' | 'messages';

const opsItems: { title: string; url: string; icon: any; countKey?: CountKey }[] = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Leads', url: '/leads', icon: Users, countKey: 'leads' },
  { title: 'Quotes', url: '/quotes', icon: FileText, countKey: 'quotes' },
  { title: 'Customers', url: '/customers', icon: Building2 },
  { title: 'Properties', url: '/properties', icon: MapPin },
  { title: 'Jobs', url: '/jobs', icon: Briefcase, countKey: 'jobs' },
  { title: 'Visits', url: '/visits', icon: ClipboardCheck, countKey: 'visits' },
  { title: 'Invoices', url: '/invoices', icon: Receipt, countKey: 'invoices' },
  { title: 'Schedule', url: '/schedule', icon: CalendarDays },
  { title: 'Requests', url: '/requests', icon: MessageSquarePlus, countKey: 'requests' },
  { title: 'Activity', url: '/activity', icon: Activity },
  { title: 'Employees', url: '/employees', icon: HardHat },
  { title: 'Subcontractors', url: '/subcontractors', icon: Users },
  { title: 'Messages', url: '/messaging', icon: MessageSquare, countKey: 'messages' },
  { title: 'Finance', url: '/finance', icon: Wallet },
];

const systemItems = [
  { title: 'Settings', url: '/settings', icon: Settings },
];

const viewAsItems = [
  { title: 'Worker Portal', url: '/worker', icon: Smartphone, badge: 'Worker view' },
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

  const getBadgeCount = (key?: CountKey): number => {
    if (!key) return 0;
    if (key === 'messages') return unreadCount ?? 0;
    return sidebarCounts?.[key] ?? 0;
  };

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
              {opsItems.map((item) => {
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

        <SidebarGroup>
          <SidebarGroupLabel>View As</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {viewAsItems.map((item) => (
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

        <SidebarGroup>
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="px-3 py-2">
          {!collapsed && (
            <p className="text-xs text-sidebar-foreground truncate mb-2">{user?.email}</p>
          )}
          <SidebarMenuButton onClick={signOut} className="w-full hover:bg-sidebar-accent/50">
            <LogOut className="mr-2 h-4 w-4" />
            {!collapsed && <span>Sign Out</span>}
          </SidebarMenuButton>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
