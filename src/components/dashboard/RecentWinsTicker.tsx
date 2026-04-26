import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, DollarSign, CheckCircle2, FileCheck, UserPlus, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow, subDays } from 'date-fns';
import { cn } from '@/lib/utils';

type WinKind = 'payment' | 'quote' | 'job' | 'customer';
interface Win {
  kind: WinKind;
  title: string;
  detail: string;
  amount?: number;
  at: Date;
}

const ICONS: Record<WinKind, typeof DollarSign> = {
  payment: DollarSign,
  quote: FileCheck,
  job: CheckCircle2,
  customer: UserPlus,
};

const COLORS: Record<WinKind, string> = {
  payment: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40',
  quote: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40',
  job: 'text-violet-600 bg-violet-50 dark:bg-violet-950/40',
  customer: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40',
};

export function RecentWinsTicker() {
  const cutoff = subDays(new Date(), 7).toISOString();

  const { data: payments, isLoading: l1 } = useQuery({
    queryKey: ['wins_payments', cutoff],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('id, invoice_number, amount_paid, paid_at, customers(first_name, last_name, company_name)')
        .gte('paid_at', cutoff)
        .not('paid_at', 'is', null)
        .order('paid_at', { ascending: false })
        .limit(15);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: approved, isLoading: l2 } = useQuery({
    queryKey: ['wins_quotes', cutoff],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotes')
        .select('id, quote_number, total, updated_at, approval_status, leads(first_name, last_name, company_name)')
        .eq('approval_status', 'Approved')
        .gte('updated_at', cutoff)
        .order('updated_at', { ascending: false })
        .limit(15);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: completed, isLoading: l3 } = useQuery({
    queryKey: ['wins_jobs', cutoff],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('id, job_number, job_title, updated_at, status, customers(first_name, last_name, company_name)')
        .eq('status', 'Completed')
        .gte('updated_at', cutoff)
        .order('updated_at', { ascending: false })
        .limit(15);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: newCust, isLoading: l4 } = useQuery({
    queryKey: ['wins_customers', cutoff],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, first_name, last_name, company_name, created_at, customer_type')
        .gte('created_at', cutoff)
        .order('created_at', { ascending: false })
        .limit(15);
      if (error) throw error;
      return data ?? [];
    },
  });

  const wins: Win[] = useMemo(() => {
    const arr: Win[] = [];
    const custLabel = (c: any) =>
      c?.company_name || [c?.first_name, c?.last_name].filter(Boolean).join(' ') || 'Customer';

    for (const p of payments ?? []) {
      arr.push({
        kind: 'payment',
        title: `Payment received · ${p.invoice_number}`,
        detail: custLabel(p.customers),
        amount: Number(p.amount_paid ?? 0),
        at: new Date(p.paid_at!),
      });
    }
    for (const q of approved ?? []) {
      arr.push({
        kind: 'quote',
        title: `Quote approved · ${q.quote_number}`,
        detail: custLabel(q.leads),
        amount: Number(q.total ?? 0),
        at: new Date(q.updated_at!),
      });
    }
    for (const j of completed ?? []) {
      arr.push({
        kind: 'job',
        title: `Job completed · ${j.job_number}`,
        detail: j.job_title || custLabel(j.customers),
        at: new Date(j.updated_at!),
      });
    }
    for (const c of newCust ?? []) {
      arr.push({
        kind: 'customer',
        title: `New customer · ${custLabel(c)}`,
        detail: c.customer_type || 'Onboarded',
        at: new Date(c.created_at!),
      });
    }
    return arr.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 20);
  }, [payments, approved, completed, newCust]);

  const loading = l1 || l2 || l3 || l4;
  const totalWon = wins
    .filter(w => w.kind === 'payment' || w.kind === 'quote')
    .reduce((s, w) => s + (w.amount ?? 0), 0);

  // Duplicate for seamless marquee
  const looped = wins.length > 0 ? [...wins, ...wins] : [];

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2 px-3 md:px-6 pt-3 md:pt-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base md:text-lg font-extrabold tracking-tight flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-50 dark:bg-amber-950/30">
                <Trophy className="h-4 w-4 text-amber-600" />
              </span>
              Recent Wins · Last 7 Days
              <span className="relative flex h-2 w-2 ml-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            </CardTitle>
            <p className="text-[11px] text-muted-foreground mt-1 ml-10">
              {wins.length} wins · ${(totalWon / 1000).toFixed(1)}k secured
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-semibold">
            <Sparkles className="h-3 w-3 text-amber-500" />
            Live feed
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-3 md:pb-4">
        {loading ? (
          <div className="px-3 md:px-6">
            <Skeleton className="h-20 w-full" />
          </div>
        ) : wins.length === 0 ? (
          <p className="text-[11px] text-muted-foreground py-8 text-center">
            No wins yet this week — let's change that 💪
          </p>
        ) : (
          <div
            className="relative overflow-hidden group"
            style={{
              maskImage: 'linear-gradient(to right, transparent, black 4%, black 96%, transparent)',
              WebkitMaskImage:
                'linear-gradient(to right, transparent, black 4%, black 96%, transparent)',
            }}
          >
            <div
              className="flex gap-3 animate-marquee group-hover:[animation-play-state:paused]"
              style={{ width: 'max-content' }}
            >
              {looped.map((w, i) => {
                const Icon = ICONS[w.kind];
                return (
                  <div
                    key={i}
                    className="shrink-0 flex items-center gap-2.5 px-3 py-2 rounded-lg border bg-card hover:shadow-md transition-shadow"
                    style={{ minWidth: 280 }}
                  >
                    <div
                      className={cn(
                        'h-9 w-9 rounded-lg flex items-center justify-center shrink-0',
                        COLORS[w.kind],
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-extrabold truncate">{w.title}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {w.detail}
                        {w.amount !== undefined && (
                          <span className="text-emerald-600 font-bold ml-1.5 tabular-nums">
                            ${w.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </span>
                        )}
                      </p>
                      <p className="text-[9px] text-muted-foreground/70 mt-0.5">
                        {formatDistanceToNow(w.at, { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
