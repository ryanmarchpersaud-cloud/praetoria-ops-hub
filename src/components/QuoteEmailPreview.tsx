import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Mail, Send, Eye, CheckCircle2, Clock, AlertCircle, X,
} from 'lucide-react';
import { formatCurrency, getQuoteDataForExport } from '@/pages/QuotePrint';

// ─── Email delivery status display helpers ───
const STATUS_CONFIG: Record<string, { label: string; icon: typeof Mail; className: string }> = {
  not_sent: { label: 'Not Sent', icon: Clock, className: 'bg-muted text-muted-foreground' },
  ready: { label: 'Ready to Send', icon: Mail, className: 'bg-accent text-accent-foreground' },
  sent: { label: 'Sent', icon: CheckCircle2, className: 'bg-primary/10 text-primary' },
  delivered: { label: 'Delivered', icon: CheckCircle2, className: 'bg-primary/10 text-primary' },
  failed: { label: 'Failed', icon: AlertCircle, className: 'bg-destructive/10 text-destructive' },
  bounced: { label: 'Bounced', icon: AlertCircle, className: 'bg-destructive/10 text-destructive' },
};

function EmailStatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.not_sent;
  const Icon = config.icon;
  return (
    <Badge variant="secondary" className={`gap-1 ${config.className}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

interface QuoteEmailPreviewProps {
  quote: any;
  lineItems: any[];
  onEmailStatusChange: () => void;
}

export function QuoteEmailPreview({ quote, lineItems, onEmailStatusChange }: QuoteEmailPreviewProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const exportData = getQuoteDataForExport(quote, lineItems);
  const emailStatus = quote.email_delivery_status || 'not_sent';
  const isApproved = quote.approval_status === 'Approved' || quote.approval_status === 'Sent';
  const canSend = isApproved && exportData.client?.email;

  // ─── Mark quote as email-ready (admin action) ───
  const handleMarkReady = async () => {
    try {
      const { error } = await supabase
        .from('quotes')
        .update({ email_ready: true, email_delivery_status: 'ready' } as any)
        .eq('id', quote.id);
      if (error) throw error;

      // Log activity
      await supabase.from('activities').insert({
        action_name: 'quote_email_marked_ready',
        record_type: 'quote',
        record_id: quote.id,
        status: 'completed',
        payload_summary: { quote_number: quote.quote_number, client_email: exportData.client?.email },
      });

      toast({ title: 'Quote marked as ready for email' });
      onEmailStatusChange();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  // ─── Simulate sending (placeholder for external provider) ───
  const handleSendEmail = async () => {
    if (!canSend) return;
    setIsSending(true);
    try {
      // PLACEHOLDER: This is where an external email provider (e.g. via edge function)
      // would be invoked. For now we update the status fields to track the intent.
      const { error } = await supabase
        .from('quotes')
        .update({
          email_delivery_status: 'sent',
          email_sent_at: new Date().toISOString(),
          sent_status: 'Sent',
          sent_at: new Date().toISOString(),
          approval_status: 'Sent' as any,
        } as any)
        .eq('id', quote.id);
      if (error) throw error;

      // Log activity
      await supabase.from('activities').insert({
        action_name: 'quote_email_sent',
        record_type: 'quote',
        record_id: quote.id,
        status: 'completed',
        payload_summary: {
          quote_number: quote.quote_number,
          recipient: exportData.client?.email,
          custom_message: customMessage || null,
        },
      });

      toast({ title: 'Quote email recorded as sent', description: 'Connect an email provider to send automatically.' });
      setShowPreview(false);
      onEmailStatusChange();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5">
            <Mail className="h-4 w-4" /> Email Quote
          </span>
          <EmailStatusBadge status={emailStatus} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Status info */}
        {quote.email_sent_at && (
          <p className="text-xs text-muted-foreground">
            Sent: {new Date(quote.email_sent_at).toLocaleString()}
          </p>
        )}
        {quote.follow_up_email_due_at && (
          <p className="text-xs text-muted-foreground">
            Follow-up due: {new Date(quote.follow_up_email_due_at).toLocaleDateString()}
          </p>
        )}

        {/* Action buttons */}
        {!isApproved && (
          <p className="text-xs text-muted-foreground italic">
            Quote must be approved before sending via email.
          </p>
        )}

        {isApproved && !exportData.client?.email && (
          <p className="text-xs text-destructive">
            No email address on file for this client.
          </p>
        )}

        <div className="flex flex-col gap-2">
          {isApproved && emailStatus === 'not_sent' && (
            <Button size="sm" variant="outline" onClick={handleMarkReady} className="w-full justify-start gap-2">
              <CheckCircle2 className="h-3.5 w-3.5" /> Mark Ready for Email
            </Button>
          )}

          {canSend && (
            <Button size="sm" variant="outline" onClick={() => setShowPreview(!showPreview)} className="w-full justify-start gap-2">
              <Eye className="h-3.5 w-3.5" /> {showPreview ? 'Hide' : 'Preview'} Email
            </Button>
          )}
        </div>

        {/* ── Email Preview Panel ── */}
        {showPreview && (
          <div className="mt-2 space-y-3 border rounded-lg p-3 bg-muted/30">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email Preview</p>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setShowPreview(false)}>
                <X className="h-3 w-3" />
              </Button>
            </div>

            {/* Simulated email header */}
            <div className="text-xs space-y-1 bg-background rounded p-2.5 border">
              <div className="flex gap-2">
                <span className="text-muted-foreground w-10 shrink-0">To:</span>
                <span className="font-medium">{exportData.client?.email}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-muted-foreground w-10 shrink-0">From:</span>
                <span>quotes@praetoriagroup.com</span>
              </div>
              <div className="flex gap-2">
                <span className="text-muted-foreground w-10 shrink-0">Subject:</span>
                <span className="font-medium">
                  Quote {exportData.quoteNumber} — {exportData.serviceCategory} — ${formatCurrency(exportData.total)}
                </span>
              </div>
            </div>

            {/* Email body preview */}
            <div className="text-xs space-y-2 bg-background rounded p-3 border">
              <p>Dear {exportData.client?.name},</p>
              <p>
                Please find attached your quote <strong>{exportData.quoteNumber}</strong> for{' '}
                <strong>{exportData.serviceCategory}</strong> services, totalling{' '}
                <strong>${formatCurrency(exportData.total)} CAD</strong> (incl. tax).
              </p>
              {exportData.scopeOfWork && (
                <p className="text-muted-foreground">{exportData.scopeOfWork}</p>
              )}

              {/* Line items summary */}
              <div className="border rounded p-2 space-y-1">
                {exportData.lineItems.map((item) => (
                  <div key={item.index} className="flex justify-between">
                    <span>{item.name} × {item.quantity}</span>
                    <span className="font-medium">${formatCurrency(item.lineTotal)}</span>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>${formatCurrency(exportData.total)}</span>
                </div>
              </div>

              <p>This quote is valid for 30 days from the issued date. Please reply to this email or call us to proceed.</p>
              <p>Best regards,<br />Praetoria Group</p>
            </div>

            {/* Optional custom message */}
            <div>
              <Label className="text-xs">Custom Message (optional)</Label>
              <Textarea
                value={customMessage}
                onChange={e => setCustomMessage(e.target.value)}
                rows={2}
                placeholder="Add a personal note to the email..."
                className="text-xs"
              />
            </div>

            <Button
              size="sm"
              onClick={handleSendEmail}
              disabled={isSending || !canSend}
              className="w-full gap-2"
            >
              <Send className="h-3.5 w-3.5" />
              {isSending ? 'Sending...' : 'Send Quote Email'}
            </Button>

            <p className="text-[10px] text-muted-foreground text-center">
              Email provider not yet connected — this will record the action and update the quote status.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
