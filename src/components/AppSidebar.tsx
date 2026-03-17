import {
  LayoutDashboard, Users, FileText, Building2, Activity, Settings, LogOut,
  MapPin, Briefcase, ClipboardCheck, CalendarDays, Smartphone, Receipt,
  MessageSquarePlus, ShieldCheck,
} from 'lucide-react';
import praetoriaLogo from '@/assets/praetoria-logo-white.png';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
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
];

const systemItems = [
  { title: 'Settings', url: '/settings', icon: Settings },
  { title: 'Field Mode', url: '/worker', icon: Smartphone },
  { title: 'Portal Preview', url: '/portal/properties', icon: ShieldCheck },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
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
