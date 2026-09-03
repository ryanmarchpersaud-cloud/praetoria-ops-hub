import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/** Phase 1A — read-only access to imported staging correspondence. */

export function useCommsSettings() {
  return useQuery({
    queryKey: ['comms-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comms_settings' as never)
        .select('*')
        .maybeSingle();
      if (error) throw error;
      return data as unknown as {
        polling_enabled: boolean;
        hub_enabled: boolean;
        poll_interval_seconds: number;
        max_messages_per_run: number;
        updated_at: string;
      } | null;
    },
  });
}

export function useCommsMailboxes() {
  return useQuery({
    queryKey: ['comms-mailboxes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comms_mailboxes' as never)
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Array<{
        id: string;
        label: string;
        email_address: string;
        environment: string;
        division: string | null;
        is_active: boolean;
      }>;
    },
  });
}

export function useCommsSyncState() {
  return useQuery({
    queryKey: ['comms-sync-state'],
    queryFn: async () => {
      const { data, error } = await supabase.from('comms_sync_state' as never).select('*');
      if (error) throw error;
      return (data ?? []) as unknown as Array<{
        mailbox_id: string;
        last_seen_uid: number;
        last_run_at: string | null;
        last_run_status: string | null;
        last_error: string | null;
        is_running: boolean;
      }>;
    },
  });
}

export type CommsMessage = {
  id: string;
  mailbox_id: string;
  subject: string | null;
  from_name: string | null;
  from_address: string | null;
  to_addresses: string | null;
  sent_at: string | null;
  imported_at: string;
  snippet: string | null;
  body_text: string | null;
  division: string | null;
  direction: string;
};

export function useCommsMessages(search?: string) {
  return useQuery({
    queryKey: ['comms-messages', search],
    queryFn: async () => {
      let query = supabase
        .from('comms_messages' as never)
        .select('*')
        .order('sent_at', { ascending: false, nullsFirst: false })
        .limit(200);
      if (search) {
        query = query.or(
          `subject.ilike.%${search}%,from_address.ilike.%${search}%,snippet.ilike.%${search}%`,
        );
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as CommsMessage[];
    },
  });
}

export type OutboundMessage = {
  id: string;
  from_address: string;
  to_address: string;
  subject: string;
  status: 'draft' | 'sending' | 'sent' | 'failed';
  created_at: string;
  sent_at: string | null;
  failed_at: string | null;
  error_text: string | null;
};

/** Phase 1B — staging outbound log (owner/admin only via RLS). */
export function useCommsOutbound() {
  return useQuery({
    queryKey: ['comms-outbound'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comms_outbound_messages' as never)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as OutboundMessage[];
    },
  });
}
