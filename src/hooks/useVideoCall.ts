import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface VideoCall {
  id: string;
  conversation_id: string | null;
  room_name: string;
  room_sid: string | null;
  status: string;
  started_by: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  recording_url: string | null;
  created_at: string;
}

export interface MeetingNote {
  id: string;
  video_call_id: string;
  conversation_id: string | null;
  note_type: string;
  title: string | null;
  content: string;
  created_by: string;
  created_at: string;
}

export function useActiveVideoCall(conversationId: string | null) {
  return useQuery({
    queryKey: ['active_video_call', conversationId],
    queryFn: async () => {
      if (!conversationId) return null;
      const { data, error } = await (supabase.from('video_calls' as any) as any)
        .select('*')
        .eq('conversation_id', conversationId)
        .in('status', ['waiting', 'active'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as VideoCall | null;
    },
    enabled: !!conversationId,
    refetchInterval: 10000,
  });
}

export function useVideoCallHistory(conversationId: string | null) {
  return useQuery({
    queryKey: ['video_call_history', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      const { data, error } = await (supabase.from('video_calls' as any) as any)
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []) as VideoCall[];
    },
    enabled: !!conversationId,
  });
}

export function useMeetingNotes(videoCallId: string | null) {
  return useQuery({
    queryKey: ['meeting_notes', videoCallId],
    queryFn: async () => {
      if (!videoCallId) return [];
      const { data, error } = await (supabase.from('meeting_notes' as any) as any)
        .select('*')
        .eq('video_call_id', videoCallId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as MeetingNote[];
    },
    enabled: !!videoCallId,
  });
}

export function useCreateVideoCall() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { data, error } = await supabase.functions.invoke('video-room', {
        body: { action: 'create', conversation_id: conversationId },
      });
      if (error) throw error;
      return data as { token: string; room_name: string; room_sid: string; video_call_id: string; identity: string };
    },
    onSuccess: (_, conversationId) => {
      queryClient.invalidateQueries({ queryKey: ['active_video_call', conversationId] });
    },
  });
}

export function useJoinVideoCall() {
  return useMutation({
    mutationFn: async ({ roomName, conversationId }: { roomName: string; conversationId: string }) => {
      const { data, error } = await supabase.functions.invoke('video-room', {
        body: { action: 'join', room_name: roomName, conversation_id: conversationId },
      });
      if (error) throw error;
      return data as { token: string; room_name: string; identity: string };
    },
  });
}

export function useEndVideoCall() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ roomName, conversationId }: { roomName: string; conversationId: string }) => {
      const { data, error } = await supabase.functions.invoke('video-room', {
        body: { action: 'end', room_name: roomName, conversation_id: conversationId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active_video_call'] });
      queryClient.invalidateQueries({ queryKey: ['video_call_history'] });
    },
  });
}

export function useSaveMeetingNote() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ videoCallId, conversationId, content, title, noteType }: {
      videoCallId: string;
      conversationId: string;
      content: string;
      title?: string;
      noteType?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await (supabase.from('meeting_notes' as any) as any)
        .insert({
          video_call_id: videoCallId,
          conversation_id: conversationId,
          content,
          title: title || null,
          note_type: noteType || 'manual',
          created_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['meeting_notes', vars.videoCallId] });
    },
  });
}

export function useGenerateAIMeetingMinutes() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ videoCallId, conversationId, manualNotes }: {
      videoCallId: string;
      conversationId: string;
      manualNotes: string[];
    }) => {
      if (!user) throw new Error('Not authenticated');
      
      // Call AI to summarize the notes
      const { data, error } = await supabase.functions.invoke('summarize-meeting', {
        body: { video_call_id: videoCallId, notes: manualNotes },
      });
      if (error) throw error;

      // Save as AI-generated note
      const { error: saveError } = await (supabase.from('meeting_notes' as any) as any)
        .insert({
          video_call_id: videoCallId,
          conversation_id: conversationId,
          content: data.summary,
          title: '📋 AI Meeting Minutes',
          note_type: 'ai_generated',
          created_by: user.id,
        });
      if (saveError) throw saveError;

      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['meeting_notes', vars.videoCallId] });
    },
  });
}
