import {
  LayoutDashboard, Users, FileText, Building2, Activity, Settings, LogOut,
  MapPin, Briefcase, ClipboardCheck, CalendarDays, Smartphone, Receipt,
} from 'lucide-react';
import praetoriaCrest from '@/assets/praetoria-crest.png';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';

const navItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Leads', url: '/leads', icon: Users },
  { title: 'Quotes', url: '/quotes', icon: FileText },
  { title: 'Customers', url: '/customers', icon: Building2 },
  { title: 'Properties', url: '/properties', icon: MapPin },
  { title: 'Jobs', url: '/jobs', icon: Briefcase },
  { title: 'Visits', url: '/visits', icon: ClipboardCheck },
  { title: 'Invoices', url: '/invoices', icon: Receipt },
  { title: 'Schedule', url: '/schedule', icon: CalendarDays },
  { title: 'Activity', url: '/activity', icon: Activity },
  { title: 'Settings', url: '/settings', icon: Settings },
  { title: 'Field Mode', url: '/worker', icon: Smartphone },
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
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4 text-primary-foreground" />
            </div>
            {!collapsed && (
              <span className="font-semibold text-sidebar-accent-foreground text-sm">Praetoria Ops</span>
            )}
          </div>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Operations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
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
