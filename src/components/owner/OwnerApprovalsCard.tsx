import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useMyOwnerApprovals } from '@/hooks/pm/useOwnerApprovals';
import { formatStatusLabel } from '@/lib/statusLabel';

export function OwnerApprovalsCard() {
  const { data = [], isLoading } = useMyOwnerApprovals();
  const pending = data.filter((a: any) =>
    ['sent_to_owner', 'owner_reviewing', 'more_info_requested'].includes(a.status),
  );

  if (isLoading) return null;

  return (
    <Card className="border-emerald-200">
      <CardHeader className="pb-2 flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-700" />
          Pending Approvals
        </CardTitle>
        <Link to="/owner/approvals" className="text-xs text-emerald-700 font-medium">View all</Link>
      </CardHeader>
      <CardContent className="space-y-2">
        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">No approvals waiting for you.</p>
        ) : (
          pending.slice(0, 4).map((a: any) => (
            <Link key={a.id} to="/owner/approvals" className="block p-2 rounded-md border hover:bg-accent">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{a.title}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {a.property?.property_name}{a.unit?.unit_label ? ` · ${a.unit.unit_label}` : ''}
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px]">{formatStatusLabel(a.status)}</Badge>
              </div>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}
