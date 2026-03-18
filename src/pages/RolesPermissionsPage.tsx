import { useEffect, useState } from 'react';
import { SettingsLayout } from '@/components/SettingsLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Users, HardHat, UserCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const roleDefinitions = [
  {
    role: 'admin',
    label: 'Admin',
    icon: Shield,
    color: 'text-destructive',
    description: 'Full system access — manages team, settings, billing, and all operational data.',
    portal: 'Admin Dashboard',
    permissions: [
      'Full CRUD on all records (leads, quotes, jobs, visits, invoices)',
      'Manage team members — invite, deactivate, assign roles',
      'Access settings, integrations, and audit logs',
      'Approve quotes, invoices, and subcontractor submissions',
      'View all customer portals in preview mode',
    ],
  },
  {
    role: 'staff',
    label: 'Staff / Worker',
    icon: HardHat,
    color: 'text-primary',
    description: 'Field workers and office staff with access to their own schedules, timesheets, and assigned work.',
    portal: 'Worker Portal (/worker)',
    permissions: [
      'View assigned visits, jobs, and schedules',
      'Clock in/out and manage timesheets',
      'Submit incident reports',
      'View own pay stubs and tax documents',
      'Request time off',
    ],
  },
  {
    role: 'subcontractor',
    label: 'Subcontractor',
    icon: UserCheck,
    color: 'text-orange-500',
    description: 'External contractors who manage their own invoices, compliance documents, and assigned work.',
    portal: 'Subcontractor Portal (/subcontractor)',
    permissions: [
      'View assigned visits and properties',
      'Submit and track invoices',
      'Upload compliance & insurance documents',
      'Submit incident reports',
      'View own payments and tax documents',
    ],
  },
  {
    role: 'customer',
    label: 'Customer',
    icon: Users,
    color: 'text-green-600',
    description: 'Property owners who view their service history, approve quotes, and submit requests.',
    portal: 'Customer Portal (/portal)',
    permissions: [
      'View own properties, visits, and photos',
      'View and respond to quotes',
      'Submit service requests',
      'Manage billing preferences and payment methods',
      'Set notification and service preferences',
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
            Reference guide — permissions are enforced server-side via row-level security.
          </p>
        </div>

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
                  <p className="text-sm">{rd.portal}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Key Permissions
                  </p>
                  <ul className="text-sm space-y-1">
                    {rd.permissions.map((p, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-primary mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
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
