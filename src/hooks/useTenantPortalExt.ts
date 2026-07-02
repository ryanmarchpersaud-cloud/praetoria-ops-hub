import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/** Tenant-facing ledger: read-only (RLS enforces tenant scope). */
export function useMyLedger() {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user?.id,
    queryKey: ['tenant-portal', 'ledger', user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('pm_tenant_ledger')
        .select('*')
        .order('entry_date', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMyBalance() {
  const { data = [] } = useMyLedger();
  const balance = (data as any[]).reduce((sum, r) => {
    const amt = Number(r.amount) || 0;
    // charges/late_fees add to balance owing; payments/credits/refunds reduce it
    if (['charge', 'late_fee'].includes(r.type)) return sum + amt;
    if (['payment', 'credit', 'refund'].includes(r.type)) return sum - amt;
    return sum;
  }, 0);
  return { balance, entries: data as any[] };
}

/** Tenant notices: RLS lets tenant see own + property-broadcast notices. */
export function useMyNotices() {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user?.id,
    queryKey: ['tenant-portal', 'notices', user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('pm_tenant_notices')
        .select('*')
        .order('published_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAckNotice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('pm_tenant_notices')
        .update({ ack_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tenant-portal', 'notices'] }),
  });
}

/** Tenant-visible documents (admin-shared). */
export function useMyTenantDocuments() {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user?.id,
    queryKey: ['tenant-portal', 'documents', user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('pm_tenant_documents')
        .select('*')
        .order('shared_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export async function signTenantDocument(path: string) {
  const { data, error } = await supabase.storage
    .from('property-management-documents')
    .createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}

// ---- Admin-side helpers (used by PMTenantDetail) ----

async function notifyTenantByTenantId(
  tenant_id: string | null | undefined,
  event: string,
  subject: string,
  body: string,
  record_type: string,
) {
  if (!tenant_id) return;
  try {
    const { data: t } = await (supabase as any)
      .from('pm_tenants')
      .select('user_id')
      .eq('id', tenant_id)
      .maybeSingle();
    const uid = t?.user_id;
    if (!uid) return;
    await (supabase as any).from('notifications').insert({
      event,
      channel: 'in_app',
      audience: 'tenant',
      recipient_id: uid,
      record_type,
      subject,
      body,
      status: 'sent',
      sent_at: new Date().toISOString(),
    });
  } catch (e) {
    console.warn('[pm-admin] tenant notify failed', e);
  }
}

export function useAdminCreateTenantNotice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      tenant_id?: string | null;
      property_id?: string | null;
      title: string;
      body?: string;
      category?: 'announcement' | 'notice' | 'document' | 'maintenance_update';
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase as any).from('pm_tenant_notices').insert({
        ...input,
        category: input.category ?? 'announcement',
        created_by: user?.id ?? null,
      });
      if (error) throw error;
      await notifyTenantByTenantId(
        input.tenant_id ?? null,
        'pm_new_notice',
        `New notice: ${input.title}`,
        input.body?.slice(0, 200) ?? 'Open the Notices tab to view.',
        'pm_tenant_notice',
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tenant-portal', 'notices'] }),
  });
}

export function useAdminCreateLedgerEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      tenant_id: string;
      lease_id?: string | null;
      entry_date?: string;
      type: 'charge' | 'payment' | 'credit' | 'refund' | 'late_fee' | 'deposit';
      amount: number;
      description?: string;
      reference?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase as any).from('pm_tenant_ledger').insert({
        ...input,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
      await notifyTenantByTenantId(
        input.tenant_id,
        'pm_ledger_updated',
        `Account activity: ${input.type}`,
        `${input.description ?? input.type} — $${Number(input.amount).toFixed(2)}`,
        'pm_tenant_ledger',
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tenant-portal', 'ledger'] }),
  });
}

export function useAdminShareTenantDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      tenant_id?: string | null;
      property_id?: string | null;
      title: string;
      file: File;
      category?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const path = `tenant-shared/${input.tenant_id ?? 'broadcast'}/${Date.now()}-${input.file.name}`;
      const { error: upErr } = await supabase.storage
        .from('property-management-documents')
        .upload(path, input.file, { upsert: false });
      if (upErr) throw upErr;
      const { error } = await (supabase as any).from('pm_tenant_documents').insert({
        tenant_id: input.tenant_id ?? null,
        property_id: input.property_id ?? null,
        title: input.title,
        storage_path: path,
        category: input.category ?? 'general',
        shared_by: user?.id ?? null,
      });
      if (error) throw error;
      await notifyTenantByTenantId(
        input.tenant_id ?? null,
        'pm_new_document',
        `New document shared: ${input.title}`,
        'Open the Documents tab to view or download.',
        'pm_tenant_document',
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tenant-portal', 'documents'] }),
  });
}
