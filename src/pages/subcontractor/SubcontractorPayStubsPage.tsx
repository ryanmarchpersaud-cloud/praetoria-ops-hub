import { useSubcontractorProfile } from '@/hooks/useSubcontractor';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, Download, FileText, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

function parseLocalDate(s: string | null | undefined): Date {
  if (!s) return new Date(NaN);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  return new Date(s);
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  approved: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
};

export default function SubcontractorPayStubsPage() {
  const { data: profile, isLoading: loadingProfile } = useSubcontractorProfile();

  const { data: stubs = [], isLoading, error } = useQuery({
    queryKey: ['sub_portal_pay_stubs', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from('subcontractor_pay_stubs')
        .select('*')
        .eq('subcontractor_id', profile.id)
        .order('period_start', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!profile?.id,
  });

  const openPrint = (id: string) => {
    try {
      const w = window.open(`/admin/subcontractor-pay-stub/${id}/print`, '_blank', 'noopener,noreferrer');
      if (!w) toast.error('Pop-up blocked. Please allow pop-ups to download your pay stub.');
    } catch (e: any) {
      toast.error(e?.message || 'Could not open pay stub');
    }
  };

  if (loadingProfile || isLoading) {
    return (
      <div className="px-4 pt-6 pb-4 space-y-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-4 space-y-4 max-w-2xl animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">My Pay Stubs</h1>
        <Badge variant="outline" className="text-[10px]">{stubs.length} total</Badge>
      </div>

      {error && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="p-4 flex items-start gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Could not load pay stubs</p>
              <p className="text-xs opacity-80">{(error as Error).message}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {stubs.length === 0 && !error ? (
        <Card>
          <CardContent className="py-10 text-center">
            <DollarSign className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No pay stubs yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Pay stubs issued by the office will appear here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {stubs.map((s: any) => (
            <Card key={s.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-mono font-semibold text-foreground flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      {s.pay_stub_number}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(parseLocalDate(s.period_start), 'MMM d')} – {format(parseLocalDate(s.period_end), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <Badge className={STATUS_COLORS[s.status] || 'bg-muted'} variant="outline">{s.status}</Badge>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</p>
                    <p className="text-xl font-bold text-foreground">${Number(s.total || 0).toFixed(2)}</p>
                  </div>
                  <Button size="sm" onClick={() => openPrint(s.id)} className="gap-1.5">
                    <Download className="h-3.5 w-3.5" /> Download / Print
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground text-center pt-2">
        You can only view and download your own pay stubs.
      </p>
    </div>
  );
}
