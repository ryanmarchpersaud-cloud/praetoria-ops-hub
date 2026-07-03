import { useState } from 'react';
import { useSubcontractorProfile } from '@/hooks/useSubcontractor';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, DollarSign, Download, ExternalLink, FileText, Mail, Printer, Share2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { callEdgeFunction } from '@/lib/edgeFunctionClient';

function parseLocalDate(s: string | null | undefined): Date {
  if (!s) return new Date(NaN);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  return new Date(s);
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  approved: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
};

function formatMoney(n: number | null | undefined) {
  return `$${Number(n || 0).toFixed(2)}`;
}

type PdfLink = {
  signedUrl: string;
  downloadUrl: string;
  fileName: string;
};

async function getPayStubPdf(payStubId: string): Promise<PdfLink> {
  const data = await callEdgeFunction('subcontractor-pay-stub-pdf', { pay_stub_id: payStubId, action: 'signed_url' });
  if (!data?.signedUrl) throw new Error(data?.error || 'Could not create secure PDF link.');
  return data as PdfLink;
}

function PayStubActionsDialog({ stub, open, onOpenChange }: { stub: any; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [pdf, setPdf] = useState<PdfLink | null>(null);
  const [email, setEmail] = useState('');

  const { data: items = [], isLoading: loadingItems } = useQuery({
    queryKey: ['sub_portal_pay_stub_items', stub?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subcontractor_pay_stub_line_items')
        .select('*')
        .eq('pay_stub_id', stub.id)
        .order('sort_order', { ascending: true })
        .order('work_date', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: open && !!stub?.id,
  });

  const withPdf = async (action: string, fn: (link: PdfLink) => Promise<void> | void) => {
    setBusyAction(action);
    try {
      const link = pdf ?? await getPayStubPdf(stub.id);
      setPdf(link);
      await fn(link);
    } catch (e: any) {
      toast.error(e?.message || 'Pay stub PDF action failed.');
    } finally {
      setBusyAction(null);
    }
  };

  const openPrintPage = (autoPrint = false) => {
    const path = `/subcontractor/pay-stubs/${stub.id}/print${autoPrint ? '?print=1' : ''}`;
    const previewWindow = window.open(path, '_blank');
    if (previewWindow) previewWindow.opener = null;
    else toast.error('Pop-up blocked. Please allow pop-ups to open the pay stub.');
  };

  const downloadPdf = async (link: PdfLink) => {
    const a = document.createElement('a');
    a.href = link.downloadUrl || link.signedUrl;
    a.download = link.fileName || `${stub.pay_stub_number || 'payment-statement'}.pdf`;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast.success('PDF download started.');
  };

  const sharePdf = async (link: PdfLink) => {
    const title = `${stub.pay_stub_number || 'Payment Statement'} - Praetoria Group`;
    try {
      try {
        const res = await fetch(link.downloadUrl || link.signedUrl);
        if (res.ok) {
          const blob = await res.blob();
          const file = new File([blob], link.fileName || 'payment-statement.pdf', { type: 'application/pdf' });
          if (navigator.canShare?.({ files: [file] }) && navigator.share) {
            await navigator.share({ title, text: 'Praetoria Group payment statement', files: [file] });
            return;
          }
        }
      } catch {
        // Fall back to sharing the secure link below.
      }
      if (navigator.share) {
        await navigator.share({ title, text: 'Praetoria Group payment statement', url: link.signedUrl });
        return;
      }
      await navigator.clipboard?.writeText(link.signedUrl);
      toast.success('Secure PDF link copied. The link expires in 1 hour.');
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      throw e;
    }
  };

  const emailPdf = async () => {
    if (!email.trim()) { toast.error('Enter an email address first.'); return; }
    setBusyAction('email');
    try {
      const data = await callEdgeFunction('subcontractor-pay-stub-pdf', { pay_stub_id: stub.id, action: 'email', email: email.trim() });
      if (data?.error) throw new Error(data.error);
      toast.success(`PDF emailed to ${email.trim()}.`);
    } catch (e: any) {
      toast.error(e?.message || 'Could not email this PDF.');
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" /> {stub.pay_stub_number || 'Payment Statement'}
          </DialogTitle>
          <DialogDescription>
            {format(parseLocalDate(stub.period_start), 'MMM d')} – {format(parseLocalDate(stub.period_end), 'MMM d, yyyy')} · ${Number(stub.total || 0).toFixed(2)} CAD
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-md border p-3">
              <p className="text-[10px] uppercase text-muted-foreground">Status</p>
              <p className="font-semibold capitalize">{stub.status}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-[10px] uppercase text-muted-foreground">Total</p>
              <p className="font-semibold">{formatMoney(stub.total)} CAD</p>
            </div>
          </div>

          <div className="rounded-md border overflow-hidden">
            <div className="bg-muted/40 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pay stub detail</div>
            <div className="divide-y">
              {loadingItems ? (
                <p className="p-3 text-sm text-muted-foreground">Loading work entries…</p>
              ) : items.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">No work entries are attached to this pay stub yet.</p>
              ) : items.map((it: any) => (
                <div key={it.id} className="p-3 text-sm space-y-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{format(parseLocalDate(it.work_date), 'MMM d, yyyy')} · {it.service_type || 'Service'}</p>
                      {it.notes && <p className="text-xs text-muted-foreground whitespace-pre-wrap break-words">{it.notes}</p>}
                    </div>
                    <p className="font-semibold shrink-0">{formatMoney(it.line_total)}</p>
                  </div>
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                    <span>{it.hours ?? '—'} hours</span>
                    <span>{it.is_mixed ? 'split rate' : it.hourly_rate ? `${formatMoney(it.hourly_rate)}/hr` : 'rate —'}</span>
                    <span>{it.start_time && it.end_time ? `${it.start_time} – ${it.end_time}` : 'time —'}</span>
                  </div>
                  {it.is_mixed && Array.isArray(it.mixed_split) && it.mixed_split.length > 0 && (
                    <div className="text-xs text-muted-foreground pl-3 border-l space-y-0.5">
                      {it.mixed_split.map((split: any, i: number) => (
                        <div key={i}>{split.service_type}: {split.hours}h × {formatMoney(split.hourly_rate)} = {formatMoney(split.line_total)}</div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="px-3 py-2 bg-muted/30 flex justify-between text-sm font-bold">
              <span>Grand total payable</span>
              <span>{formatMoney(stub.total)} CAD</span>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="outline" className="justify-start gap-2" disabled={!!busyAction} onClick={() => openPrintPage(false)}>
              <ExternalLink className="h-4 w-4" /> View Pay Stub
            </Button>
            <Button variant="outline" className="justify-start gap-2" disabled={!!busyAction} onClick={() => withPdf('download', downloadPdf)}>
              <Download className="h-4 w-4" /> Download PDF
            </Button>
            <Button variant="outline" className="justify-start gap-2" disabled={!!busyAction} onClick={() => withPdf('share', sharePdf)}>
              <Share2 className="h-4 w-4" /> Email / Share
            </Button>
            <Button variant="outline" className="justify-start gap-2" disabled={!!busyAction} onClick={() => openPrintPage(true)}>
              <Printer className="h-4 w-4" /> Print
            </Button>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="pay-stub-email">Email PDF copy</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input id="pay-stub-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
              <Button onClick={emailPdf} disabled={busyAction === 'email'} className="gap-2 sm:w-32">
                <Mail className="h-4 w-4" /> Send
              </Button>
            </div>
          </div>

          {busyAction && <p className="text-xs text-muted-foreground">Preparing secure PDF…</p>}
          {pdf && <p className="text-[11px] text-muted-foreground">Secure PDF link ready. Links expire automatically after 1 hour.</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function SubcontractorPayStubsPage() {
  const { data: profile, isLoading: loadingProfile } = useSubcontractorProfile();
  const [activeStub, setActiveStub] = useState<any | null>(null);

  const { data: stubs = [], isLoading, error } = useQuery({
    queryKey: ['sub_portal_pay_stubs', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from('subcontractor_pay_stubs')
        .select('*')
        .eq('subcontractor_id', profile.id)
        .order('period_start', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!profile?.id,
  });

  if (loadingProfile || isLoading) {
    return (
      <div className="px-4 pt-6 pb-4 space-y-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-4 space-y-4 max-w-2xl animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">My Pay Stubs</h1>
        <Badge variant="outline" className="text-[10px]">{stubs.length} total</Badge>
      </div>

      {error && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="p-4 flex items-start gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Could not load pay stubs</p>
              <p className="text-xs opacity-80">{(error as Error).message}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {stubs.length === 0 && !error ? (
        <Card>
          <CardContent className="py-10 text-center">
            <DollarSign className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No pay stubs yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Pay stubs issued by the office will appear here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {stubs.map((s: any) => (
            <Card key={s.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <button className="text-left text-sm font-mono font-semibold text-foreground flex items-center gap-2" onClick={() => setActiveStub(s)}>
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      {s.pay_stub_number}
                    </button>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(parseLocalDate(s.period_start), 'MMM d')} – {format(parseLocalDate(s.period_end), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <Badge className={STATUS_COLORS[s.status] || 'bg-muted'} variant="outline">{s.status}</Badge>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</p>
                    <p className="text-xl font-bold text-foreground">{formatMoney(s.total)}</p>
                  </div>
                  <Button size="sm" onClick={() => setActiveStub(s)} className="gap-1.5 sm:w-auto">
                    <FileText className="h-3.5 w-3.5" /> View Pay Stub
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground text-center pt-2">
        You can only view, download, share, email, or print your own pay stubs.
      </p>

      {activeStub && (
        <PayStubActionsDialog stub={activeStub} open={!!activeStub} onOpenChange={(open) => !open && setActiveStub(null)} />
      )}
    </div>
  );
}