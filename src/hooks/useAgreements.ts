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
      const { data, error } = await supabase.rpc('get_agreement_by_token', { _token: token! });
      if (error) throw error;
      return (data as any) || null;
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

export function useCountersignAgreement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { agreementId: string; signerName: string; signerTitle: string; signatureData: string }) => {
      const { error } = await supabase.rpc('countersign_agreement' as never, {
        _agreement_id: p.agreementId,
        _signer_name: p.signerName,
        _signer_title: p.signerTitle,
        _signature_data: p.signatureData,
        _signature_type: 'electronic',
        _user_agent: navigator.userAgent,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agreements'] });
      qc.invalidateQueries({ queryKey: ['agreement'] });
      qc.invalidateQueries({ queryKey: ['agreement_signatures'] });
      qc.invalidateQueries({ queryKey: ['agreement_audit_log'] });
      toast.success('Agreement fully executed');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useVoidAgreement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await supabase.rpc('void_agreement' as never, { _agreement_id: id, _reason: reason } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agreements'] });
      qc.invalidateQueries({ queryKey: ['agreement'] });
      toast.success('Agreement voided');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

/** Duplicate / amend / renew — always preserves the original agreement. */
export function useCloneAgreement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, mode, userId }: { id: string; mode: 'duplicate' | 'amendment' | 'renewal'; userId?: string }) => {
      const { data: src, error: srcErr } = await supabase.from('agreements').select('*').eq('id', id).single();
      if (srcErr) throw srcErr;

      const prefix = mode === 'amendment' ? 'Amendment — ' : mode === 'renewal' ? 'Renewal — ' : 'Copy of ';
      const payload: any = {
        title: `${prefix}${src.title}`,
        body_html: src.body_html,
        category: src.category,
        document_type: (src as any).document_type,
        field_schema: (src as any).field_schema,
        field_values: mode === 'duplicate' ? {} : (src as any).field_values,
        merge_data: src.merge_data,
        recipient_type: src.recipient_type,
        recipient_name: src.recipient_name,
        recipient_email: src.recipient_email,
        recipient_user_id: src.recipient_user_id,
        customer_id: src.customer_id,
        property_id: src.property_id,
        quote_id: src.quote_id,
        job_id: src.job_id,
        template_id: src.template_id,
        status: 'draft',
        version: mode === 'duplicate' ? 1 : (src.version || 1) + 1,
        parent_agreement_id: mode === 'duplicate' ? null : src.id,
        relationship_type: mode === 'duplicate' ? null : mode,
        created_by: userId ?? null,
      };

      const { data: created, error } = await supabase.from('agreements').insert(payload).select().single();
      if (error) throw error;

      await supabase.from('agreement_audit_log').insert({
        agreement_id: created.id,
        action: mode === 'duplicate' ? 'created' : `${mode}_created`,
        performed_by: userId ?? null,
        metadata: { source_agreement: (src as any).agreement_number },
      });

      if (mode === 'amendment' && src.status === 'fully_executed') {
        await supabase.from('agreements').update({ status: 'superseded', superseded_by: created.id }).eq('id', src.id);
        await supabase.from('agreement_audit_log').insert({
          agreement_id: src.id, action: 'superseded', performed_by: userId ?? null,
          metadata: { superseded_by: (created as any).agreement_number },
        });
      }

      return created;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['agreements'] }); toast.success('Created'); },
    onError: (e: any) => toast.error(e.message),
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
        const appBaseUrl = publicAppUrl();
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
