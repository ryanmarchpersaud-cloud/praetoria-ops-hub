import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Phase 2.6 — Tenant profile records (emergency contacts, insurance,
 * occupants, vehicles, pets) and inspections. Read paths are RLS-scoped so
 * tenants get their own rows and admins/ops staff see everything.
 *
 * `tenantId` overload: when omitted, the current user's tenant record is
 * inferred via user_id. When provided (admin flows), the id is used directly.
 */

async function resolveTenantId(tenantId?: string | null): Promise<string | null> {
  if (tenantId) return tenantId;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await (supabase as any)
    .from('pm_tenants').select('id').eq('user_id', user.id).maybeSingle();
  return data?.id ?? null;
}

const listHook = (table: string, key: string) => (tenantId?: string | null) => {
  const { user } = useAuth();
  return useQuery({
    enabled: !!(tenantId ?? user?.id),
    queryKey: ['tenant-profile', key, tenantId ?? user?.id],
    queryFn: async () => {
      const tid = await resolveTenantId(tenantId);
      if (!tid) return [];
      const { data, error } = await (supabase as any)
        .from(table).select('*').eq('tenant_id', tid).order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
};

export const useEmergencyContacts = listHook('pm_tenant_emergency_contacts', 'emergency');
export const useOccupants = listHook('pm_tenant_occupants', 'occupants');
export const useVehicles = listHook('pm_tenant_vehicles', 'vehicles');
export const usePets = listHook('pm_tenant_pets', 'pets');

export function useInsurance(tenantId?: string | null) {
  const { user } = useAuth();
  return useQuery({
    enabled: !!(tenantId ?? user?.id),
    queryKey: ['tenant-profile', 'insurance', tenantId ?? user?.id],
    queryFn: async () => {
      const tid = await resolveTenantId(tenantId);
      if (!tid) return null;
      const { data, error } = await (supabase as any)
        .from('pm_tenant_insurance').select('*').eq('tenant_id', tid).maybeSingle();
      if (error) throw error;
      return data ?? { tenant_id: tid, status: 'not_provided', admin_verified: false };
    },
  });
}

export function useInspections(tenantId?: string | null) {
  const { user } = useAuth();
  return useQuery({
    enabled: !!(tenantId ?? user?.id),
    queryKey: ['tenant-profile', 'inspections', tenantId ?? user?.id],
    queryFn: async () => {
      const tid = await resolveTenantId(tenantId);
      if (!tid) return [];
      const { data, error } = await (supabase as any)
        .from('pm_tenant_inspections').select('*')
        .eq('tenant_id', tid).order('inspection_date', { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ---- Generic admin CRUD ----
export function useSaveRow(table: string, invalidateKey: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: any) => {
      if (id) {
        const { error } = await (supabase as any).from(table).update(patch).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from(table).insert(patch);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tenant-profile', invalidateKey] }),
  });
}

export function useDeleteRow(table: string, invalidateKey: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from(table).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tenant-profile', invalidateKey] }),
  });
}

// ---- Tenant self-service: upload insurance proof + set provider/policy ----
export function useUploadOwnInsurance() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      provider?: string;
      policy_number?: string;
      coverage_start?: string | null;
      coverage_expiry?: string | null;
      file?: File | null;
    }) => {
      if (!user) throw new Error('Not signed in');
      const tid = await resolveTenantId(null);
      if (!tid) throw new Error('No tenant record');
      let storage_path: string | null = null;
      if (input.file) {
        const path = `tenant-insurance/${tid}/${Date.now()}-${input.file.name}`;
        const { error: upErr } = await supabase.storage
          .from('property-management-documents').upload(path, input.file, { upsert: false });
        if (upErr) throw upErr;
        storage_path = path;
      }
      const payload: any = {
        tenant_id: tid,
        provider: input.provider ?? null,
        policy_number: input.policy_number ?? null,
        coverage_start: input.coverage_start ?? null,
        coverage_expiry: input.coverage_expiry ?? null,
        status: input.file ? 'provided' : undefined,
      };
      if (storage_path) payload.storage_path = storage_path;

      const { data: existing } = await (supabase as any)
        .from('pm_tenant_insurance').select('id').eq('tenant_id', tid).maybeSingle();
      if (existing?.id) {
        const { error } = await (supabase as any)
          .from('pm_tenant_insurance').update(payload).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('pm_tenant_insurance').insert({ ...payload, status: payload.status ?? 'requested' });
        if (error) throw error;
      }

      // Notify Praetoria ops that a tenant submitted / updated insurance info.
      try {
        const summary = [
          'Tenant submitted / updated renters insurance information for admin review.',
          '',
          input.provider ? `Provider: ${input.provider}` : null,
          input.policy_number ? `Policy #: ${input.policy_number}` : null,
          input.coverage_expiry ? `Expires: ${input.coverage_expiry}` : null,
          input.file ? `Proof uploaded: ${input.file.name}` : 'No proof file attached',
          '',
          `Open in Praetoria Ops Hub: https://praetoriagroup.ca/property-management/tenants/${tid}`,
        ].filter(Boolean).join('\n');

        await supabase.functions.invoke('send-notification', {
          body: {
            event: 'new_tenant_insurance_submission',
            audience: 'admin',
            channels: ['email', 'in_app'],
            record_type: 'pm_tenant_insurance',
            record_id: tid,
            variables: {
              subject: `Tenant insurance submitted — ${input.provider || 'Provider not specified'}`,
              body: summary,
              reply_to: 'ops@praetoriagroup.ca',
            },
          },
        });
      } catch (err) {
        console.warn('[tenant-insurance] notification dispatch failed', err);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tenant-profile', 'insurance'] }),
  });
}

export async function signInsuranceProof(path: string) {
  const { data, error } = await supabase.storage
    .from('property-management-documents').createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}
