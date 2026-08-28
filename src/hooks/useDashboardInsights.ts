import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';

/** Visits from yesterday that were never completed (missed / still open). */
export function useMissedVisitsYesterday() {
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  return useQuery({
    queryKey: ['dashboard_missed_visits', yesterday],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visits')
        .select('id, visit_number, visit_status, service_date, job_id, jobs(job_title, job_number)')
        .eq('service_date', yesterday)
        .in('visit_status', ['Planned', 'Scheduled', 'En Route', 'In Progress', 'Missed'])
        .order('visit_number', { ascending: true })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });
}

export interface FieldSnapshot {
  clockedIn: { user_id: string; full_name: string; clock_in: string }[];
  inProgress: number;
  planned: number;
  completed: number;
  longPauses: { id: string; visit_id: string; started_at: string; reason: string | null; minutes: number }[];
}

/** Live field state for today: who's clocked in, visit progress, long-running pauses. */
export function useFieldSnapshot() {
  const today = format(new Date(), 'yyyy-MM-dd');
  return useQuery({
    queryKey: ['dashboard_field_snapshot', today],
    queryFn: async (): Promise<FieldSnapshot> => {
      const [tsRes, visitRes, pauseRes] = await Promise.all([
        supabase
          .from('timesheets')
          .select('id, user_id, clock_in, clock_out')
          .is('clock_out', null)
          .not('clock_in', 'is', null)
          .order('clock_in', { ascending: true })
          .limit(50),
        supabase
          .from('visits')
          .select('id, visit_status')
          .eq('service_date', today)
          .limit(500),
        supabase
          .from('visit_pauses')
          .select('id, visit_id, started_at, reason, ended_at')
          .is('ended_at', null)
          .order('started_at', { ascending: true })
          .limit(50),
      ]);
      if (tsRes.error) throw tsRes.error;
      if (visitRes.error) throw visitRes.error;
      if (pauseRes.error) throw pauseRes.error;

      const userIds = Array.from(new Set((tsRes.data ?? []).map((t: any) => t.user_id).filter(Boolean)));
      let nameMap = new Map<string, string>();
      if (userIds.length) {
        const { data: profiles } = await supabase
          .from('worker_profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);
        nameMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p.full_name]));
      }

      const visits = visitRes.data ?? [];
      const now = Date.now();

      return {
        clockedIn: (tsRes.data ?? []).map((t: any) => ({
          user_id: t.user_id,
          full_name: nameMap.get(t.user_id) ?? 'Team member',
          clock_in: t.clock_in,
        })),
        inProgress: visits.filter((v: any) => ['In Progress', 'En Route'].includes(v.visit_status)).length,
        planned: visits.filter((v: any) => ['Planned', 'Scheduled'].includes(v.visit_status)).length,
        completed: visits.filter((v: any) => v.visit_status === 'Completed').length,
        longPauses: (pauseRes.data ?? [])
          .map((p: any) => ({
            id: p.id,
            visit_id: p.visit_id,
            started_at: p.started_at,
            reason: p.reason ?? null,
            minutes: Math.round((now - new Date(p.started_at).getTime()) / 60000),
          }))
          .filter((p) => p.minutes >= 30),
      };
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export interface MultiDayJob {
  id: string;
  job_number: string | null;
  job_title: string | null;
  status: string | null;
  total: number;
  completed: number;
  nextDate: string | null;
}

/** Jobs with more than one visit — shows completed/total visit progress. */
export function useMultiDayJobProgress() {
  return useQuery({
    queryKey: ['dashboard_multiday_jobs'],
    queryFn: async (): Promise<MultiDayJob[]> => {
      const { data: jobs, error: jobErr } = await supabase
        .from('jobs')
        .select('id, job_number, job_title, status')
        .in('status', ['Scheduled', 'In Progress'])
        .limit(200);
      if (jobErr) throw jobErr;
      const jobIds = (jobs ?? []).map((j: any) => j.id);
      if (!jobIds.length) return [];

      const { data: visits, error: visitErr } = await supabase
        .from('visits')
        .select('id, job_id, visit_status, service_date')
        .in('job_id', jobIds)
        .limit(2000);
      if (visitErr) throw visitErr;

      const byJob = new Map<string, any[]>();
      for (const v of visits ?? []) {
        if (!v.job_id) continue;
        const arr = byJob.get(v.job_id) ?? [];
        arr.push(v);
        byJob.set(v.job_id, arr);
      }

      const todayStr = format(new Date(), 'yyyy-MM-dd');

      return (jobs ?? [])
        .map((j: any) => {
          const vs = (byJob.get(j.id) ?? []).filter(
            (v) => !['Cancelled', 'Rescheduled'].includes(v.visit_status)
          );
          const upcoming = vs
            .filter((v) => v.visit_status !== 'Completed' && v.service_date && v.service_date >= todayStr)
            .map((v) => v.service_date)
            .sort();
          return {
            id: j.id,
            job_number: j.job_number,
            job_title: j.job_title,
            status: j.status,
            total: vs.length,
            completed: vs.filter((v) => v.visit_status === 'Completed').length,
            nextDate: upcoming[0] ?? null,
          };
        })
        .filter((j) => j.total > 1 && j.completed < j.total)
        .sort((a, b) => b.completed / b.total - a.completed / a.total)
        .slice(0, 8);
    },
    staleTime: 60_000,
  });
}
