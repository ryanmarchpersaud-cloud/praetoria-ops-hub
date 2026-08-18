import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  CheckCircle, FileSignature, Loader2, Download, FileText, XCircle, Printer,
  ChevronDown, ChevronUp, ArrowRight,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAgreementByToken } from '@/hooks/useAgreements';
import { toast } from 'sonner';
import { format } from 'date-fns';

import { AgreementDocument } from '@/components/agreements/AgreementDocument';
import { SignatureModal, serializeSignature, SignatureValue } from '@/components/agreements/SignatureModal';
import { AgreementField, AgreementFieldValues, completionState } from '@/lib/agreementFields';
import { agreementStatusMeta, isSignable } from '@/lib/agreementStatus';
import { openAgreementPrintWindow } from '@/lib/agreementPrint';
import { PreSignReviewDialog } from '@/components/agreements/PreSignReviewDialog';
import { REQUIRED_SELECTION_KEYS } from '@/lib/agreementTemplates/residentialSnow';
import { PROVISIONAL_BANNER } from '@/lib/combinedDocument';

import logoWhite from '@/assets/praetoria-logo-white.png';

const FALLBACK_SCHEMA: AgreementField[] = [
  {
    key: 'customer_rep_name', label: 'Authorized Representative Name', type: 'text',
    role: 'customer', required: true, placeholder: 'Full legal name',
  },
  {
    key: 'customer_rep_title', label: 'Title / Position', type: 'text',
    role: 'customer', required: true, placeholder: 'e.g. Owner',
  },
  {
    key: 'customer_acknowledgement', label: 'Customer Acknowledgement', type: 'checkbox', role: 'customer', required: true,
    checkboxText: 'I confirm that I have reviewed this Agreement, including the service scope, pricing, exclusions and terms and conditions, and I agree to be bound by the Agreement.',
  },
  { key: 'customer_signature', label: 'Customer Signature', type: 'signature', role: 'customer', required: true },
];

export default function AgreementSignPage() {
  const { token } = useParams();
  const { data: agreement, isLoading, refetch } = useAgreementByToken(token);

  const [values, setValues] = useState<AgreementFieldValues>({});
  const [started, setStarted] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [sigField, setSigField] = useState<AgreementField | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [signed, setSigned] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [pdfSignedUrl, setPdfSignedUrl] = useState<string | null>(null);

  const fieldRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const registerFieldRef = useCallback((key: string, el: HTMLDivElement | null) => { fieldRefs.current[key] = el; }, []);

  const schema: AgreementField[] = useMemo(() => {
    const s = (agreement as any)?.field_schema;
    return Array.isArray(s) && s.length ? (s as AgreementField[]) : FALLBACK_SCHEMA;
  }, [agreement]);

  const hasPlaceholders = useMemo(
    () => Boolean(agreement?.body_html && /data-agreement-field=/.test(agreement.body_html)),
    [agreement?.body_html],
  );

  // Seed values from stored field values + recipient details
  useEffect(() => {
    if (!agreement) return;
    const stored = ((agreement as any).field_values || {}) as AgreementFieldValues;
    setValues((prev) => ({
      customer_rep_name: agreement.recipient_name || '',
      ...stored,
      ...prev,
    }));
  }, [agreement?.id]);

  useEffect(() => {
    if (agreement && ['sent', 'delivered'].includes(agreement.status) && token) {
      supabase.rpc('mark_agreement_viewed', { _token: token });
    }
  }, [agreement?.id, agreement?.status, token]);

  useEffect(() => {
    if ((agreement as any)?.attachment_url) {
      supabase.storage.from('agreement-attachments')
        .createSignedUrl((agreement as any).attachment_url, 3600)
        .then(({ data }) => { if (data?.signedUrl) setPdfSignedUrl(data.signedUrl); });
    }
  }, [(agreement as any)?.attachment_url]);

  const progress = useMemo(() => completionState(schema, values, 'customer'), [schema, values]);

  const scrollToField = useCallback((key: string) => {
    setActiveKey(key);
    const el = fieldRefs.current[key];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const input = el.querySelector('input, button, [role="combobox"]') as HTMLElement | null;
      setTimeout(() => input?.focus({ preventScroll: true }), 450);
    }
  }, []);

  const goToFirstIncomplete = useCallback(() => {
    const next = progress.firstIncomplete || progress.required[0];
    if (next) scrollToField(next.key);
  }, [progress, scrollToField]);

  const step = (dir: 1 | -1) => {
    const list = progress.required;
    if (!list.length) return;
    const idx = activeKey ? list.findIndex((f) => f.key === activeKey) : -1;
    const nextIdx = dir === 1
      ? (idx < 0 ? 0 : Math.min(idx + 1, list.length - 1))
      : Math.max((idx < 0 ? 0 : idx) - 1, 0);
    scrollToField(list[nextIdx].key);
  };

  const setValue = (key: string, value: string | boolean) => {
    setValues((v) => ({ ...v, [key]: value }));
  };

  const handleAdopt = (sig: SignatureValue) => {
    if (!sigField) return;
    setValue(sigField.key, serializeSignature(sig));
    const remaining = progress.required.filter((f) => f.key !== sigField.key && !((values as any)[f.key]));
    setSigField(null);
    if (remaining.length) setTimeout(() => scrollToField(remaining[0].key), 300);
  };

  const handleFinish = () => {
    if (!progress.allComplete) {
      toast.error('Please complete all required fields');
      goToFirstIncomplete();
      return;
    }
    setConfirmOpen(true);
  };

  const handleAgreeAndSign = async () => {
    setSubmitting(true);
    try {
      const sigField = schema.find((f) => f.type === 'signature' && f.role === 'customer');
      const { error } = await supabase.rpc('submit_agreement_signature' as never, {
        _token: token!,
        _signer_name: String(values.customer_rep_name || agreement?.recipient_name || ''),
        _signer_email: agreement?.recipient_email || '',
        _signer_title: String(values.customer_rep_title || ''),
        _signature_data: String((sigField && values[sigField.key]) || ''),
        _signature_type: 'electronic',
        _consent_text:
          'I confirm that I have reviewed this Service Agreement, including the service scope, pricing, selected snowfall trigger, exclusions, site-specific instructions and terms and conditions, and I agree to be bound by the Agreement.',
        _field_values: values as never,
        _user_agent: navigator.userAgent,
      } as never);
      if (error) throw error;

      // Fire-and-forget completion notification
      supabase.functions.invoke('send-email', {
        body: {
          action: 'agreement_completed',
          to: agreement?.recipient_email,
          recipient_name: agreement?.recipient_name,
          agreement_title: agreement?.title,
          agreement_id: agreement?.id,
          agreement_number: (agreement as any)?.agreement_number,
        },
      }).catch(() => undefined);

      setConfirmOpen(false);
      setSigned(true);
      refetch();
      toast.success('Agreement signed successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to sign agreement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = async () => {
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc('decline_agreement_with_token', { _token: token!, _user_agent: navigator.userAgent });
      if (error) throw error;
      setDeclined(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => {
    if (!agreement) return;
    openAgreementPrintWindow(
      { ...(agreement as any), field_schema: schema, field_values: values },
      { logoUrl: `${window.location.origin}${logoWhite}` },
    );
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading agreement…</div>;
  if (!agreement) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Agreement not found or link has expired.</div>;

  const statusMeta = agreementStatusMeta(agreement.status);
  const alreadyComplete = signed || ['customer_signed', 'awaiting_praetoria', 'fully_executed', 'signed'].includes(agreement.status);

  if (alreadyComplete) {
    return (
      <div className="min-h-screen bg-muted/30 p-4 flex items-center justify-center">
        <div className="max-w-2xl w-full space-y-4">
          <Card className="text-center">
            <CardContent className="p-8 space-y-4">
              <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto" />
              <h2 className="text-2xl font-bold">Agreement Successfully Signed ✓</h2>
              <p className="text-muted-foreground">
                Thank you. Your completed agreement is now available in your Praetoria Operations Hub Customer Portal.
              </p>
              <p className="text-xs text-muted-foreground">
                {(agreement as any).agreement_number} · Signed{' '}
                {(agreement as any).customer_signed_at || agreement.signed_at
                  ? format(new Date((agreement as any).customer_signed_at || agreement.signed_at!), 'MMMM d, yyyy h:mm a')
                  : format(new Date(), 'MMMM d, yyyy h:mm a')}
              </p>
              {agreement.status === 'awaiting_praetoria' && (
                <Badge className="bg-indigo-100 text-indigo-700">Awaiting Praetoria Signature</Badge>
              )}
              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <Button onClick={handlePrint}><FileText className="h-4 w-4 mr-2" /> View Signed Agreement</Button>
                <Button variant="outline" onClick={handlePrint}><Download className="h-4 w-4 mr-2" /> Download PDF</Button>
                <Button variant="ghost" onClick={() => (window.location.href = '/portal/agreements')}>Return to Customer Portal</Button>
              </div>
            </CardContent>
          </Card>
        </div>
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

  if (!isSignable(agreement.status) && agreement.status !== 'draft') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="p-8 space-y-3">
            <h2 className="text-xl font-bold">Agreement {statusMeta.label}</h2>
            <p className="text-muted-foreground">This agreement is no longer available for signing.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-32">
      {/* Branded header */}
      <div className="bg-[#0F172A] text-white">
        <div className="max-w-4xl mx-auto px-4 py-5 flex items-center gap-4">
          <img src={logoWhite} alt="Praetoria Group" className="h-12 w-12 object-contain" />
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold leading-tight truncate">Praetoria Group</h1>
            <p className="text-xs text-white/75">Agreement Review &amp; Electronic Signature</p>
          </div>
          <Badge className="ml-auto bg-white/15 text-white border-0">{statusMeta.label}</Badge>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        <Card>
          <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">{(agreement as any).agreement_number}</p>
              <h2 className="text-lg font-bold leading-snug">{agreement.title}</h2>
              <p className="text-sm text-muted-foreground">Prepared for {agreement.recipient_name}</p>
            </div>
            {!started ? (
              <Button size="lg" className="w-full sm:w-auto" onClick={() => { setStarted(true); setTimeout(goToFirstIncomplete, 200); }}>
                <FileSignature className="h-5 w-5 mr-2" /> Start Signing
              </Button>
            ) : (
              <Button size="lg" variant="secondary" className="w-full sm:w-auto" onClick={goToFirstIncomplete}>
                Next Required Field <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </CardContent>
        </Card>

        {pdfSignedUrl && (
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><FileText className="h-4 w-4" /> Attached Document</h3>
              <iframe src={pdfSignedUrl} className="w-full h-[420px] rounded border" title="Agreement PDF" />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-4 sm:p-8">
            <AgreementDocument
              bodyHtml={agreement.body_html}
              schema={schema}
              values={values}
              interactiveRole="customer"
              activeFieldKey={activeKey}
              signedDates={{ customer: null, praetoria: (agreement as any).countersigned_at }}
              onChange={setValue}
              onSignatureRequest={(f) => setSigField(f)}
              registerFieldRef={registerFieldRef}
            />

            {/* Legacy agreements without inline placeholders: render the fields below the body */}
            {!hasPlaceholders && (
              <div className="mt-6 border-t pt-6">
                <h3 className="text-sm font-bold mb-3">Required Information &amp; Signature</h3>
                <AgreementDocument
                  bodyHtml={schema.map((f) => `<span data-agreement-field="${f.key}"></span>`).join('')}
                  schema={schema}
                  values={values}
                  interactiveRole="customer"
                  activeFieldKey={activeKey}
                  onChange={setValue}
                  onSignatureRequest={(f) => setSigField(f)}
                  registerFieldRef={registerFieldRef}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handlePrint}><Printer className="h-4 w-4 mr-2" /> Print</Button>
          <Button variant="ghost" className="text-destructive" onClick={handleDecline} disabled={submitting}>
            <XCircle className="h-4 w-4 mr-2" /> Decline to Sign
          </Button>
        </div>
      </div>

      {/* Sticky signing toolbar */}
      <div className="fixed bottom-0 inset-x-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="max-w-4xl mx-auto px-4 py-3 space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold whitespace-nowrap">
              {progress.completedCount} of {progress.total} required fields completed
            </span>
            <Progress value={progress.total ? (progress.completedCount / progress.total) * 100 : 0} className="h-2 flex-1" />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => step(-1)} aria-label="Previous field">
              <ChevronUp className="h-4 w-4 mr-1" /> Previous
            </Button>
            <Button variant="outline" size="sm" onClick={() => step(1)} aria-label="Next required field">
              <ChevronDown className="h-4 w-4 mr-1" /> Next Required Field
            </Button>
            <Button className="ml-auto" onClick={handleFinish} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileSignature className="h-4 w-4 mr-2" />}
              Finish &amp; Sign
            </Button>
          </div>
        </div>
      </div>

      <SignatureModal
        open={Boolean(sigField)}
        onOpenChange={(o) => !o && setSigField(null)}
        defaultName={String(values.customer_rep_name || agreement.recipient_name || '')}
        onAdopt={handleAdopt}
      />

      {isCombined ? (
        <PreSignReviewDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          agreement={agreement}
          values={values}
          provisional={isProvisional}
          submitting={submitting}
          missingSelections={missingSelections}
          onConfirm={handleAgreeAndSign}
          onDecline={handleDecline}
        />
      ) : (
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Confirm Your Signature</DialogTitle>
              <DialogDescription>
                By selecting “Agree &amp; Sign,” you confirm that you intend to electronically sign this Service Agreement.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>Go Back</Button>
              <Button onClick={handleAgreeAndSign} disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Agree &amp; Sign
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}
