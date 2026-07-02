import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Megaphone, CheckCircle2 } from 'lucide-react';
import { useMyNotices, useAckNotice } from '@/hooks/useTenantPortalExt';

const CAT_LABEL: Record<string, string> = {
  announcement: 'Announcement',
  notice: 'Notice',
  document: 'Document',
  maintenance_update: 'Maintenance update',
};

export default function TenantNotices() {
  const { data = [], isLoading } = useMyNotices();
  const ack = useAckNotice();

  return (
    <div className="p-4 space-y-4">
      <Button asChild variant="ghost" size="sm">
        <Link to="/tenant"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link>
      </Button>

      <h2 className="text-lg font-bold flex items-center gap-2">
        <Megaphone className="h-5 w-5 text-emerald-700" /> Notices
      </h2>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (data as any[]).length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <Megaphone className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="font-medium">No notices right now</p>
            <p className="text-xs text-muted-foreground mt-1">
              Announcements and notices from your property manager will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {(data as any[]).map(n => {
            const unread = !n.ack_at;
            return (
              <Card key={n.id} className={unread ? 'border-emerald-300' : ''}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm">{n.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {CAT_LABEL[n.category] ?? n.category} ·{' '}
                        {new Date(n.published_at).toLocaleDateString()}
                      </p>
                    </div>
                    {unread ? (
                      <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white">New</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">
                        <CheckCircle2 className="h-3 w-3 mr-0.5" /> Read
                      </Badge>
                    )}
                  </div>
                  {n.body && <p className="text-sm whitespace-pre-wrap">{n.body}</p>}
                  {unread && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => ack.mutate(n.id)}
                      disabled={ack.isPending}
                    >
                      Mark as read
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
