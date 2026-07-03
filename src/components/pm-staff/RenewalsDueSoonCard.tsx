import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { CalendarClock } from 'lucide-react';
import { useLeaseRenewals } from '@/hooks/pm/useLeaseRenewals';
import { useAuthorization } from '@/hooks/useAuthorization';

function daysUntil(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const end = new Date(dateStr + 'T00:00:00').getTime();
  const now = Date.now();
  return Math.ceil((end - now) / 86_400_000);
}

export function RenewalsDueSoonCard() {
  const auth = useAuthorization();
  const mineOnly = auth.isLeasingAgent && !auth.isPropertyManager && !auth.isAdmin;
  const { data: renewals = [] } = useLeaseRenewals({ mineOnly });

  const openRenewals = renewals.filter(
    (r: any) => !['completed', 'cancelled', 'non_renewal', 'tenant_declined'].includes(r.status),
  );

  const in30 = openRenewals.filter((r: any) => {
    const d = daysUntil(r.current_lease_end_date);
    return d !== null && d >= 0 && d <= 30;
  }).length;
  const in60 = openRenewals.filter((r: any) => {
    const d = daysUntil(r.current_lease_end_date);
    return d !== null && d > 30 && d <= 60;
  }).length;
  const in90 = openRenewals.filter((r: any) => {
    const d = daysUntil(r.current_lease_end_date);
    return d !== null && d > 60 && d <= 90;
  }).length;
  const monthToMonth = openRenewals.filter((r: any) => r.status === 'month_to_month').length;
  const assignedCount = mineOnly ? openRenewals.length : undefined;

  const buckets: { label: string; count: number; tone: string }[] = [
    { label: 'Ending in 30 days', count: in30, tone: 'bg-rose-50 border-rose-100 text-rose-800' },
    { label: 'Ending in 60 days', count: in60, tone: 'bg-amber-50 border-amber-100 text-amber-800' },
    { label: 'Ending in 90 days', count: in90, tone: 'bg-blue-50 border-blue-100 text-blue-800' },
    { label: 'Month-to-month', count: monthToMonth, tone: 'bg-violet-50 border-violet-100 text-violet-800' },
  ];

  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-emerald-700" />
          Renewals due soon
          {assignedCount !== undefined && (
            <span className="ml-1 text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full">
              {assignedCount} assigned to you
            </span>
          )}
        </CardTitle>
        <Link to="/pm-staff/lease-renewals" className="text-xs text-emerald-700 font-medium">
          View all
        </Link>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2">
        {buckets.map((b) => (
          <Link
            key={b.label}
            to="/pm-staff/lease-renewals"
            className={`rounded-lg border p-2 text-center hover:shadow-sm transition-shadow ${b.tone}`}
          >
            <p className="text-lg font-bold leading-none">{b.count}</p>
            <p className="text-[10px] mt-1 leading-tight opacity-80">{b.label}</p>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
