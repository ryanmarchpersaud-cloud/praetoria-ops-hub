import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/StatusBadge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, Search, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RecurringEnrollmentDetailDialog } from '@/components/RecurringEnrollmentDetailDialog';
import { addDays, addMonths, addWeeks, addYears, format, parseISO, isValid } from 'date-fns';

const STATUS_OPTIONS = ['Pending', 'Approved', 'Active', 'Declined', 'Cancelled'];

function computeNextBillingDate(startDateStr: string | null | undefined, frequency: string | null | undefined): Date | null {
  if (!startDateStr) return null;
  const start = parseISO(startDateStr);
  if (!isValid(start)) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (start >= today) return start;

  const freq = (frequency || '').toLowerCase();
  const step = (d: Date): Date => {
    if (freq.includes('year') || freq.includes('annual')) return addYears(d, 1);
    if (freq.includes('quarter')) return addMonths(d, 3);
    if (freq.includes('bi-week') || freq.includes('biweek') || freq.includes('bi week')) return addWeeks(d, 2);
    if (freq.includes('week')) return addWeeks(d, 1);
    if (freq.includes('day')) return addDays(d, 1);
    // default monthly
    return addMonths(d, 1);
  };

  let next = start;
  let guard = 0;
  while (next < today && guard < 600) {
    next = step(next);
    guard++;
  }
  return next;
}

export default function RecurringEnrollmentRequests() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['admin_recurring_requests_full'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('customer_recurring_requests' as any) as any)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const customerIds = [...new Set<string>((data ?? []).map((r: any) => r.customer_id).filter(Boolean))];
      const propertyIds = [...new Set<string>((data ?? []).map((r: any) => r.property_id).filter(Boolean))];

      const [{ data: customers = [] }, { data: properties = [] }] = await Promise.all([
        customerIds.length
          ? supabase.from('customers').select('id, first_name, last_name, company_name').in('id', customerIds)
          : Promise.resolve({ data: [] as any[] }),
        propertyIds.length
          ? supabase.from('properties').select('id, property_name, address_line_1, city').in('id', propertyIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const customerMap = new Map((customers as any[]).map((c: any) => [c.id, c]));
      const propertyMap = new Map((properties as any[]).map((p: any) => [p.id, p]));

      return (data ?? []).map((r: any) => ({
        ...r,
        customer: customerMap.get(r.customer_id),
        property: propertyMap.get(r.property_id),
        next_billing_date: computeNextBillingDate(r.preferred_start_date, r.frequency),
      }));
    },
  });

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const s of STATUS_OPTIONS) c[s] = 0;
    for (const r of rows as any[]) {
      const s = r.status || 'Pending';
      c[s] = (c[s] || 0) + 1;
    }
    return c;
  }, [rows]);

  const filtered = (rows as any[]).filter((r) => {
    if (statusFilter && r.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      const name = `${r.customer?.first_name || ''} ${r.customer?.last_name || ''} ${r.customer?.company_name || ''}`.toLowerCase();
      const prop = `${r.property?.property_name || ''} ${r.property?.address_line_1 || ''} ${r.property?.city || ''}`.toLowerCase();
      const svc = (r.service_category || '').toLowerCase();
      if (!name.includes(s) && !prop.includes(s) && !svc.includes(s)) return false;
    }
    return true;
  });

  const renderCustomer = (r: any) => {
    if (!r.customer) return <span className="text-muted-foreground">Unknown customer</span>;
    const name = `${r.customer.first_name || ''} ${r.customer.last_name || ''}`.trim() || r.customer.company_name || 'Customer';
    return (
      <Link to={`/customers/${r.customer_id}`} className="text-primary hover:underline">
        {name}
      </Link>
    );
  };

  const renderProperty = (r: any) => {
    if (!r.property) return <span className="text-muted-foreground">—</span>;
    const label = r.property.property_name || r.property.address_line_1 || 'Property';
    return (
      <Link to={`/properties/${r.property_id}`} className="hover:underline">
        {label}
      </Link>
    );
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            Recurring Enrollment Requests
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            {rows.length} total · customer-submitted recurring service enrollments
          </p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all active:scale-95 ${
              statusFilter === s ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-card border-border text-muted-foreground'
            }`}
          >
            {s}
            <span className={statusFilter === s ? 'text-primary' : 'text-muted-foreground/60'}>{counts[s] || 0}</span>
          </button>
        ))}
        {statusFilter && (
          <button onClick={() => setStatusFilter('')} className="text-xs text-muted-foreground hover:text-foreground px-2">
            Clear ×
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by customer, property, or service..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 max-w-md"
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Inbox className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No recurring enrollment requests match your filters.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {filtered.map((r) => (
              <Card key={r.id} className="cursor-pointer hover:bg-muted/30 transition" onClick={() => setOpenId(r.id)}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{r.service_category}</p>
                      <p className="text-xs text-muted-foreground">{renderCustomer(r)}</p>
                    </div>
                    <StatusBadge status={r.status} showIcon={false} />
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p>Property: {renderProperty(r)}</p>
                    <p>Frequency: {r.frequency || '—'}</p>
                    <p>
                      Next billing:{' '}
                      {r.next_billing_date ? format(r.next_billing_date, 'MMM d, yyyy') : <span className="italic">Not scheduled</span>}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" className="w-full" onClick={(e) => { e.stopPropagation(); setOpenId(r.id); }}>
                    Open / Review
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop table */}
          <Card className="hidden md:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Service Type</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Next Billing Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{renderCustomer(r)}</TableCell>
                      <TableCell>{renderProperty(r)}</TableCell>
                      <TableCell className="font-medium">{r.service_category}</TableCell>
                      <TableCell className="capitalize text-muted-foreground">{r.frequency || '—'}</TableCell>
                      <TableCell>
                        <StatusBadge status={r.status} showIcon={false} />
                      </TableCell>
                      <TableCell>
                        {r.next_billing_date ? (
                          format(r.next_billing_date, 'MMM d, yyyy')
                        ) : (
                          <span className="italic text-muted-foreground">Not scheduled</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
