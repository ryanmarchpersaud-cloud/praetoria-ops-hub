import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useAgreementTemplates() {
  return useQuery({
    queryKey: ['agreement_templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agreement_templates')
        .select('*')
        .eq('is_active', true)
        .order('category');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAgreements(filters?: { status?: string; recipientType?: string }) {
  return useQuery({
    queryKey: ['agreements', filters],
    queryFn: async () => {
      let q = supabase.from('agreements').select('*').order('created_at', { ascending: false });
      if (filters?.status && filters.status !== 'all') q = q.eq('status', filters.status);
      if (filters?.recipientType && filters.recipientType !== 'all') q = q.eq('recipient_type', filters.recipientType);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAgreement(id: string | undefined) {
  return useQuery({
    queryKey: ['agreement', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('agreements').select('*').eq('id', id!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useAgreementByToken(token: string | undefined) {
  return useQuery({
    queryKey: ['agreement_token', token],
    enabled: !!token,
    queryFn: async () => {
      const { data, error } = await supabase.from('agreements').select('*').eq('signing_token', token!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useAgreementSignatures(agreementId: string | undefined) {
  return useQuery({
    queryKey: ['agreement_signatures', agreementId],
    enabled: !!agreementId,
    queryFn: async () => {
      const { data, error } = await supabase.from('agreement_signatures').select('*').eq('agreement_id', agreementId!).order('signed_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAgreementAuditLog(agreementId: string | undefined) {
  return useQuery({
    queryKey: ['agreement_audit_log', agreementId],
    enabled: !!agreementId,
    queryFn: async () => {
      const { data, error } = await supabase.from('agreement_audit_log').select('*').eq('agreement_id', agreementId!).order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMyAgreements(userId: string | undefined, recipientType?: string) {
  return useQuery({
    queryKey: ['my_agreements', userId, recipientType],
    enabled: !!userId,
    queryFn: async () => {
      let q = supabase.from('agreements').select('*').eq('recipient_user_id', userId!).order('created_at', { ascending: false });
      if (recipientType) q = q.eq('recipient_type', recipientType);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateAgreement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase.from('agreements').insert(payload).select().single();
      if (error) throw error;
      // Audit log
      await supabase.from('agreement_audit_log').insert({ agreement_id: data.id, action: 'created', performed_by: payload.created_by });
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['agreements'] }); toast.success('Agreement created'); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateAgreement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { error } = await supabase.from('agreements').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['agreements'] }); qc.invalidateQueries({ queryKey: ['agreement'] }); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useSendAgreement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, sentBy }: { id: string; sentBy: string }) => {
      const { error } = await supabase.from('agreements').update({ status: 'sent', sent_at: new Date().toISOString(), sent_by: sentBy }).eq('id', id);
      if (error) throw error;
      await supabase.from('agreement_audit_log').insert({ agreement_id: id, action: 'sent', performed_by: sentBy });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['agreements'] }); qc.invalidateQueries({ queryKey: ['agreement'] }); toast.success('Agreement sent'); },
    onError: (e: any) => toast.error(e.message),
  });
}
