import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { callEdgeFunction } from '@/lib/edgeFunctionClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search, UserPlus, Users, MoreHorizontal, Shield, UserX, UserCheck,
  Pencil, Archive, Phone, Mail, Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { SettingsLayout } from '@/components/SettingsLayout';
import { cn } from '@/lib/utils';

/* ── Constants ── */
const TEAM_TYPES = ['Admin', 'Office Staff', 'Worker', 'Subcontractor', 'Manager'];
const MEMBER_STATUSES = ['Invited', 'Active', 'Inactive', 'Archived'];
const SERVICE_CATEGORIES = [
  'Snow & Ice', 'Landscaping & Grounds', 'Junk Removal', 'Property Care & Maintenance',
  'Cleaning Services', 'Power Washing', 'Property Inspection', 'Bylaw / Compliance', 'Property Management',
];

const ROLE_FOR_TYPE: Record<string, string> = {
  Admin: 'admin',
  'Office Staff': 'staff',
  Worker: 'staff',
  Subcontractor: 'subcontractor',
  Manager: 'manager',
};

/* ── Types ── */
type TeamMember = {
  user_id: string;
  full_name: string;
  display_name: string | null;
  email: string;
  phone: string | null;
  team_type: string;
  status: string;
  is_active: boolean;
  service_categories: string[];
  notes: string | null;
  portal_admin: boolean;
  portal_worker: boolean;
  portal_subcontractor: boolean;
  roles: string[];
  banned: boolean;
  last_sign_in: string | null;
};

type FormState = {
  full_name: string;
  display_name: string;
  email: string;
  phone: string;
  password: string;
  team_type: string;
  service_categories: string[];
  notes: string;
  portal_admin: boolean;
  portal_worker: boolean;
  portal_subcontractor: boolean;
};

const emptyForm: FormState = {
  full_name: '', display_name: '', email: '', phone: '', password: '',
  team_type: 'Worker', service_categories: [], notes: '',
  portal_admin: false, portal_worker: true, portal_subcontractor: false,
};

/* ── Badges ── */
const TYPE_COLORS: Record<string, string> = {
  Admin: 'bg-destructive/10 text-destructive border-destructive/20',
  'Office Staff': 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20',
  Worker: 'bg-primary/10 text-primary border-primary/20',
  Subcontractor: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  Manager: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
};

function TypeBadge({ type }: { type: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${TYPE_COLORS[type] || 'bg-muted text-muted-foreground border-border'}`}>
      {type}
    </span>
  );
}

function MemberStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Active: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
    Invited: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
    Inactive: 'bg-destructive/10 text-destructive border-destructive/20',
    Archived: 'bg-muted text-muted-foreground border-border',
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${colors[status] || colors.Active}`}>
      {status}
    </span>
  );
}

function PortalSummary({ m }: { m: TeamMember }) {
  const portals: string[] = [];
  if (m.portal_admin) portals.push('Admin');
  if (m.portal_worker) portals.push('Worker');
  if (m.portal_subcontractor) portals.push('Sub');
  if (portals.length === 0) return <span className="text-xs text-muted-foreground">None</span>;
  return (
    <div className="flex gap-1 flex-wrap">
      {portals.map(p => (
        <span key={p} className="inline-flex items-center rounded border border-border bg-muted/50 px-1.5 py-0 text-[10px] font-medium text-muted-foreground">{p}</span>
      ))}
    </div>
  );
}

/* ── Main Component ── */
export default function ManageTeamPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  /* ── Data Fetching ── */
  const { data: teamMembers = [], isLoading } = useQuery({
    queryKey: ['manage_team_v2'],
    queryFn: async () => {
      const [tmRes, rolesRes, statusesRes] = await Promise.all([
        supabase.from('team_members' as any).select('*'),
        supabase.from('user_roles').select('user_id, role'),
        callEdgeFunction('manage-team', { action: 'get_user_statuses' }),
      ]);

      const tmData: any[] = (tmRes as any).data || [];
      const roles: any[] = rolesRes.data || [];
      const statuses: any[] = statusesData?.statuses || [];

      const roleMap: Record<string, string[]> = {};
      roles.forEach((r: any) => {
        if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
        roleMap[r.user_id].push(r.role);
      });

      const statusMap: Record<string, any> = {};
      statuses.forEach((s: any) => { statusMap[s.user_id] = s; });

      return tmData.map((tm: any): TeamMember => {
        const st = statusMap[tm.user_id];
        return {
          ...tm,
          roles: roleMap[tm.user_id] || [],
          banned: st?.banned || false,
          last_sign_in: st?.last_sign_in || null,
        };
      });
    },
  });

  const filtered = useMemo(() => {
    return teamMembers.filter((m) => {
      if (search) {
        const q = search.toLowerCase();
        if (![m.full_name, m.display_name, m.email, m.phone, m.team_type].filter(Boolean).join(' ').toLowerCase().includes(q)) return false;
      }
      if (typeFilter !== 'all' && m.team_type !== typeFilter) return false;
      if (statusFilter !== 'all' && m.status !== statusFilter) return false;
      return true;
    });
  }, [teamMembers, search, typeFilter, statusFilter]);

  const counts = useMemo(() => ({
    total: teamMembers.length,
    active: teamMembers.filter(m => m.status === 'Active').length,
    inactive: teamMembers.filter(m => m.status === 'Inactive').length,
    archived: teamMembers.filter(m => m.status === 'Archived').length,
  }), [teamMembers]);

  const invalidateAll = () => queryClient.invalidateQueries({ queryKey: ['manage_team_v2'] });

  /* ── Dialog helpers ── */
  const closeDialog = () => {
    setDialogOpen(false);
    setEditingUserId(null);
    setForm(emptyForm);
  };

  const openCreate = () => {
    setEditingUserId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (m: TeamMember) => {
    setEditingUserId(m.user_id);
    setForm({
      full_name: m.full_name,
      display_name: m.display_name || '',
      email: m.email,
      phone: m.phone || '',
      password: '',
      team_type: m.team_type,
      service_categories: m.service_categories || [],
      notes: m.notes || '',
      portal_admin: m.portal_admin,
      portal_worker: m.portal_worker,
      portal_subcontractor: m.portal_subcontractor,
    });
    setDialogOpen(true);
  };

  /* ── Create mutation ── */
  const createMutation = useMutation({
    mutationFn: async () => {
      const role = ROLE_FOR_TYPE[form.team_type] || 'staff';
      const { data, error } = await supabase.functions.invoke('manage-team', {
        body: {
          action: 'create_user',
          email: form.email,
          password: form.password,
          full_name: form.full_name || form.email,
          role,
          phone: form.phone || null,
          team_type: form.team_type,
          service_categories: form.service_categories,
          notes: form.notes || null,
          portal_admin: form.portal_admin,
          portal_worker: form.portal_worker,
          portal_subcontractor: form.portal_subcontractor,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'User created');
      closeDialog();
      invalidateAll();
    },
    onError: (err: any) => toast.error(err.message || 'Failed to create user'),
  });

  /* ── Update mutation ── */
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingUserId) throw new Error('No user selected');
      const { data, error } = await supabase.functions.invoke('manage-team', {
        body: {
          action: 'update_team_member',
          user_id: editingUserId,
          updates: {
            full_name: form.full_name,
            display_name: form.display_name || null,
            email: form.email,
            phone: form.phone || null,
            team_type: form.team_type,
            service_categories: form.service_categories,
            notes: form.notes || null,
            portal_admin: form.portal_admin,
            portal_worker: form.portal_worker,
            portal_subcontractor: form.portal_subcontractor,
          },
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success('Team member updated');
      closeDialog();
      invalidateAll();
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update'),
  });

  /* ── Status mutations ── */
  const statusAction = useMutation({
    mutationFn: async ({ userId, action }: { userId: string; action: string }) => {
      const { data, error } = await supabase.functions.invoke('manage-team', {
        body: { action, user_id: userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'Done');
      invalidateAll();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleSave = () => {
    if (!form.full_name.trim() || !form.email.trim()) {
      toast.error('Name and email are required');
      return;
    }
    if (!editingUserId && !form.password) {
      toast.error('Password is required for new users');
      return;
    }
    if (editingUserId) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  const toggleCategory = (cat: string) => {
    setForm(f => ({
      ...f,
      service_categories: f.service_categories.includes(cat)
        ? f.service_categories.filter(c => c !== cat)
        : [...f.service_categories, cat],
    }));
  };

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <SettingsLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Manage Team</h1>
          <p className="text-sm text-muted-foreground">Manage team members, portal access, and service assignments</p>
        </div>
        <Button onClick={openCreate}>
          <UserPlus className="h-4 w-4 mr-2" /> Add Member
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6 mt-6">
        {/* Main area */}
        <div className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search name, email, phone..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="All Types" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {TEAM_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[130px]"><SelectValue placeholder="All Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {MEMBER_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {filtered.length} Member{filtered.length !== 1 ? 's' : ''}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-8 text-center text-muted-foreground">Loading team...</div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No members match your filters.</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="hidden md:table-cell">Status</TableHead>
                        <TableHead className="hidden lg:table-cell">Portals</TableHead>
                        <TableHead className="hidden xl:table-cell">Category</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map(m => (
                        <TableRow key={m.user_id} className={cn('cursor-pointer', !m.is_active && 'opacity-60')} onClick={() => openEdit(m)}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0', m.is_active ? 'bg-primary/10' : 'bg-muted')}>
                                <span className={cn('text-xs font-semibold', m.is_active ? 'text-primary' : 'text-muted-foreground')}>
                                  {(m.full_name || '?')[0].toUpperCase()}
                                </span>
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-foreground truncate text-sm">{m.full_name}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span className="truncate">{m.email}</span>
                                  {m.phone && <span className="hidden sm:inline">· {m.phone}</span>}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell><TypeBadge type={m.team_type} /></TableCell>
                          <TableCell className="hidden md:table-cell"><MemberStatusBadge status={m.status} /></TableCell>
                          <TableCell className="hidden lg:table-cell"><PortalSummary m={m} /></TableCell>
                          <TableCell className="hidden xl:table-cell">
                            {m.service_categories?.length > 0 ? (
                              <span className="text-xs text-muted-foreground truncate max-w-[140px] block">
                                {m.service_categories[0]}{m.service_categories.length > 1 ? ` +${m.service_categories.length - 1}` : ''}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell onClick={e => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEdit(m)}>
                                  <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {m.status === 'Active' && (
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => {
                                      if (confirm(`Deactivate ${m.full_name}?`)) {
                                        statusAction.mutate({ userId: m.user_id, action: 'deactivate_user' });
                                      }
                                    }}
                                  >
                                    <UserX className="h-3.5 w-3.5 mr-2" /> Deactivate
                                  </DropdownMenuItem>
                                )}
                                {m.status === 'Inactive' && (
                                  <>
                                    <DropdownMenuItem onClick={() => statusAction.mutate({ userId: m.user_id, action: 'reactivate_user' })}>
                                      <UserCheck className="h-3.5 w-3.5 mr-2" /> Reactivate
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => {
                                      if (confirm(`Archive ${m.full_name}? This cannot be undone easily.`)) {
                                        statusAction.mutate({ userId: m.user_id, action: 'archive_user' });
                                      }
                                    }}>
                                      <Archive className="h-3.5 w-3.5 mr-2" /> Archive
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" /> Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-bold text-foreground">{counts.total}</span>
                <span className="text-xs text-muted-foreground">Total Members</span>
              </div>
              <div className="h-px bg-border" />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Active</span><span className="font-medium text-emerald-600">{counts.active}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Inactive</span><span className="font-medium text-destructive">{counts.inactive}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Archived</span><span className="font-medium text-muted-foreground">{counts.archived}</span></div>
              </div>
              <div className="h-px bg-border" />
              <div className="space-y-1.5 text-sm">
                {TEAM_TYPES.map(t => {
                  const c = teamMembers.filter(m => m.team_type === t).length;
                  return c > 0 ? (
                    <div key={t} className="flex justify-between">
                      <span className="text-muted-foreground">{t}</span>
                      <span className="font-medium text-foreground">{c}</span>
                    </div>
                  ) : null;
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={v => { if (!v) closeDialog(); else setDialogOpen(true); }}>
        <DialogContent className="max-w-lg max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{editingUserId ? 'Edit Team Member' : 'Add Team Member'}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh] pr-4">
            <div className="space-y-4 py-1">
              {/* Identity */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Full Name *</Label>
                  <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Sarah Johnson" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Display Name</Label>
                  <Input value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} placeholder="Preferred name" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Email *</Label>
                  <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="sarah@company.ca" disabled={!!editingUserId} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Phone</Label>
                  <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(555) 123-4567" />
                </div>
              </div>

              {!editingUserId && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Temporary Password *</Label>
                  <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 8 characters" />
                </div>
              )}

              {/* Team Type */}
              <div className="space-y-1.5">
                <Label className="text-xs">Team Type</Label>
                <Select value={form.team_type} onValueChange={v => {
                  const updates: Partial<FormState> = { team_type: v };
                  if (v === 'Admin') { updates.portal_admin = true; updates.portal_worker = false; updates.portal_subcontractor = false; }
                  if (v === 'Worker' || v === 'Office Staff') { updates.portal_admin = false; updates.portal_worker = true; updates.portal_subcontractor = false; }
                  if (v === 'Subcontractor') { updates.portal_admin = false; updates.portal_worker = false; updates.portal_subcontractor = true; }
                  if (v === 'Manager') { updates.portal_admin = true; updates.portal_worker = false; updates.portal_subcontractor = false; }
                  setForm(f => ({ ...f, ...updates }));
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TEAM_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Service Categories */}
              <div className="space-y-1.5">
                <Label className="text-xs">Service Categories</Label>
                <div className="flex flex-wrap gap-1.5">
                  {SERVICE_CATEGORIES.map(cat => {
                    const active = form.service_categories.includes(cat);
                    return (
                      <button key={cat} type="button" onClick={() => toggleCategory(cat)}
                        className={cn('text-[11px] px-2.5 py-1 rounded-full border transition-all', active ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-border text-muted-foreground hover:border-primary/40')}>
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Portal Access */}
              <div className="space-y-2">
                <Label className="text-xs">Portal Access</Label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Admin Portal</p>
                      <p className="text-xs text-muted-foreground">Full admin dashboard access</p>
                    </div>
                    <Switch checked={form.portal_admin} onCheckedChange={v => setForm(f => ({ ...f, portal_admin: v }))} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Worker Portal</p>
                      <p className="text-xs text-muted-foreground">Field worker mobile experience</p>
                    </div>
                    <Switch checked={form.portal_worker} onCheckedChange={v => setForm(f => ({ ...f, portal_worker: v }))} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Subcontractor Portal</p>
                      <p className="text-xs text-muted-foreground">External contractor experience</p>
                    </div>
                    <Switch checked={form.portal_subcontractor} onCheckedChange={v => setForm(f => ({ ...f, portal_subcontractor: v }))} />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label className="text-xs">Notes</Label>
                <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} placeholder="Internal notes about this team member..." />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? 'Saving...' : editingUserId ? 'Save Changes' : 'Create Member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsLayout>
  );
}
