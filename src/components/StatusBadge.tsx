import { forwardRef } from 'react';
import { getStatusClass } from '@/lib/constants';
import { FileEdit, Eye, CheckCircle, Send, XCircle, Inbox, Search, Clock, Trophy, Archive, Ban } from 'lucide-react';

const statusIcons: Record<string, typeof FileEdit> = {
  'draft': FileEdit,
  'new': Inbox,
  'reviewing': Search,
  'awaiting info': Clock,
  'quote drafting': FileEdit,
  'quote ready': CheckCircle,
  'needs review': Eye,
  'approved': CheckCircle,
  'quote sent': Send,
  'sent': Send,
  'won': Trophy,
  'lost': Ban,
  'declined': XCircle,
  'archived': Archive,
};

export const StatusBadge = forwardRef<HTMLSpanElement, { status: string; showIcon?: boolean }>(
  ({ status, showIcon = true }, ref) => {
    const Icon = statusIcons[status.toLowerCase()];

    return (
      <span ref={ref} className={`status-badge ${getStatusClass(status)}`}>
        {showIcon && Icon && <Icon className="h-3 w-3 mr-1 -ml-0.5" />}
        {status}
      </span>
    );
  }
);
StatusBadge.displayName = 'StatusBadge';
