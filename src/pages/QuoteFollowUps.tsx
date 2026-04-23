import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, isBefore, isToday, addDays, startOfDay } from 'date-fns';
import { CalendarIcon, Clock, ArrowLeft, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useQuotes, useUpdateQuote } from '@/hooks/useQuotes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/StatusBadge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type Bucket = 'overdue' | 'today' | 'thisWeek' | 'later';

interface QuoteRow {
  id: string;
  quote_number: string;
  approval_status: string;
  total: number;
  follow_up_due_at: string;
  service_category: string;
  customers?: any;
  leads?: any;
  bucket: Bucket;
}

function clientName(q: any) {
  const c = q.customers || q.leads;
  if (!c) return 'Unknown';
  const name = [c.first_name, c.last_name].filter(Boolean).join(' ').trim();
  return c.company_name ? `${c.company_name}${name ? ` — ${name}` : ''}` : name || 'Unknown';
}

function bucketFor(due: Date): Bucket {
  const now = new Date();
  if (isBefore(due, startOfDay(now))) return 'overdue';
  if (isToday(due)) return 'today';
  if (isBefore(due, addDays(startOfDay(now), 7))) return 'thisWeek';
  return 'later';
}

const bucketMeta: Record<Bucket, { label: string; tone: string; icon: any }> = {
  overdue: { label: 'Overdue', tone: 'text-destructive', icon: AlertTriangle },
  today: { label: 'Due today', tone: 'text-warning', icon: Clock },
  thisWeek: { label: 'This week', tone: 'text-primary', icon: CalendarIcon },
  later: { label: 'Later', tone: 'text-muted-foreground', icon: CheckCircle2 },
};

function DueDateEditor({ quoteId, current, onUpdated }: { quoteId: string; current: string; onUpdated?: () => void }) {
  const updateQuote = useUpdateQuote();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const handleSelect = async (date: Date | undefined) => {
    if (!date) return;
    try {
      // Preserve time portion of original due date when changing the date.
      const original = new Date(current);
      date.setHours(original.getHours() || 9, original.getMinutes() || 0, 0, 0);
      await updateQuote.mutateAsync({ id: quoteId, follow_up_due_at: date.toISOString() } as any);
      toast({ title: 'Follow-up updated', description: format(date, 'PPP p') });
      setOpen(false);
      onUpdated?.();
    } catch (err: any) {
      toast({ title: 'Could not update', description: err.message, variant: 'destructive' });
    }
  };

  const handleClear = async () => {
    try {
      await updateQuote.mutateAsync({ id: quoteId, follow_up_due_at: null } as any);
      toast({ title: 'Follow-up cleared' });
      setOpen(false);
      onUpdated?.();
    } catch (err: any) {
      toast({ title: 'Could not clear', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5">
          <CalendarIcon className="h-3.5 w-3.5" />
          {format(new Date(current), 'MMM d')}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar
          mode="single"
          selected={new Date(current)}
          onSelect={handleSelect}
          initialFocus
          className={cn('p-3 pointer-events-auto')}
        />
        <div className="border-t p-2 flex justify-between gap-2">
          <Button size="sm" variant="ghost" onClick={() => handleSelect(addDays(new Date(), 3))}>+3 days</Button>
          <Button size="sm" variant="ghost" onClick={() => handleSelect(addDays(new Date(), 7))}>+1 week</Button>
          <Button size="sm" variant="ghost" className="text-destructive" onClick={handleClear}>Clear</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function QuoteFollowUps() {
  const { data: quotes = [], isLoading, refetch } = useQuotes({});

  const rows: QuoteRow[] = useMemo(() => {
    return (quotes as any[])
      .filter(q => q.follow_up_due_at)
      .map(q => ({
        id: q.id,
        quote_number: q.quote_number,
        approval_status: q.approval_status,
        total: Number(q.total) || 0,
        follow_up_due_at: q.follow_up_due_at,
        service_category: q.service_category,
        customers: q.customers,
        leads: q.leads,
        bucket: bucketFor(new Date(q.follow_up_due_at)),
      }))
      .sort((a, b) => new Date(a.follow_up_due_at).getTime() - new Date(b.follow_up_due_at).getTime());
  }, [quotes]);

  const counts = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc[r.bucket] += 1;
        return acc;
      },
      { overdue: 0, today: 0, thisWeek: 0, later: 0 } as Record<Bucket, number>,
    );
  }, [rows]);

  const grouped: Record<Bucket, QuoteRow[]> = {
    overdue: rows.filter(r => r.bucket === 'overdue'),
    today: rows.filter(r => r.bucket === 'today'),
    thisWeek: rows.filter(r => r.bucket === 'thisWeek'),
    later: rows.filter(r => r.bucket === 'later'),
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="h-9 w-9">
          <Link to="/quotes"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl md:text-2xl font-bold">Quote Follow-ups</h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            {rows.length} quote{rows.length === 1 ? '' : 's'} with a scheduled follow-up
          </p>
        </div>
      </div>

      {/* Bucket summary chips */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
        {(['overdue', 'today', 'thisWeek', 'later'] as Bucket[]).map(b => {
          const meta = bucketMeta[b];
          const Icon = meta.icon;
          return (
            <Card key={b}>
              <CardContent className="p-3 md:p-4 flex items-center gap-3">
                <Icon className={cn('h-5 w-5 shrink-0', meta.tone)} />
                <div>
                  <p className="text-xs text-muted-foreground">{meta.label}</p>
                  <p className={cn('text-lg md:text-xl font-bold mono', meta.tone)}>{counts[b]}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {isLoading ? (
        <p className="text-center text-muted-foreground py-12 text-sm">Loading...</p>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No quotes with follow-up dates set. Open a quote and set a follow-up date to track it here.
          </CardContent>
        </Card>
      ) : (
        (['overdue', 'today', 'thisWeek', 'later'] as Bucket[]).map(b => {
          const list = grouped[b];
          if (list.length === 0) return null;
          const meta = bucketMeta[b];
          const Icon = meta.icon;
          return (
            <Card key={b}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Icon className={cn('h-4 w-4', meta.tone)} />
                  <span className={meta.tone}>{meta.label}</span>
                  <Badge variant="secondary" className="ml-auto">{list.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {/* Mobile cards */}
                <div className="md:hidden divide-y">
                  {list.map(q => (
                    <div key={q.id} className="p-3 flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <Link to={`/quotes/${q.id}`} className="font-medium mono text-sm hover:text-primary">
                          {q.quote_number}
                        </Link>
                        <p className="text-xs text-muted-foreground truncate">{clientName(q)}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <StatusBadge status={q.approval_status} showIcon={false} />
                          <span className="text-[11px] text-muted-foreground">${q.total.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right space-y-1">
                        <p className={cn('text-[11px]', meta.tone)}>
                          {format(new Date(q.follow_up_due_at), 'MMM d, p')}
                        </p>
                        <DueDateEditor quoteId={q.id} current={q.follow_up_due_at} onUpdated={refetch} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop table */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Quote #</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Due</TableHead>
                        <TableHead className="text-right">Follow-up</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {list.map(q => (
                        <TableRow key={q.id}>
                          <TableCell>
                            <Link to={`/quotes/${q.id}`} className="font-medium mono text-sm hover:text-primary">
                              {q.quote_number}
                            </Link>
                          </TableCell>
                          <TableCell className="text-sm">{clientName(q)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{q.service_category}</TableCell>
                          <TableCell className="text-sm text-right mono">${q.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell><StatusBadge status={q.approval_status} /></TableCell>
                          <TableCell className={cn('text-sm', meta.tone)}>
                            {format(new Date(q.follow_up_due_at), 'MMM d, yyyy p')}
                          </TableCell>
                          <TableCell className="text-right">
                            <DueDateEditor quoteId={q.id} current={q.follow_up_due_at} onUpdated={refetch} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
