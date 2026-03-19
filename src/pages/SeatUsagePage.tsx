import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SettingsLayout } from '@/components/SettingsLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, UserCheck, UserX, Shield, HardHat, UserCog, ArrowRight, UserPlus, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TeamMember {
  id: string;
  display_name: string;
  email: string;
  team_type: string;
  status: string;
  portal_admin: boolean;
  portal_worker: boolean;
  portal_subcontractor: boolean;
  created_at: string;
}

interface RoleCounts { admin: number; staff: number; subcontractor: number; customer: number; }

export default function SeatUsagePage() {
  const navigate = useNavigate();
  const [counts, setCounts] = useState<RoleCounts>({ admin: 0, staff: 0, subcontractor: 0, customer: 0 });
  const [totalProfiles, setTotalProfiles] = useState(0);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [inactiveCount, setInactiveCount] = useState(0);
  const [recentMembers, setRecentMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [rolesRes, profilesRes, membersRes] = await Promise.all([
        supabase.from('user_roles').select('role'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('team_members').select('*').order('created_at', { ascending: false }),
      ]);

      const c: RoleCounts = { admin: 0, staff: 0, subcontractor: 0, customer: 0 };
      (rolesRes.data ?? []).forEach((r: any) => {
        if (r.role in c) c[r.role as keyof RoleCounts]++;
      });
      setCounts(c);
      setTotalProfiles(profilesRes.count ?? 0);

      const m = (membersRes.data ?? []) as TeamMember[];
      setMembers(m);
      setActiveCount(m.filter(x => x.status === 'active').length);
      setInactiveCount(m.filter(x => x.status !== 'active').length);
      setRecentMembers(m.slice(0, 5));
      setLoading(false);
    }
    load();
  }, []);

  const totalSeats = counts.admin + counts.staff + counts.subcontractor + counts.customer;

  const summaryCards = [
    { label: 'Total Accounts', value: totalProfiles, icon: Users, color: 'text-primary' },
    { label: 'Active Members', value: activeCount, icon: UserCheck, color: 'text-green-600' },
    { label: 'Inactive / Archived', value: inactiveCount, icon: UserX, color: 'text-destructive' },
    { label: 'Role Assignments', value: totalSeats, icon: Shield, color: 'text-orange-500' },
  ];

  const roleBreakdown = [
    { label: 'Admin', value: counts.admin, icon: Shield, color: 'text-destructive' },
    { label: 'Staff', value: counts.staff, icon: HardHat, color: 'text-primary' },
    { label: 'Subcontractor', value: counts.subcontractor, icon: UserCog, color: 'text-orange-500' },
    { label: 'Customer', value: counts.customer, icon: Users, color: 'text-green-600' },
  ];

  // Portal access breakdown
  const portalBreakdown = [
    { label: 'Admin Portal', value: members.filter(m => m.portal_admin).length },
    { label: 'Worker Portal', value: members.filter(m => m.portal_worker).length },
    { label: 'Subcontractor Portal', value: members.filter(m => m.portal_subcontractor).length },
    { label: 'Customer Portal', value: 0 },
  ];

  // Team type breakdown
  const teamTypes = members.reduce<Record<string, number>>((acc, m) => {
    const t = m.team_type || 'Unknown';
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});

  if (loading) {
    return <SettingsLayout><div className="flex items-center justify-center py-20 text-muted-foreground">Loading…</div></SettingsLayout>;
  }

  return (
    <SettingsLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Seat Usage & Limits</h1>
            <p className="text-sm text-muted-foreground">User accounts, role distribution, and portal access overview.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/settings/team')}><UserPlus className="h-4 w-4 mr-1" />Manage Team</Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/settings/roles')}><Shield className="h-4 w-4 mr-1" />Roles</Button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid gap-4 md:grid-cols-4">
          {summaryCards.map(m => (
            <Card key={m.label}>
              <CardContent className="pt-4 flex items-center gap-3">
                <m.icon className={`h-8 w-8 ${m.color}`} />
                <div><p className="text-2xl font-bold">{m.value}</p><p className="text-xs text-muted-foreground">{m.label}</p></div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Role Distribution */}
          <Card>
            <CardHeader><CardTitle>Role Distribution</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {roleBreakdown.map(r => (
                <div key={r.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2"><r.icon className={`h-4 w-4 ${r.color}`} /><span>{r.label}</span></div>
                    <span className="font-medium">{r.value}</span>
                  </div>
                  <Progress value={totalSeats > 0 ? (r.value / totalSeats) * 100 : 0} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Portal Access */}
          <Card>
            <CardHeader><CardTitle>Portal Access</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {portalBreakdown.map(p => (
                <div key={p.label} className="flex items-center justify-between text-sm">
                  <span>{p.label}</span>
                  <Badge variant="outline">{p.value} users</Badge>
                </div>
              ))}
              <div className="pt-2 border-t">
                <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">By Team Type</p>
                {Object.entries(teamTypes).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between text-sm py-1">
                    <span className="capitalize">{type}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Members */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Additions</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/settings/team')}>View All <ArrowRight className="h-3.5 w-3.5 ml-1" /></Button>
          </CardHeader>
          <CardContent>
            {recentMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No team members yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Added</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentMembers.map(m => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div><p className="font-medium text-sm">{m.display_name}</p><p className="text-xs text-muted-foreground">{m.email}</p></div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{m.team_type}</Badge></TableCell>
                      <TableCell><Badge variant={m.status === 'active' ? 'default' : 'secondary'}>{m.status}</Badge></TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{new Date(m.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </SettingsLayout>
  );
}
