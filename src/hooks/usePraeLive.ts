// Prae production connection — live, division-scoped reads and the
// approval/execution mutations. Every read runs as the signed-in user, so
// row-level security (not a service-role client) decides visibility.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { EmailBinding } from '@/lib/praeCompose';

export type PraeLiveMessage = {
  id: string;
  direction: 'inbound' | 'outbound';
  from_address: string | null;
  from_name: string | null;
  to_addresses: string | null;
  subject: string | null;
  snippet: string | null;
  body_text: string | null;
  sent_at: string | null;
  division: string | null;
};

/** New communication activity the signed-in user is permitted to see. */
export function usePraeActivity(enabled: boolean) {
  return useQuery({
    queryKey: ['prae-live-activity'],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comms_messages' as never)
        .select('id, direction, from_address, from_name, to_addresses, subject, snippet, body_text, sent_at, division')
        .order('sent_at', { ascending: false })
        .limit(25);
      if (error) throw error;
      return (data ?? []) as unknown as PraeLiveMessage[];
    },
  });
}

/** Permitted customers, searched under the user's own RLS scope. */
export function usePraeCustomerLookup(term: string, enabled: boolean) {
  return useQuery({
    queryKey: ['prae-live-customers', term],
    enabled: enabled && term.trim().length >= 2,
    queryFn: async () => {
      const q = `%${term.trim()}%`;
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, email, phone, customer_status')
        .or(`name.ilike.${q},email.ilike.${q}`)
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export type PraeApprovalRow = {
  id: string;
  channel: string;
  division: string;
  state: string;
  execution_state: string;
  executed_at: string | null;
  execution_receipt: Record<string, unknown> | null;
  content_binding: Record<string, unknown>;
  content_hash: string;
  expires_at: string;
  created_at: string;
};

export function usePraeApprovals(enabled: boolean) {
  return useQuery({
    queryKey: ['prae-approvals'],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prae_approvals' as never)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as unknown as PraeApprovalRow[];
    },
  });
}

export function usePraeAudit(approvalId: string | null) {
  return useQuery({
    queryKey: ['prae-audit', approvalId],
    enabled: !!approvalId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prae_approval_audit' as never)
        .select('*')
        .eq('approval_id', approvalId as string)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Array<{
        id: string; event: string; detail: string | null; created_at: string; actor_role: string | null;
      }>;
    },
  });
}

/** Creates a server-hashed approval. The browser never supplies a content hash. */
export function useCreatePraeApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { binding: EmailBinding; division: string; ttlMinutes?: number }) => {
      const { data, error } = await supabase.rpc('prae_create_approval' as never, {
        _content_binding: args.binding as unknown as never,
        _division: args.division as never,
        _ttl_minutes: (args.ttlMinutes ?? 15) as never,
        _is_synthetic: false as never,
      } as never);
      if (error) throw error;
      return data as unknown as { approval_id: string; nonce: string; expires_at: string };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prae-approvals'] }),
  });
}

/** Approve or reject. The nonce is single-use and never persisted by the browser. */
export function useDecidePraeApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { approvalId: string; nonce: string; decision: 'approved' | 'rejected' }) => {
      // The server accepts the verbs 'approve' / 'reject'.
      const verb = args.decision === 'approved' ? 'approve' : 'reject';
      const { data, error } = await supabase.rpc('prae_decide_approval' as never, {
        _approval_id: args.approvalId as never,
        _nonce: args.nonce as never,
        _decision: verb as never,
      } as never);

      if (error) throw error;
      return data as unknown as { ok: boolean; reason?: string };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prae-approvals'] }),
  });
}

/** Executes an approved send. Only the approval id is sent — never content. */
export function useExecutePraeApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (approvalId: string) => {
      const { data, error } = await supabase.functions.invoke('comms-smtp-send', {
        body: { action: 'execute_approval', approval_id: approvalId },
      });
      if (error) throw error;
      return data as { approval_id?: string; error?: string; reason?: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prae-approvals'] });
      qc.invalidateQueries({ queryKey: ['comms-outbound'] });
    },
  });
}

export type PraeRelatedRecords = {
  email: string | null;
  customers: Array<{ id: string; name: string | null; email: string | null; phone: string | null; customer_status: string | null }>;
  properties: Array<{ id: string; property_name: string | null; address_line_1: string | null; city: string | null; status: string | null }>;
  quotes: Array<{ id: string; quote_number: string | null; approval_status: string | null; sent_status: string | null; total: number | null }>;
  invoices: Array<{ id: string; invoice_number: string | null; status: string | null; total: number | null; balance_due: number | null; due_date: string | null }>;
  jobs: Array<{ id: string; job_number: string | null; job_title: string | null; status: string | null; scheduled_date: string | null }>;
  visits: Array<{ id: string; visit_number: string | null; visit_status: string | null; service_date: string | null; scheduled_start_time: string | null }>;
};

/**
 * Phase 1F — caller-scoped related-record lookup. Runs as the signed-in user
 * (SECURITY INVOKER + owner/admin guard); the browser never uses a service key.
 */
export function usePraeRelatedRecords(email: string | null | undefined) {
  return useQuery({
    queryKey: ['prae-related', email],
    enabled: !!email,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('prae_related_records' as never, {
        _email: email as never,
      } as never);
      if (error) throw error;
      return data as unknown as PraeRelatedRecords;
    },
  });
}
