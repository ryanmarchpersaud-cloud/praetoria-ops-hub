import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Types matching DB schema
export interface Notification {
  id: string;
  event: string;
  channel: string;
  audience: string;
  recipient_id: string | null;
  customer_id: string | null;
  record_type: string | null;
  record_id: string | null;
  subject: string;
  body: string | null;
  metadata: Record<string, unknown>;
  status: string;
  sent_at: string | null;
  read_at: string | null;
  created_at: string;
}

export interface NotificationPreference {
  id: string;
  customer_id: string;
  event: string;
  email_enabled: boolean;
  sms_enabled: boolean;
  in_app_enabled: boolean;
}

export function useNotifications(filters?: { audience?: string; customer_id?: string; status?: string; limit?: number }) {
  return useQuery({
    queryKey: ['notifications', filters],
    queryFn: async () => {
      let query = supabase.from('notifications' as any).select('*').order('created_at', { ascending: false });
      if (filters?.audience) query = query.eq('audience', filters.audience);
      if (filters?.customer_id) query = query.eq('customer_id', filters.customer_id);
      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.limit) query = query.limit(filters.limit);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as Notification[];
    },
  });
}

export function useUnreadNotifications(recipientId?: string, isOpsStaff?: boolean) {
  return useQuery({
    queryKey: ['notifications_unread', recipientId, isOpsStaff],
    queryFn: async () => {
      // For ops staff, fetch both their personal notifications AND admin-audience notifications
      if (isOpsStaff) {
        const { data, error } = await (supabase.from('notifications' as any) as any)
          .select('*')
          .eq('status', 'sent')
          .is('read_at', null)
          .or(`recipient_id.eq.${recipientId},audience.eq.admin`)
          .order('created_at', { ascending: false })
          .limit(30);
        if (error) throw error;
        return (data || []) as unknown as Notification[];
      }
      // For non-ops (workers, subcontractors), personal notifications by recipient_id OR worker audience
      let query = (supabase.from('notifications' as any) as any)
        .select('*')
        .eq('status', 'sent')
        .is('read_at', null)
        .or(`recipient_id.eq.${recipientId},and(audience.eq.worker,recipient_id.eq.${recipientId})`)
        .order('created_at', { ascending: false })
        .limit(20);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as Notification[];
    },
    enabled: !!recipientId,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await (supabase.from('notifications' as any) as any)
        .update({ read_at: new Date().toISOString(), status: 'read' })
        .eq('id', notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications_unread'] });
    },
  });
}

export function useNotificationPreferences(customerId?: string) {
  return useQuery({
    queryKey: ['notification_preferences', customerId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('customer_notification_preferences' as any) as any)
        .select('*')
        .eq('customer_id', customerId);
      if (error) throw error;
      return (data || []) as unknown as NotificationPreference[];
    },
    enabled: !!customerId,
  });
}

export function useUpsertNotificationPreference() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pref: { customer_id: string; event: string; email_enabled: boolean; sms_enabled: boolean; in_app_enabled: boolean }) => {
      const { error } = await (supabase.from('customer_notification_preferences' as any) as any)
        .upsert(pref, { onConflict: 'customer_id,event' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notification_preferences'] }),
  });
}

// Helper to send a notification via edge function
export async function sendNotification(params: {
  event: string;
  customer_id?: string;
  recipient_id?: string;
  record_type?: string;
  record_id?: string;
  variables?: Record<string, string>;
  channels?: string[];
  audience?: string;
}) {
  const { data, error } = await supabase.functions.invoke('send-notification', {
    body: params,
  });
  if (error) throw error;
  return data;
}
