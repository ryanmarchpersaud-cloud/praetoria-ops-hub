import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle2, Loader2, Send, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { CommsMessage } from '@/hooks/useCommunications';

type Status = 'compose' | 'preview' | 'sending' | 'sent' | 'failed';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fromAddress: string;
  replyTo?: CommsMessage | null;
  onSent?: () => void;
}

export default function ReplyComposerDialog({ open, onOpenChange, fromAddress, replyTo, onSent }: Props) {
  const [to, setTo] = useState(replyTo?.from_address ?? 'admin@praetoriagroup.ca');
  const [subject, setSubject] = useState(
    replyTo?.subject ? (/^re:/i.test(replyTo.subject) ? replyTo.subject : `Re: ${replyTo.subject}`) : '',
  );
  const [body, setBody] = useState('');
  const [status, setStatus] = useState<Status>('compose');
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ id: string; message_id_header: string; in_reply_to_header: string | null } | null>(null);
  const idempotencyKey = useMemo(() => crypto.randomUUID(), [open]);

  const reset = () => {
    setStatus('compose');
    setError(null);
    setDraft(null);
  };

  const prepare = async () => {
    setError(null);
    const { data, error: fnError } = await supabase.functions.invoke('comms-smtp-send', {
      body: {
        action: 'prepare',
        idempotency_key: idempotencyKey,
        to,
        subject,
        body_text: body,
        in_reply_to_id: replyTo?.id ?? null,
      },
    });
    if (fnError || (data as { error?: string })?.error) {
      setError((data as { error?: string })?.error ?? fnError?.message ?? 'Could not prepare the message');
      return;
    }
    setDraft((data as { record: typeof draft }).record);
    setStatus('preview');
  };

  const send = async () => {
    if (!draft) return;
    setStatus('sending');
    setError(null);
    const { data, error: fnError } = await supabase.functions.invoke('comms-smtp-send', {
      body: { action: 'send', id: draft.id, confirm: true },
    });
    if (fnError || (data as { error?: string })?.error) {
      setError((data as { error?: string })?.error ?? fnError?.message ?? 'Send failed');
      setStatus('failed');
      return;
    }
    setStatus('sent');
    toast.success('Staging email sent');
    onSent?.();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Reply
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3.5 w-3.5" /> Staging Mode
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {status === 'compose' && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>From</Label>
              <Input value={fromAddress} readOnly disabled />
              <p className="text-xs text-muted-foreground">
                The sender is fixed to the authenticated staging mailbox.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reply-to">To</Label>
              <Input id="reply-to" value={to} onChange={(e) => setTo(e.target.value)} />
              <p className="text-xs text-muted-foreground">
                Staging mode only delivers to allow-listed recipients.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reply-subject">Subject</Label>
              <Input id="reply-subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reply-body">Message (plain text only)</Label>
              <Textarea id="reply-body" rows={10} value={body} onChange={(e) => setBody(e.target.value)} />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {(status === 'preview' || status === 'sending' || status === 'failed') && draft && (
          <div className="space-y-3">
            <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1">
              <div><span className="text-muted-foreground">From:</span> {fromAddress}</div>
              <div><span className="text-muted-foreground">To:</span> {to}</div>
              <div><span className="text-muted-foreground">Subject:</span> {subject}</div>
              <div className="text-xs text-muted-foreground">Message-ID: {draft.message_id_header}</div>
              {draft.in_reply_to_header && (
                <div className="text-xs text-muted-foreground">In-Reply-To: {draft.in_reply_to_header}</div>
              )}
            </div>
            <pre className="whitespace-pre-wrap break-words text-sm bg-background border rounded-md p-3 max-h-[320px] overflow-auto font-sans">
              {body}
            </pre>
            <Alert>
              <AlertDescription className="text-xs">
                Nothing is sent until you press <strong>Confirm and send</strong>. No automatic sending occurs.
              </AlertDescription>
            </Alert>
            {error && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {status === 'sent' && (
          <div className="flex items-center gap-2 text-sm text-emerald-600 py-6">
            <CheckCircle2 className="h-5 w-5" /> Sent from the staging mailbox.
          </div>
        )}

        <DialogFooter>
          {status === 'compose' && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={prepare} disabled={!to || !subject || !body}>Preview</Button>
            </>
          )}
          {status === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStatus('compose')}>Back</Button>
              <Button onClick={send} className="gap-2">
                <Send className="h-4 w-4" /> Confirm and send
              </Button>
            </>
          )}
          {status === 'sending' && (
            <Button disabled className="gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Sending…
            </Button>
          )}
          {status === 'failed' && (
            <>
              <Button variant="outline" onClick={() => setStatus('compose')}>Edit</Button>
              <Button onClick={send} variant="destructive">Retry send</Button>
            </>
          )}
          {status === 'sent' && <Button onClick={() => onOpenChange(false)}>Close</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
