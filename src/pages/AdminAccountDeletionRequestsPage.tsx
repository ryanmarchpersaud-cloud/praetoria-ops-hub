import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function AdminAccountDeletionRequestsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data = [], isLoading } = useQuery({
    queryKey: ['account_deletion_requests_admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('account_deletion_requests')
        .select('*')
        .order('requested_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const markProcessed = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke('process-account-deletion', {
        body: { request_id: id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data: any) => {
      toast({
        title: 'Account deleted',
        description: data?.email ? `Removed ${data.email} from authentication.` : 'User removed.',
      });
      qc.invalidateQueries({ queryKey: ['account_deletion_requests_admin'] });
    },
    onError: (e: any) => toast({ title: 'Delete failed', description: e.message, variant: 'destructive' }),
  });

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-destructive" /> Account Deletion Requests
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Users who have requested deletion of their Praetoria Group account from inside the app.
          Process each request manually (anonymize personal profile + login) and mark as processed.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : data.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No deletion requests yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.map((r: any) => (
            <Card key={r.id}>
              <CardHeader className="pb-2 flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-base">{r.email || r.user_id}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    Requested {format(new Date(r.requested_at), 'PPpp')}
                  </p>
                </div>
                <Badge variant={r.status === 'pending' ? 'destructive' : 'secondary'}>
                  {r.status}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">User ID</p>
                  <p className="font-mono text-xs">{r.user_id}</p>
                </div>
                {r.reason && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Reason</p>
                    <p>{r.reason}</p>
                  </div>
                )}
                {r.processed_at && (
                  <p className="text-xs text-muted-foreground">
                    Processed {format(new Date(r.processed_at), 'PPpp')}
                  </p>
                )}
                {r.status === 'pending' && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      if (confirm(`Permanently delete ${r.email || r.user_id}? This removes their login and cannot be undone.`)) {
                        markProcessed.mutate(r.id);
                      }
                    }}
                    disabled={markProcessed.isPending}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    {markProcessed.isPending ? 'Deleting…' : 'Delete Account & Mark Processed'}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
