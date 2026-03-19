import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  priority: 'info' | 'warning' | 'critical';
  status: 'draft' | 'scheduled' | 'active' | 'expired' | 'cancelled';
  created_by: string;
  publish_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

function useCurrentUserId() {
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user?.id ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user?.id ?? null));
    return () => subscription.unsubscribe();
  }, []);
  return userId;
}

/** All announcements for admin management */
export function useAllAnnouncements() {
  return useQuery({
    queryKey: ['announcements', 'all'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('system_announcements')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Announcement[];
    },
  });
}

/** Active announcements for banner display (excludes dismissed) */
export function useActiveAnnouncements() {
  const userId = useCurrentUserId();

  return useQuery({
    queryKey: ['announcements', 'active', userId],
    queryFn: async () => {
      // Get active announcements
      const { data: announcements, error } = await (supabase as any)
        .from('system_announcements')
        .select('*')
        .eq('status', 'active')
        .order('priority', { ascending: true }); // critical first
      if (error) throw error;
      if (!announcements?.length || !userId) return [];

      // Get dismissed IDs
      const { data: dismissed } = await (supabase as any)
        .from('announcement_dismissals')
        .select('announcement_id')
        .eq('user_id', userId);
      const dismissedIds = new Set((dismissed || []).map((d: any) => d.announcement_id));

      return (announcements as Announcement[]).filter(a => !dismissedIds.has(a.id));
    },
    enabled: !!userId,
    refetchInterval: 60000,
  });
}

/** Create or update an announcement */
export function useUpsertAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ann: Partial<Announcement> & { id?: string }) => {
      if (ann.id) {
        const { error } = await (supabase as any)
          .from('system_announcements')
          .update(ann)
          .eq('id', ann.id);
        if (error) throw error;
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await (supabase as any)
          .from('system_announcements')
          .insert({ ...ann, created_by: user?.id });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['announcements'] }),
  });
}

/** Dismiss an announcement for the current user */
export function useDismissAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (announcementId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await (supabase as any)
        .from('announcement_dismissals')
        .upsert({ announcement_id: announcementId, user_id: user.id }, { onConflict: 'announcement_id,user_id' });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['announcements', 'active'] }),
  });
}

/** Cancel an announcement */
export function useCancelAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('system_announcements')
        .update({ status: 'cancelled' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['announcements'] }),
  });
}
