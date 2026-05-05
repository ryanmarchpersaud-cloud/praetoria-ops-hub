import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Send, Download, RefreshCw, Eye, FileSignature, Clock, CheckCircle, XCircle, Copy, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useAgreement, useAgreementSignatures, useAgreementAuditLog, useSendAgreement, useUpdateAgreement } from '@/hooks/useAgreements';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-blue-100 text-blue-700',
  viewed: 'bg-amber-100 text-amber-700',
  signed: 'bg-emerald-100 text-emerald-700',
  declined: 'bg-destructive/10 text-destructive',
  expired: 'bg-muted text-muted-foreground',
  cancelled: 'bg-muted text-muted-foreground',
};

const statusIcon: Record<string, any> = {
  draft: Clock, sent: Send, viewed: Eye, signed: CheckCircle, declined: XCircle, expired: Clock, cancelled: XCircle,
};

export default function AgreementDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: agreement, isLoading } = useAgreement(id);
  const { data: signatures = [] } = useAgreementSignatures(id);
  const { data: auditLog = [] } = useAgreementAuditLog(id);
  const sendAgreement = useSendAgreement();
  const updateAgreement = useUpdateAgreement();

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading…</div>;
  if (!agreement) return <div className="p-8 text-center text-muted-foreground">Agreement not found</div>;

  const signingUrl = `${window.location.origin}/sign/${agreement.signing_token}`;
  const StatusIcon = statusIcon[agreement.status] || Clock;

  const handleSend = () => {
    if (!agreement.recipient_email) { toast.error('No recipient email set'); return; }
    sendAgreement.mutate({ id: agreement.id, sentBy: user?.id! });
  };

  const handleCancel = () => {
    updateAgreement.mutate({ id: agreement.id, status: 'cancelled' });
    toast.success('Agreement cancelled');
  };

  const handleResend = () => {
    sendAgreement.mutate({ id: agreement.id, sentBy: user?.id!, isReminder: true });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(signingUrl);
    toast.success('Signing link copied');
  };

  const handlePrint = async () => {
    // If a PDF attachment exists, load it as an in-app blob first so browsers do not block the signed storage URL.
    if (agreement.attachment_url) {
      const pdfWindow = window.open('', '_blank');
      try {
        const pdfUrl = await createAgreementPdfObjectUrl(agreement.attachment_url);
        if (pdfWindow) {
          pdfWindow.location.href = pdfUrl;
        } else {
          const link = document.createElement('a');
          link.href = pdfUrl;
          link.download = `${agreement.title || 'agreement'}.pdf`;
          link.click();
        }
      } catch (error) {
        pdfWindow?.close();
        toast.error('Could not load attached PDF');
      }
      return;
    }
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>${agreement.title}</title>
      <style>body{font-family:-apple-system,sans-serif;max-width:750px;margin:0 auto;padding:32px;color:#1a1a2e;}h1,h2{color:#0f172a;}
      .sig-box{margin-top:32px;border:2px solid #e2e8f0;border-radius:8px;padding:16px;}
      .sig-box p{margin:4px 0;font-size:13px;}
      @media print{body{padding:0;}}</style></head><body>
      ${agreement.body_html}
      ${signatures.length > 0 ? signatures.map(s => `
        <div class="sig-box">
          <p><strong>Signed by:</strong> ${s.signer_name}</p>
          <p><strong>Date:</strong> ${format(new Date(s.signed_at), 'MMMM d, yyyy h:mm a')}</p>
          ${s.signature_type === 'typed' ? `<p style="font-family:cursive;font-size:28px;margin-top:8px;">${s.signature_data || s.signer_name}</p>` : (s.signature_data ? `<img src="${s.signature_data}" style="max-height:80px;margin-top:8px;" />` : '')}
          <p style="font-size:11px;color:#64748b;margin-top:8px;">${s.consent_text}</p>
        </div>`).join('') : ''}
      </body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 500);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate('/agreements')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-primary" />
            {agreement.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {agreement.recipient_name} • {agreement.recipient_type}
            {agreement.internal_reference && ` • Ref: ${agreement.internal_reference}`}
          </p>
        </div>
        <Badge className={`${statusColors[agreement.status]} text-sm px-3 py-1`}>
          <StatusIcon className="h-3.5 w-3.5 mr-1" />
          {agreement.status.charAt(0).toUpperCase() + agreement.status.slice(1)}
        </Badge>
      </div>

      {/* Action Bar */}
      <div className="flex gap-2 flex-wrap">
        {agreement.status === 'draft' && (
          <Button onClick={handleSend} disabled={sendAgreement.isPending}>
            <Send className="h-4 w-4 mr-1" /> Send for Signature
          </Button>
        )}
        {(agreement.status === 'sent' || agreement.status === 'viewed') && (
          <Button variant="outline" onClick={handleResend}>
            <RefreshCw className="h-4 w-4 mr-1" /> Resend Reminder
          </Button>
        )}
        <Button variant="outline" onClick={handleCopyLink}>
          <Copy className="h-4 w-4 mr-1" /> Copy Signing Link
        </Button>
        <Button variant="outline" onClick={handlePrint}>
          <Download className="h-4 w-4 mr-1" /> Print / PDF
        </Button>
        {agreement.status !== 'signed' && agreement.status !== 'cancelled' && (
          <Button variant="destructive" size="sm" onClick={handleCancel}>Cancel</Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Document Preview */}
        <div className="lg:col-span-2 space-y-4">
          {/* PDF Attachment */}
          <AgreementPdfViewer attachmentUrl={agreement.attachment_url} />

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Agreement Document</CardTitle></CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: agreement.body_html }} />
            </CardContent>
          </Card>

          {/* Signatures */}
          {signatures.length > 0 && (
            <Card className="mt-4">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><CheckCircle className="h-4 w-4 text-emerald-600" /> Signatures</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {signatures.map(sig => (
                  <div key={sig.id} className="border rounded-lg p-4 bg-muted/30">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">{sig.signer_name}</p>
                        <p className="text-xs text-muted-foreground">{sig.signer_email}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{format(new Date(sig.signed_at), 'MMM d, yyyy h:mm a')}</p>
                    </div>
                    {sig.signature_type === 'typed' ? (
                      <p className="mt-3 text-2xl" style={{ fontFamily: 'cursive' }}>{sig.signature_data || sig.signer_name}</p>
                    ) : sig.signature_data ? (
                      <img src={sig.signature_data} alt="Signature" className="mt-3 max-h-16" />
                    ) : null}
                    <p className="text-xs text-muted-foreground mt-2 italic">{sig.consent_text}</p>
                    {sig.ip_address && <p className="text-[10px] text-muted-foreground mt-1">IP: {sig.ip_address}</p>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Details */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Details</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-2">
              <DetailRow label="Recipient" value={agreement.recipient_name} />
              <DetailRow label="Email" value={agreement.recipient_email || '—'} />
              <DetailRow label="Type" value={agreement.recipient_type} />
              <DetailRow label="Category" value={agreement.category} />
              <DetailRow label="Version" value={String(agreement.version)} />
              {agreement.sent_at && <DetailRow label="Sent" value={format(new Date(agreement.sent_at), 'MMM d, yyyy h:mm a')} />}
              {agreement.viewed_at && <DetailRow label="Viewed" value={format(new Date(agreement.viewed_at), 'MMM d, yyyy h:mm a')} />}
              {agreement.signed_at && <DetailRow label="Signed" value={format(new Date(agreement.signed_at), 'MMM d, yyyy h:mm a')} />}
              {agreement.expires_at && <DetailRow label="Expires" value={format(new Date(agreement.expires_at), 'MMM d, yyyy')} />}
            </CardContent>
          </Card>

          {/* Signing Link */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Signing Link</CardTitle></CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground break-all bg-muted p-2 rounded font-mono">{signingUrl}</p>
              <Button variant="outline" size="sm" className="mt-2 w-full" onClick={handleCopyLink}>
                <Copy className="h-3.5 w-3.5 mr-1" /> Copy Link
              </Button>
            </CardContent>
          </Card>

          {/* Audit Trail */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Audit Trail</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="max-h-64">
                <div className="space-y-2">
                  {auditLog.map(log => (
                    <div key={log.id} className="text-xs border-l-2 border-primary/30 pl-3 py-1">
                      <p className="font-medium capitalize">{log.action}</p>
                      <p className="text-muted-foreground">{format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}</p>
                    </div>
                  ))}
                  {auditLog.length === 0 && <p className="text-xs text-muted-foreground">No activity yet</p>}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

function AgreementPdfViewer({ attachmentUrl }: { attachmentUrl: string | null }) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!attachmentUrl) return;
    let objectUrl: string | null = null;
    createAgreementPdfObjectUrl(attachmentUrl).then((url) => {
      objectUrl = url;
      setPdfUrl(url);
    }).catch(() => toast.error('Could not preview attached PDF'));

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachmentUrl]);

  if (!attachmentUrl || !pdfUrl) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" /> Attached PDF Agreement
        </CardTitle>
      </CardHeader>
      <CardContent>
        <iframe src={pdfUrl} className="w-full h-[600px] border rounded" title="Agreement PDF" />
        <div className="mt-2 flex gap-2">
          <Button asChild variant="outline" size="sm">
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
              <Download className="h-3.5 w-3.5 mr-1" /> Open PDF in New Tab
            </a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href={pdfUrl} download="agreement.pdf">
              <Download className="h-3.5 w-3.5 mr-1" /> Download PDF
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

async function createAgreementPdfObjectUrl(attachmentUrl: string) {
  const { data, error } = await supabase.storage
    .from('agreement-attachments')
    .download(attachmentUrl);

  if (error || !data) throw error || new Error('PDF download failed');

  return URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
}
