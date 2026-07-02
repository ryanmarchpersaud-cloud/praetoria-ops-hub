import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useOwnerScope, scopeBlocksAll } from './useOwnerScope';

/**
 * Property Owner Portal — data hooks.
 * All queries rely on RLS: the property_owner role only sees rows
 * scoped to the properties they are linked to via pm_owner_properties.
 * Ops staff access is unchanged.
 */

export function useOwnerRecord() {
  const { user } = useAuth();
  const scope = useOwnerScope();
  return useQuery({
    queryKey: ['owner-portal', 'owner-record', scope.isPreview ? `preview:${scope.ownerId}` : user?.id],
    queryFn: async () => {
      if (scope.isPreview) {
        if (!scope.ownerId) return null;
        const { data, error } = await supabase
          .from('pm_property_owners')
          .select('id, owner_name, company_name, email, phone, mailing_address, is_active')
          .eq('id', scope.ownerId)
          .maybeSingle();
        if (error) throw error;
        return data;
      }
      if (!user) return null;
      const { data, error } = await supabase
        .from('pm_property_owners')
        .select('id, owner_name, company_name, email, phone, mailing_address, is_active')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && (!scope.isPreview || scope.ready),
  });
}

export function useOwnerProperties() {
  const { user } = useAuth();
  const scope = useOwnerScope();
  return useQuery({
    queryKey: ['owner-portal', 'properties', scope.isPreview ? `preview:${scope.ownerId}` : user?.id, scope.propertyIds?.join(',') ?? null],
    queryFn: async () => {
      if (scopeBlocksAll(scope)) return [];
      let q = supabase
        .from('pm_managed_properties')
        .select('id, property_name, address_line_1, city, province, postal_code, property_type, is_active, notes')
        .order('property_name');
      if (scope.isPreview && scope.propertyIds?.length) q = q.in('id', scope.propertyIds);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user && (!scope.isPreview || scope.ready),
  });
}

export function useOwnerProperty(id?: string) {
  const scope = useOwnerScope();
  const allowed = !scope.isPreview || !!(id && scope.propertyIds?.includes(id));
  return useQuery({
    queryKey: ['owner-portal', 'property', id, scope.isPreview ? 'preview' : 'self'],
    queryFn: async () => {
      if (!id || !allowed) return null;
      const { data, error } = await supabase
        .from('pm_managed_properties')
        .select('id, property_name, address_line_1, city, province, postal_code, property_type, is_active, notes')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id && (!scope.isPreview || scope.ready),
  });
}

export function useOwnerUnitsForProperty(propertyId?: string) {
  const scope = useOwnerScope();
  const allowed = !scope.isPreview || !!(propertyId && scope.propertyIds?.includes(propertyId));
  return useQuery({
    queryKey: ['owner-portal', 'units', propertyId, scope.isPreview ? 'preview' : 'self'],
    queryFn: async () => {
      if (!propertyId || !allowed) return [];
      const { data, error } = await supabase
        .from('pm_units')
        .select('id, unit_label, bedrooms, bathrooms, status')
        .eq('property_id', propertyId)
        .order('unit_label');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!propertyId && (!scope.isPreview || scope.ready),
  });
}

/** Owner-visible lease summary only (no tenant PII). */
export function useOwnerLeasesForProperty(propertyId?: string) {
  const scope = useOwnerScope();
  const allowed = !scope.isPreview || !!(propertyId && scope.propertyIds?.includes(propertyId));
  return useQuery({
    queryKey: ['owner-portal', 'leases', propertyId, scope.isPreview ? 'preview' : 'self'],
    queryFn: async () => {
      if (!propertyId || !allowed) return [];
      const { data, error } = await supabase
        .from('pm_leases')
        .select('id, start_date, end_date, monthly_rent, status, rent_frequency, unit_id')
        .eq('property_id', propertyId)
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!propertyId && (!scope.isPreview || scope.ready),
  });
}

/** Only requests flagged owner_visible are returned to the owner portal. */
export function useOwnerMaintenanceRequests(propertyId?: string) {
  const { user } = useAuth();
  const scope = useOwnerScope();
  return useQuery({
    queryKey: ['owner-portal', 'maintenance', propertyId ?? 'all', scope.isPreview ? `preview:${scope.ownerId}` : user?.id, scope.propertyIds?.join(',') ?? null],
    queryFn: async () => {
      if (scopeBlocksAll(scope)) return [];
      let q = supabase
        .from('pm_maintenance_requests')
        .select(`
          id, title, category, priority, status, created_at, completed_at,
          property_id, unit_id, is_urgent_safety,
          owner_visible, owner_visible_summary,
          property:pm_managed_properties(id, property_name),
          unit:pm_units(id, unit_label)
        `)
        .eq('owner_visible', true)
        .order('created_at', { ascending: false });
      if (propertyId) q = q.eq('property_id', propertyId);
      else if (scope.isPreview && scope.propertyIds?.length) q = q.in('property_id', scope.propertyIds);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user && (!scope.isPreview || scope.ready),
  });
}

/** Owner-visible work orders across assigned properties. */
export function useOwnerWorkOrders(propertyId?: string) {
  const { user } = useAuth();
  const scope = useOwnerScope();
  return useQuery({
    queryKey: ['owner-portal', 'work-orders', propertyId ?? 'all', scope.isPreview ? `preview:${scope.ownerId}` : user?.id, scope.propertyIds?.join(',') ?? null],
    queryFn: async () => {
      if (scopeBlocksAll(scope)) return [];
      let q = supabase
        .from('pm_work_orders')
        .select(`
          id, work_order_number, title, status, priority, created_at, completed_at,
          property_id, unit_id,
          owner_visible, owner_visible_summary, owner_visible_completion_note,
          property:pm_managed_properties(id, property_name),
          unit:pm_units(id, unit_label)
        `)
        .eq('owner_visible', true)
        .order('created_at', { ascending: false });
      if (propertyId) q = q.eq('property_id', propertyId);
      else if (scope.isPreview && scope.propertyIds?.length) q = q.in('property_id', scope.propertyIds);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user && (!scope.isPreview || scope.ready),
  });
}

/** Owner documents (RLS-scoped: owner-visible + linked to owner/property). */
export function useOwnerDocuments(propertyId?: string) {
  const { user } = useAuth();
  const scope = useOwnerScope();
  return useQuery({
    queryKey: ['owner-portal', 'documents', propertyId ?? 'all', scope.isPreview ? `preview:${scope.ownerId}` : user?.id, scope.propertyIds?.join(',') ?? null],
    queryFn: async () => {
      if (scopeBlocksAll(scope) && !scope.ownerId) return [];
      let q = supabase
        .from('pm_owner_documents')
        .select('id, title, description, category, file_path, mime_type, file_size, created_at, property_id, owner_id, is_owner_visible, property:pm_managed_properties(id, property_name)')
        .eq('is_owner_visible', true)
        .order('created_at', { ascending: false });
      if (propertyId) {
        q = q.eq('property_id', propertyId);
      } else if (scope.isPreview) {
        // Preview: mirror the RLS rule client-side.
        const ids = scope.propertyIds ?? [];
        const parts: string[] = [];
        if (scope.ownerId) parts.push(`owner_id.eq.${scope.ownerId}`);
        if (ids.length) parts.push(`property_id.in.(${ids.join(',')})`);
        if (parts.length === 0) return [];
        q = q.or(parts.join(','));
      }
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user && (!scope.isPreview || scope.ready),
  });
}

export async function signOwnerDocument(filePath: string) {
  const { data, error } = await supabase.storage
    .from('owner-documents')
    .createSignedUrl(filePath, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}

// ── Admin-side owner document management ────────────────────────────────────
export function useAdminOwnerDocuments(opts: { ownerId?: string; propertyId?: string }) {
  return useQuery({
    queryKey: ['pm_owner_documents', opts.ownerId ?? null, opts.propertyId ?? null],
    queryFn: async () => {
      let q = supabase
        .from('pm_owner_documents')
        .select('id, title, description, category, file_path, mime_type, file_size, is_owner_visible, created_at, owner_id, property_id, property:pm_managed_properties(id, property_name)')
        .order('created_at', { ascending: false });
      if (opts.ownerId) q = q.eq('owner_id', opts.ownerId);
      if (opts.propertyId) q = q.eq('property_id', opts.propertyId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!(opts.ownerId || opts.propertyId),
  });
}

export function useUploadOwnerDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      file: File;
      title: string;
      description?: string;
      category?: string;
      owner_id?: string;
      property_id?: string;
      is_owner_visible?: boolean;
    }) => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      const scope = input.owner_id ? `owner/${input.owner_id}` : `property/${input.property_id}`;
      const path = `${scope}/${Date.now()}-${input.file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const up = await supabase.storage.from('owner-documents').upload(path, input.file, {
        contentType: input.file.type || 'application/octet-stream',
        upsert: false,
      });
      if (up.error) throw up.error;
      const { error } = await supabase.from('pm_owner_documents').insert({
        owner_id: input.owner_id ?? null,
        property_id: input.property_id ?? null,
        title: input.title,
        description: input.description ?? null,
        category: input.category ?? null,
        file_path: path,
        mime_type: input.file.type || null,
        file_size: input.file.size,
        is_owner_visible: input.is_owner_visible ?? true,
        uploaded_by: uid ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pm_owner_documents'] }),
  });
}

export function useDeleteOwnerDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: { id: string; file_path: string }) => {
      await supabase.storage.from('owner-documents').remove([row.file_path]).catch(() => {});
      const { error } = await supabase.from('pm_owner_documents').delete().eq('id', row.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pm_owner_documents'] }),
  });
}

export function useToggleOwnerDocumentVisibility() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: { id: string; is_owner_visible: boolean }) => {
      const { error } = await supabase
        .from('pm_owner_documents')
        .update({ is_owner_visible: row.is_owner_visible })
        .eq('id', row.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pm_owner_documents'] }),
  });
}

/** Is this owner record already linked to an auth user? */
export function useOwnerPortalLinked(ownerId?: string) {
  return useQuery({
    queryKey: ['pm_owner_portal_linked', ownerId],
    queryFn: async () => {
      if (!ownerId) return false;
      const { data, error } = await supabase
        .from('pm_property_owners')
        .select('user_id')
        .eq('id', ownerId)
        .maybeSingle();
      if (error) throw error;
      return !!data?.user_id;
    },
    enabled: !!ownerId,
  });
}

/**
 * Owner-visible property expenses. Reads from `pm_expenses_owner_safe`,
 * which excludes `admin_note` at the SQL level. RLS further restricts rows
 * to expenses where `is_owner_visible = true` AND the property is linked
 * to this owner via `pm_owner_properties`.
 */
export function useOwnerExpenses(propertyId?: string) {
  const { user } = useAuth();
  const scope = useOwnerScope();
  return useQuery({
    queryKey: ['owner-portal', 'expenses', propertyId ?? 'all', scope.isPreview ? `preview:${scope.ownerId}` : user?.id, scope.propertyIds?.join(',') ?? null],
    queryFn: async () => {
      if (scopeBlocksAll(scope)) return [];
      let q = (supabase as any)
        .from('pm_expenses_owner_safe')
        .select(`
          id, expense_date, category, status, subtotal, gst_amount, pst_amount, total,
          description, owner_visible_note, is_billable_to_owner, reference_number, vendor_name,
          property_id, unit_id, work_order_id,
          property:pm_managed_properties(id, property_name, address_line_1, city),
          unit:pm_units(id, unit_label),
          work_order:pm_work_orders(id, work_order_number, title)
        `)
        .order('expense_date', { ascending: false })
        .limit(500);
      if (propertyId) q = q.eq('property_id', propertyId);
      else if (scope.isPreview && scope.propertyIds?.length) q = q.in('property_id', scope.propertyIds);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!user && (!scope.isPreview || scope.ready),
  });
}

/**
 * Owner-visible receipts attached to an expense. RLS enforces:
 *   attachment.is_owner_visible = true
 *   AND parent expense.is_owner_visible = true
 *   AND owner is linked to that property.
 */
export function useOwnerExpenseAttachments(expenseId?: string) {
  return useQuery({
    queryKey: ['owner-portal', 'expense-attachments', expenseId],
    enabled: !!expenseId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('pm_expense_attachments')
        .select('id, file_name, mime_type, size_bytes, storage_path, is_owner_visible, created_at')
        .eq('expense_id', expenseId!)
        .eq('is_owner_visible', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

/** 5-minute signed URL for an owner-visible receipt. */
export async function getOwnerReceiptSignedUrl(path: string) {
  const { data, error } = await supabase.storage.from('pm-receipts').createSignedUrl(path, 300);
  if (error) throw error;
  return data.signedUrl;
}

