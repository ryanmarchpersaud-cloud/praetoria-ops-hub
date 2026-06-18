import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DollarSign } from 'lucide-react';
import { AddJobToTrackerDialog } from './AddJobToTrackerDialog';

interface Props {
  /** When known, pre-selects this job at the top of the dialog list. */
  jobId?: string | null;
  /** Optional pre-filled search (job/quote/invoice number, customer name…). */
  initialSearch?: string;
  label?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

/**
 * Universal entry point for adding a record to the Job Cost & Profit Tracker.
 * Used from the dashboard tracker card and from job/quote/invoice detail pages.
 * Does NOT create duplicate records — only flags an existing job for tracking.
 */
export function AddToJobCostTrackerButton({
  jobId, initialSearch, label = 'Add to Job Cost Tracker',
  variant = 'outline', size = 'sm', className,
}: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant={variant} size={size} className={className} onClick={() => setOpen(true)}>
        <DollarSign className="h-3.5 w-3.5 mr-1.5" /> {label}
      </Button>
      <AddJobToTrackerDialog
        open={open}
        onOpenChange={setOpen}
        preselectedJobId={jobId ?? null}
        initialSearch={initialSearch}
      />
    </>
  );
}
