import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SettingsLayout } from '@/components/SettingsLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Shield, Users, HardHat, UserCheck, Briefcase, ChevronRight, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type PermissionKey = string;

const MODULES = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'leads', label: 'Leads' },
  { key: 'quotes', label: 'Quotes' },
  { key: 'customers', label: 'Customers' },
  { key: 'properties', label: 'Properties' },
  { key: 'jobs', label: 'Jobs' },
  { key: 'visits', label: 'Visits' },
  { key: 'invoices', label: 'Invoices' },
  { key: 'schedule', label: 'Schedule' },
  { key: 'requests', label: 'Requests' },
  { key: 'activity', label: 'Activity / Audit' },
  { key: 'employees', label: 'Employees' },
  { key: 'subcontractors', label: 'Subcontractors' },
  { key: 'catalog', label: 'Products & Services' },
  { key: 'expenses', label: 'Expense Tracking' },
  { key: 'settings', label: 'Settings' },
];

const ACTIONS = [
  { key: 'view', label: 'View' },
  { key: 'create', label: 'Create' },
  { key: 'edit', label: 'Edit' },
  { key: 'delete', label: 'Delete' },
  { key: 'approve', label: 'Approve' },
  { key: 'assign', label: 'Assign' },
  { key: 'export', label: 'Export' },
];

const roleDefinitions = [
  { role: 'admin', label: 'Admin', icon: Shield, color: 'text-destructive', description: 'Full system access — manages team, settings, billing, and all operational data.', protected: true },
  { role: 'manager', label: 'Manager', icon: Briefcase, color: 'text-violet-600', description: 'Operational admin access — can view dashboards, manage jobs, and limited settings.', protected: true },
  { role: 'staff', label: 'Worker', icon: HardHat, color: 'text-primary', description: 'Field workers with access to assigned schedules, timesheets, and safety tools.', protected: true },
  { role: 'subcontractor', label: 'Subcontractor', icon: UserCheck, color: 'text-orange-500', description: 'External contractors who manage their own invoices, compliance documents, and assigned work.', protected: true },
  { role: 'customer', label: 'Customer', icon: Users, color: 'text-green-600', description: 'Property owners who view their service history, approve quotes, and submit requests.', protected: true },
];

// Default permission map per role
const DEFAULT_PERMS: Record<string, Record<string, string[]>> = {
  admin: Object.fromEntries(MODULES.map(m => [m.key, ACTIONS.map(a => a.key)])),
  manager: {
    dashboard: ['view'], leads: ['view', 'create', 'edit', 'assign'], quotes: ['view', 'create', 'edit', 'approve', 'assign'],
    customers: ['view', 'create', 'edit'], properties: ['view', 'create', 'edit'], jobs: ['view', 'create', 'edit', 'assign'],
    visits: ['view', 'create', 'edit', 'assign'], invoices: ['view', 'create', 'edit'], schedule: ['view', 'create', 'edit', 'assign'],
    requests: ['view', 'create', 'edit', 'assign'], activity: ['view'], employees: ['view'], subcontractors: ['view'],
    catalog: ['view'], expenses: ['view'], settings: ['view'],
  },
  staff: {
    dashboard: ['view'], schedule: ['view'], visits: ['view'], jobs: ['view'], properties: ['view'],
  },
  subcontractor: {
    schedule: ['view'], visits: ['view'], invoices: ['view', 'create'], properties: ['view'],
  },
  customer: {
    requests: ['view', 'create'], quotes: ['view', 'approve'], invoices: ['view'], properties: ['view'], visits: ['view'],
  },
};

export default function RolesPermissionsPage() {
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState('admin');
  const [permState, setPermState] = useState<Record<string, Record<string, string[]>>>({});
  const [dirty, setDirty] = useState(false);

  // Fetch role counts
  const { data: counts = {} } = useQuery({
    queryKey: ['user_roles_counts'],
    queryFn: async () => {
      const { data } = await supabase.from('user_roles').select('role');
      const c: Record<string, number> = {};
      (data ?? []).forEach((r: any) => { c[r.role] = (c[r.role] || 0) + 1; });
      return c;
    },
  });

  // Fetch existing permissions
  const { data: dbPerms = [] } = useQuery({
    queryKey: ['role_permissions_all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('role_permissions').select('*');
      if (error) throw error;
      return data as { id: string; role: string; permission_key: string }[];
    },
  });

  // Build permission state from DB or defaults
  useEffect(() => {
    const state: Record<string, Record<string, string[]>> = {};
    roleDefinitions.forEach(rd => {
      state[rd.role] = {};
      MODULES.forEach(m => { state[rd.role][m.key] = []; });
    });

    if (dbPerms.length > 0) {
      dbPerms.forEach(p => {
        // permission_key format: can_<action>_<module> e.g. can_view_dashboard
        const match = p.permission_key.match(/^can_(\w+?)_(.+)$/);
        if (match && state[p.role]) {
          const [, action, mod] = match;
          if (!state[p.role][mod]) state[p.role][mod] = [];
          if (!state[p.role][mod].includes(action)) state[p.role][mod].push(action);
        }
      });
      // Fill any roles that have no DB perms with defaults
      roleDefinitions.forEach(rd => {
        const hasAny = Object.values(state[rd.role]).some(a => a.length > 0);
        if (!hasAny && DEFAULT_PERMS[rd.role]) {
          state[rd.role] = JSON.parse(JSON.stringify(DEFAULT_PERMS[rd.role]));
        }
      });
    } else {
      // No DB perms yet — use defaults
      roleDefinitions.forEach(rd => {
        if (DEFAULT_PERMS[rd.role]) state[rd.role] = JSON.parse(JSON.stringify(DEFAULT_PERMS[rd.role]));
      });
    }
    setPermState(state);
  }, [dbPerms]);

  const togglePerm = (role: string, mod: string, action: string) => {
    setPermState(prev => {
      const next = { ...prev, [role]: { ...prev[role], [mod]: [...(prev[role]?.[mod] || [])] } };
      const arr = next[role][mod];
      if (arr.includes(action)) {
        next[role][mod] = arr.filter(a => a !== action);
      } else {
        next[role][mod] = [...arr, action];
      }
      return next;
    });
    setDirty(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Delete all existing for this role, re-insert
      const role = selectedRole;
      await supabase.from('role_permissions').delete().eq('role', role);
      const rows: { role: string; permission_key: string }[] = [];
      MODULES.forEach(m => {
        (permState[role]?.[m.key] || []).forEach(action => {
          rows.push({ role, permission_key: `can_${action}_${m.key}` });
        });
      });
      if (rows.length > 0) {
        const { error } = await supabase.from('role_permissions').insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Permissions saved');
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ['role_permissions_all'] });
    },
    onError: () => toast.error('Failed to save permissions'),
  });

  const rd = roleDefinitions.find(r => r.role === selectedRole)!;
  const Icon = rd.icon;

  return (
    <SettingsLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold">Roles &amp; Permissions</h1>
          <p className="text-sm text-muted-foreground">
            Manage what each role can see and do across the system.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* Role selector */}
          <Card className="h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Roles</CardTitle>
              <CardDescription>Select a role to edit permissions</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {roleDefinitions.map(r => {
                const RIcon = r.icon;
                return (
                  <button
                    key={r.role}
                    onClick={() => { setSelectedRole(r.role); setDirty(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b last:border-b-0 ${selectedRole === r.role ? 'bg-muted' : ''}`}
                  >
                    <RIcon className={`h-4 w-4 ${r.color} shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{r.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{r.description.slice(0, 50)}…</p>
                    </div>
                    <Badge variant="secondary" className="text-xs shrink-0">{counts[r.role] ?? 0}</Badge>
                    {selectedRole === r.role && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {/* Permission matrix */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={`h-5 w-5 ${rd.color}`} />
                  <CardTitle className="text-lg">{rd.label} Permissions</CardTitle>
                  {rd.protected && <Badge variant="outline" className="text-xs">System Role</Badge>}
                </div>
                <Button size="sm" disabled={!dirty || saveMutation.isPending} onClick={() => saveMutation.mutate()}>
                  {saveMutation.isPending ? 'Saving…' : 'Save Changes'}
                </Button>
              </div>
              <CardDescription>{rd.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="w-full">
                <div className="min-w-[600px]">
                  <div className="grid grid-cols-[200px_repeat(7,1fr)] gap-0 text-xs font-medium text-muted-foreground border-b pb-2 mb-1">
                    <div>Module</div>
                    {ACTIONS.map(a => <div key={a.key} className="text-center">{a.label}</div>)}
                  </div>
                  {MODULES.map(m => (
                    <div key={m.key} className="grid grid-cols-[200px_repeat(7,1fr)] gap-0 items-center py-2 border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <div className="text-sm font-medium">{m.label}</div>
                      {ACTIONS.map(a => {
                        const active = permState[selectedRole]?.[m.key]?.includes(a.key) ?? false;
                        return (
                          <div key={a.key} className="flex justify-center">
                            <button
                              onClick={() => togglePerm(selectedRole, m.key, a.key)}
                              className={`h-7 w-7 rounded-md flex items-center justify-center transition-colors ${active ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}
                            >
                              {active ? <Check className="h-3.5 w-3.5" /> : <X className="h-3 w-3 opacity-30" />}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {dirty && (
                <div className="mt-4 flex items-center gap-2 text-sm text-amber-600">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  Unsaved changes
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Authorization model summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Authorization Model</CardTitle>
            <CardDescription>How access is enforced across the system</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-1">Layers</p>
                <ul className="space-y-1">
                  {[
                    { label: 'Role', desc: '(user_roles) — determines authorization level' },
                    { label: 'Team type', desc: '(team_members) — organizational/person record' },
                    { label: 'Portal flags', desc: '(team_members) — which portal UIs a member may enter' },
                    { label: 'Active status', desc: '— inactive/archived users blocked from all areas' },
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      <span><strong>{item.label}</strong> {item.desc}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-1">Enforcement</p>
                <ul className="space-y-1">
                  {[
                    'Route guards (AdminRoute, WorkerRoute, etc.) check useAuthorization()',
                    'RLS policies on every table enforce data isolation server-side',
                    'has_role() security definer function prevents RLS recursion',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </SettingsLayout>
  );
}
