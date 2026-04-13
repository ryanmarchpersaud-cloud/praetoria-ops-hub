import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useEffect, useCallback } from 'react';

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
  _last_read_at?: string | null;
  _muted?: boolean;
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

export interface MessagingPerson {
  id: string;
  name: string;
  role: string;
}

function formatMessagingRole(value: string | null | undefined) {
  if (!value) return null;

  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** Fetch available people for starting conversations */
export function useMessagingPeople(enabled = true) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['messaging_people', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const people = new Map<string, MessagingPerson>();

      const [teamRes, subRes] = await Promise.all([
        supabase
          .from('team_members')
          .select('user_id, full_name, display_name, team_type, portal_admin, portal_worker, portal_subcontractor')
          .eq('is_active', true),
        supabase
          .from('subcontractors')
          .select('user_id, contact_name, company_name, active_flag')
          .eq('active_flag', true),
      ]);

      if (teamRes.error) throw teamRes.error;
      if (subRes.error) throw subRes.error;

      (teamRes.data || []).forEach((member: any) => {
        if (!member.user_id || member.user_id === user.id) return;

        const role = member.portal_admin
          ? 'Admin'
          : member.portal_worker
            ? 'Worker'
            : member.portal_subcontractor
              ? 'Subcontractor'
              : formatMessagingRole(member.team_type) || 'Staff';

        people.set(member.user_id, {
          id: member.user_id,
          name: member.full_name || member.display_name || 'Unknown',
          role,
        });
      });

      (subRes.data || []).forEach((sub: any) => {
        if (!sub.user_id || sub.user_id === user.id) return;

        people.set(sub.user_id, {
          id: sub.user_id,
          name: sub.contact_name || sub.company_name || 'Subcontractor',
          role: sub.company_name || 'Subcontractor',
        });
      });

      return Array.from(people.values()).sort((a, b) => a.name.localeCompare(b.name));
    },
    enabled: enabled && !!user,
  });
}

/** Fetch all conversations the current user is a member of */
export function useConversations(filter?: { type?: string; unreadOnly?: boolean; includeArchived?: boolean }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['conversations', user?.id, filter],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from('conversations')
        .select('*, conversation_members!inner(user_id, last_read_at, role_snapshot, muted)')
        .eq('conversation_members.user_id', user.id)
        .order('last_message_at', { ascending: false });

      if (!filter?.includeArchived) {
        query = query.eq('is_archived', false);
      }

      if (filter?.type) {
        query = query.eq('conversation_type', filter.type);
      }

      const { data, error } = await query;
      if (error) throw error;

      const { data: unreadData } = await (supabase.rpc as any)('get_conversation_unread_counts', {
        _user_id: user.id,
      });
      const unreadMap: Record<string, number> = {};
      (unreadData || []).forEach((r: any) => {
        unreadMap[r.conversation_id] = Number(r.unread_count);
      });

      const convos = (data || []).map((c: any) => {
        const membership = c.conversation_members?.[0];
        return {
          ...c,
          members: c.conversation_members,
          _last_read_at: membership?.last_read_at,
          _muted: membership?.muted ?? false,
          unread_count: unreadMap[c.id] || 0,
        };
      });

      return convos as Conversation[];
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`conversations-live-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversation_members',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
        queryClient.invalidateQueries({ queryKey: ['unread_count'] });
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversations',
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, (payload: any) => {
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
        if (payload.new?.sender_user_id !== user.id) {
          queryClient.invalidateQueries({ queryKey: ['unread_count'] });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return query;
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

  // Realtime subscription for new messages — invalidate conversations + unread too
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
        queryClient.invalidateQueries({ queryKey: ['unread_count'] });
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
    mutationFn: async ({ conversationId, body, messageType, attachments }: {
      conversationId: string;
      body: string;
      messageType?: string;
      attachments?: { file_url: string; file_name: string; file_type: string }[];
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { data: msg, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_user_id: user.id,
          body,
          message_type: messageType || (attachments?.length ? 'attachment' : 'text'),
          attachment_count: attachments?.length || 0,
        })
        .select()
        .single();
      if (error) throw error;

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

      // Mark as read for sender
      await supabase
        .from('conversation_members')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id);

      // Create in-app notification for other members
      try {
        const { data: members } = await supabase
          .from('conversation_members')
          .select('user_id')
          .eq('conversation_id', conversationId)
          .neq('user_id', user.id);

        if (members && members.length > 0) {
          const senderName = user.user_metadata?.full_name || user.email || 'Someone';
          const notifications = members.map((m: any) => ({
            event: 'worker_message' as const,
            channel: 'in_app' as const,
            audience: 'admin' as const,
            recipient_id: m.user_id,
            record_type: 'conversation',
            record_id: conversationId,
            subject: `New message from ${senderName}`,
            body: body?.substring(0, 120) || '📎 Attachment',
            status: 'sent',
            sent_at: new Date().toISOString(),
          }));
          await supabase.from('notifications').insert(notifications as any);
        }
      } catch (e) {
        console.error('Failed to create message notification:', e);
      }

      return msg;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['messages', vars.conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['unread_count'] });
      queryClient.invalidateQueries({ queryKey: ['notifications_unread'] });
      queryClient.invalidateQueries({ queryKey: ['notifications_all_recent'] });
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

      let expandedMemberUserIds = memberUserIds;

      if (type === 'direct_message' && memberUserIds.length > 0) {
        const { data: roleRows } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        const senderRoles = (roleRows || []).map((row: any) => row.role);
        const senderIsFieldOrExternal = senderRoles.some((role: string) =>
          ['subcontractor', 'staff', 'lead_worker', 'supervisor', 'dispatcher'].includes(role)
        ) && !senderRoles.some((role: string) =>
          ['owner', 'admin', 'manager', 'ops_manager', 'accountant', 'hr_admin'].includes(role)
        );

        if (senderIsFieldOrExternal) {
          const { data: selectedTeamMembers } = await supabase
            .from('team_members')
            .select('user_id, portal_admin')
            .in('user_id', memberUserIds);

          const targetsAdmin = (selectedTeamMembers || []).some((member: any) => member.portal_admin);

          if (targetsAdmin) {
            const { data: adminMembers } = await supabase
              .from('team_members')
              .select('user_id')
              .eq('is_active', true)
              .eq('portal_admin', true);

            expandedMemberUserIds = [
              ...new Set([
                ...memberUserIds,
                ...(adminMembers || []).map((member: any) => member.user_id).filter(Boolean),
              ]),
            ];
          }
        }
      }

      const allMembers = [...new Set([user.id, ...expandedMemberUserIds])];
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

/** Mute/unmute conversation */
export function useToggleMute() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, muted }: { conversationId: string; muted: boolean }) => {
      if (!user) return;
      await supabase
        .from('conversation_members')
        .update({ muted })
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['unread_count'] });
    },
  });
}

/** Archive/unarchive conversation */
export function useToggleArchive() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, archived }: { conversationId: string; archived: boolean }) => {
      if (!user) return;
      await supabase
        .from('conversations')
        .update({ is_archived: archived, updated_at: new Date().toISOString() })
        .eq('id', conversationId);
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
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['unread_count', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { data, error } = await (supabase.rpc as any)('get_unread_message_count', {
        _user_id: user.id,
      });
      if (error) {
        console.error('Unread count error:', error);
        return 0;
      }
      return (data as number) || 0;
    },
    enabled: !!user,
    refetchInterval: 15000,
  });

  // Global realtime listener for any new message to update unread count instantly
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('global-unread-counter')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, (payload: any) => {
        // Only invalidate if the message is from someone else
        if (payload.new?.sender_user_id !== user.id) {
          queryClient.invalidateQueries({ queryKey: ['unread_count'] });
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  return query;
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
          .select('user_id, full_name, display_name, email')
          .in('user_id', userIds);
        (team || []).forEach((t: any) => {
          profiles[t.user_id] = { name: t.full_name || t.display_name || 'Unknown', email: t.email, avatar: null };
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
