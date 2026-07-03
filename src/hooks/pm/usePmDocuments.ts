import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type PmDocumentVisibility =
  | 'internal_only'
  | 'tenant_visible'
  | 'owner_visible'
  | 'tenant_and_owner_visible';

export type PmDocumentStatus = 'active' | 'archived' | 'expired' | 'deleted';

export interface PmDocumentInsert {
  title: string;
  description?: string | null;
  document_type?: string | null;
  category?: string | null;
  property_id?: string | null;
  unit_id?: string | null;
  owner_id?: string | null;
  tenant_id?: string | null;
  lease_id?: string | null;
  maintenance_request_id?: string | null;
  work_order_id?: string | null;
  expense_id?: string | null;
  owner_statement_id?: string | null;
  owner_approval_id?: string | null;
  owner_thread_id?: string | null;
  tenant_thread_id?: string | null;
  lease_renewal_id?: string | null;
  move_in_id?: string | null;
  move_out_id?: string | null;
  inspection_id?: string | null;
  notice_id?: string | null;
  file_path: string;
  file_name: string;
  file_size?: number | null;
  mime_type?: string | null;
  visibility: PmDocumentVisibility;
  expires_at?: string | null;
}

export const PM_DOC_BUCKET = 'pm-documents';

export const PM_DOC_TYPES = [
  'lease','lease_renewal','move_in','move_out','inspection','owner_statement',
  'owner_approval','notice','tenant_document','owner_document','maintenance',
  'work_order','expense_receipt','property_photo','insurance','utility',
  'keys_access','compliance','general',
] as const;

export const PM_DOC_VISIBILITIES: { value: PmDocumentVisibility; label: string }[] = [
  { value: 'internal_only', label: 'Internal only (Ops staff)' },
  { value: 'tenant_visible', label: 'Tenant visible' },
  { value: 'owner_visible', label: 'Owner visible' },
  { value: 'tenant_and_owner_visible', label: 'Tenant and owner visible' },
];

export function usePmDocuments(filters?: {
  property_id?: string;
  unit_id?: string;
  owner_id?: string;
  tenant_id?: string;
  lease_id?: string;
  maintenance_request_id?: string;
  work_order_id?: string;
  visibility?: PmDocumentVisibility;
  category?: string;
  document_type?: string;
  status?: PmDocumentStatus;
  search?: string;
}) {
  return useQuery({
    queryKey: ['pm_documents', filters ?? {}],
    queryFn: async () => {
      let q = supabase.from('pm_documents').select('*').order('created_at', { ascending: false });
      if (filters?.property_id) q = q.eq('property_id', filters.property_id);
      if (filters?.unit_id) q = q.eq('unit_id', filters.unit_id);
      if (filters?.owner_id) q = q.eq('owner_id', filters.owner_id);
      if (filters?.tenant_id) q = q.eq('tenant_id', filters.tenant_id);
      if (filters?.lease_id) q = q.eq('lease_id', filters.lease_id);
      if (filters?.maintenance_request_id) q = q.eq('maintenance_request_id', filters.maintenance_request_id);
      if (filters?.work_order_id) q = q.eq('work_order_id', filters.work_order_id);
      if (filters?.visibility) q = q.eq('visibility', filters.visibility);
      if (filters?.category) q = q.eq('category', filters.category);
      if (filters?.document_type) q = q.eq('document_type', filters.document_type);
      q = q.eq('status', filters?.status ?? 'active');
      if (filters?.search) {
        const s = `%${filters.search}%`;
        q = q.or(`title.ilike.${s},file_name.ilike.${s},description.ilike.${s}`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export async function signPmDocument(path: string, ttl = 3600): Promise<string> {
  const { data, error } = await supabase.storage.from(PM_DOC_BUCKET).createSignedUrl(path, ttl);
  if (error || !data) throw error ?? new Error('Could not sign document');
  return data.signedUrl;
}

export function useUploadPmDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, meta }: { file: File; meta: Omit<PmDocumentInsert, 'file_path' | 'file_name' | 'file_size' | 'mime_type'> }) => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) throw new Error('Not authenticated');
      const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
      const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const up = await supabase.storage.from(PM_DOC_BUCKET).upload(path, file, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });
      if (up.error) throw up.error;
      const insert: PmDocumentInsert = {
        ...meta,
        file_path: path,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type || null,
      };
      const { data, error } = await supabase
        .from('pm_documents')
        .insert({ ...insert, uploaded_by: uid })
        .select('*')
        .single();
      if (error) {
        await supabase.storage.from(PM_DOC_BUCKET).remove([path]).catch(() => {});
        throw error;
      }
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pm_documents'] }),
  });
}

export function useArchivePmDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('pm_documents').update({ status: 'archived' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pm_documents'] }),
  });
}
