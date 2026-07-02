import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

function usePMStaffDocuments() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['pm_staff_documents', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('worker_documents')
        .select('id, document_name, document_type, file_url, file_name, notes, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });
}

export default function PMStaffMyDocumentsPage() {
  const { data = [], isLoading } = usePMStaffDocuments();
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-emerald-700" />
        <h2 className="text-lg font-semibold">My Documents</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        Includes proof-of-employment letters, offer letters, policies, and personal documents shared with you by admin/HR.
      </p>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : data.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No documents on file yet.</CardContent></Card>
      ) : (
        data.map((d: any) => (
          <Card key={d.id}>
            <CardContent className="p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{d.document_name || d.file_name || 'Document'}</p>
                <p className="text-xs text-muted-foreground">
                  {d.document_type || 'General'} · {format(new Date(d.created_at), 'MMM d, yyyy')}
                </p>
              </div>
              {d.file_url && (
                <Button size="sm" variant="outline" asChild>
                  <a href={d.file_url} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4 mr-1" /> Open
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
