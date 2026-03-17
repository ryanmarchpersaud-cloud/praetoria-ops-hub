import { CheckCircle, Send, XCircle, Eye, FileEdit, Clock, AlertTriangle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

type ApprovalStatus = 'Draft' | 'Needs review' | 'Approved' | 'Sent' | 'Declined';

interface ApprovalWorkflowProps {
  status: ApprovalStatus;
  agentSummary: string;
  total: number;
  lineItemCount: number;
  sentAt: string | null;
  followUpDueAt: string | null;
  createdAt: string;
  onStatusChange: (status: ApprovalStatus) => Promise<void>;
  isUpdating: boolean;
}

const PIPELINE_STEPS: { status: ApprovalStatus; label: string; icon: typeof CheckCircle }[] = [
  { status: 'Draft', label: 'Draft', icon: FileEdit },
  { status: 'Needs review', label: 'Review', icon: Eye },
  { status: 'Approved', label: 'Approved', icon: CheckCircle },
  { status: 'Sent', label: 'Sent', icon: Send },
];

function getStepIndex(status: ApprovalStatus): number {
  if (status === 'Declined') return -1;
  return PIPELINE_STEPS.findIndex(s => s.status === status);
}

function getValidTransitions(status: ApprovalStatus): { status: ApprovalStatus; label: string; variant: 'primary' | 'success' | 'warning' | 'destructive'; icon: typeof CheckCircle }[] {
  switch (status) {
    case 'Draft':
      return [
        { status: 'Needs review', label: 'Submit for Review', variant: 'primary', icon: Eye },
      ];
    case 'Needs review':
      return [
        { status: 'Approved', label: 'Approve Quote', variant: 'success', icon: CheckCircle },
        { status: 'Draft', label: 'Return to Draft', variant: 'warning', icon: FileEdit },
        { status: 'Declined', label: 'Decline', variant: 'destructive', icon: XCircle },
      ];
    case 'Approved':
      return [
        { status: 'Sent', label: 'Mark as Sent', variant: 'primary', icon: Send },
        { status: 'Draft', label: 'Revert to Draft', variant: 'warning', icon: FileEdit },
      ];
    case 'Sent':
      return [
        { status: 'Draft', label: 'Revert to Draft', variant: 'warning', icon: FileEdit },
      ];
    case 'Declined':
      return [
        { status: 'Draft', label: 'Reopen as Draft', variant: 'primary', icon: FileEdit },
      ];
    default:
      return [];
  }
}

function getStatusBannerInfo(status: ApprovalStatus, followUpDueAt: string | null, lineItemCount: number, total: number) {
  const banners: { type: 'info' | 'warning' | 'error' | 'success'; message: string; icon: typeof AlertTriangle }[] = [];

  if (status === 'Draft' && lineItemCount === 0) {
    banners.push({ type: 'warning', message: 'No line items added yet. Add line items before submitting for review.', icon: AlertTriangle });
  }
  if (status === 'Draft' && total === 0 && lineItemCount > 0) {
    banners.push({ type: 'warning', message: 'Quote total is $0.00 — verify pricing before submitting.', icon: AlertTriangle });
  }
  if (status === 'Needs review') {
    banners.push({ type: 'info', message: 'This quote is awaiting admin review and approval.', icon: Eye });
  }
  if (status === 'Declined') {
    banners.push({ type: 'error', message: 'This quote was declined. Reopen as draft to revise and resubmit.', icon: XCircle });
  }
  if (status === 'Approved') {
    banners.push({ type: 'success', message: 'Approved and ready to send to client.', icon: CheckCircle });
  }
  if (status === 'Sent' && followUpDueAt) {
    const due = new Date(followUpDueAt);
    const now = new Date();
    if (due <= now) {
      banners.push({ type: 'error', message: `Follow-up was due ${formatDistanceToNow(due, { addSuffix: true })}. Contact the client.`, icon: Clock });
    } else {
      banners.push({ type: 'info', message: `Follow-up due ${formatDistanceToNow(due, { addSuffix: true })}.`, icon: Clock });
    }
  }

  return banners;
}

const bannerStyles = {
  info: 'bg-info/10 border-info/30 text-info',
  warning: 'bg-warning/10 border-warning/30 text-warning',
  error: 'bg-destructive/10 border-destructive/30 text-destructive',
  success: 'bg-success/10 border-success/30 text-success',
};

const actionButtonStyles = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
  success: 'bg-success text-success-foreground hover:bg-success/90',
  warning: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
};

export function ApprovalWorkflowPanel({
  status,
  agentSummary,
  total,
  lineItemCount,
  sentAt,
  followUpDueAt,
  createdAt,
  onStatusChange,
  isUpdating,
}: ApprovalWorkflowProps) {
  const [declineReason, setDeclineReason] = useState('');
  const currentStep = getStepIndex(status);
  const transitions = getValidTransitions(status);
  const banners = getStatusBannerInfo(status, followUpDueAt, lineItemCount, total);

  const isDeclined = status === 'Declined';

  return (
    <div className="space-y-4">
      {/* ── Visual Pipeline Stepper ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">Approval Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-1">
            {PIPELINE_STEPS.map((step, idx) => {
              const isActive = idx === currentStep;
              const isComplete = currentStep > idx;
              const StepIcon = step.icon;

              return (
                <div key={step.status} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1 min-w-0">
                    <div
                      className={`
                        w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all
                        ${isActive
                          ? 'bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-2 ring-offset-card scale-110'
                          : isComplete
                            ? 'bg-success/20 text-success'
                            : 'bg-muted text-muted-foreground'
                        }
                        ${isDeclined ? 'opacity-50' : ''}
                      `}
                    >
                      {isComplete ? <CheckCircle className="h-4 w-4" /> : <StepIcon className="h-3.5 w-3.5" />}
                    </div>
                    <span className={`text-[10px] mt-1.5 font-medium text-center leading-tight ${isActive ? 'text-primary' : isComplete ? 'text-success' : 'text-muted-foreground'}`}>
                      {step.label}
                    </span>
                  </div>
                  {idx < PIPELINE_STEPS.length - 1 && (
                    <ArrowRight className={`h-3 w-3 shrink-0 -mt-4 ${isComplete ? 'text-success/50' : 'text-border'}`} />
                  )}
                </div>
              );
            })}
          </div>
          {isDeclined && (
            <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-destructive font-medium">
              <XCircle className="h-3.5 w-3.5" /> Declined — removed from pipeline
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Warning / Info Banners ── */}
      {banners.map((banner, idx) => {
        const BannerIcon = banner.icon;
        return (
          <div
            key={idx}
            className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border text-sm ${bannerStyles[banner.type]}`}
          >
            <BannerIcon className="h-4 w-4 mt-0.5 shrink-0" />
            <span className="leading-snug">{banner.message}</span>
          </div>
        );
      })}

      {/* ── Admin Review Panel ── */}
      {(status === 'Needs review' || status === 'Approved') && (
        <Card className="border-primary/20 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              Admin Review
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Agent Summary Section */}
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Agent Summary</Label>
              {agentSummary ? (
                <div className="mt-1.5 p-3 rounded-md bg-muted/50 border border-border text-sm leading-relaxed">
                  {agentSummary}
                </div>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground italic">No agent summary provided</p>
              )}
            </div>

            <Separator />

            {/* Quick Review Info */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground text-xs">Line Items</span>
                <p className="font-medium">{lineItemCount} items</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Quote Total</span>
                <p className="font-semibold text-base">${Number(total).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Actions ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {transitions.map((t) => {
            const ActionIcon = t.icon;

            // For decline, use a confirmation dialog
            if (t.status === 'Declined') {
              return (
                <AlertDialog key={t.status}>
                  <AlertDialogTrigger asChild>
                    <Button
                      className={`w-full justify-start ${actionButtonStyles[t.variant]}`}
                      disabled={isUpdating}
                    >
                      <ActionIcon className="h-4 w-4 mr-2" />
                      {t.label}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Decline this quote?</AlertDialogTitle>
                      <AlertDialogDescription>
                        The quote will be marked as declined. It can be reopened as a draft later.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-2">
                      <Label>Reason (optional)</Label>
                      <Textarea
                        value={declineReason}
                        onChange={e => setDeclineReason(e.target.value)}
                        placeholder="Why is this quote being declined?"
                        rows={3}
                      />
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => onStatusChange('Declined')}
                      >
                        Decline Quote
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              );
            }

            // For "Mark as Sent", confirm
            if (t.status === 'Sent') {
              return (
                <AlertDialog key={t.status}>
                  <AlertDialogTrigger asChild>
                    <Button
                      className={`w-full justify-start ${actionButtonStyles[t.variant]}`}
                      disabled={isUpdating}
                    >
                      <ActionIcon className="h-4 w-4 mr-2" />
                      {t.label}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Mark quote as sent?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This records the quote as sent to the client with today's date. Make sure you have actually delivered the quote.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={() => onStatusChange('Sent')}
                      >
                        Confirm Sent
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              );
            }

            return (
              <Button
                key={t.status}
                className={`w-full justify-start ${actionButtonStyles[t.variant]}`}
                disabled={isUpdating || (t.status === 'Needs review' && lineItemCount === 0)}
                onClick={() => onStatusChange(t.status)}
              >
                <ActionIcon className="h-4 w-4 mr-2" />
                {t.label}
                {t.status === 'Needs review' && lineItemCount === 0 && (
                  <span className="ml-auto text-[10px] opacity-70">Add items first</span>
                )}
              </Button>
            );
          })}

          {transitions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">No actions available</p>
          )}
        </CardContent>
      </Card>

      {/* ── Timeline ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">Timeline</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
            <span>Created {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}</span>
          </div>
          {sentAt && (
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span>Sent {formatDistanceToNow(new Date(sentAt), { addSuffix: true })}</span>
            </div>
          )}
          {followUpDueAt && (
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${new Date(followUpDueAt) <= new Date() ? 'bg-destructive' : 'bg-warning'}`} />
              <span>Follow-up {formatDistanceToNow(new Date(followUpDueAt), { addSuffix: true })}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
