import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Search, UserPlus, Users, MoreHorizontal, Shield, Eye, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { SettingsLayout } from '@/components/SettingsLayout';

type TeamUser = {
  user_id: string;
  display_name: string | null;
  email: string;
  roles: string[];
  portal_access: string[];
};

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-destructive/10 text-destructive border-destructive/20',
  staff: 'bg-primary/10 text-primary border-primary/20',
  customer: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  subcontractor: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
};

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${ROLE_COLORS[role] || 'bg-muted text-muted-foreground'}`}>
      {role}
    </span>
  );
}

function portalForRole(role: string): string | null {
  const map: Record<string, string> = {
    admin: 'Internal Ops',
    staff: 'Worker Portal',
    subcontractor: 'Subcontractor Portal',
    customer: 'Customer Portal',
  };
  return map[role] || null;
}

export default function ManageTeamPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('staff');
  const [invitePassword, setInvitePassword] = useState('');

  // Fetch all profiles + roles
  const { data: teamUsers = [], isLoading } = useQuery({
    queryKey: ['manage_team_users'],
    queryFn: async () => {
      // Get all profiles
      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('user_id, display_name');
      if (pErr) throw pErr;

      // Get all roles
      const { data: roles, error: rErr } = await supabase
        .from('user_roles')
        .select('user_id, role');
      if (rErr) throw rErr;

      // Group roles by user_id
      const roleMap: Record<string, string[]> = {};
      roles.forEach((r: any) => {
        if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
        roleMap[r.user_id].push(r.role);
      });

      // Build user list from profiles
      const users: TeamUser[] = (profiles || []).map((p: any) => ({
        user_id: p.user_id,
        display_name: p.display_name,
        email: p.display_name || '—', // profiles don't store email, display_name often is email
        roles: roleMap[p.user_id] || [],
        portal_access: (roleMap[p.user_id] || []).map(portalForRole).filter(Boolean) as string[],
      }));

      return users;
    },
  });

  const filtered = useMemo(() => {
    return teamUsers.filter((u) => {
      if (search) {
        const q = search.toLowerCase();
        const match = [u.display_name, u.email, ...u.roles].join(' ').toLowerCase();
        if (!match.includes(q)) return false;
      }
      if (roleFilter !== 'all' && !u.roles.includes(roleFilter)) return false;
      return true;
    });
  }, [teamUsers, search, roleFilter]);

  const counts = useMemo(() => ({
    total: teamUsers.length,
    admins: teamUsers.filter((u) => u.roles.includes('admin')).length,
    staff: teamUsers.filter((u) => u.roles.includes('staff')).length,
    customers: teamUsers.filter((u) => u.roles.includes('customer')).length,
    subcontractors: teamUsers.filter((u) => u.roles.includes('subcontractor')).length,
  }), [teamUsers]);

  // Invite user mutation
  const inviteMutation = useMutation({
    mutationFn: async () => {
      if (inviteRole === 'customer') {
        throw new Error('Use the customer invite flow from the Customer Detail page.');
      }
      // For staff/admin: create auth user via edge function pattern
      // For now, create via edge function seed-test-accounts pattern
      const { data, error } = await supabase.functions.invoke('seed-test-accounts', {
        body: {
          accounts: [{
            email: inviteEmail,
            password: invitePassword,
            full_name: inviteName || inviteEmail,
            role: inviteRole,
          }],
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('User invited successfully');
      setInviteOpen(false);
      setInviteEmail('');
      setInviteName('');
      setInvitePassword('');
      setInviteRole('staff');
      queryClient.invalidateQueries({ queryKey: ['manage_team_users'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to invite user');
    },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Manage Team</h1>
          <p className="text-sm text-muted-foreground">Manage user accounts, roles, and portal access across your organization</p>
        </div>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite New User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input placeholder="Jane Smith" value={inviteName} onChange={(e) => setInviteName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" placeholder="jane@praetoria.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Temporary Password</Label>
                <Input type="password" placeholder="Min 8 characters" value={invitePassword} onChange={(e) => setInvitePassword(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="staff">Staff / Worker</SelectItem>
                    <SelectItem value="subcontractor">Subcontractor</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Customer accounts are created from the Customer Detail page via the Invite to Portal flow.
                </p>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button
                onClick={() => inviteMutation.mutate()}
                disabled={!inviteEmail || !invitePassword || inviteMutation.isPending}
              >
                {inviteMutation.isPending ? 'Creating...' : 'Create Account'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        {/* Main table area */}
        <div className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search by name, email, or role..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="All Roles" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="subcontractor">Subcontractor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {filtered.length} User{filtered.length !== 1 ? 's' : ''}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-8 text-center text-muted-foreground">Loading team members...</div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No users match your filters.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="hidden md:table-cell">Portal Access</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((user) => (
                      <TableRow key={user.user_id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <span className="text-xs font-semibold text-primary">
                                {(user.display_name || '?')[0].toUpperCase()}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-foreground truncate">{user.display_name || '—'}</p>
                              <p className="text-xs text-muted-foreground truncate">{user.user_id.slice(0, 8)}…</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {user.roles.length > 0 ? user.roles.map((r) => (
                              <RoleBadge key={r} role={r} />
                            )) : (
                              <span className="text-xs text-muted-foreground">No role</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {user.portal_access.length > 0 ? user.portal_access.map((p) => (
                              <span key={p} className="inline-flex items-center rounded border border-border bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                {p}
                              </span>
                            )) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => toast.info('View user detail coming soon')}>
                                <Eye className="h-3.5 w-3.5 mr-2" /> View User
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => toast.info('Edit role coming soon')}>
                                <Shield className="h-3.5 w-3.5 mr-2" /> Edit Role
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right summary sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4" />
                Seat Usage
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-bold text-foreground">{counts.total}</span>
                <span className="text-xs text-muted-foreground">Total Users</span>
              </div>
              <div className="h-px bg-border" />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Admins</span>
                  <span className="font-medium text-foreground">{counts.admins}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Staff / Workers</span>
                  <span className="font-medium text-foreground">{counts.staff}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subcontractors</span>
                  <span className="font-medium text-foreground">{counts.subcontractors}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Customers</span>
                  <span className="font-medium text-foreground">{counts.customers}</span>
                </div>
              </div>
              <div className="h-px bg-border" />
              <p className="text-xs text-muted-foreground">
                Unlimited seats on your current plan.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Role Guide</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <div><RoleBadge role="admin" /> <span className="ml-1">Full system access</span></div>
              <div><RoleBadge role="staff" /> <span className="ml-1">Worker portal & field ops</span></div>
              <div><RoleBadge role="subcontractor" /> <span className="ml-1">Subcontractor portal</span></div>
              <div><RoleBadge role="customer" /> <span className="ml-1">Customer portal only</span></div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
