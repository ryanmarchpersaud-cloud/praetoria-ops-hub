import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useEmployees } from '@/hooks/useEmployees';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Users, ChevronRight } from 'lucide-react';

const statusOptions = ['all', 'active', 'inactive', 'on-leave', 'terminated'] as const;
const serviceOptions = ['all', 'Snow & Ice', 'Landscaping & Grounds', 'Junk Removal', 'Property Care & Maintenance', 'Cleaning Services', 'Power Washing'] as const;

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    inactive: 'bg-muted text-muted-foreground',
    'on-leave': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    terminated: 'bg-destructive/10 text-destructive',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] || colors.inactive}`}>
      {status}
    </span>
  );
}

export default function Employees() {
  const { data: employees = [], isLoading } = useEmployees();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('all');

  const filtered = useMemo(() => {
    return employees.filter(e => {
      if (search) {
        const q = search.toLowerCase();
        const match = [e.full_name, e.employee_id, e.role_title, e.work_email, e.phone]
          .filter(Boolean).join(' ').toLowerCase();
        if (!match.includes(q)) return false;
      }
      if (statusFilter !== 'all' && e.employment_status !== statusFilter) return false;
      if (serviceFilter !== 'all' && e.primary_service_category !== serviceFilter && e.secondary_service_category !== serviceFilter) return false;
      return true;
    });
  }, [employees, search, statusFilter, serviceFilter]);

  const counts = useMemo(() => ({
    total: employees.length,
    active: employees.filter(e => e.employment_status === 'active').length,
    onLeave: employees.filter(e => e.employment_status === 'on-leave').length,
  }), [employees]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Employees</h1>
        <p className="text-sm text-muted-foreground">Manage worker profiles, HR records, and employment details</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{counts.total}</p>
              <p className="text-xs text-muted-foreground">Total Employees</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{counts.active}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{counts.onLeave}</p>
              <p className="text-xs text-muted-foreground">On Leave</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search name, ID, role, email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                {statusOptions.map(s => <SelectItem key={s} value={s}>{s === 'all' ? 'All Statuses' : s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={serviceFilter} onValueChange={setServiceFilter}>
              <SelectTrigger className="w-full sm:w-[200px]"><SelectValue placeholder="Service Line" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Service Lines</SelectItem>
                {serviceOptions.filter(s => s !== 'all').map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Employee table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {filtered.length} Employee{filtered.length !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading employees...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No employees match your filters.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Role</TableHead>
                  <TableHead className="hidden md:table-cell">Service Line</TableHead>
                  <TableHead className="hidden md:table-cell">Branch</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-8"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(emp => (
                  <TableRow key={emp.id} className="cursor-pointer" onClick={() => window.location.href = `/employees/${emp.user_id}`}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">{emp.full_name || '—'}</p>
                        <p className="text-xs text-muted-foreground">{emp.employee_id || emp.work_email || '—'}</p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{emp.role_title || '—'}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{emp.primary_service_category || '—'}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{emp.branch_location || '—'}</TableCell>
                    <TableCell><StatusBadge status={emp.employment_status} /></TableCell>
                    <TableCell><ChevronRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
