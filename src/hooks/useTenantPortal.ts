import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useMyTenantRecord() {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user?.id,
    queryKey: ['tenant-portal', 'me', user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('pm_tenants')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useMyTenantContext() {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user?.id,
    queryKey: ['tenant-portal', 'context', user?.id],
    queryFn: async () => {
      const { data: tenant, error: tErr } = await (supabase as any)
        .from('pm_tenants')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (tErr) throw tErr;
      if (!tenant) return { tenant: null, leases: [], activeLease: null, property: null, unit: null };

      const { data: leases, error: lErr } = await (supabase as any)
        .from('pm_leases')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('start_date', { ascending: false });
      if (lErr) throw lErr;

      const activeLease = (leases ?? []).find((l: any) => l.status === 'active') ?? (leases ?? [])[0] ?? null;

      let property = null, unit = null;
      if (activeLease?.property_id) {
        const { data: p } = await (supabase as any)
          .from('pm_managed_properties').select('*').eq('id', activeLease.property_id).maybeSingle();
        property = p;
      }
      if (activeLease?.unit_id) {
        const { data: u } = await (supabase as any)
          .from('pm_units').select('*').eq('id', activeLease.unit_id).maybeSingle();
        unit = u;
      }
      return { tenant, leases: leases ?? [], activeLease, property, unit };
    },
  });
}

export function useMyMaintenanceRequests() {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user?.id,
    queryKey: ['tenant-portal', 'requests', user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('pm_maintenance_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMyMaintenanceRequest(id?: string) {
  return useQuery({
    enabled: !!id,
    queryKey: ['tenant-portal', 'request', id],
    queryFn: async () => {
      const { data: req, error } = await (supabase as any)
        .from('pm_maintenance_requests').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      const { data: atts } = await (supabase as any)
        .from('pm_maintenance_request_attachments').select('*').eq('request_id', id);
      return { ...(req ?? {}), attachments: atts ?? [] };
    },
  });
}

export async function signMaintenanceAttachment(path: string) {
  const { data, error } = await supabase.storage
    .from('pm-maintenance-attachments')
    .createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}

interface CreateReqInput {
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
  // Structured catalog fields (all optional)
  issue_label?: string | null;
  issue_key?: string | null;
  is_urgent_safety?: boolean;
  priority_suggested_by_catalog?: 'low' | 'normal' | 'urgent' | null;
}

export function useCreateMaintenanceRequest() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: CreateReqInput) => {
      const { files, ...payload } = input;
      const { data: req, error } = await (supabase as any)
        .from('pm_maintenance_requests')
        .insert({ ...payload, submitted_by_user_id: user!.id, status: 'new' })
        .select().single();
      if (error) throw error;

      if (files && files.length > 0) {
        for (const file of files) {
          const path = `${user!.id}/${req.id}/${Date.now()}-${file.name}`;
          const { error: upErr } = await supabase.storage
            .from('pm-maintenance-attachments')
            .upload(path, file, { upsert: false });
          if (upErr) throw upErr;
          await (supabase as any).from('pm_maintenance_request_attachments').insert({
            request_id: req.id,
            storage_path: path,
            file_name: file.name,
            content_type: file.type,
            uploaded_by_user_id: user!.id,
          });
        }
      }
      return req;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenant-portal', 'requests'] });
    },
  });
}

// Admin-facing hooks
export function useAdminMaintenanceRequests() {
  return useQuery({
    queryKey: ['pm', 'maintenance-requests'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('pm_maintenance_requests')
        .select(`*, tenant:pm_tenants(id, first_name, last_name, phone),
                  property:pm_managed_properties(id, property_name),
                  unit:pm_units(id, unit_label)`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAdminMaintenanceRequest(id?: string) {
  return useQuery({
    enabled: !!id,
    queryKey: ['pm', 'maintenance-request', id],
    queryFn: async () => {
      const { data: req } = await (supabase as any)
        .from('pm_maintenance_requests')
        .select(`*, tenant:pm_tenants(id, first_name, last_name, phone, email),
                  property:pm_managed_properties(id, property_name, address_line_1, city),
                  unit:pm_units(id, unit_label)`)
        .eq('id', id).maybeSingle();
      const { data: atts } = await (supabase as any)
        .from('pm_maintenance_request_attachments').select('*').eq('request_id', id);
      return { ...(req ?? {}), attachments: atts ?? [] };
    },
  });
}

export function useUpdateMaintenanceRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: any }) => {
      const { error } = await (supabase as any)
        .from('pm_maintenance_requests').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['pm', 'maintenance-requests'] });
      qc.invalidateQueries({ queryKey: ['pm', 'maintenance-request', v.id] });
    },
  });
}

export function useInviteTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ tenantId, email }: { tenantId: string; email: string }) => {
      const { data, error } = await supabase.functions.invoke('send-tenant-invite', {
        body: { tenant_id: tenantId, email },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pm', 'tenants'] }),
  });
}
