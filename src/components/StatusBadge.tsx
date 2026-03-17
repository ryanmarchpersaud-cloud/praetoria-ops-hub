import { getStatusClass } from '@/lib/constants';

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`status-badge ${getStatusClass(status)}`}>
      {status}
    </span>
  );
}
