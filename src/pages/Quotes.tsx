import { useState } from 'react';
import { useQuotes } from '@/hooks/useQuotes';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { QUOTE_APPROVAL_STATUSES } from '@/lib/constants';
import { formatDistanceToNow } from 'date-fns';

export default function Quotes() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const { data: quotes = [], isLoading } = useQuotes({
    approval_status: statusFilter || undefined,
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Quotes</h1>
        <p className="text-sm text-muted-foreground">{quotes.length} total quotes</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {QUOTE_APPROVAL_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quote #</TableHead>
              <TableHead>Client</TableHead>
              <TableHead className="hidden md:table-cell">Service</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : quotes.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No quotes found</TableCell></TableRow>
            ) : (
              quotes.map((q: any) => (
                <TableRow key={q.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell>
                    <Link to={`/quotes/${q.id}`} className="font-medium mono text-sm">{q.quote_number}</Link>
                  </TableCell>
                  <TableCell className="text-sm">
                    {q.leads?.first_name} {q.leads?.last_name}
                    {q.leads?.company_name && <span className="text-muted-foreground ml-1">({q.leads.company_name})</span>}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm">{q.service_category}</TableCell>
                  <TableCell className="text-sm font-medium">${Number(q.total).toLocaleString()}</TableCell>
                  <TableCell><StatusBadge status={q.approval_status} /></TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(q.created_at), { addSuffix: true })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
