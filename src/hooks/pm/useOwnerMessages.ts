import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type OwnerThreadCategory =
  | 'general' | 'approval' | 'maintenance' | 'work_order' | 'expense'
  | 'statement' | 'lease_renewal' | 'move_out' | 'document' | 'other';
export type OwnerThreadStatus =
  | 'open' | 'waiting_on_owner' | 'waiting_on_praetoria' | 'resolved' | 'closed';
export type OwnerThreadPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface OwnerThread {
  id: string;
  subject: string;
  category: OwnerThreadCategory;
  status: OwnerThreadStatus;
  priority: OwnerThreadPriority;
  property_id: string | null;
  unit_id: string | null;
  owner_id: string;
  related_approval_id: string | null;
  related_maintenance_request_id: string | null;
  related_work_order_id: string | null;
  related_expense_id: string | null;
  related_statement_id: string | null;
  related_lease_renewal_id: string | null;
  related_move_out_id: string | null;
  created_by: string | null;
  assigned_staff_id: string | null;
  last_message_at: string | null;
  last_owner_visible_message_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OwnerMessage {
  id: string;
  thread_id: string;
  sender_id: string | null;
  sender_type: 'admin' | 'property_manager' | 'owner' | 'system';
  body: string;
  is_owner_visible: boolean;
  read_at: string | null;
  created_at: string;
}

// ============ Staff/Admin: list all threads ============
export function useOwnerThreads(filters?: {
  status?: OwnerThreadStatus | 'all';
  category?: OwnerThreadCategory | 'all';
  owner_id?: string;
  property_id?: string;
}) {
  return useQuery({
    queryKey: ['pm_owner_message_threads', filters],
    queryFn: async () => {
      let q = supabase
        .from('pm_owner_message_threads' as any)
        .select('*')
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });
      if (filters?.status && filters.status !== 'all') q = q.eq('status', filters.status);
      if (filters?.category && filters.category !== 'all') q = q.eq('category', filters.category);
      if (filters?.owner_id) q = q.eq('owner_id', filters.owner_id);
      if (filters?.property_id) q = q.eq('property_id', filters.property_id);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as OwnerThread[];
    },
  });
}

// ============ Owner: list own threads (RLS filters automatically) ============
export function useOwnerOwnThreads() {
  return useQuery({
    queryKey: ['pm_owner_message_threads_own'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pm_owner_message_threads' as any)
        .select('*')
        .order('last_owner_visible_message_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as OwnerThread[];
    },
  });
}

// ============ Messages within a thread ============
export function useThreadMessages(threadId: string | undefined, opts?: { ownerVisibleOnly?: boolean }) {
  return useQuery({
    queryKey: ['pm_owner_messages', threadId, opts?.ownerVisibleOnly ?? false],
    enabled: !!threadId,
    queryFn: async () => {
      let q = supabase
        .from('pm_owner_messages' as any)
        .select('*')
        .eq('thread_id', threadId as string)
        .order('created_at', { ascending: true });
      if (opts?.ownerVisibleOnly) q = q.eq('is_owner_visible', true);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as OwnerMessage[];
    },
  });
}

// ============ Staff creates a thread ============
export function useCreateOwnerThread() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      subject: string;
      category?: OwnerThreadCategory;
      priority?: OwnerThreadPriority;
      owner_id: string;
      property_id?: string | null;
      unit_id?: string | null;
      assigned_staff_id?: string | null;
      related_approval_id?: string | null;
      related_maintenance_request_id?: string | null;
      related_work_order_id?: string | null;
      related_expense_id?: string | null;
      related_statement_id?: string | null;
      related_lease_renewal_id?: string | null;
      related_move_out_id?: string | null;
      first_message: string;
    }) => {
      if (!input.subject.trim()) throw new Error('Subject required');
      if (!input.first_message.trim()) throw new Error('Message required');

      const { data: thread, error } = await supabase
        .from('pm_owner_message_threads' as any)
        .insert({
          subject: input.subject.trim(),
          category: input.category ?? 'general',
          priority: input.priority ?? 'normal',
          status: 'waiting_on_owner',
          owner_id: input.owner_id,
          property_id: input.property_id ?? null,
          unit_id: input.unit_id ?? null,
          assigned_staff_id: input.assigned_staff_id ?? user?.id ?? null,
          created_by: user?.id ?? null,
          related_approval_id: input.related_approval_id ?? null,
          related_maintenance_request_id: input.related_maintenance_request_id ?? null,
          related_work_order_id: input.related_work_order_id ?? null,
          related_expense_id: input.related_expense_id ?? null,
          related_statement_id: input.related_statement_id ?? null,
          related_lease_renewal_id: input.related_lease_renewal_id ?? null,
          related_move_out_id: input.related_move_out_id ?? null,
        })
        .select()
        .single();
      if (error) throw error;

      const staffType = 'property_manager'; // we treat ops/PM staff uniformly here
      const { error: msgErr } = await supabase.from('pm_owner_messages' as any).insert({
        thread_id: (thread as any).id,
        sender_id: user?.id ?? null,
        sender_type: staffType,
        body: input.first_message.trim(),
        is_owner_visible: true,
      });
      if (msgErr) throw msgErr;

      return thread as unknown as OwnerThread;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pm_owner_message_threads'] });
    },
  });
}

// ============ Staff: reply / internal note ============
export function useStaffReply() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { thread_id: string; body: string; is_owner_visible: boolean }) => {
      if (!input.body.trim()) throw new Error('Message required');
      const { error } = await supabase.from('pm_owner_messages' as any).insert({
        thread_id: input.thread_id,
        sender_id: user?.id ?? null,
        sender_type: 'property_manager',
        body: input.body.trim(),
        is_owner_visible: input.is_owner_visible,
      });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['pm_owner_messages', v.thread_id] });
      qc.invalidateQueries({ queryKey: ['pm_owner_message_threads'] });
    },
  });
}

// ============ Staff: update thread meta (status, assignee, priority) ============
export function useUpdateOwnerThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Pick<OwnerThread, 'status' | 'priority' | 'assigned_staff_id' | 'subject' | 'category'>> }) => {
      const p: Record<string, any> = { ...patch };
      if (patch.status === 'closed') p.closed_at = new Date().toISOString();
      const { error } = await supabase.from('pm_owner_message_threads' as any).update(p).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pm_owner_message_threads'] });
    },
  });
}

// ============ Owner: reply ============
export function useOwnerReply() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { thread_id: string; body: string }) => {
      if (!input.body.trim()) throw new Error('Message required');
      const { error } = await supabase.from('pm_owner_messages' as any).insert({
        thread_id: input.thread_id,
        sender_id: user?.id ?? null,
        sender_type: 'owner',
        body: input.body.trim(),
        is_owner_visible: true,
      });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['pm_owner_messages', v.thread_id] });
      qc.invalidateQueries({ queryKey: ['pm_owner_message_threads_own'] });
    },
  });
}

// ============ Owner: open a new thread (RPC) ============
export function useOwnerOpenThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      property_id: string;
      subject: string;
      body: string;
      category?: OwnerThreadCategory;
    }) => {
      const { data, error } = await supabase.rpc('owner_open_message_thread' as any, {
        _property_id: input.property_id,
        _subject: input.subject,
        _body: input.body,
        _category: input.category ?? 'general',
      });
      if (error) throw error;
      return data as unknown as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pm_owner_message_threads_own'] }),
  });
}

// ============ Owner: mark thread read ============
export function useOwnerMarkThreadRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (thread_id: string) => {
      const { error } = await supabase.rpc('owner_mark_thread_read' as any, { _thread_id: thread_id });
      if (error) throw error;
    },
    onSuccess: (_d, tid) => {
      qc.invalidateQueries({ queryKey: ['pm_owner_messages', tid] });
      qc.invalidateQueries({ queryKey: ['pm_owner_message_threads_own'] });
    },
  });
}
