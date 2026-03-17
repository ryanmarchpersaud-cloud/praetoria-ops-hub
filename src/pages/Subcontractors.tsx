import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAllSubcontractors } from '@/hooks/useSubcontractor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Truck, ChevronRight } from 'lucide-react';

function StatusChip({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    inactive: 'bg-muted text-muted-foreground',
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${colors[status] || 'bg-muted text-muted-foreground'}`}>{status}</span>;
}

export default function Subcontractors() {
  const navigate = useNavigate();
  const { data: subs = [], isLoading } = useAllSubcontractors();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = useMemo(() => {
    return subs.filter(s => {
      if (search) {
        const q = search.toLowerCase();
        const match = [s.company_name, s.contact_name, s.email, s.phone].filter(Boolean).join(' ').toLowerCase();
        if (!match.includes(q)) return false;
      }
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      return true;
    });
  }, [subs, search, statusFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Subcontractors</h1>
        <p className="text-sm text-muted-foreground">Manage external contractors, compliance, assignments, and invoices</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Truck className="h-5 w-5 text-primary" /></div>
          <div><p className="text-2xl font-bold text-foreground">{subs.length}</p><p className="text-xs text-muted-foreground">Total</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center"><Truck className="h-5 w-5 text-green-600" /></div>
          <div><p className="text-2xl font-bold text-foreground">{subs.filter(s => s.status === 'active').length}</p><p className="text-xs text-muted-foreground">Active</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center"><Truck className="h-5 w-5 text-amber-600" /></div>
          <div><p className="text-2xl font-bold text-foreground">{subs.filter(s => s.status === 'pending').length}</p><p className="text-xs text-muted-foreground">Pending</p></div>
        </CardContent></Card>
      </div>

      <Card><CardContent className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search company, contact, email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent></Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">{filtered.length} Subcontractor{filtered.length !== 1 ? 's' : ''}</CardTitle></CardHeader>
        <CardContent className="p-0">
          {isLoading ? <div className="p-8 text-center text-muted-foreground">Loading...</div> :
          filtered.length === 0 ? <div className="p-8 text-center text-muted-foreground">No subcontractors found.</div> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Company</TableHead>
                <TableHead className="hidden sm:table-cell">Contact</TableHead>
                <TableHead className="hidden md:table-cell">Area</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Compliance</TableHead>
                <TableHead className="w-8"></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filtered.map(sub => {
                  const complianceOk = sub.insurance_status === 'active' && sub.wcb_status === 'active' && sub.agreement_signed_status !== 'missing';
                  return (
                    <TableRow key={sub.id} className="cursor-pointer" onClick={() => navigate(`/subcontractors/${sub.id}`)}>
                      <TableCell><p className="font-medium text-foreground">{sub.company_name}</p></TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{sub.contact_name}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{sub.service_area_summary || '—'}</TableCell>
                      <TableCell><StatusChip status={sub.status} /></TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className={`text-xs font-medium ${complianceOk ? 'text-green-600' : 'text-amber-600'}`}>{complianceOk ? '✓ Compliant' : '⚠ Issues'}</span>
                      </TableCell>
                      <TableCell><ChevronRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
