import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type PMCalendarEvent = {
  event_id: string;
  source: string;
  event_type:
    | 'showing'
    | 'inspection'
    | 'move_in'
    | 'move_out'
    | 'lease_renewal'
    | 'staff_task'
    | 'owner_approval_due'
    | 'work_order_appointment'
    | 'maintenance_follow_up'
    | 'general_pm';
  title: string;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  status: string | null;
  priority: string | null;
  property_id: string | null;
  unit_id: string | null;
  tenant_id: string | null;
  owner_id: string | null;
  assigned_staff_id: string | null;
  related_id: string | null;
  action_url: string | null;
};

export function usePMCalendar(startISO: string, endISO: string) {
  return useQuery({
    queryKey: ['pm-calendar', startISO, endISO],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('pm_calendar_events', {
        p_start: startISO,
        p_end: endISO,
      });
      if (error) throw error;
      return (data ?? []) as PMCalendarEvent[];
    },
    staleTime: 30_000,
  });
}
