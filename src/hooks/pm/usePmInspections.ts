import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type PmInspectionType = Database['public']['Enums']['pm_inspection_type'];
export type PmInspectionStatus = Database['public']['Enums']['pm_inspection_status'];
export type PmInspectionCondition = Database['public']['Enums']['pm_inspection_condition'];
export type PmInspectionVisibility = Database['public']['Enums']['pm_inspection_visibility'];

export const INSPECTION_BUCKET = 'pm-inspection-photos';

export const INSPECTION_TYPES: PmInspectionType[] = [
  'move_in','move_out','routine','maintenance','safety','exterior','interior','seasonal','complaint_followup','other',
];
export const INSPECTION_STATUSES: PmInspectionStatus[] = [
  'draft','scheduled','in_progress','completed','reviewed','archived','cancelled',
];
export const INSPECTION_CONDITIONS: PmInspectionCondition[] = [
  'excellent','good','fair','poor','damaged','needs_cleaning','not_applicable',
];
export const INSPECTION_AREAS = [
  'Exterior','Entry','Living room','Kitchen','Bedroom','Bathroom','Basement',
  'Garage','Laundry','Mechanical room','Yard','Deck / balcony','Common area','Other',
];

export interface InspectionFilters {
  property_id?: string;
  unit_id?: string;
  tenant_id?: string;
  owner_id?: string;
  lease_id?: string;
  maintenance_request_id?: string;
  work_order_id?: string;
  inspection_type?: PmInspectionType;
  status?: PmInspectionStatus;
  assigned_to?: string;
  from?: string;
  to?: string;
  search?: string;
  onlyAssignedToMe?: boolean;
}

export function usePmInspections(filters?: InspectionFilters) {
  return useQuery({
    queryKey: ['pm_inspections', filters ?? {}],
    queryFn: async () => {
      let q = supabase.from('pm_inspections').select('*').order('created_at', { ascending: false });
      if (filters?.onlyAssignedToMe) {
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) return [];
        q = q.eq('assigned_to', user.user.id);
      } else if (filters?.assigned_to) q = q.eq('assigned_to', filters.assigned_to);
      if (filters?.property_id) q = q.eq('property_id', filters.property_id);
      if (filters?.unit_id) q = q.eq('unit_id', filters.unit_id);
      if (filters?.tenant_id) q = q.eq('tenant_id', filters.tenant_id);
      if (filters?.owner_id) q = q.eq('owner_id', filters.owner_id);
      if (filters?.lease_id) q = q.eq('lease_id', filters.lease_id);
      if (filters?.maintenance_request_id) q = q.eq('maintenance_request_id', filters.maintenance_request_id);
      if (filters?.work_order_id) q = q.eq('work_order_id', filters.work_order_id);
      if (filters?.inspection_type) q = q.eq('inspection_type', filters.inspection_type);
      if (filters?.status) q = q.eq('status', filters.status);
      if (filters?.from) q = q.gte('inspected_at', filters.from);
      if (filters?.to) q = q.lte('inspected_at', filters.to);
      if (filters?.search) q = q.ilike('title', `%${filters.search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function usePmInspection(id?: string) {
  return useQuery({
    enabled: !!id,
    queryKey: ['pm_inspection', id],
    queryFn: async () => {
      const [{ data: insp, error: ie }, items, photos, activity] = await Promise.all([
        supabase.from('pm_inspections').select('*').eq('id', id!).maybeSingle(),
        supabase.from('pm_inspection_items').select('*').eq('inspection_id', id!).order('sort_order'),
        supabase.from('pm_inspection_photos').select('*').eq('inspection_id', id!).order('created_at'),
        supabase.from('pm_inspection_activity').select('*').eq('inspection_id', id!).order('created_at', { ascending: false }),
      ]);
      if (ie) throw ie;
      return {
        inspection: insp,
        items: items.data ?? [],
        photos: photos.data ?? [],
        activity: activity.data ?? [],
      };
    },
  });
}

async function logActivity(
  inspection_id: string,
  action: string,
  detail?: Record<string, unknown> | null,
  visibility: PmInspectionVisibility = 'internal_only',
) {
  const { data: u } = await supabase.auth.getUser();
  await supabase.from('pm_inspection_activity').insert({
    inspection_id,
    actor_id: u.user?.id,
    action,
    detail: detail ?? null,
    visibility,
  });
}

export function useCreatePmInspection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Database['public']['Tables']['pm_inspections']['Insert']> & { title: string }) => {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('pm_inspections')
        .insert({ ...input, created_by: u.user?.id })
        .select('*')
        .single();
      if (error) throw error;
      await logActivity(data.id, 'inspection_created', { title: data.title });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pm_inspections'] }),
  });
}

export function useUpdatePmInspection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch, activity }: {
      id: string;
      patch: Partial<Database['public']['Tables']['pm_inspections']['Update']>;
      activity?: { action: string; visibility?: PmInspectionVisibility; detail?: Record<string, unknown> };
    }) => {
      const { error } = await supabase.from('pm_inspections').update(patch).eq('id', id);
      if (error) throw error;
      if (activity) await logActivity(id, activity.action, activity.detail, activity.visibility);
    },
    onSuccess: (_r, v) => {
      qc.invalidateQueries({ queryKey: ['pm_inspections'] });
      qc.invalidateQueries({ queryKey: ['pm_inspection', v.id] });
    },
  });
}

export function useUpsertInspectionItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Partial<Database['public']['Tables']['pm_inspection_items']['Insert']> & { inspection_id: string; area: string; id?: string }) => {
      if (row.id) {
        const { error } = await supabase.from('pm_inspection_items').update(row).eq('id', row.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('pm_inspection_items').insert(row);
        if (error) throw error;
        await logActivity(row.inspection_id, 'checklist_updated', { area: row.area });
      }
    },
    onSuccess: (_r, v) => qc.invalidateQueries({ queryKey: ['pm_inspection', v.inspection_id] }),
  });
}

export function useDeleteInspectionItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, inspection_id }: { id: string; inspection_id: string }) => {
      const { error } = await supabase.from('pm_inspection_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_r, v) => qc.invalidateQueries({ queryKey: ['pm_inspection', v.inspection_id] }),
  });
}

export function useUploadInspectionPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ inspection_id, item_id, file, caption, tenant_visible, owner_visible }: {
      inspection_id: string; item_id?: string | null; file: File; caption?: string;
      tenant_visible?: boolean; owner_visible?: boolean;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) throw new Error('Not authenticated');
      const ext = file.name.includes('.') ? file.name.split('.').pop() : 'jpg';
      const path = `${inspection_id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const up = await supabase.storage.from(INSPECTION_BUCKET).upload(path, file, {
        contentType: file.type || 'image/jpeg',
      });
      if (up.error) throw up.error;
      const { error } = await supabase.from('pm_inspection_photos').insert({
        inspection_id, item_id: item_id ?? null,
        uploaded_by: uid,
        file_path: path, file_name: file.name, file_size: file.size, mime_type: file.type,
        caption: caption ?? null,
        tenant_visible: !!tenant_visible, owner_visible: !!owner_visible,
      });
      if (error) {
        await supabase.storage.from(INSPECTION_BUCKET).remove([path]).catch(() => {});
        throw error;
      }
      await logActivity(inspection_id, 'photo_uploaded', { file_name: file.name });
    },
    onSuccess: (_r, v) => qc.invalidateQueries({ queryKey: ['pm_inspection', v.inspection_id] }),
  });
}

export function useUpdateInspectionPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch, inspection_id }: {
      id: string; inspection_id: string;
      patch: Partial<Database['public']['Tables']['pm_inspection_photos']['Update']>;
    }) => {
      const { error } = await supabase.from('pm_inspection_photos').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_r, v) => qc.invalidateQueries({ queryKey: ['pm_inspection', v.inspection_id] }),
  });
}

export function useDeleteInspectionPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, file_path, inspection_id }: { id: string; file_path: string; inspection_id: string }) => {
      await supabase.storage.from(INSPECTION_BUCKET).remove([file_path]).catch(() => {});
      const { error } = await supabase.from('pm_inspection_photos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_r, v) => qc.invalidateQueries({ queryKey: ['pm_inspection', v.inspection_id] }),
  });
}

export async function signInspectionPhoto(path: string, ttl = 3600): Promise<string> {
  const { data, error } = await supabase.storage.from(INSPECTION_BUCKET).createSignedUrl(path, ttl);
  if (error || !data) throw error ?? new Error('Sign failed');
  return data.signedUrl;
}
