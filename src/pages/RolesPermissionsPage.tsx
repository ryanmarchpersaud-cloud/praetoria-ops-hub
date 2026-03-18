import { useEffect, useState } from 'react';
import { SettingsLayout } from '@/components/SettingsLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Users, HardHat, UserCheck, Briefcase } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const roleDefinitions = [
  {
    role: 'admin',
    label: 'Admin',
    icon: Shield,
    color: 'text-destructive',
    description: 'Full system access — manages team, settings, billing, and all operational data.',
    portalAccess: ['Admin Dashboard', 'Worker Portal', 'Subcontractor Portal', 'Customer Portal (preview)'],
    enforcedAccess: [
      'All admin routes (/, /leads, /quotes, /jobs, /invoices, /settings/*)',
      'All worker routes (/worker/*)',
      'All subcontractor routes (/subcontractor/*)',
      'Customer portal preview (/portal/*)',
      'Inactive/archived users blocked',
    ],
  },
  {
    role: 'manager',
    label: 'Manager',
    icon: Briefcase,
    color: 'text-violet-600',
    description: 'Operational admin access — can view dashboards, manage jobs, and limited settings.',
    portalAccess: ['Admin Dashboard (operational)', 'Worker Portal', 'Customer Portal (preview)'],
    enforcedAccess: [
      'Admin dashboard and operational routes',
      'Worker portal routes (/worker/*)',
      'Customer portal preview (/portal/*)',
      'Cannot access: Settings > Team, Roles, Connected Apps',
      'Cannot access subcontractor portal',
    ],
  },
  {
    role: 'staff',
    label: 'Worker',
    icon: HardHat,
    color: 'text-primary',
    description: 'Field workers with access to assigned schedules, timesheets, and safety tools.',
    portalAccess: ['Worker Portal (/worker)'],
    enforcedAccess: [
      'Worker portal routes (/worker/*)',
      'Cannot access admin dashboard',
      'Cannot access subcontractor portal',
    ],
  },
  {
    role: 'subcontractor',
    label: 'Subcontractor',
    icon: UserCheck,
    color: 'text-orange-500',
    description: 'External contractors who manage their own invoices, compliance documents, and assigned work.',
    portalAccess: ['Subcontractor Portal (/subcontractor)'],
    enforcedAccess: [
      'Subcontractor portal routes (/subcontractor/*)',
      'Cannot access admin dashboard',
      'Cannot access worker portal',
    ],
  },
  {
    role: 'customer',
    label: 'Customer',
    icon: Users,
    color: 'text-green-600',
    description: 'Property owners who view their service history, approve quotes, and submit requests.',
    portalAccess: ['Customer Portal (/portal)'],
    enforcedAccess: [
      'Customer portal routes (/portal/*)',
      'Cannot access admin, worker, or subcontractor portals',
      'RLS restricts data to own records only',
    ],
  },
];

export default function RolesPermissionsPage() {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    supabase
      .from('user_roles')
      .select('role')
      .then(({ data }) => {
        const c: Record<string, number> = {};
        (data ?? []).forEach((r: any) => {
          c[r.role] = (c[r.role] || 0) + 1;
        });
        setCounts(c);
      });
  }, []);

  return (
    <SettingsLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold">Roles &amp; Permissions</h1>
          <p className="text-sm text-muted-foreground">
            Enforced authorization model. Roles control portal access, route guards block unauthorized navigation, and RLS policies protect data server-side.
          </p>
        </div>

        {/* Authorization model summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Authorization Model v1</CardTitle>
            <CardDescription>How access is enforced across the system</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-1">Layers</p>
              <ul className="space-y-1">
                <li className="flex items-start gap-1.5">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  <span><strong>Role</strong> (user_roles) — determines authorization level</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  <span><strong>Team type</strong> (team_members) — organizational/person record</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  <span><strong>Portal flags</strong> (team_members) — which portal UIs a member may enter</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  <span><strong>Active status</strong> — inactive/archived users blocked from all areas</span>
                </li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-1">Enforcement</p>
              <ul className="space-y-1">
                <li className="flex items-start gap-1.5">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                  <span>Route guards (AdminRoute, WorkerRoute, etc.) check useAuthorization()</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                  <span>RLS policies on every table enforce data isolation server-side</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                  <span>has_role() security definer function prevents RLS recursion</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          {roleDefinitions.map((rd) => (
            <Card key={rd.role}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <rd.icon className={`h-5 w-5 ${rd.color}`} />
                    <CardTitle className="text-lg">{rd.label}</CardTitle>
                  </div>
                  <Badge variant="secondary">{counts[rd.role] ?? 0} users</Badge>
                </div>
                <CardDescription>{rd.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Portal Access
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {rd.portalAccess.map((p, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{p}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Enforced Access Rules
                  </p>
                  <ul className="text-sm space-y-1">
                    {rd.enforcedAccess.map((p, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </SettingsLayout>
  );
}
