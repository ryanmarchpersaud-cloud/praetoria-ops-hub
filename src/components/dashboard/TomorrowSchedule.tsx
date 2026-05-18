import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarClock, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { format, addDays } from 'date-fns';

function useTomorrowVisits() {
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  return useQuery({
    queryKey: ['dashboard_tomorrow_visits', tomorrow],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visits')
        .select('id, visit_number, scheduled_start_time, service_category, visit_status, assigned_worker_id, jobs(job_title), customers(first_name, last_name, company_name), properties(property_name, city)')
        .eq('service_date', tomorrow)
        .order('scheduled_start_time', { ascending: true });
      if (error) throw error;
      const visits = data ?? [];
      const visitIds = visits.map((v: any) => v.id);
      if (visitIds.length === 0) return visits;

      const [crewRes, subRes] = await Promise.all([
        supabase.from('visit_crew_members').select('visit_id, worker_user_id').in('visit_id', visitIds),
        supabase.from('subcontractor_assignments').select('visit_id, subcontractor_id').in('visit_id', visitIds),
      ]);
      const crewRows = crewRes.data || [];
      const subRows = subRes.data || [];

      const workerIds = [...new Set([
        ...visits.map((v: any) => v.assigned_worker_id).filter(Boolean),
        ...crewRows.map((c: any) => c.worker_user_id).filter(Boolean),
      ])] as string[];
      const subIds = [...new Set(subRows.map((s: any) => s.subcontractor_id).filter(Boolean))] as string[];

      const [workersRes, subsRes] = await Promise.all([
        workerIds.length
          ? supabase.from('worker_profiles').select('user_id, full_name').in('user_id', workerIds)
          : Promise.resolve({ data: [] as any[] }),
        subIds.length
          ? supabase.from('subcontractors').select('id, company_name, contact_name').in('id', subIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      const workerMap: Record<string, string> = Object.fromEntries(((workersRes as any).data || []).map((w: any) => [w.user_id, w.full_name]));
      const subMap: Record<string, string> = Object.fromEntries(((subsRes as any).data || []).map((s: any) => [s.id, s.company_name || s.contact_name || 'Subcontractor']));

      const crewByVisit: Record<string, string[]> = {};
      crewRows.forEach((c: any) => {
        const n = workerMap[c.worker_user_id];
        if (!n) return;
        (crewByVisit[c.visit_id] = crewByVisit[c.visit_id] || []).push(n);
      });
      const subsByVisit: Record<string, string[]> = {};
      subRows.forEach((s: any) => {
        const n = subMap[s.subcontractor_id];
        if (!n) return;
        (subsByVisit[s.visit_id] = subsByVisit[s.visit_id] || []).push(n);
      });

      return visits.map((v: any) => ({
        ...v,
        lead_name: v.assigned_worker_id ? workerMap[v.assigned_worker_id] : null,
        crew_names: crewByVisit[v.id] || [],
        subcontractor_names: subsByVisit[v.id] || [],
      }));
    },
  });
}

export function TomorrowSchedule() {
  const { data: visits = [], isLoading } = useTomorrowVisits();
  const tomorrow = addDays(new Date(), 1);

  return (
    <Card>
      <CardHeader className="pb-2 px-3 md:px-6 pt-3 md:pt-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base md:text-lg font-extrabold tracking-tight flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-cyan-50 dark:bg-cyan-950/30">
              <CalendarClock className="h-4 w-4 text-cyan-600" />
            </span>
            Tomorrow · {format(tomorrow, 'EEE MMM d')}
          </CardTitle>
          <Link to="/visits" className="text-[11px] md:text-xs font-semibold text-primary flex items-center gap-0.5 hover:underline">
            View <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="px-3 md:px-6 pb-3 md:pb-6 space-y-2.5">
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : visits.length === 0 ? (
          <p className="text-[11px] text-muted-foreground py-2 text-center">Nothing scheduled for tomorrow</p>
        ) : (
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">
              {visits.length} visit{visits.length === 1 ? '' : 's'} scheduled
            </p>
            <div className="divide-y divide-border/50">
              {visits.slice(0, 5).map((v: any) => {
                const cust = v.customers?.company_name || `${v.customers?.first_name ?? ''} ${v.customers?.last_name ?? ''}`.trim();
                return (
                  <Link key={v.id} to={`/visits/${v.id}`} className="flex items-center justify-between py-1.5 active:bg-muted/40 rounded transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold truncate">
                        {v.scheduled_start_time ? <span className="font-mono text-primary mr-1.5">{v.scheduled_start_time.slice(0, 5)}</span> : null}
                        {cust || v.properties?.property_name || v.visit_number}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {v.service_category ?? 'Service'}
                        {v.properties?.city ? ` · ${v.properties.city}` : ''}
                      </p>
                    </div>
                    {!v.assigned_worker_id && (
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 shrink-0">
                        Unassigned
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
            {visits.length > 5 && (
              <p className="text-[10px] text-muted-foreground text-center pt-1">+{visits.length - 5} more</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
