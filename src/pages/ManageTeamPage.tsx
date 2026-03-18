import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Search, UserPlus, Users, MoreHorizontal, Shield, Eye, UserX, UserCheck, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { SettingsLayout } from '@/components/SettingsLayout';

type UserStatus = {
  user_id: string;
  email: string;
  banned: boolean;
  last_sign_in: string | null;
  created_at: string;
};

type TeamUser = {
  user_id: string;
  display_name: string | null;
  email: string;
  roles: string[];
  portal_access: string[];
  banned: boolean;
  last_sign_in: string | null;
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

function StatusBadge({ banned }: { banned: boolean }) {
  if (banned) {
    return (
      <span className="inline-flex items-center rounded-full bg-destructive/10 text-destructive border border-destructive/20 px-2 py-0.5 text-[11px] font-semibold">
        Deactivated
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold">
      Active
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

  // Edit role dialog state
  const [editRoleOpen, setEditRoleOpen] = useState(false);
  const [editRoleUser, setEditRoleUser] = useState<TeamUser | null>(null);
  const [editRoleNewRole, setEditRoleNewRole] = useState('');

  // Fetch all profiles + roles + auth statuses
  const { data: teamUsers = [], isLoading } = useQuery({
    queryKey: ['manage_team_users'],
    queryFn: async () => {
      // Parallel: profiles, roles, auth statuses
      const [profilesRes, rolesRes, statusesRes] = await Promise.all([
        supabase.from('profiles').select('user_id, display_name'),
        supabase.from('user_roles').select('user_id, role'),
        supabase.functions.invoke('manage-team', { body: { action: 'get_user_statuses' } }),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;

      const profiles = profilesRes.data || [];
      const roles = rolesRes.data || [];
      const statuses: UserStatus[] = statusesRes.data?.statuses || [];

      // Build lookup maps
      const roleMap: Record<string, string[]> = {};
      roles.forEach((r: any) => {
        if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
        roleMap[r.user_id].push(r.role);
      });

      const statusMap: Record<string, UserStatus> = {};
      statuses.forEach((s) => { statusMap[s.user_id] = s; });

      const users: TeamUser[] = profiles.map((p: any) => {
        const st = statusMap[p.user_id];
        return {
          user_id: p.user_id,
          display_name: p.display_name,
          email: st?.email || p.display_name || '—',
          roles: roleMap[p.user_id] || [],
          portal_access: (roleMap[p.user_id] || []).map(portalForRole).filter(Boolean) as string[],
          banned: st?.banned || false,
          last_sign_in: st?.last_sign_in || null,
        };
      });

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
    active: teamUsers.filter((u) => !u.banned).length,
    deactivated: teamUsers.filter((u) => u.banned).length,
    admins: teamUsers.filter((u) => u.roles.includes('admin')).length,
    staff: teamUsers.filter((u) => u.roles.includes('staff')).length,
    customers: teamUsers.filter((u) => u.roles.includes('customer')).length,
    subcontractors: teamUsers.filter((u) => u.roles.includes('subcontractor')).length,
  }), [teamUsers]);

  const invalidateAll = () => queryClient.invalidateQueries({ queryKey: ['manage_team_users'] });

  // ── Create user mutation ──
  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('manage-team', {
        body: {
          action: 'create_user',
          email: inviteEmail,
          password: invitePassword,
          full_name: inviteName || inviteEmail,
          role: inviteRole,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'User created successfully');
      setInviteOpen(false);
      setInviteEmail('');
      setInviteName('');
      setInvitePassword('');
      setInviteRole('staff');
      invalidateAll();
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to create user');
    },
  });

  // ── Deactivate mutation ──
  const deactivateMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('manage-team', {
        body: { action: 'deactivate_user', user_id: userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success('User deactivated');
      invalidateAll();
    },
    onError: (err: any) => toast.error(err.message || 'Failed to deactivate'),
  });

  // ── Reactivate mutation ──
  const reactivateMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('manage-team', {
        body: { action: 'reactivate_user', user_id: userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success('User reactivated');
      invalidateAll();
    },
    onError: (err: any) => toast.error(err.message || 'Failed to reactivate'),
  });

  // ── Edit role mutation ──
  const editRoleMutation = useMutation({
    mutationFn: async () => {
      if (!editRoleUser) throw new Error('No user selected');
      const { data, error } = await supabase.functions.invoke('manage-team', {
        body: {
          action: 'update_role',
          user_id: editRoleUser.user_id,
          new_role: editRoleNewRole,
          old_role: editRoleUser.roles[0] || null,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'Role updated');
      setEditRoleOpen(false);
      setEditRoleUser(null);
      invalidateAll();
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update role'),
  });

  const openEditRole = (user: TeamUser) => {
    setEditRoleUser(user);
    setEditRoleNewRole(user.roles[0] || 'staff');
    setEditRoleOpen(true);
  };

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <SettingsLayout>
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
              <DialogTitle>Add New User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input placeholder="Sarah Johnson" value={inviteName} onChange={(e) => setInviteName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" placeholder="sarah@praetoriagroup.ca" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
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
                  Customer accounts are created from the Customer Detail page.
                </p>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!inviteEmail || !invitePassword || createMutation.isPending}
              >
                {createMutation.isPending ? 'Creating...' : 'Create Account'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 mt-6">
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
                      <TableHead className="hidden md:table-cell">Status</TableHead>
                      <TableHead className="hidden lg:table-cell">Last Login</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((user) => (
                      <TableRow key={user.user_id} className={user.banned ? 'opacity-60' : ''}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${user.banned ? 'bg-muted' : 'bg-primary/10'}`}>
                              <span className={`text-xs font-semibold ${user.banned ? 'text-muted-foreground' : 'text-primary'}`}>
                                {(user.display_name || '?')[0].toUpperCase()}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-foreground truncate">{user.display_name || '—'}</p>
                              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
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
                          <StatusBadge banned={user.banned} />
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                          {formatDate(user.last_sign_in)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditRole(user)}>
                                <Shield className="h-3.5 w-3.5 mr-2" /> Edit Role
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {user.banned ? (
                                <DropdownMenuItem
                                  onClick={() => reactivateMutation.mutate(user.user_id)}
                                  disabled={reactivateMutation.isPending}
                                >
                                  <UserCheck className="h-3.5 w-3.5 mr-2" /> Reactivate User
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => {
                                    if (confirm(`Deactivate ${user.display_name || user.email}? They will be unable to log in.`)) {
                                      deactivateMutation.mutate(user.user_id);
                                    }
                                  }}
                                  disabled={deactivateMutation.isPending}
                                >
                                  <UserX className="h-3.5 w-3.5 mr-2" /> Deactivate User
                                </DropdownMenuItem>
                              )}
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
                  <span className="text-muted-foreground">Active</span>
                  <span className="font-medium text-emerald-600">{counts.active}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Deactivated</span>
                  <span className="font-medium text-destructive">{counts.deactivated}</span>
                </div>
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

      {/* Edit Role Dialog */}
      <Dialog open={editRoleOpen} onOpenChange={setEditRoleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Role — {editRoleUser?.display_name || editRoleUser?.email}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Current role{editRoleUser?.roles?.length === 1 ? '' : 's'}:</p>
              <div className="flex gap-1">
                {editRoleUser?.roles.map((r) => <RoleBadge key={r} role={r} />)}
                {editRoleUser?.roles.length === 0 && <span className="text-sm text-muted-foreground">None</span>}
              </div>
            </div>
            <div className="space-y-2">
              <Label>New Role</Label>
              <Select value={editRoleNewRole} onValueChange={setEditRoleNewRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="staff">Staff / Worker</SelectItem>
                  <SelectItem value="subcontractor">Subcontractor</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={() => editRoleMutation.mutate()}
              disabled={editRoleMutation.isPending}
            >
              {editRoleMutation.isPending ? 'Saving...' : 'Save Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsLayout>
  );
}
