import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useEffect } from 'react';

export type ConversationType = 'direct_message' | 'team_channel' | 'job_thread' | 'visit_thread' | 'incident_thread' | 'equipment_thread' | 'announcement_channel';

export interface Conversation {
  id: string;
  conversation_type: string;
  title: string | null;
  created_by: string;
  job_id: string | null;
  visit_id: string | null;
  incident_id: string | null;
  equipment_item_id: string | null;
  is_announcement_only: boolean;
  is_archived: boolean;
  last_message_at: string | null;
  last_message_preview: string | null;
  created_at: string;
  members?: ConversationMember[];
  unread_count?: number;
}

export interface ConversationMember {
  id: string;
  conversation_id: string;
  user_id: string;
  role_snapshot: string | null;
  joined_at: string;
  last_read_at: string | null;
  muted: boolean;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_user_id: string;
  body: string | null;
  message_type: string;
  attachment_count: number;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  attachments?: MessageAttachment[];
  sender_profile?: { full_name: string; email: string; avatar_url?: string; role_label?: string };
}

export interface MessageAttachment {
  id: string;
  message_id: string;
  file_url: string;
  file_name: string;
  file_type: string | null;
  uploaded_by: string;
  created_at: string;
}

/** Fetch all conversations the current user is a member of */
export function useConversations(filter?: { type?: string; unreadOnly?: boolean }) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['conversations', user?.id, filter],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from('conversations')
        .select('*, conversation_members!inner(user_id, last_read_at, role_snapshot)')
        .eq('conversation_members.user_id', user.id)
        .eq('is_archived', false)
        .order('last_message_at', { ascending: false });

      if (filter?.type) {
        query = query.eq('conversation_type', filter.type);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Calculate unread counts
      const convos = (data || []).map((c: any) => {
        const membership = c.conversation_members?.[0];
        const lastRead = membership?.last_read_at;
        return {
          ...c,
          members: c.conversation_members,
          _last_read_at: lastRead,
        };
      });

      return convos as Conversation[];
    },
    enabled: !!user,
    refetchInterval: 30000,
  });
}

/** Fetch messages for a conversation */
export function useMessages(conversationId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      const { data, error } = await supabase
        .from('messages')
        .select('*, message_attachments(*)')
        .eq('conversation_id', conversationId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
        .limit(200);
      if (error) throw error;

      // Fetch sender profiles
      const senderIds = [...new Set((data || []).map((m: any) => m.sender_user_id))];
      const profiles: Record<string, any> = {};
      
      if (senderIds.length > 0) {
        // Try team_members first
        const { data: teamMembers } = await supabase
          .from('team_members')
          .select('user_id, full_name, display_name, email')
          .in('user_id', senderIds);
        
        (teamMembers || []).forEach((tm: any) => {
          profiles[tm.user_id] = {
            full_name: tm.full_name || tm.display_name || 'Unknown',
            email: tm.email,
            avatar_url: null,
            role_label: 'Staff',
          };
        });

        // Try subcontractors
        const missingSenders = senderIds.filter(id => !profiles[id]);
        if (missingSenders.length > 0) {
          const { data: subs } = await supabase
            .from('subcontractors')
            .select('user_id, contact_name, email, profile_photo_url, company_name')
            .in('user_id', missingSenders);
          (subs || []).forEach((s: any) => {
            profiles[s.user_id] = {
              full_name: s.contact_name,
              email: s.email,
              avatar_url: s.profile_photo_url,
              role_label: s.company_name || 'Subcontractor',
            };
          });
        }
      }

      return (data || []).map((m: any) => ({
        ...m,
        attachments: m.message_attachments || [],
        sender_profile: profiles[m.sender_user_id] || { full_name: 'Unknown', email: '' },
      })) as Message[];
    },
    enabled: !!conversationId && !!user,
  });

  // Realtime subscription for new messages
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, queryClient]);

  return query;
}

/** Send a message */
export function useSendMessage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, body, attachments }: {
      conversationId: string;
      body: string;
      attachments?: { file_url: string; file_name: string; file_type: string }[];
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { data: msg, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_user_id: user.id,
          body,
          message_type: attachments?.length ? 'attachment' : 'text',
          attachment_count: attachments?.length || 0,
        })
        .select()
        .single();
      if (error) throw error;

      // Insert attachments
      if (attachments?.length) {
        const { error: attErr } = await supabase
          .from('message_attachments')
          .insert(attachments.map(a => ({
            message_id: msg.id,
            file_url: a.file_url,
            file_name: a.file_name,
            file_type: a.file_type,
            uploaded_by: user.id,
          })));
        if (attErr) console.error('Attachment insert error:', attErr);
      }

      // Update conversation last_message
      await supabase
        .from('conversations')
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: body?.substring(0, 100) || '📎 Attachment',
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId);

      // Mark as read
      await supabase
        .from('conversation_members')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id);

      return msg;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['messages', vars.conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

/** Create a new conversation */
export function useCreateConversation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ type, title, memberUserIds, jobId, visitId, incidentId }: {
      type: ConversationType;
      title?: string;
      memberUserIds: string[];
      jobId?: string;
      visitId?: string;
      incidentId?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { data: convo, error } = await supabase
        .from('conversations')
        .insert({
          conversation_type: type,
          title: title || null,
          created_by: user.id,
          job_id: jobId || null,
          visit_id: visitId || null,
          incident_id: incidentId || null,
          is_announcement_only: type === 'announcement_channel',
        })
        .select()
        .single();
      if (error) throw error;

      // Add members (include creator)
      const allMembers = [...new Set([user.id, ...memberUserIds])];
      const { error: memErr } = await supabase
        .from('conversation_members')
        .insert(allMembers.map(uid => ({
          conversation_id: convo.id,
          user_id: uid,
        })));
      if (memErr) throw memErr;

      return convo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

/** Mark conversation as read */
export function useMarkRead() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      if (!user) return;
      await supabase
        .from('conversation_members')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['unread_count'] });
    },
  });
}

/** Get total unread count across all conversations */
export function useUnreadCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['unread_count', user?.id],
    queryFn: async () => {
      if (!user) return 0;

      const { data: memberships, error } = await supabase
        .from('conversation_members')
        .select('conversation_id, last_read_at')
        .eq('user_id', user.id);
      if (error) return 0;
      if (!memberships?.length) return 0;

      let total = 0;
      for (const mem of memberships) {
        let q = supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', mem.conversation_id)
          .neq('sender_user_id', user.id)
          .is('deleted_at', null);
        
        if (mem.last_read_at) {
          q = q.gt('created_at', mem.last_read_at);
        }
        
        const { count } = await q;
        total += count || 0;
      }

      return total;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });
}

/** Get conversation members with profile info */
export function useConversationMembers(conversationId: string | null) {
  return useQuery({
    queryKey: ['conversation_members', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      const { data, error } = await supabase
        .from('conversation_members')
        .select('*')
        .eq('conversation_id', conversationId);
      if (error) throw error;

      const userIds = (data || []).map((m: any) => m.user_id);
      const profiles: Record<string, any> = {};

      if (userIds.length > 0) {
        const { data: team } = await supabase
          .from('team_members')
          .select('user_id, full_name, display_name, email, profile_photo_url')
          .in('user_id', userIds);
        (team || []).forEach((t: any) => {
          profiles[t.user_id] = { name: t.full_name || t.display_name || 'Unknown', email: t.email, avatar: t.profile_photo_url };
        });

        const missing = userIds.filter((id: string) => !profiles[id]);
        if (missing.length) {
          const { data: subs } = await supabase
            .from('subcontractors')
            .select('user_id, contact_name, email, profile_photo_url')
            .in('user_id', missing);
          (subs || []).forEach((s: any) => {
            profiles[s.user_id] = { name: s.contact_name, email: s.email, avatar: s.profile_photo_url };
          });
        }
      }

      return (data || []).map((m: any) => ({
        ...m,
        profile: profiles[m.user_id] || { name: 'Unknown', email: '' },
      }));
    },
    enabled: !!conversationId,
  });
}
