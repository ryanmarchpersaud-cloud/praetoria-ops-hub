import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquarePlus, FileText, Briefcase, Receipt, ClipboardCheck, ChevronRight, ChevronLeft, AlertCircle, Plus, MapPin, Download, Printer, Share2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface Props {
  customerId: string;
}

type WorkItem = {
  id: string;
  type: 'request' | 'quote' | 'job' | 'invoice' | 'visit';
  number: string;
  title: string;
  date: string | null;
  status: string;
  amount: number;
  requiresInvoicing?: boolean;
  link: string;
};

const ICON_MAP = {
  request: MessageSquarePlus,
  quote: FileText,
  job: Briefcase,
  invoice: Receipt,
  visit: MapPin,
  
};

const ITEMS_PER_PAGE = 10;

const parseSafeDate = (value?: string | null) => {
  if (!value) return null;
  const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const parsed = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]), 12)
    : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatSafeDate = (value: string | null | undefined, pattern: string) => {
  const parsed = parseSafeDate(value);
  return parsed ? format(parsed, pattern) : '';
};

const safeDateTime = (value: string | null | undefined) => parseSafeDate(value)?.getTime() ?? 0;

export function CustomerWorkOverview({ customerId }: Props) {
  const [tab, setTab] = useState<'all' | 'request' | 'quote' | 'job' | 'invoice' | 'visit'>('all');
  const [page, setPage] = useState(1);

  const { data: customer } = useQuery({
    queryKey: ['cwo_customer', customerId],
    queryFn: async () => {
      const { data } = await supabase.from('customers')
        .select('first_name, last_name, company_name, email, phone, address_line_1, city, province, postal_code')
        .eq('id', customerId).maybeSingle();
      return data;
    },
    enabled: !!customerId,
  });

  const { data: requests = [], isLoading: loadingReq } = useQuery({
    queryKey: ['cwo_requests', customerId],
    queryFn: async () => {
      const { data } = await supabase.from('service_requests').select('id, subject, status, created_at')
        .eq('customer_id', customerId).order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!customerId,
  });

  const { data: quotes = [], isLoading: loadingQ } = useQuery({
    queryKey: ['cwo_quotes', customerId],
    queryFn: async () => {
      const { data } = await supabase.from('quotes').select('id, quote_number, approval_status, total, created_at, scope_of_work')
        .eq('customer_id', customerId).order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!customerId,
  });

  const { data: jobs = [], isLoading: loadingJ } = useQuery({
    queryKey: ['cwo_jobs', customerId],
    queryFn: async () => {
      const { data } = await supabase.from('jobs').select('id, job_number, job_title, status, created_at, scheduled_date, billing_status, estimated_total, job_line_items(line_total)')
        .eq('customer_id', customerId).order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!customerId,
  });

  const { data: invoices = [], isLoading: loadingI } = useQuery({
    queryKey: ['cwo_invoices', customerId],
    queryFn: async () => {
      const { data } = await supabase.from('invoices').select('id, invoice_number, status, total, balance_due, created_at, customer_memo')
        .eq('customer_id', customerId).order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!customerId,
  });

  const { data: visits = [], isLoading: loadingV } = useQuery({
    queryKey: ['cwo_visits', customerId],
    queryFn: async () => {
      const { data, error } = await supabase.from('visits')
        .select('id, visit_number, visit_status, visit_type, service_date, scheduled_start_time, jobs(job_number, job_title)')
        .eq('customer_id', customerId).order('service_date', { ascending: false });
      if (error) console.error('cwo_visits error', error);
      return data || [];
    },
    enabled: !!customerId,
  });

  const isLoading = loadingReq || loadingQ || loadingJ || loadingI || loadingV;

  const items = useMemo((): WorkItem[] => {
    const all: WorkItem[] = [];

    requests.forEach((r: any) => all.push({
      id: r.id, type: 'request', number: '', title: r.subject || 'Service Request',
      date: r.created_at, status: r.status, amount: 0, link: `/requests/${r.id}`,
    }));

    quotes.forEach((q: any) => all.push({
      id: q.id, type: 'quote', number: q.quote_number, title: q.scope_of_work || 'Quote',
      date: q.created_at, status: q.approval_status, amount: Number(q.total || 0), link: `/quotes/${q.id}`,
    }));

    jobs.forEach((j: any) => all.push({
      id: j.id, type: 'job', number: j.job_number, title: j.job_title || 'Job',
      date: j.scheduled_date || j.created_at, status: j.status, amount: (j.job_line_items || []).reduce((sum: number, item: any) => sum + Number(item.line_total || 0), 0) || Number(j.estimated_total || 0),
      requiresInvoicing: (j.status === 'Completed' || j.status === 'Closed') && j.billing_status !== 'invoiced',
      link: `/jobs/${j.id}`,
    }));

    invoices.forEach((i: any) => all.push({
      id: i.id, type: 'invoice', number: i.invoice_number, title: i.customer_memo || 'Invoice',
      date: i.created_at, status: i.status, amount: Number(i.total || 0), link: `/invoices/${i.id}`,
    }));

    visits.forEach((v: any) => {
      all.push({
        id: v.id,
        type: 'visit',
        number: v.visit_number || '',
        title: v.jobs?.job_title || v.visit_type || 'Visit',
        date: v.service_date || null,
        status: v.visit_status,
        amount: 0,
        link: `/visits/${v.id}`,
      });
    });

    all.sort((a, b) => safeDateTime(b.date) - safeDateTime(a.date));
    return all;
  }, [requests, quotes, jobs, invoices, visits]);

  const filtered = tab === 'all' ? items : items.filter(i => i.type === tab);
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const pageItems = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const counts = {
    all: items.length,
    request: items.filter(i => i.type === 'request').length,
    quote: items.filter(i => i.type === 'quote').length,
    job: items.filter(i => i.type === 'job').length,
    invoice: items.filter(i => i.type === 'invoice').length,
    visit: items.filter(i => i.type === 'visit').length,
    
  };

  const requiresInvoicingCount = items.filter(i => i.requiresInvoicing).length;

  const { toast } = useToast();

  const isVisitView = tab === 'visit';

  const exportRows = filtered.map(i => {
    const base: Record<string, string> = {
      Type: i.type,
      Number: i.number,
      Title: i.title,
      Date: formatSafeDate(i.date, 'yyyy-MM-dd'),
    };
    if (isVisitView) {
      base.Day = formatSafeDate(i.date, 'EEEE');
    }
    base.Status = i.status || '';
    if (!isVisitView) {
      base.Amount = i.amount ? `$${i.amount.toFixed(2)}` : '';
    }
    return base;
  });

  const exportTotal = isVisitView ? 0 : exportRows.reduce((sum, r) => {
    const n = parseFloat(String(r.Amount ?? '').replace(/[^0-9.\-]/g, ''));
    return sum + (isNaN(n) ? 0 : n);
  }, 0);

  const tabLabel = tab === 'all' ? 'Records' : tab.charAt(0).toUpperCase() + tab.slice(1) + 's';

  const handleDownload = () => {
    if (exportRows.length === 0) { toast({ title: 'Nothing to export' }); return; }
    const headers = Object.keys(exportRows[0]);
    const escape = (v: any) => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [headers.join(','), ...exportRows.map(r => headers.map(h => escape((r as any)[h])).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customer-${tabLabel.toLowerCase()}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const buildPrintHtml = () => {
    const rows = exportRows.map(r => `<tr>${Object.values(r).map(v => `<td>${String(v ?? '').replace(/</g, '&lt;')}</td>`).join('')}</tr>`).join('');
    const headers = exportRows[0] ? Object.keys(exportRows[0]).map(h => `<th>${h}</th>`).join('') : '';
    const colCount = exportRows[0] ? Object.keys(exportRows[0]).length : 0;
    const totalRow = exportTotal > 0
      ? `<tr><td colspan="${colCount - 1}" style="text-align:right;font-weight:bold;background:#f8fafc">Total</td><td style="font-weight:bold;background:#f8fafc">$${exportTotal.toFixed(2)}</td></tr>`
      : '';
    const feeNote = isVisitView
      ? `<p style="font-size:10px;color:#64748b;margin:8px 0 0">This is your scheduled service calendar. Billing is handled separately on your monthly invoice.</p>`
      : '';
    const customerName = customer
      ? [customer.first_name, customer.last_name].filter(Boolean).join(' ') || customer.company_name || ''
      : '';
    const company = customer?.company_name && customerName !== customer.company_name ? customer.company_name : '';
    const addrLine = customer ? [customer.address_line_1, customer.city, customer.province, customer.postal_code].filter(Boolean).join(', ') : '';
    const contactLine = customer ? [customer.email, customer.phone].filter(Boolean).join(' · ') : '';
    const logoUrl = `${window.location.origin}/invoice-logo.png`;
    return `<!doctype html><html><head><title>${tabLabel} — ${customerName}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:24px;color:#0F172A}
        .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0F172A;padding-bottom:12px;margin-bottom:16px}
        .brand{display:flex;align-items:center;gap:12px}
        .brand img{height:56px;width:auto}
        .brand-text strong{font-size:16px;display:block;color:#0F172A}
        .brand-text span{font-size:10px;color:#64748b}
        .cust{text-align:right;font-size:11px;line-height:1.5}
        .cust .name{font-size:14px;font-weight:bold;color:#0F172A}
        h1{font-size:16px;margin:0 0 4px}
        .meta{font-size:11px;color:#64748b;margin-bottom:12px}
        table{width:100%;border-collapse:collapse;font-size:11px}
        th,td{border:1px solid #e2e8f0;padding:6px 8px;text-align:left}
        th{background:#f1f5f9}
      </style></head><body>
      <div class="header">
        <div class="brand">
          <img src="${logoUrl}" alt="Praetoria Group" onerror="this.style.display='none'"/>
          <div class="brand-text"><strong>Praetoria Group</strong><span>support@praetoriagroup.ca</span></div>
        </div>
        <div class="cust">
          ${customerName ? `<div class="name">${customerName}</div>` : ''}
          ${company ? `<div>${company}</div>` : ''}
          ${addrLine ? `<div>${addrLine}</div>` : ''}
          ${contactLine ? `<div>${contactLine}</div>` : ''}
        </div>
      </div>
      <h1>Customer ${tabLabel}</h1>
      <div class="meta">Generated ${format(new Date(), 'MMM d, yyyy')} · ${exportRows.length} records</div>
      <table><thead><tr>${headers}</tr></thead><tbody>${rows}${totalRow}</tbody></table>
      ${feeNote}
    </body></html>`;
  };

  const handlePrint = () => {
    if (exportRows.length === 0) { toast({ title: 'Nothing to print' }); return; }
    const w = window.open('', '_blank');
    if (!w) { toast({ title: 'Pop-up blocked', variant: 'destructive' }); return; }
    w.document.write(buildPrintHtml());
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  };

  const handleShare = async () => {
    if (exportRows.length === 0) { toast({ title: 'Nothing to share' }); return; }
    const headers = Object.keys(exportRows[0]);
    const csv = [headers.join(','), ...exportRows.map(r => headers.map(h => (r as any)[h]).join(','))].join('\n');
    const file = new File([csv], `customer-${tabLabel.toLowerCase()}.csv`, { type: 'text/csv' });
    try {
      if ((navigator as any).canShare?.({ files: [file] })) {
        await (navigator as any).share({ files: [file], title: `Customer ${tabLabel}` });
        return;
      }
    } catch { /* fall through */ }
    try {
      await navigator.clipboard.writeText(csv);
      toast({ title: 'Copied to clipboard', description: 'Paste into your email.' });
    } catch {
      handleDownload();
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" /> Work Overview
            {requiresInvoicingCount > 0 && (
              <Badge variant="outline" className="text-[10px] gap-1 border-warning text-warning">
                <AlertCircle className="h-3 w-3" /> {requiresInvoicingCount} requires invoicing
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] gap-1" onClick={handleDownload} title={`Download ${tabLabel} as CSV`}>
              <Download className="h-3 w-3" /> CSV
            </Button>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] gap-1" onClick={handlePrint} title={`Print ${tabLabel}`}>
              <Printer className="h-3 w-3" /> Print
            </Button>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] gap-1" onClick={handleShare} title={`Share ${tabLabel}`}>
              <Share2 className="h-3 w-3" /> Share
            </Button>
            <Link to={`/jobs/new?customer_id=${customerId}`}>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] gap-1">
                <Plus className="h-3 w-3" /> Create
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Tabs value={tab} onValueChange={(v) => { setTab(v as any); setPage(1); }}>
          <TabsList className="h-8">
            {(['all', 'request', 'quote', 'job', 'visit', 'invoice'] as const).map(t => {
              const Icon = t === 'all' ? ClipboardCheck : ICON_MAP[t];
              const label = t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1) + 's';
              return (
                <TabsTrigger key={t} value={t} className="text-[11px] gap-1 px-2">
                  <Icon className="h-3 w-3" /> {label} ({counts[t]})
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : pageItems.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No records found</p>
        ) : (
          <div className="space-y-1">
            {pageItems.map(item => {
              const Icon = ICON_MAP[item.type];
              return (
                <Link key={`${item.type}-${item.id}`} to={item.link}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors group">
                  <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center shrink-0">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {item.number && <span className="text-xs font-mono text-muted-foreground">{item.number}</span>}
                      <p className="text-xs font-medium truncate">{item.title}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {formatSafeDate(item.date, 'MMM d, yyyy') || '—'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.requiresInvoicing && (
                      <Badge variant="outline" className="text-[9px] border-warning text-warning bg-warning/5">
                        Requires Invoicing
                      </Badge>
                    )}
                    <StatusBadge status={item.status} showIcon={false} />
                    {item.amount > 0 && (
                      <span className="text-xs font-mono font-medium w-16 text-right">
                        ${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    )}
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-1">
            <p className="text-[10px] text-muted-foreground">
              Showing {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} items
            </p>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" className="h-6 w-6 p-0" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <Button variant="outline" size="sm" className="h-6 w-6 p-0" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
