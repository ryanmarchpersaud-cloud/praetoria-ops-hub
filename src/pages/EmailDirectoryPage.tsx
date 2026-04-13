import { useState, useMemo } from 'react';
import { useCustomers } from '@/hooks/useCustomers';
import { useLeads } from '@/hooks/useLeads';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Search, Download, Mail, Users, UserPlus, Filter, CheckSquare } from 'lucide-react';

interface EmailContact {
  id: string;
  name: string;
  email: string;
  source: 'Customer' | 'Lead';
  company: string | null;
  phone: string | null;
  city: string | null;
  status: string;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  lost: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  paused: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  New: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  Contacted: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400',
  Qualified: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
  Converted: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  Lost: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export default function EmailDirectoryPage() {
  const { data: customers = [], isLoading: loadingCustomers } = useCustomers();
  const { data: leads = [], isLoading: loadingLeads } = useLeads();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const contacts: EmailContact[] = useMemo(() => {
    const list: EmailContact[] = [];

    customers.forEach((c: any) => {
      if (c.email) {
        list.push({
          id: `cust-${c.id}`,
          name: `${c.first_name} ${c.last_name}`,
          email: c.email,
          source: 'Customer',
          company: c.company_name,
          phone: c.phone,
          city: c.city,
          status: c.customer_status || 'active',
          created_at: c.created_at,
        });
      }
    });

    leads.forEach((l: any) => {
      if (l.email) {
        list.push({
          id: `lead-${l.id}`,
          name: `${l.first_name} ${l.last_name}`,
          email: l.email,
          source: 'Lead',
          company: l.company_name,
          phone: l.phone,
          city: l.city,
          status: l.status,
          created_at: l.created_at,
        });
      }
    });

    // De-duplicate by email, prefer customer over lead
    const seen = new Map<string, EmailContact>();
    list.forEach((c) => {
      const key = c.email.toLowerCase();
      if (!seen.has(key) || c.source === 'Customer') {
        seen.set(key, c);
      }
    });

    return Array.from(seen.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [customers, leads]);

  const filtered = useMemo(() => {
    return contacts.filter((c) => {
      if (sourceFilter !== 'all' && c.source !== sourceFilter) return false;
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          (c.company?.toLowerCase().includes(q) ?? false)
        );
      }
      return true;
    });
  }, [contacts, search, sourceFilter, statusFilter]);

  const allStatuses = useMemo(() => {
    const s = new Set<string>();
    contacts.forEach((c) => s.add(c.status));
    return Array.from(s).sort();
  }, [contacts]);

  const isAllSelected = filtered.length > 0 && filtered.every((c) => selected.has(c.id));

  const toggleAll = () => {
    if (isAllSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((c) => c.id)));
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const exportCSV = () => {
    const rows = (selected.size > 0 ? filtered.filter((c) => selected.has(c.id)) : filtered);
    if (rows.length === 0) {
      toast({ title: 'No contacts to export', variant: 'destructive' });
      return;
    }
    const header = ['Name', 'Email', 'Source', 'Company', 'Phone', 'City', 'Status'];
    const csv = [
      header.join(','),
      ...rows.map((r) =>
        [r.name, r.email, r.source, r.company || '', r.phone || '', r.city || '', r.status]
          .map((v) => `"${v.replace(/"/g, '""')}"`)
          .join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `email-directory-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: `Exported ${rows.length} contacts` });
  };

  const isLoading = loadingCustomers || loadingLeads;
  const customerCount = contacts.filter((c) => c.source === 'Customer').length;
  const leadCount = contacts.filter((c) => c.source === 'Lead').length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Email Directory</h1>
          <p className="text-sm text-muted-foreground">
            {contacts.length} unique email{contacts.length !== 1 ? 's' : ''} across all sources
          </p>
        </div>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <Badge variant="secondary" className="h-9 px-3 gap-1.5">
              <CheckSquare className="h-3.5 w-3.5" />
              {selected.size} selected
            </Badge>
          )}
          <Button variant="outline" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{contacts.length}</p>
              <p className="text-xs text-muted-foreground">Total Emails</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{customerCount}</p>
              <p className="text-xs text-muted-foreground">Customers</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="h-10 w-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <UserPlus className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{leadCount}</p>
              <p className="text-xs text-muted-foreground">Leads</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Filter className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{filtered.length}</p>
              <p className="text-xs text-muted-foreground">Showing</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, email, company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="Customer">Customers</SelectItem>
            <SelectItem value="Lead">Leads</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {allStatuses.map((s) => (
              <SelectItem key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox checked={isAllSelected} onCheckedChange={toggleAll} />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="hidden md:table-cell">Source</TableHead>
              <TableHead className="hidden md:table-cell">Company</TableHead>
              <TableHead className="hidden lg:table-cell">City</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No contacts with email addresses found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell>
                    <Checkbox
                      checked={selected.has(contact.id)}
                      onCheckedChange={() => toggleOne(contact.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{contact.name}</TableCell>
                  <TableCell className="text-sm">{contact.email}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant={contact.source === 'Customer' ? 'default' : 'secondary'} className="text-[10px]">
                      {contact.source}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {contact.company || '—'}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {contact.city || '—'}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        STATUS_COLORS[contact.status] || 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {contact.status.charAt(0).toUpperCase() + contact.status.slice(1)}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Twilio / Marketing note */}
      <Card className="border-dashed">
        <CardContent className="p-4 flex items-start gap-3">
          <Mail className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium">Email Marketing Integration</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Export your contacts as CSV and import into Twilio SendGrid, Mailchimp, or any email marketing
              platform. Twilio SendGrid supports bulk email campaigns with templates, scheduling, and tracking.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
