import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Trash2, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Props {
  /** Compact button-only variant for sidebars/footers. */
  variant?: 'card' | 'inline';
}

export function DeleteAccountSection({ variant = 'card' }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(false);

  const { data: existing } = useQuery({
    queryKey: ['account_deletion_request', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('account_deletion_requests')
        .select('id, status, requested_at')
        .eq('user_id', user.id)
        .order('requested_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const pending = existing && existing.status === 'pending';

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    const { error } = await supabase.from('account_deletion_requests').insert({
      user_id: user.id,
      email: user.email,
      reason: reason.trim() || null,
      status: 'pending',
    });
    setSubmitting(false);
    if (error) {
      toast({ title: 'Could not submit request', description: error.message, variant: 'destructive' });
      return;
    }
    // Fire-and-forget email to ops inbox so the team is alerted in their inbox too.
    supabase.functions.invoke('send-email', {
      body: {
        action: 'ops_notification',
        subject: `Account deletion requested — ${user.email}`,
        body_html: `
          <p><strong>${user.email}</strong> has requested deletion of their Praetoria Group account from inside the app.</p>
          <p><strong>User ID:</strong> ${user.id}</p>
          ${reason.trim() ? `<p><strong>Reason:</strong> ${reason.trim()}</p>` : ''}
          <p><a href="https://praetoria-ops-hub.lovable.app/admin/account-deletion-requests">Review in Admin →</a></p>
        `,
        to_addresses: ['ops@praetoriagroup.ca', 'support@praetoriagroup.ca'],
      },
    }).catch((e) => console.error('ops email failed', e));
    setOpen(false);
    setReason('');
    queryClient.invalidateQueries({ queryKey: ['account_deletion_request', user.id] });
    toast({
      title: 'Account deletion request submitted',
      description: "We've received your request. Our team will process it and contact you by email when complete.",
    });
  };

  const trigger = (
    <Button variant="destructive" size={variant === 'inline' ? 'sm' : 'default'} disabled={!!pending}>
      <Trash2 className="h-4 w-4 mr-2" />
      {pending ? 'Deletion Request Pending' : 'Delete Account'}
    </Button>
  );

  const dialog = (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" /> Delete your account?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm">
              <p>
                This will submit a request to permanently delete your account ({user?.email}).
                Our team will remove or anonymize your personal profile and login.
              </p>
              <p className="text-xs text-muted-foreground">
                Note: business records that we are legally required to retain (such as invoices,
                tax records, signed agreements, and job/service history) may be kept in
                anonymized form to comply with Canadian record-keeping laws.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <label className="text-xs font-medium">Reason (optional)</label>
          <Textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Tell us why you're leaving (optional)"
            rows={3}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => { e.preventDefault(); handleSubmit(); }}
            disabled={submitting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {submitting ? 'Submitting…' : 'Submit Deletion Request'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (pending) {
    const body = (
      <div className="flex items-start gap-2 text-sm">
        <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <div>
          <p className="font-medium">Account deletion request submitted</p>
          <p className="text-xs text-muted-foreground">
            Submitted {new Date(existing!.requested_at).toLocaleDateString()}. Our team will
            process this and email you when your account has been removed.
          </p>
        </div>
      </div>
    );
    if (variant === 'inline') return body;
    return (
      <Card className="border-destructive/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-destructive">
            <Trash2 className="h-4 w-4" /> Delete Account
          </CardTitle>
        </CardHeader>
        <CardContent>{body}</CardContent>
      </Card>
    );
  }

  if (variant === 'inline') return dialog;

  return (
    <Card className="border-destructive/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-destructive">
          <Trash2 className="h-4 w-4" /> Delete Account
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Permanently delete your Praetoria Group account. This sends a deletion request
          to our team. Business records required by law may be retained in anonymized form.
        </p>
        {dialog}
      </CardContent>
    </Card>
  );
}
