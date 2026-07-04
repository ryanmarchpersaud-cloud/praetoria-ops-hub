import {
  FileSignature,
  LayoutDashboard, Users, FileText, Building2, Activity, Settings, LogOut, Trash2,
  MapPin, Briefcase, ClipboardCheck, CalendarDays, Smartphone, Receipt,
  MessageSquarePlus, Eye, HardHat, MessageSquare, Wallet, ShieldAlert, BookOpen, Mail, Lock, DollarSign, RefreshCw,
  ChevronDown, Home, KeyRound, UserCircle, Wrench, CalendarClock, ShieldCheck, FolderOpen,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import praetoriaLogo from '@/assets/praetoria-logo-white.png';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadCount } from '@/hooks/useMessaging';
import { useSidebarCounts } from '@/hooks/useSidebarCounts';
import { useSidebarAccess, useModuleAccess } from '@/hooks/useModuleAccess';
import { useAdminOwnerUnreadMessagesCount } from '@/hooks/pm/useOwnerMessages';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';
import { ServiceLinksSection } from '@/components/ServiceLinksSection';

type CountKey = 'leads' | 'quotes' | 'jobs' | 'visits' | 'invoices' | 'requests' | 'messages' | 'incidents';
type SidebarKey = 'dashboard' | 'leads' | 'quotes' | 'customers' | 'properties'
  | 'jobs' | 'visits' | 'invoices' | 'schedule' | 'requests'
  | 'activity' | 'employees' | 'subcontractors' | 'messaging' | 'finance' | 'incidents' | 'hr';

// Subtle color identity per functional area (icon tint + active left border).
// Kept muted so the sidebar reads professional, not rainbow.
type AreaKey = 'admin' | 'finance' | 'hr' | 'workers' | 'subs' | 'customers' | 'tenants' | 'owners' | 'employees';
const AREA_STYLES: Record<AreaKey, { icon: string; activeBorder: string; activeText: string; badgeBg: string; badgeText: string }> = {
  admin:     { icon: 'text-amber-300',   activeBorder: 'border-amber-400',   activeText: 'text-amber-200',   badgeBg: 'bg-amber-500/15',   badgeText: 'text-amber-300' },
  finance:   { icon: 'text-teal-300',    activeBorder: 'border-teal-400',    activeText: 'text-teal-200',    badgeBg: 'bg-teal-500/15',    badgeText: 'text-teal-300' },
  hr:        { icon: 'text-violet-300',  activeBorder: 'border-violet-400',  activeText: 'text-violet-200',  badgeBg: 'bg-violet-500/15',  badgeText: 'text-violet-300' },
  workers:   { icon: 'text-cyan-300',    activeBorder: 'border-cyan-400',    activeText: 'text-cyan-200',    badgeBg: 'bg-cyan-500/15',    badgeText: 'text-cyan-300' },
  subs:      { icon: 'text-orange-300',  activeBorder: 'border-orange-400',  activeText: 'text-orange-200',  badgeBg: 'bg-orange-500/15',  badgeText: 'text-orange-300' },
  customers: { icon: 'text-sky-300',     activeBorder: 'border-sky-400',     activeText: 'text-sky-200',     badgeBg: 'bg-sky-500/15',     badgeText: 'text-sky-300' },
  tenants:   { icon: 'text-emerald-300', activeBorder: 'border-emerald-400', activeText: 'text-emerald-200', badgeBg: 'bg-emerald-500/15', badgeText: 'text-emerald-300' },
  owners:    { icon: 'text-yellow-300',  activeBorder: 'border-yellow-400',  activeText: 'text-yellow-200',  badgeBg: 'bg-yellow-500/15',  badgeText: 'text-yellow-300' },
  employees: { icon: 'text-indigo-300', activeBorder: 'border-indigo-400', activeText: 'text-indigo-200', badgeBg: 'bg-indigo-500/15', badgeText: 'text-indigo-300' },
};
// Items whose LABEL text should also carry the area color (matching the icon).
// Other items keep the default white sidebar text.
const COLORED_LABEL_TITLES = new Set<string>([
  'Dashboard', 'Customers', 'HR Workspace', 'Employees', 'Subcontractors', 'Finance',
]);

const opsItems: { title: string; url: string; icon: any; countKey?: CountKey; accessKey: SidebarKey; area: AreaKey }[] = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard, accessKey: 'dashboard', area: 'admin' },
  { title: 'Leads', url: '/leads', icon: Users, countKey: 'leads', accessKey: 'leads', area: 'customers' },
  { title: 'Quotes', url: '/quotes', icon: FileText, countKey: 'quotes', accessKey: 'quotes', area: 'finance' },
  { title: 'Customers', url: '/customers', icon: Building2, accessKey: 'customers', area: 'customers' },
  { title: 'Properties', url: '/properties', icon: MapPin, accessKey: 'properties', area: 'customers' },
  { title: 'Jobs', url: '/jobs', icon: Briefcase, countKey: 'jobs', accessKey: 'jobs', area: 'workers' },
  { title: 'Visits', url: '/visits', icon: ClipboardCheck, countKey: 'visits', accessKey: 'visits', area: 'workers' },
  { title: 'Snow Log Archive', url: '/snow-logs', icon: ClipboardCheck, accessKey: 'visits' as SidebarKey, area: 'workers' },
  { title: 'Labour Price List', url: '/price-list', icon: DollarSign, accessKey: 'quotes' as SidebarKey, area: 'finance' },
  { title: 'Invoices', url: '/invoices', icon: Receipt, countKey: 'invoices', accessKey: 'invoices', area: 'finance' },
  { title: 'Schedule', url: '/schedule', icon: CalendarDays, accessKey: 'schedule', area: 'workers' },
  { title: 'Requests', url: '/requests', icon: MessageSquarePlus, countKey: 'requests', accessKey: 'requests', area: 'customers' },
  { title: 'Recurring Enrollments', url: '/requests/recurring', icon: RefreshCw, accessKey: 'requests' as SidebarKey, area: 'customers' },
  { title: 'Activity', url: '/activity', icon: Activity, accessKey: 'activity', area: 'admin' },
  { title: 'Incidents', url: '/incidents', icon: ShieldAlert, countKey: 'incidents' as CountKey, accessKey: 'incidents' as SidebarKey, area: 'admin' },
  { title: 'Tasks', url: '/tasks', icon: ClipboardCheck, accessKey: 'jobs' as SidebarKey, area: 'workers' },
  { title: 'HR Workspace', url: '/hr', icon: BookOpen, accessKey: 'hr' as SidebarKey, area: 'hr' },
  { title: 'Employees', url: '/employees', icon: HardHat, accessKey: 'employees', area: 'employees' },
  { title: 'Subcontractors', url: '/subcontractors', icon: Users, accessKey: 'subcontractors', area: 'subs' },
  { title: 'Messages', url: '/messaging', icon: MessageSquare, countKey: 'messages', accessKey: 'messaging', area: 'admin' },
  { title: 'Finance', url: '/finance', icon: Wallet, accessKey: 'finance', area: 'finance' },
  { title: 'Agreements', url: '/agreements', icon: FileSignature, accessKey: 'finance' as SidebarKey, area: 'finance' },
  { title: 'Email Directory', url: '/email-directory', icon: Mail, accessKey: 'customers' as SidebarKey, area: 'customers' },
  { title: 'Personal Accounts 🔒', url: '/personal-accounts', icon: Lock, accessKey: 'finance' as SidebarKey, area: 'admin' },
];

const viewAsItems: { title: string; url: string; icon: any; badge: string; area: AreaKey }[] = [
  { title: 'Worker Portal', url: '/worker', icon: Smartphone, badge: 'Worker view', area: 'workers' },
  { title: 'Subcontractor Portal', url: '/subcontractor', icon: HardHat, badge: 'Subcontractor view', area: 'subs' },
  { title: 'Customer Portal', url: '/portal/properties', icon: Eye, badge: 'Customer view', area: 'customers' },
  { title: 'PM Staff Portal', url: '/pm-staff', icon: KeyRound, badge: 'Leasing Agent view', area: 'admin' },
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
  const moduleAccess = useModuleAccess();

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
                const style = AREA_STYLES[item.area];
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.url === '/'}
                        className={`hover:bg-sidebar-accent/50 border-l-2 border-transparent pl-[calc(0.5rem-2px)]`}
                        activeClassName={`bg-sidebar-accent font-semibold ${style.activeText} ${style.activeBorder}`}
                      >
                        <div className="relative mr-2">
                          <item.icon className={`h-4 w-4 ${style.icon}`} />
                          <BadgeCount count={count} />
                        </div>
                        {!collapsed && (
                          <span className="flex items-center justify-between flex-1">
                            <span className={COLORED_LABEL_TITLES.has(item.title) ? style.icon : undefined}>{item.title}</span>
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
                {visibleViewAs.map((item) => {
                  const style = AREA_STYLES[item.area];
                  return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className={`hover:bg-sidebar-accent/50 border-l-2 border-transparent pl-[calc(0.5rem-2px)]`}
                        activeClassName={`bg-sidebar-accent font-semibold ${style.activeText} ${style.activeBorder}`}
                      >
                        <item.icon className={`mr-2 h-4 w-4 ${style.icon}`} />
                        {!collapsed && (
                          <span className="flex items-center gap-2">
                            {item.title}
                            <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${style.badgeBg} ${style.badgeText}`}>
                              {item.badge}
                            </span>
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
                      className="hover:bg-sidebar-accent/50 border-l-2 border-transparent pl-[calc(0.5rem-2px)]"
                      activeClassName="bg-sidebar-accent font-semibold text-yellow-300 border-yellow-400"
                    >
                      <Settings className="mr-2 h-4 w-4 text-yellow-400" />
                      {!collapsed && <span className="text-yellow-400">Settings</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {moduleAccess.isOwnerOrAdmin && <PropertyManagementGroup collapsed={collapsed} />}

        {!collapsed && <ServiceHubGroup />}
      </SidebarContent>




      <SidebarFooter>
        <div className="px-3 py-2 space-y-1">
          {!collapsed && (
            <p className="text-xs text-sidebar-foreground truncate">{user?.email}</p>
          )}
          {!collapsed && (
            <a
              href="/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-sidebar-foreground/60 hover:text-sidebar-foreground underline-offset-2 hover:underline block"
            >
              Privacy Policy
            </a>
          )}
          <NavLink to="/account-privacy" className="block">
            <SidebarMenuButton className="w-full text-destructive border border-destructive/40 bg-destructive/10 hover:bg-destructive/20 hover:text-destructive font-semibold">
              <Trash2 className="mr-2 h-4 w-4 text-destructive" />
              {!collapsed && <span>Delete Account</span>}
            </SidebarMenuButton>
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

const SERVICE_HUB_STORAGE_KEY = 'praetoria.sidebar.serviceHubOpen';

function ServiceHubGroup() {
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const stored = window.localStorage.getItem(SERVICE_HUB_STORAGE_KEY);
    return stored === null ? true : stored === '1';
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(SERVICE_HUB_STORAGE_KEY, open ? '1' : '0');
    } catch {
      // ignore storage errors
    }
  }, [open]);

  return (
    <SidebarGroup>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`flex w-full items-center justify-between rounded-md px-2.5 py-2 text-xs font-semibold uppercase tracking-wider
          text-white shadow-sm
          border border-blue-400/40
          transition-colors cursor-pointer
          ${open ? 'bg-blue-600 hover:bg-blue-500' : 'bg-blue-700 hover:bg-blue-600'}`}
      >
        <span>Service Hub</span>
        <ChevronDown
          className={`h-4 w-4 text-white transition-transform ${open ? '' : '-rotate-90'}`}
        />
      </button>
      {open && (
        <SidebarGroupContent>
          <ServiceLinksSection variant="sidebar" />
        </SidebarGroupContent>
      )}
    </SidebarGroup>
  );
}


const PM_STORAGE_KEY = 'praetoria.sidebar.propertyManagementOpen';
const PM_SUB_STORAGE_PREFIX = 'praetoria.sidebar.pm.';

type PMItem = { title: string; url: string; icon: any; end?: boolean; badgeCount?: number };
type PMSubgroup = {
  key: string;
  label: string;
  icon: any;
  items: PMItem[];
  accent: {
    header: string;
    idle: string;
    active: string;
    border: string;
  };
};

const PM_ACCENTS = {
  neutral: {
    header: 'text-slate-600 dark:text-slate-300 hover:bg-slate-500/10 border-slate-500/50',
    idle: 'hover:bg-slate-500/10 hover:text-slate-700 dark:hover:text-slate-200',
    active: 'bg-slate-500/15 text-slate-800 dark:text-slate-100 font-semibold border-l-2 border-slate-500 pl-[calc(0.5rem-2px)]',
    border: 'border-slate-500/60',
  },
  yellow: {
    header: 'text-yellow-600 dark:text-yellow-300 hover:bg-yellow-500/10 border-yellow-500/60',
    idle: 'hover:bg-yellow-500/10 hover:text-yellow-700 dark:hover:text-yellow-300',
    active: 'bg-yellow-500/15 text-yellow-800 dark:text-yellow-200 font-semibold border-l-2 border-yellow-500 pl-[calc(0.5rem-2px)]',
    border: 'border-yellow-500/60',
  },
  owners: {
    header: 'text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 border-amber-500/60',
    idle: 'hover:bg-amber-500/10 hover:text-amber-700 dark:hover:text-amber-300',
    active: 'bg-amber-500/15 text-amber-800 dark:text-amber-200 font-semibold border-l-2 border-amber-500 pl-[calc(0.5rem-2px)]',
    border: 'border-amber-500/60',
  },
  tenants: {
    header: 'text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 border-emerald-500/60',
    idle: 'hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-300',
    active: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 font-semibold border-l-2 border-emerald-500 pl-[calc(0.5rem-2px)]',
    border: 'border-emerald-500/60',
  },
  leases: {
    header: 'text-teal-700 dark:text-teal-300 hover:bg-teal-500/10 border-teal-500/60',
    idle: 'hover:bg-teal-500/10 hover:text-teal-700 dark:hover:text-teal-300',
    active: 'bg-teal-500/15 text-teal-800 dark:text-teal-200 font-semibold border-l-2 border-teal-500 pl-[calc(0.5rem-2px)]',
    border: 'border-teal-500/60',
  },
  ops: {
    header: 'text-orange-700 dark:text-orange-300 hover:bg-orange-500/10 border-orange-500/60',
    idle: 'hover:bg-orange-500/10 hover:text-orange-700 dark:hover:text-orange-300',
    active: 'bg-orange-500/15 text-orange-800 dark:text-orange-200 font-semibold border-l-2 border-orange-500 pl-[calc(0.5rem-2px)]',
    border: 'border-orange-500/60',
  },
  finance: {
    header: 'text-sky-700 dark:text-sky-300 hover:bg-sky-500/10 border-sky-500/60',
    idle: 'hover:bg-sky-500/10 hover:text-sky-700 dark:hover:text-sky-300',
    active: 'bg-sky-500/15 text-sky-800 dark:text-sky-200 font-semibold border-l-2 border-sky-500 pl-[calc(0.5rem-2px)]',
    border: 'border-sky-500/60',
  },
} as const;

function PMSubgroupBlock({ group, defaultOpen }: { group: PMSubgroup; defaultOpen: boolean }) {
  const storageKey = `${PM_SUB_STORAGE_PREFIX}${group.key}`;
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return defaultOpen;
    const stored = window.localStorage.getItem(storageKey);
    if (stored === '1') return true;
    if (stored === '0') return false;
    return defaultOpen;
  });
  useEffect(() => {
    try { window.localStorage.setItem(storageKey, open ? '1' : '0'); } catch {}
  }, [open, storageKey]);

  if (group.items.length === 0) return null;

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider cursor-pointer border-l-2 ${group.accent.header}`}
      >
        <span className="flex items-center gap-1.5">
          <group.icon className="h-3.5 w-3.5" />
          {group.label}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && (
        <SidebarMenu className="mt-0.5">
          {group.items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild size="sm">
                <NavLink to={item.url} end={item.end} className={`pl-4 ${group.accent.idle}`} activeClassName={group.accent.active}>
                  <span className="relative mr-2 inline-flex">
                    <item.icon className="h-4 w-4" />
                    {item.badgeCount && item.badgeCount > 0 ? (
                      <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-sidebar">
                        {item.badgeCount > 9 ? '9+' : item.badgeCount}
                      </span>
                    ) : null}
                  </span>
                  <span>{item.title}</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      )}
    </div>
  );
}

function PropertyManagementGroup({ collapsed }: { collapsed: boolean }) {
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(PM_STORAGE_KEY) === '1';
  });
  useEffect(() => {
    try { window.localStorage.setItem(PM_STORAGE_KEY, open ? '1' : '0'); } catch {}
  }, [open]);

  const access = useModuleAccess();
  const canSeeOwnerMessages = access.isOwnerOrAdmin || access.isPropertyManager;
  const canSeeTenantMessages = access.isOwnerOrAdmin || access.isPropertyManager;

  // Owner message unread badge + audio chime on increase (admin-side alert)
  const { data: ownerUnread = 0 } = useAdminOwnerUnreadMessagesCount();
  const prevOwnerUnread = useRef<number | null>(null);
  useEffect(() => {
    if (prevOwnerUnread.current !== null && ownerUnread > prevOwnerUnread.current) {
      playOwnerMessageChime();
    }
    prevOwnerUnread.current = ownerUnread;
  }, [ownerUnread]);

  const mainItems: PMItem[] = [
    { title: 'Dashboard', url: '/property-management', icon: LayoutDashboard, end: true },
    { title: 'Properties', url: '/property-management/properties', icon: Building2 },
    { title: 'Units', url: '/property-management/units', icon: Home },
    { title: 'Documents', url: '/property-management/documents', icon: FolderOpen },
  ];

  const ownerItems: PMItem[] = [
    { title: 'Owners', url: '/property-management/owners', icon: UserCircle },
    { title: 'Owner Approvals', url: '/property-management/owner-approvals', icon: ShieldCheck },
    ...(canSeeOwnerMessages
      ? [{ title: 'Owner Messages', url: '/property-management/owner-messages', icon: MessageSquare, badgeCount: ownerUnread }]
      : []),
    { title: 'Owner Statements', url: '/property-management/owner-statements', icon: FileText },
  ];

  const tenantItems: PMItem[] = [
    { title: 'Tenants', url: '/property-management/tenants', icon: Users },
    ...(canSeeTenantMessages
      ? [{ title: 'Tenant Messages', url: '/property-management/tenant-messages', icon: MessageSquare }]
      : []),
  ];

  const leaseItems: PMItem[] = [
    { title: 'Leases', url: '/property-management/leases', icon: KeyRound },
    { title: 'Lease Renewals', url: '/property-management/lease-renewals', icon: CalendarClock },
    { title: 'Move-Ins', url: '/property-management/move-ins', icon: KeyRound },
    { title: 'Move-Outs', url: '/property-management/move-outs', icon: KeyRound },
  ];

  const opsItems: PMItem[] = [
    { title: 'Maintenance Requests', url: '/property-management/maintenance', icon: Wrench },
    { title: 'Inspections', url: '/property-management/inspections', icon: ClipboardCheck },
  ];

  const financeItems: PMItem[] = [
    { title: 'Expenses', url: '/property-management/expenses', icon: Receipt },
  ];

  const subgroups: PMSubgroup[] = [
    { key: 'owners', label: 'Owners', icon: UserCircle, items: ownerItems, accent: PM_ACCENTS.owners },
    { key: 'tenants', label: 'Tenants', icon: Users, items: tenantItems, accent: PM_ACCENTS.tenants },
    { key: 'leases', label: 'Leases & Lifecycle', icon: CalendarClock, items: leaseItems, accent: PM_ACCENTS.leases },
    { key: 'ops', label: 'Maintenance & Inspections', icon: Wrench, items: opsItems, accent: PM_ACCENTS.ops },
    { key: 'finance', label: 'Finance & Records', icon: Receipt, items: financeItems, accent: PM_ACCENTS.finance },
  ].filter((g) => g.items.length > 0);

  // Auto-open the subgroup whose route is active
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  const isActiveIn = (items: PMItem[]) => items.some((i) => currentPath === i.url || (!i.end && currentPath.startsWith(i.url + '/')));

  const idleClass = PM_ACCENTS.yellow.idle;
  const activeClass = PM_ACCENTS.yellow.active;

  if (collapsed) {
    const flatItems = [...mainItems, ...ownerItems, ...tenantItems, ...leaseItems, ...opsItems, ...financeItems];
    return (
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            {flatItems.map((item) => (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton asChild>
                  <NavLink to={item.url} end={item.end} className={idleClass} activeClassName={activeClass}>
                    <item.icon className="h-4 w-4" />
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  return (
    <SidebarGroup>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-300 hover:bg-emerald-500/10 cursor-pointer border-l-2 border-emerald-500/70"
      >
        <span className="flex items-center gap-1.5">
          <Building2 className="h-3.5 w-3.5 text-emerald-400" />
          Property Management
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && (
        <SidebarGroupContent>
          <SidebarMenu>
            {mainItems.map((item) => {
              const isDashboard = item.title === 'Dashboard';
              return (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end={item.end} className={idleClass} activeClassName={activeClass}>
                      <item.icon className={`mr-2 h-4 w-4 ${isDashboard ? 'text-yellow-400' : ''}`} />
                      <span className={isDashboard ? 'text-yellow-400' : ''}>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
          {subgroups.map((g) => (
            <PMSubgroupBlock key={g.key} group={g} defaultOpen={isActiveIn(g.items)} />
          ))}
        </SidebarGroupContent>
      )}
    </SidebarGroup>
  );
}

