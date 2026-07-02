import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, Eye, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import PayStubDetailDialog from '@/components/PayStubDetailDialog';

/**
 * PM Staff pay stubs — own rows only. Never selects SIN or banking columns.
 */
function usePMStaffPayStubs() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['pm_staff_pay_stubs', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('employee_pay_stubs')
        .select('id, user_id, pay_period_start, pay_period_end, pay_date, gross_pay, deductions, net_pay, ytd_gross, ytd_net, stub_pdf_url, notes')
        .eq('user_id', user.id)
        .order('pay_date', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });
}

export default function PMStaffMyPayStubsPage() {
  const { data = [], isLoading } = usePMStaffPayStubs();
  const [selected, setSelected] = useState<any>(null);

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <DollarSign className="h-5 w-5 text-emerald-700" />
        <h2 className="text-lg font-semibold">My Pay Stubs</h2>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : data.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No pay stubs available yet.</CardContent></Card>
      ) : (
        data.map((s: any) => (
          <Card key={s.id}>
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {format(new Date(s.pay_period_start), 'MMM d')} – {format(new Date(s.pay_period_end), 'MMM d, yyyy')}
                  </p>
                  <p className="text-xs text-muted-foreground">Pay date: {format(new Date(s.pay_date), 'MMM d, yyyy')}</p>
                </div>
                <p className="font-semibold text-emerald-700">${Number(s.net_pay).toFixed(2)}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => setSelected(s)}>
                  <Eye className="h-4 w-4 mr-1" /> View
                </Button>
                {s.stub_pdf_url && (
                  <Button size="sm" variant="outline" className="flex-1" asChild>
                    <a href={s.stub_pdf_url} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4 mr-1" /> PDF
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))
      )}

      <p className="text-[11px] text-muted-foreground pt-2">
        Only your own pay stubs are shown here. SIN and banking information are not displayed in this portal.
      </p>

      {selected && (
        <PayStubDetailDialog
          stub={selected}
          open={!!selected}
          onOpenChange={(o) => !o && setSelected(null)}
        />
      )}
    </div>
  );
}
