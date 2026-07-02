import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

function usePMStaffTraining() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['pm_staff_training', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('training_assignments')
        .select('id, status, due_date, completed_at, expiry_date, certificate_url, course:training_courses(id, title, category)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });
}

export default function PMStaffTrainingPage() {
  const { data = [], isLoading } = usePMStaffTraining();
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <GraduationCap className="h-5 w-5 text-emerald-700" />
        <h2 className="text-lg font-semibold">Training & Safety</h2>
      </div>
      <p className="text-xs text-muted-foreground">Your assigned courses, certificates, and safety acknowledgements.</p>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : data.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No training assignments yet.</CardContent></Card>
      ) : (
        data.map((a: any) => (
          <Card key={a.id}>
            <CardContent className="p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{a.course?.title ?? 'Course'}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.course?.category || 'General'}
                    {a.due_date && ` · Due ${format(new Date(a.due_date), 'MMM d, yyyy')}`}
                    {a.expiry_date && ` · Expires ${format(new Date(a.expiry_date), 'MMM d, yyyy')}`}
                  </p>
                </div>
                <Badge
                  variant={a.status === 'completed' ? 'default' : a.status === 'overdue' ? 'destructive' : 'secondary'}
                  className="text-[10px] capitalize"
                >
                  {a.status ?? 'assigned'}
                </Badge>
              </div>
              {a.certificate_url && (
                <Button size="sm" variant="outline" asChild className="w-full">
                  <a href={a.certificate_url} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4 mr-1" /> View certificate
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
