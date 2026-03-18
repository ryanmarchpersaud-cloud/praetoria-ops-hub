import { useEffect, useState } from 'react';
import { SettingsLayout } from '@/components/SettingsLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Users, UserCheck, UserX, Shield, HardHat, UserCog } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface RoleCounts { admin: number; staff: number; subcontractor: number; customer: number; }

export default function SeatUsagePage() {
  const [counts, setCounts] = useState<RoleCounts>({ admin: 0, staff: 0, subcontractor: 0, customer: 0 });
  const [totalProfiles, setTotalProfiles] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [rolesRes, profilesRes] = await Promise.all([
        supabase.from('user_roles').select('role'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
      ]);
      const c: RoleCounts = { admin: 0, staff: 0, subcontractor: 0, customer: 0 };
      (rolesRes.data ?? []).forEach((r: any) => {
        if (r.role in c) c[r.role as keyof RoleCounts]++;
      });
      setCounts(c);
      setTotalProfiles(profilesRes.count ?? 0);
      setLoading(false);
    }
    load();
  }, []);

  const totalSeats = counts.admin + counts.staff + counts.subcontractor + counts.customer;

  const metrics = [
    { label: 'Total Accounts', value: totalProfiles, icon: Users, color: 'text-primary' },
    { label: 'Total Role Assignments', value: totalSeats, icon: UserCheck, color: 'text-green-600' },
  ];

  const roleBreakdown = [
    { label: 'Admin', value: counts.admin, icon: Shield, color: 'bg-destructive' },
    { label: 'Staff', value: counts.staff, icon: HardHat, color: 'bg-primary' },
    { label: 'Subcontractor', value: counts.subcontractor, icon: UserCog, color: 'bg-orange-500' },
    { label: 'Customer', value: counts.customer, icon: Users, color: 'bg-green-600' },
  ];

  if (loading) {
    return (
      <SettingsLayout>
        <div className="flex items-center justify-center py-20 text-muted-foreground">Loading…</div>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold">Seat Usage &amp; Limits</h1>
          <p className="text-sm text-muted-foreground">Overview of user accounts and role distribution.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {metrics.map((m) => (
            <Card key={m.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{m.label}</CardTitle>
                <m.icon className={`h-5 w-5 ${m.color}`} />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{m.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Role Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {roleBreakdown.map((r) => (
              <div key={r.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <r.icon className="h-4 w-4 text-muted-foreground" />
                    <span>{r.label}</span>
                  </div>
                  <span className="font-medium">{r.value}</span>
                </div>
                <Progress value={totalSeats > 0 ? (r.value / totalSeats) * 100 : 0} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </SettingsLayout>
  );
}
