import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DollarSign, Link2 } from 'lucide-react';
import {
  AddJobToTrackerDialog,
  type SourceQuoteContext,
  type SourceInvoiceContext,
} from './AddJobToTrackerDialog';

interface Props {
  /** When known, pre-selects this job at the top of the dialog list. */
  jobId?: string | null;
  /** Optional pre-filled search (job/quote/invoice number, customer name…). */
  initialSearch?: string;
  /** Source quote context — opens dialog in "link this quote" mode. */
  sourceQuote?: SourceQuoteContext | null;
  /** Source invoice context — opens dialog in "link this invoice" mode. */
  sourceInvoice?: SourceInvoiceContext | null;
  /** Callback for the "Create job from this quote/invoice" button. */
  onCreateJobFromSource?: () => void;
  label?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

/**
 * Universal entry point for adding a record to the Job Cost & Profit Tracker.
 * Used from the dashboard tracker card and from job/quote/invoice detail pages.
 * Does NOT create duplicate records — only flags an existing job for tracking
 * and (when invoked from a quote/invoice) attaches the source record to that job.
 */
export function AddToJobCostTrackerButton({
  jobId, initialSearch, sourceQuote = null, sourceInvoice = null, onCreateJobFromSource,
  label, variant = 'outline', size = 'sm', className,
}: Props) {
  const [open, setOpen] = useState(false);
  const hasSource = !!(sourceQuote || sourceInvoice);
  const computedLabel = label ?? (hasSource ? 'Link to Job Cost Tracker' : 'Add to Job Cost Tracker');
  const Icon = hasSource ? Link2 : DollarSign;
  return (
    <>
      <Button type="button" variant={variant} size={size} className={className} onClick={() => setOpen(true)}>
        <Icon className="h-3.5 w-3.5 mr-1.5" /> {computedLabel}
      </Button>
      <AddJobToTrackerDialog
        open={open}
        onOpenChange={setOpen}
        preselectedJobId={jobId ?? null}
        initialSearch={initialSearch}
        sourceQuote={sourceQuote}
        sourceInvoice={sourceInvoice}
        onCreateJobFromSource={onCreateJobFromSource}
      />
    </>
  );
}
