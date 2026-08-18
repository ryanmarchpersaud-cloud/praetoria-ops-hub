import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Send, Download, RefreshCw, Eye, FileSignature, Clock, CheckCircle, XCircle, Copy, FileText, Pencil, Save, PenLine, Ban, CopyPlus, FilePlus2 } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useAgreement, useAgreementSignatures, useAgreementAuditLog, useSendAgreement, useUpdateAgreement, useCountersignAgreement, useVoidAgreement, useCloneAgreement } from '@/hooks/useAgreements';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import DOMPurify from 'dompurify';
import { AgreementDocument } from '@/components/agreements/AgreementDocument';
import { SignatureModal, serializeSignature, SignatureValue } from '@/components/agreements/SignatureModal';
import { AgreementField, AgreementFieldValues } from '@/lib/agreementFields';
import { agreementStatusMeta, canRemind } from '@/lib/agreementStatus';
import { openAgreementPrintWindow } from '@/lib/agreementPrint';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { CombinedDocumentPanel } from '@/components/agreements/CombinedDocumentPanel';
import { resolveAgreementBody, resolveAgreementSchema } from '@/lib/agreementBody';


const statusIcon: Record<string, any> = {
  draft: Clock, sent: Send, viewed: Eye, signed: CheckCircle, fully_executed: CheckCircle,
  customer_signed: CheckCircle, awaiting_praetoria: PenLine, declined: XCircle, expired: Clock,
  cancelled: XCircle, voided: Ban, superseded: FileText,
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
  const countersign = useCountersignAgreement();
  const voidAgreement = useVoidAgreement();
  const cloneAgreement = useCloneAgreement();

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editRecipientName, setEditRecipientName] = useState('');
  const [editRecipientEmail, setEditRecipientEmail] = useState('');
  const [countersignOpen, setCountersignOpen] = useState(false);
  const [sigModalOpen, setSigModalOpen] = useState(false);
  const [repName, setRepName] = useState('Ryan Steven Persaud');
  const [repTitle, setRepTitle] = useState('Authorized Representative');
  const [repSignature, setRepSignature] = useState<string>('');


  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading…</div>;
  if (!agreement) return <div className="p-8 text-center text-muted-foreground">Agreement not found</div>;

  const startEdit = () => {
    setEditTitle(agreement.title || '');
    setEditBody(resolveAgreementBody(agreement));
    setEditRecipientName(agreement.recipient_name || '');
    setEditRecipientEmail(agreement.recipient_email || '');
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (!editTitle.trim() || !editRecipientName.trim()) { toast.error('Title and recipient name are required'); return; }
    updateAgreement.mutate(
      {
        id: agreement.id,
        title: editTitle.trim(),
        body_html: editBody,
        recipient_name: editRecipientName.trim(),
        recipient_email: editRecipientEmail.trim() || null,
      },
      { onSuccess: () => { toast.success('Agreement updated'); setIsEditing(false); } }
    );
  };

  const signingUrl = `${window.location.origin}/sign/${agreement.signing_token}`;
  const StatusIcon = statusIcon[agreement.status] || Clock;
  const statusMeta = agreementStatusMeta(agreement.status);
  const isAwaitingPraetoria = ['awaiting_praetoria', 'customer_signed'].includes(agreement.status);
  const isLocked = ['fully_executed', 'signed', 'voided', 'cancelled', 'superseded'].includes(agreement.status);
  const fieldSchema = ((resolveAgreementSchema(agreement) || []) as AgreementField[]);
  const fieldValues = (((agreement as any).field_values || {}) as AgreementFieldValues);

  const handleVoid = () => {
    const reason = window.prompt('Reason for voiding this agreement?') || '';
    if (!reason.trim()) return;
    voidAgreement.mutate({ id: agreement.id, reason: reason.trim() });
  };

  const handleCountersign = () => {
    if (!repName.trim() || !repTitle.trim()) { toast.error('Enter the authorized representative name and title'); return; }
    if (!repSignature) { toast.error('Adopt a signature first'); return; }
    countersign.mutate(
      { agreementId: agreement.id, signerName: repName.trim(), signerTitle: repTitle.trim(), signatureData: repSignature },
      {
        onSuccess: async () => {
          setCountersignOpen(false);
          const merged = { ...fieldValues, praetoria_signature: repSignature };
          await supabase.from('agreements').update({ field_values: merged as never }).eq('id', agreement.id);
          if (agreement.recipient_email) {
            supabase.functions.invoke('send-email', {
              body: {
                action: 'agreement_completed',
                to: agreement.recipient_email,
                recipient_name: agreement.recipient_name,
                agreement_title: agreement.title,
                agreement_id: agreement.id,
                agreement_number: (agreement as any).agreement_number,
              },
            }).catch(() => undefined);
          }
        },
      },
    );
  };


  const handleSend = () => {
    if (!agreement.recipient_email) {
      toast.error('No recipient email set — add it below, then Save and send again');
      startEdit();
      setTimeout(() => document.getElementById('agreement-recipient-email')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
      setTimeout(() => (document.getElementById('agreement-recipient-email') as HTMLInputElement | null)?.focus(), 400);
      return;
    }
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
    if (fieldSchema.length) {
      openAgreementPrintWindow({ ...(agreement as any), body_html: resolveAgreementBody(agreement) } as any, {
        logoUrl: `${window.location.origin}/praetoria-logo-white.png`,
        audit: auditLog as any,
      });
      return;
    }
    const w = window.open('', '_blank');
    if (!w) return;
    const esc = (v: unknown) =>
      String(v ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    const safeBody = DOMPurify.sanitize(resolveAgreementBody(agreement));
    const safeTitle = esc(agreement.title);
    const safeSignatures = signatures.length > 0
      ? signatures.map((s: any) => {
          const safeName = esc(s.signer_name);
          const safeConsent = esc(s.consent_text);
          const safeDate = esc(format(new Date(s.signed_at), 'MMMM d, yyyy h:mm a'));
          let sigBlock = '';
          if (s.signature_type === 'typed') {
            sigBlock = `<p style="font-family:cursive;font-size:28px;margin-top:8px;">${esc(s.signature_data || s.signer_name)}</p>`;
          } else if (s.signature_data) {
            // Only allow safe data: image URLs; otherwise drop.
            const isSafeImg = /^data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/.test(s.signature_data);
            sigBlock = isSafeImg ? `<img src="${s.signature_data}" style="max-height:80px;margin-top:8px;" />` : '';
          }
          return `<div class="sig-box">
            <p><strong>Signed by:</strong> ${safeName}</p>
            <p><strong>Date:</strong> ${safeDate}</p>
            ${sigBlock}
            <p style="font-size:11px;color:#64748b;margin-top:8px;">${safeConsent}</p>
          </div>`;
        }).join('')
      : '';
    const logoUrl = `${window.location.origin}/praetoria-logo-white.png`;
    const generated = esc(format(new Date(), 'MMM d, yyyy h:mm a'));
    const letterhead = `<div class="letterhead">
      <img src="${logoUrl}" alt="Praetoria Group" />
      <div>
        <h1>Praetoria Operations Group Inc.</h1>
        <p>Head Office: 2282 Unit B, Toronto Street, Regina, Saskatchewan</p>
        <p>Email: support@praetoriagroup.ca • Web: praetoriagroup.ca</p>
        <span class="doc-chip">${safeTitle}</span>
      </div>
    </div>`;
    const footer = `<div class="doc-footer">Praetoria Group • 2282 Unit B, Toronto Street, Regina, Saskatchewan • support@praetoriagroup.ca • Generated ${generated}</div>`;
    w.document.write(`<!DOCTYPE html><html><head><title>${safeTitle}</title>
      <style>body{font-family:-apple-system,sans-serif;max-width:800px;margin:0 auto;padding:32px;color:#1a1a2e;}h1,h2{color:#0f172a;}
      .letterhead{display:flex;align-items:center;gap:24px;background:linear-gradient(135deg,#0F172A 0%,#1E3A8A 100%);color:#fff;border-radius:8px;padding:24px;margin-bottom:24px;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
      .letterhead img{height:110px;width:110px;object-fit:contain;flex-shrink:0;}
      .letterhead h1{color:#fff;font-size:26px;margin:0 0 8px;}
      .letterhead p{margin:2px 0;font-size:13px;color:rgba(255,255,255,.95);}
      .doc-chip{display:inline-block;margin-top:12px;background:#fff;color:#0F172A;font-weight:700;padding:6px 14px;border-radius:6px;font-size:14px;}
      .doc-footer{margin-top:32px;background:#0F172A;color:#fff;border-radius:8px;padding:12px;text-align:center;font-size:11px;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
      .sig-box{margin-top:32px;border:2px solid #e2e8f0;border-radius:8px;padding:16px;}
      .sig-box p{margin:4px 0;font-size:13px;}
      @media print{body{padding:0;}}</style></head><body>
      ${letterhead}
      ${safeBody}
      ${safeSignatures}
      ${footer}
      </body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 800);
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
        <Badge className={`${statusMeta.className} text-sm px-3 py-1`}>
          <StatusIcon className="h-3.5 w-3.5 mr-1" />
          {statusMeta.label}
        </Badge>
      </div>

      {/* Action Bar */}
      <div className="flex gap-2 flex-wrap">
        {['draft', 'ready_to_send'].includes(agreement.status) && (
          <Button onClick={handleSend} disabled={sendAgreement.isPending}>
            <Send className="h-4 w-4 mr-1" /> Send for Signature
          </Button>
        )}
        {isAwaitingPraetoria && (
          <Button onClick={() => setCountersignOpen(true)}>
            <PenLine className="h-4 w-4 mr-1" /> Review &amp; Sign
          </Button>
        )}
        {!isLocked && (
          <Button variant="outline" onClick={startEdit}>
            <Pencil className="h-4 w-4 mr-1" /> {isEditing ? 'Editing…' : 'Edit Agreement'}
          </Button>
        )}
        {canRemind(agreement.status) && (
          <Button variant="outline" onClick={handleResend}>
            <RefreshCw className="h-4 w-4 mr-1" /> Send Reminder
          </Button>
        )}
        <Button variant="outline" onClick={handleCopyLink}>
          <Copy className="h-4 w-4 mr-1" /> Copy Signing Link
        </Button>
        <Button variant="outline" onClick={handlePrint}>
          <Download className="h-4 w-4 mr-1" /> Print / PDF
        </Button>
        <Button variant="outline" onClick={() => cloneAgreement.mutate({ id: agreement.id, mode: 'duplicate', userId: user?.id }, { onSuccess: (a: any) => navigate(`/agreements/${a.id}`) })}>
          <CopyPlus className="h-4 w-4 mr-1" /> Duplicate
        </Button>
        <Button variant="outline" onClick={() => cloneAgreement.mutate({ id: agreement.id, mode: 'amendment', userId: user?.id }, { onSuccess: (a: any) => navigate(`/agreements/${a.id}`) })}>
          <FilePlus2 className="h-4 w-4 mr-1" /> Create Amendment
        </Button>
        <Button variant="outline" onClick={() => cloneAgreement.mutate({ id: agreement.id, mode: 'renewal', userId: user?.id }, { onSuccess: (a: any) => navigate(`/agreements/${a.id}`) })}>
          <RefreshCw className="h-4 w-4 mr-1" /> Create Renewal
        </Button>
        {!isLocked && (
          <Button variant="destructive" size="sm" onClick={handleVoid}>
            <Ban className="h-4 w-4 mr-1" /> Void
          </Button>
        )}
      </div>

      {!agreement.recipient_email && agreement.status !== 'signed' && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span>No recipient email is set on this agreement, so it can't be emailed yet.</span>
          <Button size="sm" variant="outline" onClick={handleSend}>Set recipient email</Button>
        </div>
      )}

      {(agreement as any).is_combined_document && (
        <CombinedDocumentPanel agreement={agreement} userId={user?.id} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Document Preview */}
        <div className="lg:col-span-2 space-y-4">

          {/* PDF Attachment */}
          <AgreementPdfViewer attachmentUrl={agreement.attachment_url} />


          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Agreement Document</CardTitle>
              {isEditing && (
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                  <Button size="sm" onClick={handleSaveEdit} disabled={updateAgreement.isPending}>
                    <Save className="h-4 w-4 mr-1" /> Save
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Title</Label>
                    <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Recipient Name</Label>
                      <Input value={editRecipientName} onChange={e => setEditRecipientName(e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs">Recipient Email</Label>
                      <Input id="agreement-recipient-email" type="email" placeholder="name@company.com" value={editRecipientEmail} onChange={e => setEditRecipientEmail(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Document Body (HTML)</Label>
                    <Textarea className="font-mono text-xs min-h-[420px]" value={editBody} onChange={e => setEditBody(e.target.value)} />
                  </div>
                </div>
              ) : (
                <div>
                  <div
                    className="rounded-lg p-5 mb-6 flex flex-col sm:flex-row items-center gap-5 text-white"
                    style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E3A8A 100%)', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                  >
                    <img src="/praetoria-logo-white.png" alt="Praetoria Group" className="h-24 w-24 sm:h-28 sm:w-28 object-contain flex-shrink-0" />
                    <div className="flex-1 text-center sm:text-left">
                      <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">Praetoria Operations Group Inc.</h2>
                      <p className="text-xs sm:text-sm text-white/95 mt-1">Head Office: 2282 Unit B, Toronto Street, Regina, Saskatchewan</p>
                      <p className="text-xs sm:text-sm text-white/95">Email: support@praetoriagroup.ca • Web: praetoriagroup.ca</p>
                      <span className="inline-block mt-3 bg-white text-[#0F172A] font-bold px-3 py-1.5 rounded text-sm">{agreement.title}</span>
                    </div>
                  </div>
                  {fieldSchema.length ? (
                    <AgreementDocument
                      bodyHtml={resolveAgreementBody(agreement)}
                      schema={fieldSchema}
                      values={fieldValues}
                      showRequiredHints={false}
                      signedDates={{ customer: (agreement as any).customer_signed_at, praetoria: (agreement as any).countersigned_at }}
                    />
                  ) : (
                    <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(resolveAgreementBody(agreement)) }} />
                  )}
                  <div
                    className="rounded-lg mt-8 p-3 text-[11px] text-center text-white"
                    style={{ background: '#0F172A', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                  >
                    Praetoria Group • 2282 Unit B, Toronto Street, Regina, Saskatchewan • support@praetoriagroup.ca
                  </div>
                </div>
              )}
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

      {/* Praetoria countersignature */}
      <Dialog open={countersignOpen} onOpenChange={setCountersignOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Praetoria Authorized Signature</DialogTitle>
            <DialogDescription>
              Sign on behalf of Praetoria. Only an authorized representative should complete this step.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Full Name</Label>
              <Input value={repName} onChange={(e) => setRepName(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Position / Title</Label>
              <Input value={repTitle} onChange={(e) => setRepTitle(e.target.value)} />
            </div>
            <div className="rounded-lg border-2 border-dashed p-4 min-h-[90px] flex items-center justify-center bg-muted/30">
              {repSignature ? (
                <img
                  src={JSON.parse(repSignature).type === 'typed' ? undefined : JSON.parse(repSignature).value}
                  alt=""
                  className={JSON.parse(repSignature).type === 'typed' ? 'hidden' : 'max-h-20'}
                />
              ) : null}
              {repSignature && JSON.parse(repSignature).type === 'typed' && (
                <span className="text-3xl" style={{ fontFamily: '"Segoe Script", "Brush Script MT", cursive' }}>
                  {JSON.parse(repSignature).value}
                </span>
              )}
              {!repSignature && (
                <Button variant="secondary" onClick={() => setSigModalOpen(true)}>
                  <PenLine className="h-4 w-4 mr-2" /> Click to Sign
                </Button>
              )}
            </div>
            {repSignature && (
              <Button variant="ghost" size="sm" onClick={() => setSigModalOpen(true)}>Change signature</Button>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setCountersignOpen(false)}>Cancel</Button>
            <Button onClick={handleCountersign} disabled={countersign.isPending}>Agree &amp; Sign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SignatureModal
        open={sigModalOpen}
        onOpenChange={setSigModalOpen}
        defaultName={repName}
        title="Adopt Praetoria Signature"
        onAdopt={(sig: SignatureValue) => setRepSignature(serializeSignature(sig))}
      />
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
