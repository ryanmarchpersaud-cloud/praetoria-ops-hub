import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type PMNotificationStatus = 'unread' | 'read' | 'archived';
export type PMNotificationPriority = 'low' | 'normal' | 'high' | 'urgent';
export type PMRecipientPortal = 'admin' | 'pm_staff' | 'tenant' | 'owner';

export interface PMNotification {
  id: string;
  recipient_user_id: string;
  recipient_portal: PMRecipientPortal;
  recipient_role: string | null;
  notification_type: string;
  priority: PMNotificationPriority;
  status: PMNotificationStatus;
  title: string;
  message: string;
  action_url: string | null;
  related_type: string | null;
  related_id: string | null;
  property_id: string | null;
  unit_id: string | null;
  tenant_id: string | null;
  owner_id: string | null;
  metadata: Record<string, unknown>;
  read_at: string | null;
  archived_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const TABLE = 'pm_notifications' as const;

export function usePMNotifications(opts?: { limit?: number; includeArchived?: boolean }) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['pm_notifications', user?.id, opts?.limit ?? 50, !!opts?.includeArchived],
    enabled: !!user?.id,
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      let q = (supabase.from(TABLE as any) as any)
        .select('*')
        .eq('recipient_user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(opts?.limit ?? 50);
      if (!opts?.includeArchived) q = q.neq('status', 'archived');
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as PMNotification[];
    },
  });
}

export function usePMUnreadCount() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['pm_notifications_unread_count', user?.id],
    enabled: !!user?.id,
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { count, error } = await (supabase.from(TABLE as any) as any)
        .select('id', { count: 'exact', head: true })
        .eq('recipient_user_id', user!.id)
        .eq('status', 'unread');
      if (error) throw error;
      return count ?? 0;
    },
  });
}

export function useMarkPMNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from(TABLE as any) as any)
        .update({ status: 'read', read_at: new Date().toISOString() })
        .eq('id', id)
        .eq('status', 'unread');
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pm_notifications'] });
      qc.invalidateQueries({ queryKey: ['pm_notifications_unread_count'] });
    },
  });
}

export function useMarkAllPMNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('pm_notifications_mark_all_read' as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pm_notifications'] });
      qc.invalidateQueries({ queryKey: ['pm_notifications_unread_count'] });
    },
  });
}

export function useArchivePMNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from(TABLE as any) as any)
        .update({ status: 'archived', archived_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pm_notifications'] });
      qc.invalidateQueries({ queryKey: ['pm_notifications_unread_count'] });
    },
  });
}
