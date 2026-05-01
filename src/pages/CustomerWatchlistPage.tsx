import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, ShieldAlert, Search, Bot, User, ExternalLink, Plus, Loader2 } from 'lucide-react';
import { WARNING_TYPES } from '@/components/CustomerWarningsEditor';
import { useToast } from '@/hooks/use-toast';
import { PROVINCES } from '@/lib/constants';
import { formatDistanceToNow } from 'date-fns';

type Row = {
  id: string;
  customer_id: string;
  warning_type: string;
  severity: string;
  description: string | null;
  is_active: boolean;
  auto_generated: boolean;
  source: string | null;
  created_at: string;
  customers: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    company_name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
};

export default function CustomerWatchlistPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  const { data: warnings = [], isLoading } = useQuery({
    queryKey: ['customer_watchlist'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_warnings')
        .select(`
          id, customer_id, warning_type, severity, description, is_active,
          auto_generated, source, created_at,
          customers:customer_id (id, first_name, last_name, company_name, email, phone)
        `)
        .eq('is_active', true)
        .order('severity', { ascending: true })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Row[];
    },
  });

  // Group by customer
  const grouped = useMemo(() => {
    const map = new Map<string, { customer: Row['customers']; warnings: Row[] }>();
    for (const w of warnings) {
      if (!w.customer_id) continue;
      const existing = map.get(w.customer_id);
      if (existing) existing.warnings.push(w);
      else map.set(w.customer_id, { customer: w.customers, warnings: [w] });
    }
    return Array.from(map.entries()).map(([customer_id, v]) => ({ customer_id, ...v }));
  }, [warnings]);

  // Filter
  const filtered = useMemo(() => {
    return grouped.filter(g => {
      if (severityFilter !== 'all' && !g.warnings.some(w => w.severity === severityFilter)) return false;
      if (typeFilter !== 'all' && !g.warnings.some(w => w.warning_type === typeFilter)) return false;
      if (search.trim()) {
        const s = search.toLowerCase();
        const c = g.customer;
        const name = `${c?.first_name || ''} ${c?.last_name || ''} ${c?.company_name || ''}`.toLowerCase();
        if (!name.includes(s) && !c?.email?.toLowerCase().includes(s) && !c?.phone?.includes(s)) return false;
      }
      return true;
    });
  }, [grouped, search, typeFilter, severityFilter]);

  const stats = useMemo(() => ({
    totalCustomers: grouped.length,
    high: grouped.filter(g => g.warnings.some(w => w.severity === 'high')).length,
    autoFlagged: grouped.filter(g => g.warnings.some(w => w.auto_generated)).length,
    paymentIssues: grouped.filter(g => g.warnings.some(w => w.warning_type === 'payment_issue')).length,
  }), [grouped]);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="rounded-xl border border-destructive/30 bg-gradient-to-r from-destructive/10 via-destructive/5 to-transparent p-4 md:p-5">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
          <ShieldAlert className="h-7 w-7 text-destructive" />
          Customer Watchlist
        </h1>
        <p className="text-muted-foreground text-xs md:text-sm mt-1 font-medium">
          Customers flagged for non-payment, broken contracts, complaints, or other concerns. New requests, leads, and quotes from these people will trigger a red banner.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Flagged Customers" value={stats.totalCustomers} color="text-destructive" />
        <StatCard label="High Severity" value={stats.high} color="text-destructive" />
        <StatCard label="Auto-Flagged" value={stats.autoFlagged} color="text-amber-600" />
        <StatCard label="Payment Issues" value={stats.paymentIssues} color="text-orange-600" />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 md:p-4 space-y-3">
          <div className="flex gap-2 items-center">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-9"
            />
          </div>
          <Tabs value={severityFilter} onValueChange={setSeverityFilter}>
            <TabsList>
              <TabsTrigger value="all">All Severity</TabsTrigger>
              <TabsTrigger value="high">High</TabsTrigger>
              <TabsTrigger value="medium">Medium</TabsTrigger>
              <TabsTrigger value="low">Low</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex flex-wrap gap-1.5">
            <Button
              size="sm"
              variant={typeFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setTypeFilter('all')}
              className="h-7 text-xs"
            >
              All Reasons
            </Button>
            {WARNING_TYPES.map(t => (
              <Button
                key={t.value}
                size="sm"
                variant={typeFilter === t.value ? 'default' : 'outline'}
                onClick={() => setTypeFilter(t.value)}
                className="h-7 text-xs"
              >
                {t.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            {filtered.length} {filtered.length === 1 ? 'Customer' : 'Customers'} on Watchlist
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading watchlist...</p>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center">
              <ShieldAlert className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No flagged customers match these filters.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Reasons</TableHead>
                  <TableHead>Highest Severity</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Flagged</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(g => {
                  const c = g.customer;
                  const highest = g.warnings.find(w => w.severity === 'high') || g.warnings.find(w => w.severity === 'medium') || g.warnings[0];
                  const name = c?.company_name || `${c?.first_name || ''} ${c?.last_name || ''}`.trim() || 'Unknown';
                  const isAuto = g.warnings.some(w => w.auto_generated);
                  const newest = g.warnings[0];
                  return (
                    <TableRow key={g.customer_id}>
                      <TableCell className="font-semibold">{name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <div>{c?.email || '—'}</div>
                        <div>{c?.phone || '—'}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {g.warnings.slice(0, 3).map(w => {
                            const t = WARNING_TYPES.find(x => x.value === w.warning_type);
                            return (
                              <Badge key={w.id} variant="secondary" className={`text-[10px] ${t?.color || ''}`}>
                                {t?.label || w.warning_type}
                              </Badge>
                            );
                          })}
                          {g.warnings.length > 3 && (
                            <Badge variant="outline" className="text-[10px]">+{g.warnings.length - 3}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={highest?.severity === 'high' ? 'destructive' : 'secondary'} className="text-[10px] uppercase">
                          {highest?.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {isAuto ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400"><Bot className="h-3 w-3" /> Auto</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"><User className="h-3 w-3" /> Manual</span>
                        )}
                      </TableCell>
                      <TableCell className="text-[11px] text-muted-foreground">
                        {newest && formatDistanceToNow(new Date(newest.created_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                          <Link to={`/customers/${g.customer_id}`}>
                            Open <ExternalLink className="h-3 w-3 ml-1" />
                          </Link>
                        </Button>
                      </TableCell>
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

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card>
      <CardContent className="p-3 md:p-4">
        <p className={`text-2xl md:text-3xl font-extrabold tabular-nums ${color}`}>{value}</p>
        <p className="text-[11px] md:text-xs font-semibold text-muted-foreground mt-1 uppercase tracking-wide">{label}</p>
      </CardContent>
    </Card>
  );
}
