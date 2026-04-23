import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Receipt, Search, Paperclip, ChevronRight, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(n);

const statusColors: Record<string, string> = {
  submitted: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  paid: 'bg-primary/10 text-primary',
  rejected: 'bg-destructive/10 text-destructive',
};

const STATUS_TABS: Array<{ key: string; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'submitted', label: 'Pending Review' },
  { key: 'approved', label: 'Approved' },
  { key: 'paid', label: 'Paid' },
  { key: 'rejected', label: 'Rejected' },
];

export default function AdminSubcontractorInvoicesPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['admin_subcontractor_invoices_index'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subcontractor_invoices')
        .select('*, subcontractors(company_name, contact_name, email)')
        .order('submitted_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const counts = {
    all: invoices.length,
    submitted: invoices.filter((i: any) => i.status === 'submitted').length,
    approved: invoices.filter((i: any) => i.status === 'approved').length,
    paid: invoices.filter((i: any) => i.status === 'paid').length,
    rejected: invoices.filter((i: any) => i.status === 'rejected').length,
  };

  const totals = {
    pending: invoices
      .filter((i: any) => i.status === 'submitted')
      .reduce((s: number, i: any) => s + Number(i.amount || 0), 0),
    approved: invoices
      .filter((i: any) => i.status === 'approved')
      .reduce((s: number, i: any) => s + Number(i.amount || 0), 0),
    paid: invoices
      .filter((i: any) => i.status === 'paid')
      .reduce((s: number, i: any) => s + Number(i.amount || 0), 0),
  };

  const filtered = invoices.filter((inv: any) => {
    if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      inv.invoice_number?.toLowerCase().includes(q) ||
      inv.subcontractors?.company_name?.toLowerCase().includes(q) ||
      inv.subcontractors?.contact_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Receipt className="h-6 w-6 text-primary" />
            Subcontractor Invoices
          </h1>
          <p className="text-sm text-muted-foreground">
            Invoices submitted by subcontractors. Click any row to review, approve, reject, or pay.
          </p>
        </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className={counts.submitted > 0 ? 'border-amber-300 dark:border-amber-700/50' : ''}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pending Review</p>
              <p className="text-lg font-bold text-foreground">{fmt(totals.pending)}</p>
              <p className="text-[11px] text-muted-foreground">{counts.submitted} invoice{counts.submitted === 1 ? '' : 's'}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-50 dark:bg-green-950/40">
              <Receipt className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Approved (unpaid)</p>
              <p className="text-lg font-bold text-foreground">{fmt(totals.approved)}</p>
              <p className="text-[11px] text-muted-foreground">{counts.approved} invoice{counts.approved === 1 ? '' : 's'}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Receipt className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Paid (lifetime)</p>
              <p className="text-lg font-bold text-foreground">{fmt(totals.paid)}</p>
              <p className="text-[11px] text-muted-foreground">{counts.paid} invoice{counts.paid === 1 ? '' : 's'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        {STATUS_TABS.map((t) => (
          <Button
            key={t.key}
            size="sm"
            variant={statusFilter === t.key ? 'default' : 'outline'}
            onClick={() => setStatusFilter(t.key)}
          >
            {t.label}
            <span className="ml-1.5 text-[10px] opacity-70">({counts[t.key as keyof typeof counts]})</span>
          </Button>
        ))}
        <div className="relative ml-auto">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search invoice # or contractor"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 w-64"
          />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            {filtered.length} invoice{filtered.length === 1 ? '' : 's'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              <Receipt className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
              No invoices match the current filter.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Contractor</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Attachment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-8"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((inv: any) => (
                  <TableRow key={inv.id} className="cursor-pointer hover:bg-muted/40">
                    <TableCell className="font-medium">
                      <Link
                        to={`/subcontractors/invoices/${inv.id}`}
                        className="block py-1"
                      >
                        {inv.invoice_number}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link to={`/subcontractors/invoices/${inv.id}`} className="block py-1">
                        <span className="text-sm">{inv.subcontractors?.company_name || 'Unknown'}</span>
                        {inv.subcontractors?.contact_name && (
                          <p className="text-[11px] text-muted-foreground">{inv.subcontractors.contact_name}</p>
                        )}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <Link to={`/subcontractors/invoices/${inv.id}`} className="block py-1">
                        {inv.submitted_at ? format(new Date(inv.submitted_at), 'MMM d, yyyy') : '—'}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <Link to={`/subcontractors/invoices/${inv.id}`} className="block py-1">
                        {fmt(Number(inv.amount || 0))}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {inv.attachment_url ? (
                        <a
                          href={inv.attachment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline text-xs inline-flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Paperclip className="h-3 w-3" /> View
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Link to={`/subcontractors/invoices/${inv.id}`} className="block py-1">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                            statusColors[inv.status] || 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
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
