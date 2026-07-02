import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

const t = (name: string) => (supabase as any).from(name);

export interface TenantMaintenanceRequest {
  id: string;
  tenant_id: string;
  property_id: string;
  unit_id: string | null;
  lease_id: string | null;
  title: string;
  description: string | null;
  category: string;
  priority: 'low' | 'normal' | 'urgent';
  status: 'new' | 'reviewed' | 'in_progress' | 'completed' | 'cancelled';
  contact_notes: string | null;
  permission_to_enter: boolean;
  preferred_contact_time: string | null;
  internal_notes: string | null;
  tenant_facing_update: string | null;
  submitted_by_user_id: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Fetch the tenant record for the currently signed-in user (via pm_tenants.user_id). */
export function useMyTenantRecord() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my_pm_tenant', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await t('pm_tenants').select('*').eq('user_id', user.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 60_000,
  });
}

/** Fetch active lease + linked property + unit for the current tenant. */
export function useMyTenantContext() {
  const { data: tenant } = useMyTenantRecord();
  return useQuery({
    queryKey: ['my_pm_tenant_ctx', tenant?.id],
    queryFn: async () => {
      if (!tenant) return null;
      const { data: leases } = await t('pm_leases')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('start_date', { ascending: false });
      const activeLease = (leases ?? []).find((l: any) => l.status === 'active') ?? (leases ?? [])[0] ?? null;
      let property: any = null, unit: any = null;
      if (activeLease) {
        const [{ data: p }, { data: u }] = await Promise.all([
          t('pm_managed_properties').select('*').eq('id', activeLease.property_id).maybeSingle(),
          activeLease.unit_id
            ? t('pm_units').select('*').eq('id', activeLease.unit_id).maybeSingle()
            : Promise.resolve({ data: null }),
        ]);
        property = p; unit = u;
      }
      return { tenant, leases: leases ?? [], activeLease, property, unit };
    },
    enabled: !!tenant,
  });
}

export function useMyMaintenanceRequests() {
  const { data: tenant } = useMyTenantRecord();
  return useQuery<TenantMaintenanceRequest[]>({
    queryKey: ['my_maintenance_requests', tenant?.id],
    queryFn: async () => {
      if (!tenant) return [];
      const { data, error } = await t('pm_maintenance_requests')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!tenant,
  });
}

export function useMyMaintenanceRequest(id?: string) {
  return useQuery({
    queryKey: ['my_maintenance_request', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await t('pm_maintenance_requests').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      const { data: atts } = await t('pm_maintenance_request_attachments')
        .select('*')
        .eq('request_id', id)
        .order('created_at', { ascending: false });
      return { ...(data ?? {}), attachments: atts ?? [] };
    },
    enabled: !!id,
  });
}

export function useCreateMaintenanceRequest() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (payload: {
      tenant_id: string;
      property_id: string;
      unit_id?: string | null;
      lease_id?: string | null;
      title: string;
      description?: string;
      category: string;
      priority: 'low' | 'normal' | 'urgent';
      contact_notes?: string;
      permission_to_enter?: boolean;
      preferred_contact_time?: string;
      files?: File[];
    }) => {
      const { files, ...row } = payload;
      const { data, error } = await t('pm_maintenance_requests')
        .insert({ ...row, submitted_by_user_id: user?.id ?? null })
        .select()
        .single();
      if (error) throw error;

      if (files && files.length > 0) {
        for (const file of files) {
          const path = `${payload.tenant_id}/${data.id}/${Date.now()}-${file.name}`;
          const { error: upErr } = await supabase.storage
            .from('pm-maintenance-attachments')
            .upload(path, file, { upsert: false, contentType: file.type });
          if (!upErr) {
            await t('pm_maintenance_request_attachments').insert({
              request_id: data.id,
              storage_path: path,
              file_name: file.name,
              content_type: file.type,
              uploaded_by_user_id: user?.id ?? null,
            });
          }
        }
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my_maintenance_requests'] });
      qc.invalidateQueries({ queryKey: ['pm_maintenance_requests_admin'] });
    },
  });
}

// ─── Admin views ──────────────────────────────────────────────────────────
export function usePmAdminMaintenanceRequests() {
  return useQuery<TenantMaintenanceRequest[]>({
    queryKey: ['pm_maintenance_requests_admin'],
    queryFn: async () => {
      const { data, error } = await t('pm_maintenance_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function usePmAdminMaintenanceRequest(id?: string) {
  return useQuery({
    queryKey: ['pm_maintenance_request_admin', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await t('pm_maintenance_requests').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      const { data: atts } = await t('pm_maintenance_request_attachments')
        .select('*')
        .eq('request_id', id)
        .order('created_at', { ascending: false });
      return { ...(data ?? {}), attachments: atts ?? [] };
    },
    enabled: !!id,
  });
}

export function useUpdateMaintenanceRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; [k: string]: any }) => {
      const { id, ...rest } = payload;
      const { data, error } = await t('pm_maintenance_requests').update(rest).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['pm_maintenance_request_admin', vars.id] });
      qc.invalidateQueries({ queryKey: ['pm_maintenance_requests_admin'] });
      qc.invalidateQueries({ queryKey: ['my_maintenance_requests'] });
    },
  });
}

/** Signed URL for an attachment path (bucket = pm-maintenance-attachments). */
export async function signMaintenanceAttachment(path: string) {
  const { data, error } = await supabase.storage
    .from('pm-maintenance-attachments')
    .createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}
