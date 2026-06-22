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

type PdfLink = {
  signedUrl: string;
  downloadUrl: string;
  fileName: string;
};

async function getPayStubPdf(payStubId: string): Promise<PdfLink> {
  const { data, error } = await supabase.functions.invoke('subcontractor-pay-stub-pdf', {
    body: { pay_stub_id: payStubId, action: 'signed_url' },
  });
  if (error) throw error;
  if (!data?.signedUrl) throw new Error(data?.error || 'Could not create secure PDF link.');
  return data as PdfLink;
}

function PayStubActionsDialog({ stub, open, onOpenChange }: { stub: any; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [pdf, setPdf] = useState<PdfLink | null>(null);
  const [email, setEmail] = useState('');

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

  const viewOrPrintPdf = async (action: 'view' | 'print') => {
    const previewWindow = window.open('about:blank', '_blank');
    if (!previewWindow) {
      toast.error('Pop-up blocked. Please allow pop-ups to open the PDF.');
      return;
    }
    previewWindow.document.write('<p style="font-family:system-ui;padding:24px;">Preparing secure PDF…</p>');
    setBusyAction(action);
    try {
      const link = pdf ?? await getPayStubPdf(stub.id);
      setPdf(link);
      previewWindow.location.href = link.signedUrl;
    } catch (e: any) {
      previewWindow.close();
      toast.error(e?.message || 'Could not open the PDF.');
    } finally {
      setBusyAction(null);
    }
  };

  const downloadPdf = async (link: PdfLink) => {
    const res = await fetch(link.downloadUrl || link.signedUrl);
    if (!res.ok) throw new Error('Could not download the PDF file.');
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = link.fileName || `${stub.pay_stub_number || 'payment-statement'}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(blobUrl);
    toast.success('PDF download started.');
  };

  const sharePdf = async (link: PdfLink) => {
    const title = `${stub.pay_stub_number || 'Payment Statement'} - Praetoria Group`;
    try {
      const res = await fetch(link.downloadUrl || link.signedUrl);
      if (!res.ok) throw new Error('Could not prepare PDF for sharing.');
      const blob = await res.blob();
      const file = new File([blob], link.fileName || 'payment-statement.pdf', { type: 'application/pdf' });
      if (navigator.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({ title, text: 'Praetoria Group payment statement', files: [file] });
        return;
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
      const { data, error } = await supabase.functions.invoke('subcontractor-pay-stub-pdf', {
        body: { pay_stub_id: stub.id, action: 'email', email: email.trim() },
      });
      if (error) throw error;
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
              <p className="font-semibold">${Number(stub.total || 0).toFixed(2)} CAD</p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="outline" className="justify-start gap-2" disabled={!!busyAction} onClick={() => viewOrPrintPdf('view')}>
              <ExternalLink className="h-4 w-4" /> View PDF
            </Button>
            <Button variant="outline" className="justify-start gap-2" disabled={!!busyAction} onClick={() => withPdf('download', downloadPdf)}>
              <Download className="h-4 w-4" /> Download PDF
            </Button>
            <Button variant="outline" className="justify-start gap-2" disabled={!!busyAction} onClick={() => withPdf('share', sharePdf)}>
              <Share2 className="h-4 w-4" /> Share PDF
            </Button>
            <Button variant="outline" className="justify-start gap-2" disabled={!!busyAction} onClick={() => viewOrPrintPdf('print')}>
              <Printer className="h-4 w-4" /> Print PDF
            </Button>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="pay-stub-email">Email PDF</Label>
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
                      <FileText className="h-4 w-4 text-muted-foreground" />
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
                    <p className="text-xl font-bold text-foreground">${Number(s.total || 0).toFixed(2)}</p>
                  </div>
                  <Button size="sm" onClick={() => setActiveStub(s)} className="gap-1.5 sm:w-auto">
                    <FileText className="h-3.5 w-3.5" /> Open PDF Actions
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