import { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, FileSignature, Loader2, Type, PenTool, Download, FileText, XCircle, Printer } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAgreementByToken } from '@/hooks/useAgreements';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function AgreementSignPage() {
  const { token } = useParams();
  const { data: agreement, isLoading, refetch } = useAgreementByToken(token);
  const [consent, setConsent] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [signatureType, setSignatureType] = useState<'typed' | 'drawn'>('typed');
  const [typedSig, setTypedSig] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [signed, setSigned] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [pdfSignedUrl, setPdfSignedUrl] = useState<string | null>(null);
  const [showSignForm, setShowSignForm] = useState(false);

  // Canvas for drawn signature
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);

  // Mark as viewed on load
  useEffect(() => {
    if (agreement && agreement.status === 'sent') {
      supabase.from('agreements').update({ status: 'viewed', viewed_at: new Date().toISOString() }).eq('id', agreement.id).then(() => {
        supabase.from('agreement_audit_log').insert({ agreement_id: agreement.id, action: 'viewed', user_agent: navigator.userAgent });
      });
    }
  }, [agreement?.id, agreement?.status]);

  useEffect(() => {
    if (agreement) {
      setSignerName(agreement.recipient_name || '');
      setSignerEmail(agreement.recipient_email || '');
    }
  }, [agreement]);

  // Generate signed URL for PDF attachment
  useEffect(() => {
    if (agreement?.attachment_url) {
      supabase.storage.from('agreement-attachments')
        .createSignedUrl(agreement.attachment_url, 3600)
        .then(({ data }) => {
          if (data?.signedUrl) {
            setPdfSignedUrl(resolveSignedStorageUrl(data.signedUrl));
          }
        });
    }
  }, [agreement?.attachment_url]);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading agreement…</div>;
  if (!agreement) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Agreement not found or link has expired.</div>;
  if (agreement.status === 'signed' || signed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="p-8 space-y-4">
            <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto" />
            <h2 className="text-2xl font-bold">Agreement Signed</h2>
            <p className="text-muted-foreground">Thank you, {agreement.recipient_name}. Your signed agreement has been recorded.</p>
            <p className="text-xs text-muted-foreground">Signed on {agreement.signed_at ? format(new Date(agreement.signed_at), 'MMMM d, yyyy h:mm a') : format(new Date(), 'MMMM d, yyyy h:mm a')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  if (agreement.status === 'declined' || declined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="p-8 space-y-4">
            <XCircle className="h-16 w-16 text-destructive mx-auto" />
            <h2 className="text-2xl font-bold">Agreement Declined</h2>
            <p className="text-muted-foreground">You have declined this agreement. If this was a mistake, please contact us.</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  if (agreement.status === 'cancelled' || agreement.status === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="p-8 space-y-4">
            <h2 className="text-xl font-bold">Agreement {agreement.status === 'cancelled' ? 'Cancelled' : 'Expired'}</h2>
            <p className="text-muted-foreground">This agreement is no longer available for signing.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Canvas drawing handlers
  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setDrawing(true);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const getPos = (ev: any) => {
      if (ev.touches) return { x: ev.touches[0].clientX - rect.left, y: ev.touches[0].clientY - rect.top };
      return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
    };
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const getPos = (ev: any) => {
      if (ev.touches) return { x: ev.touches[0].clientX - rect.left, y: ev.touches[0].clientY - rect.top };
      return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
    };
    const pos = getPos(e);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSubmit = async () => {
    if (!consent) { toast.error('Please check the consent box'); return; }
    if (!signerName.trim()) { toast.error('Please enter your name'); return; }
    if (signatureType === 'typed' && !typedSig.trim()) { toast.error('Please type your signature'); return; }

    setSubmitting(true);
    try {
      let sigData = '';
      if (signatureType === 'typed') {
        sigData = typedSig;
      } else {
        const canvas = canvasRef.current;
        if (canvas) sigData = canvas.toDataURL('image/png');
      }

      // Insert signature
      const { error: sigError } = await supabase.from('agreement_signatures').insert({
        agreement_id: agreement.id,
        signer_name: signerName,
        signer_email: signerEmail,
        signature_data: sigData,
        signature_type: signatureType,
        consent_text: 'I have read and agree to the terms of this agreement.',
        user_agent: navigator.userAgent,
      });
      if (sigError) throw sigError;

      // Update agreement status
      const { error: updError } = await supabase.from('agreements').update({
        status: 'signed',
        signed_at: new Date().toISOString(),
      }).eq('id', agreement.id);
      if (updError) throw updError;

      // Audit log
      await supabase.from('agreement_audit_log').insert({
        agreement_id: agreement.id,
        action: 'signed',
        user_agent: navigator.userAgent,
        metadata: { signer_name: signerName, signer_email: signerEmail },
      });

      setSigned(true);
      toast.success('Agreement signed successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to sign');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = async () => {
    setSubmitting(true);
    try {
      await supabase.from('agreements').update({ status: 'declined', declined_at: new Date().toISOString() }).eq('id', agreement.id);
      await supabase.from('agreement_audit_log').insert({ agreement_id: agreement.id, action: 'declined', user_agent: navigator.userAgent });
      setDeclined(true);
      toast.success('Agreement declined');
    } catch (err: any) {
      toast.error(err.message || 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => {
    if (pdfSignedUrl) {
      window.open(pdfSignedUrl, '_blank');
    } else {
      window.print();
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <FileSignature className="h-10 w-10 text-primary mx-auto" />
          <h1 className="text-2xl font-bold">Praetoria Group</h1>
          <p className="text-sm text-muted-foreground">Agreement Review & Signature</p>
        </div>

        {/* Attached PDF */}
        {pdfSignedUrl && (
          <Card>
            <CardContent className="p-6">
              <h3 className="text-sm font-bold flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4 text-primary" /> Agreement Document (PDF)
              </h3>
              <iframe src={pdfSignedUrl} className="w-full h-[500px] border rounded" title="Agreement PDF" />
              <Button variant="outline" size="sm" className="mt-2" onClick={() => window.open(pdfSignedUrl, '_blank')}>
                <Download className="h-3.5 w-3.5 mr-1" /> Open PDF in New Tab
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Document (HTML body) */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{agreement.title}</h2>
              <Badge variant="outline">Review & Sign</Badge>
            </div>
            <Separator className="mb-4" />
            <ScrollArea className="max-h-[50vh]">
              <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: agreement.body_html }} />
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Quick Action Buttons */}
        {!showSignForm && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="text-lg font-bold text-center">What would you like to do?</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Button size="lg" className="h-16 text-base" onClick={() => setShowSignForm(true)}>
                  <CheckCircle className="h-5 w-5 mr-2" /> Yes, I Approve
                </Button>
                <Button size="lg" variant="destructive" className="h-16 text-base" onClick={handleDecline} disabled={submitting}>
                  <XCircle className="h-5 w-5 mr-2" /> No, I Do Not Approve
                </Button>
                <Button size="lg" variant="outline" className="h-16 text-base" onClick={handlePrint}>
                  <Printer className="h-5 w-5 mr-2" /> Print & Read
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Signature Section (shown after clicking Approve) */}
        {showSignForm && (
          <Card>
            <CardContent className="p-6 space-y-5">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <PenTool className="h-5 w-5 text-primary" /> Sign Agreement
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Full Name</label>
                  <Input value={signerName} onChange={e => setSignerName(e.target.value)} placeholder="Your full legal name" />
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input value={signerEmail} onChange={e => setSignerEmail(e.target.value)} placeholder="your@email.com" />
                </div>
              </div>

              {/* Signature method */}
              <Tabs value={signatureType} onValueChange={(v) => setSignatureType(v as 'typed' | 'drawn')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="typed"><Type className="h-4 w-4 mr-1" /> Type Signature</TabsTrigger>
                  <TabsTrigger value="drawn"><PenTool className="h-4 w-4 mr-1" /> Draw Signature</TabsTrigger>
                </TabsList>
                <TabsContent value="typed" className="mt-3">
                  <Input
                    value={typedSig}
                    onChange={e => setTypedSig(e.target.value)}
                    placeholder="Type your full name as signature"
                    className="text-2xl h-16"
                    style={{ fontFamily: 'cursive' }}
                  />
                  {typedSig && (
                    <div className="mt-2 p-3 border rounded bg-muted/30 text-center">
                      <p className="text-3xl" style={{ fontFamily: 'cursive' }}>{typedSig}</p>
                      <p className="text-xs text-muted-foreground mt-1">Signature Preview</p>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="drawn" className="mt-3">
                  <div className="border-2 border-dashed rounded-lg p-1 bg-white">
                    <canvas
                      ref={canvasRef}
                      width={600}
                      height={150}
                      className="w-full cursor-crosshair touch-none"
                      onMouseDown={startDraw}
                      onMouseMove={draw}
                      onMouseUp={() => setDrawing(false)}
                      onMouseLeave={() => setDrawing(false)}
                      onTouchStart={startDraw}
                      onTouchMove={draw}
                      onTouchEnd={() => setDrawing(false)}
                    />
                  </div>
                  <Button variant="ghost" size="sm" onClick={clearCanvas} className="mt-1">Clear</Button>
                </TabsContent>
              </Tabs>

              <Separator />

              {/* Consent */}
              <div className="flex items-start gap-3 p-4 border rounded-lg bg-muted/30">
                <Checkbox id="consent" checked={consent} onCheckedChange={(c) => setConsent(!!c)} className="mt-0.5" />
                <label htmlFor="consent" className="text-sm leading-relaxed cursor-pointer">
                  I, <strong>{signerName || '[Your Name]'}</strong>, have read, understood, and agree to the terms of this agreement. I consent to this electronic signature being legally binding.
                </label>
              </div>

              <div className="flex gap-3">
                <Button onClick={handleSubmit} disabled={submitting || !consent} className="flex-1 h-12 text-lg">
                  {submitting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <CheckCircle className="h-5 w-5 mr-2" />}
                  Sign Agreement
                </Button>
                <Button variant="outline" onClick={() => setShowSignForm(false)} className="h-12">
                  Back
                </Button>
              </div>

              <p className="text-[11px] text-center text-muted-foreground">
                By clicking "Sign Agreement", you agree to use electronic signatures. A timestamped record will be stored securely.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function resolveSignedStorageUrl(url: string) {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1${url}`;
}
