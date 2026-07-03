import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type TenantThreadCategory =
  | 'general' | 'lease' | 'maintenance' | 'notice' | 'document'
  | 'renewal' | 'move_in' | 'move_out' | 'payment_question'
  | 'access' | 'safety' | 'other';
export type TenantThreadStatus =
  | 'open' | 'waiting_on_tenant' | 'waiting_on_praetoria' | 'resolved' | 'closed';
export type TenantThreadPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface TenantThread {
  id: string;
  subject: string;
  category: TenantThreadCategory;
  status: TenantThreadStatus;
  priority: TenantThreadPriority;
  property_id: string | null;
  unit_id: string | null;
  tenant_id: string;
  lease_id: string | null;
  related_maintenance_request_id: string | null;
  related_work_order_id: string | null;
  related_notice_id: string | null;
  related_document_id: string | null;
  related_lease_renewal_id: string | null;
  related_move_in_id: string | null;
  related_move_out_id: string | null;
  created_by: string | null;
  assigned_staff_id: string | null;
  last_message_at: string | null;
  last_tenant_visible_message_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TenantMessage {
  id: string;
  thread_id: string;
  sender_id: string | null;
  sender_type: 'admin' | 'property_manager' | 'leasing_agent' | 'tenant' | 'system';
  body: string;
  is_tenant_visible: boolean;
  read_at: string | null;
  created_at: string;
}

// ============ Staff: list all tenant threads ============
export function useTenantThreads(filters?: {
  status?: TenantThreadStatus | 'all';
  category?: TenantThreadCategory | 'all';
  tenant_id?: string;
  property_id?: string;
}) {
  return useQuery({
    queryKey: ['pm_tenant_message_threads', filters],
    queryFn: async () => {
      let q = supabase
        .from('pm_tenant_message_threads' as any)
        .select('*')
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });
      if (filters?.status && filters.status !== 'all') q = q.eq('status', filters.status);
      if (filters?.category && filters.category !== 'all') q = q.eq('category', filters.category);
      if (filters?.tenant_id) q = q.eq('tenant_id', filters.tenant_id);
      if (filters?.property_id) q = q.eq('property_id', filters.property_id);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as TenantThread[];
    },
  });
}

// ============ Tenant: list own threads (RLS filters automatically) ============
export function useTenantOwnThreads() {
  return useQuery({
    queryKey: ['pm_tenant_message_threads_own'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pm_tenant_message_threads' as any)
        .select('*')
        .order('last_tenant_visible_message_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as TenantThread[];
    },
  });
}

// ============ Messages within a thread ============
export function useTenantThreadMessages(threadId: string | undefined, opts?: { tenantVisibleOnly?: boolean }) {
  return useQuery({
    queryKey: ['pm_tenant_messages', threadId, opts?.tenantVisibleOnly ?? false],
    enabled: !!threadId,
    queryFn: async () => {
      let q = supabase
        .from('pm_tenant_messages' as any)
        .select('*')
        .eq('thread_id', threadId as string)
        .order('created_at', { ascending: true });
      if (opts?.tenantVisibleOnly) q = q.eq('is_tenant_visible', true);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as TenantMessage[];
    },
  });
}

// ============ Staff creates a thread ============
export function useCreateTenantThread() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      subject: string;
      category?: TenantThreadCategory;
      priority?: TenantThreadPriority;
      tenant_id: string;
      property_id?: string | null;
      unit_id?: string | null;
      lease_id?: string | null;
      assigned_staff_id?: string | null;
      related_maintenance_request_id?: string | null;
      related_work_order_id?: string | null;
      related_notice_id?: string | null;
      related_document_id?: string | null;
      related_lease_renewal_id?: string | null;
      related_move_in_id?: string | null;
      related_move_out_id?: string | null;
      first_message: string;
    }) => {
      if (!input.subject.trim()) throw new Error('Subject required');
      if (!input.first_message.trim()) throw new Error('Message required');

      const { data: thread, error } = await supabase
        .from('pm_tenant_message_threads' as any)
        .insert({
          subject: input.subject.trim(),
          category: input.category ?? 'general',
          priority: input.priority ?? 'normal',
          status: 'waiting_on_tenant',
          tenant_id: input.tenant_id,
          property_id: input.property_id ?? null,
          unit_id: input.unit_id ?? null,
          lease_id: input.lease_id ?? null,
          assigned_staff_id: input.assigned_staff_id ?? user?.id ?? null,
          created_by: user?.id ?? null,
          related_maintenance_request_id: input.related_maintenance_request_id ?? null,
          related_work_order_id: input.related_work_order_id ?? null,
          related_notice_id: input.related_notice_id ?? null,
          related_document_id: input.related_document_id ?? null,
          related_lease_renewal_id: input.related_lease_renewal_id ?? null,
          related_move_in_id: input.related_move_in_id ?? null,
          related_move_out_id: input.related_move_out_id ?? null,
        })
        .select()
        .single();
      if (error) throw error;

      const { error: msgErr } = await supabase.from('pm_tenant_messages' as any).insert({
        thread_id: (thread as any).id,
        sender_id: user?.id ?? null,
        sender_type: 'property_manager',
        body: input.first_message.trim(),
        is_tenant_visible: true,
      });
      if (msgErr) throw msgErr;

      return thread as unknown as TenantThread;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pm_tenant_message_threads'] });
    },
  });
}

// ============ Staff: reply / internal note ============
export function useStaffTenantReply() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { thread_id: string; body: string; is_tenant_visible: boolean }) => {
      if (!input.body.trim()) throw new Error('Message required');
      const { error } = await supabase.from('pm_tenant_messages' as any).insert({
        thread_id: input.thread_id,
        sender_id: user?.id ?? null,
        sender_type: 'property_manager',
        body: input.body.trim(),
        is_tenant_visible: input.is_tenant_visible,
      });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['pm_tenant_messages', v.thread_id] });
      qc.invalidateQueries({ queryKey: ['pm_tenant_message_threads'] });
    },
  });
}

// ============ Staff: update thread meta ============
export function useUpdateTenantThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Pick<TenantThread, 'status' | 'priority' | 'assigned_staff_id' | 'subject' | 'category'>> }) => {
      const p: Record<string, any> = { ...patch };
      if (patch.status === 'closed') p.closed_at = new Date().toISOString();
      const { error } = await supabase.from('pm_tenant_message_threads' as any).update(p).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pm_tenant_message_threads'] });
    },
  });
}

// ============ Tenant: reply ============
export function useTenantReply() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { thread_id: string; body: string }) => {
      if (!input.body.trim()) throw new Error('Message required');
      const { error } = await supabase.from('pm_tenant_messages' as any).insert({
        thread_id: input.thread_id,
        sender_id: user?.id ?? null,
        sender_type: 'tenant',
        body: input.body.trim(),
        is_tenant_visible: true,
      });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['pm_tenant_messages', v.thread_id] });
      qc.invalidateQueries({ queryKey: ['pm_tenant_message_threads_own'] });
    },
  });
}

// ============ Tenant: open thread (RPC) ============
export function useTenantOpenThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      subject: string;
      body: string;
      category?: TenantThreadCategory;
      related_maintenance_request_id?: string | null;
    }) => {
      const { data, error } = await supabase.rpc('tenant_open_message_thread' as any, {
        _subject: input.subject,
        _body: input.body,
        _category: input.category ?? 'general',
        _related_maintenance_request_id: input.related_maintenance_request_id ?? null,
      });
      if (error) throw error;
      return data as unknown as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pm_tenant_message_threads_own'] }),
  });
}

// ============ Tenant: mark thread read ============
export function useTenantMarkThreadRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (thread_id: string) => {
      const { error } = await supabase.rpc('tenant_mark_thread_read' as any, { _thread_id: thread_id });
      if (error) throw error;
    },
    onSuccess: (_d, tid) => {
      qc.invalidateQueries({ queryKey: ['pm_tenant_messages', tid] });
      qc.invalidateQueries({ queryKey: ['pm_tenant_message_threads_own'] });
    },
  });
}
