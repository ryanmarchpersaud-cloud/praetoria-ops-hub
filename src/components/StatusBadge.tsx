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

export function StatusBadge({ status, showIcon = true }: { status: string; showIcon?: boolean }) {
  const Icon = statusIcons[status.toLowerCase()];

  return (
    <span className={`status-badge ${getStatusClass(status)}`}>
      {showIcon && Icon && <Icon className="h-3 w-3 mr-1 -ml-0.5" />}
      {status}
    </span>
  );
}
