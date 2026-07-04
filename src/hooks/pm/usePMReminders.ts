import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type PMReminder = {
  id: string;
  recipient_user_id: string;
  recipient_portal: 'admin' | 'pm_staff';
  event_source: string;
  event_type: string;
  event_ref: string;
  related_id: string | null;
  property_id: string | null;
  unit_id: string | null;
  tenant_id: string | null;
  owner_id: string | null;
  event_start_at: string;
  lead_time_minutes: number;
  remind_at: string;
  status: 'pending' | 'triggered' | 'cancelled' | 'dismissed';
  title: string;
  message: string;
  action_url: string | null;
  triggered_at: string | null;
  cancelled_at: string | null;
  created_by: string | null;
  created_at: string;
};

export const REMINDER_LEAD_TIMES: { label: string; minutes: number }[] = [
  { label: 'At event time', minutes: 0 },
  { label: '15 minutes before', minutes: 15 },
  { label: '30 minutes before', minutes: 30 },
  { label: '1 hour before', minutes: 60 },
  { label: '1 day before', minutes: 60 * 24 },
  { label: '3 days before', minutes: 60 * 24 * 3 },
  { label: '1 week before', minutes: 60 * 24 * 7 },
];

export function usePMReminders(opts?: { includeAll?: boolean }) {
  const { user } = useAuth();
  return useQuery<PMReminder[]>({
    queryKey: ['pm_reminders', user?.id, !!opts?.includeAll],
    queryFn: async () => {
      if (!user) return [];
      let q = (supabase as any)
        .from('pm_calendar_reminders')
        .select('*')
        .order('remind_at', { ascending: true })
        .limit(200);
      if (!opts?.includeAll) q = q.eq('status', 'pending');
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as PMReminder[];
    },
    enabled: !!user,
  });
}

export function useRemindersForEvent(eventRef?: string) {
  const { user } = useAuth();
  return useQuery<PMReminder[]>({
    queryKey: ['pm_reminders_event', user?.id, eventRef],
    queryFn: async () => {
      if (!user || !eventRef) return [];
      const { data, error } = await (supabase as any)
        .from('pm_calendar_reminders')
        .select('*')
        .eq('event_ref', eventRef)
        .eq('recipient_user_id', user.id)
        .in('status', ['pending', 'triggered']);
      if (error) throw error;
      return (data ?? []) as PMReminder[];
    },
    enabled: !!user && !!eventRef,
  });
}

export function useCreatePMReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      recipient_user_id?: string | null;
      recipient_portal?: 'admin' | 'pm_staff';
      event_source: string;
      event_type: string;
      event_ref: string;
      related_id?: string | null;
      property_id?: string | null;
      unit_id?: string | null;
      tenant_id?: string | null;
      owner_id?: string | null;
      event_start_at: string;
      lead_time_minutes: number;
      title: string;
      message: string;
      action_url?: string | null;
    }) => {
      const { data, error } = await (supabase as any).rpc('pm_create_reminder', {
        p_recipient_user_id: args.recipient_user_id ?? null,
        p_recipient_portal: args.recipient_portal ?? 'admin',
        p_event_source: args.event_source,
        p_event_type: args.event_type,
        p_event_ref: args.event_ref,
        p_related_id: args.related_id ?? null,
        p_property_id: args.property_id ?? null,
        p_unit_id: args.unit_id ?? null,
        p_tenant_id: args.tenant_id ?? null,
        p_owner_id: args.owner_id ?? null,
        p_event_start_at: args.event_start_at,
        p_lead_time_minutes: args.lead_time_minutes,
        p_title: args.title,
        p_message: args.message,
        p_action_url: args.action_url ?? null,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return row as { id: string; is_duplicate: boolean };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pm_reminders'] });
      qc.invalidateQueries({ queryKey: ['pm_reminders_event'] });
    },
  });
}

export function useCancelPMReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await (supabase as any).rpc('pm_cancel_reminder', { p_id: id });
      if (error) throw error;
      return data as boolean;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pm_reminders'] });
      qc.invalidateQueries({ queryKey: ['pm_reminders_event'] });
    },
  });
}

/** Fires any due reminders for the current user into pm_notifications. */
export function useProcessDueReminders() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await (supabase as any).rpc('pm_process_due_reminders');
      if (error) throw error;
      return (data as number) ?? 0;
    },
    onSuccess: (fired) => {
      if (fired > 0) {
        qc.invalidateQueries({ queryKey: ['pm_notifications'] });
        qc.invalidateQueries({ queryKey: ['pm_notifications_unread_count'] });
        qc.invalidateQueries({ queryKey: ['pm_reminders'] });
      }
    },
  });
}
