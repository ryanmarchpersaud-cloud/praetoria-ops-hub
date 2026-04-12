import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const AGREEMENT_PORTAL_PATHS: Record<string, string> = {
  customer: '/portal/agreements',
  subcontractor: '/subcontractor/agreements',
  worker: '/worker/agreements',
  employee: '/worker/agreements',
};

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
    mutationFn: async ({ id, sentBy, isReminder = false }: { id: string; sentBy: string; isReminder?: boolean }) => {
      const { data: agreement, error: agreementError } = await supabase
        .from('agreements')
        .select('*')
        .eq('id', id)
        .single();

      if (agreementError) throw agreementError;

      if (agreement.recipient_email) {
        const appBaseUrl = window.location.origin;
        const signingUrl = `${appBaseUrl}/sign/${agreement.signing_token}`;
        const portalPath = AGREEMENT_PORTAL_PATHS[agreement.recipient_type] || '';
        const portalUrl = agreement.recipient_user_id && portalPath ? `${appBaseUrl}${portalPath}` : null;

        const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-email', {
          body: {
            action: 'agreement_sent',
            to: agreement.recipient_email,
            recipient_name: agreement.recipient_name,
            agreement_title: agreement.title,
            agreement_id: agreement.id,
            agreement_category: agreement.category,
            internal_reference: agreement.internal_reference,
            signing_url: signingUrl,
            portal_url: portalUrl,
            attachment_present: Boolean(agreement.attachment_url),
            is_reminder: isReminder,
          },
        });

        if (emailError) throw emailError;
        if (emailResult && typeof emailResult === 'object' && 'ok' in emailResult && emailResult.ok === false) {
          throw new Error((emailResult as { error?: string }).error || 'Failed to send agreement email');
        }
      }

      const { error } = await supabase
        .from('agreements')
        .update({ status: 'sent', sent_at: new Date().toISOString(), sent_by: sentBy })
        .eq('id', id);

      if (error) throw error;

      await supabase.from('agreement_audit_log').insert({
        agreement_id: id,
        action: isReminder ? 'resent' : 'sent',
        performed_by: sentBy,
        metadata: {
          delivery_method: agreement.recipient_email ? 'email_link' : 'portal',
          attachment_present: Boolean(agreement.attachment_url),
        },
      });
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['agreements'] });
      qc.invalidateQueries({ queryKey: ['agreement'] });
      toast.success(variables.isReminder ? 'Reminder sent' : 'Agreement sent');
    },
    onError: (e: any) => toast.error(e.message),
  });
}
