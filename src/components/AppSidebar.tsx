import {
  LayoutDashboard, Users, FileText, Building2, Activity, Settings, LogOut,
  MapPin, Briefcase, ClipboardCheck, CalendarDays, Smartphone, Receipt,
  MessageSquarePlus, Eye, HardHat,
} from 'lucide-react';
import praetoriaLogo from '@/assets/praetoria-logo-white.png';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/hooks/useAuth';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';

const opsItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Leads', url: '/leads', icon: Users },
  { title: 'Quotes', url: '/quotes', icon: FileText },
  { title: 'Customers', url: '/customers', icon: Building2 },
  { title: 'Properties', url: '/properties', icon: MapPin },
  { title: 'Jobs', url: '/jobs', icon: Briefcase },
  { title: 'Visits', url: '/visits', icon: ClipboardCheck },
  { title: 'Invoices', url: '/invoices', icon: Receipt },
  { title: 'Schedule', url: '/schedule', icon: CalendarDays },
  { title: 'Requests', url: '/requests', icon: MessageSquarePlus },
  { title: 'Activity', url: '/activity', icon: Activity },
  { title: 'Employees', url: '/employees', icon: HardHat },
  { title: 'Subcontractors', url: '/subcontractors', icon: Users },
];

const systemItems = [
  { title: 'Settings', url: '/settings', icon: Settings },
];

const viewAsItems = [
  { title: 'Field Mode', url: '/worker', icon: Smartphone, badge: 'Worker view' },
  { title: 'Portal Preview', url: '/portal/properties', icon: Eye, badge: 'Customer view' },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { signOut, user } = useAuth();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <div className="flex items-center gap-2 px-3 py-4">
            <img src={praetoriaLogo} alt="Praetoria" className="w-8 h-8 object-contain shrink-0" />
            {!collapsed && (
              <span className="font-semibold text-sidebar-accent-foreground text-sm">Praetoria Ops</span>
            )}
          </div>
        </SidebarGroup>

        {/* Current mode badge */}
        {!collapsed && (
          <div className="px-4 pb-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full">
              🛡️ Internal Ops
            </span>
          </div>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>Internal Ops</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {opsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === '/'}
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
