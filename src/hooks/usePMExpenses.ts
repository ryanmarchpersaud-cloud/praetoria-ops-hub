import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const PM_EXPENSE_CATEGORIES = [
  'Repairs & Maintenance',
  'Plumbing',
  'Electrical',
  'Heating / Cooling',
  'Appliances',
  'Cleaning',
  'Snow Removal',
  'Landscaping / Grounds',
  'Pest Control',
  'Materials / Supplies',
  'Contractor / Subcontractor Labour',
  'Inspection',
  'Move-In / Move-Out',
  'Garbage / Junk Removal',
  'Utilities',
  'Insurance',
  'Property Tax',
  'Condo Fees',
  'Management Fee',
  'Legal / Professional',
  'Advertising / Leasing',
  'Other',
] as const;

export const PM_EXPENSE_STATUSES = [
  'draft', 'pending', 'approved', 'paid', 'reimbursed', 'billable', 'cancelled', 'disputed',
] as const;

export type PMExpenseFilters = {
  propertyId?: string;
  unitId?: string;
  tenantId?: string;
  workOrderId?: string;
  maintenanceRequestId?: string;
  category?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
};

export function usePMExpenses(filters: PMExpenseFilters = {}) {
  return useQuery({
    queryKey: ['pm-expenses', filters],
    queryFn: async () => {
      let q = supabase
        .from('pm_expenses' as any)
        .select(`
          *,
          pm_managed_properties!property_id (id, address_line_1, city),
          pm_units!unit_id (id, unit_label),
          pm_tenants!tenant_id (id, first_name, last_name, business_name),
          pm_work_orders!work_order_id (id, work_order_number, title),
          pm_maintenance_requests!maintenance_request_id (id, title)
        `)
        .order('expense_date', { ascending: false })
        .limit(500);
      if (filters.propertyId) q = q.eq('property_id', filters.propertyId);
      if (filters.unitId) q = q.eq('unit_id', filters.unitId);
      if (filters.tenantId) q = q.eq('tenant_id', filters.tenantId);
      if (filters.workOrderId) q = q.eq('work_order_id', filters.workOrderId);
      if (filters.maintenanceRequestId) q = q.eq('maintenance_request_id', filters.maintenanceRequestId);
      if (filters.category && filters.category !== 'all') q = q.eq('category', filters.category);
      if (filters.status && filters.status !== 'all') q = q.eq('status', filters.status);
      if (filters.dateFrom) q = q.gte('expense_date', filters.dateFrom);
      if (filters.dateTo) q = q.lte('expense_date', filters.dateTo);
      const { data, error } = await q;
      if (error) throw error;
      let rows: any[] = data ?? [];
      if (filters.search) {
        const s = filters.search.toLowerCase();
        rows = rows.filter((r: any) =>
          r.description?.toLowerCase().includes(s) ||
          r.vendor_name?.toLowerCase().includes(s) ||
          r.reference_number?.toLowerCase().includes(s) ||
          r.category?.toLowerCase().includes(s)
        );
      }
      return rows;
    },
  });
}

export function usePMExpense(id?: string) {
  return useQuery({
    queryKey: ['pm-expense', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pm_expenses' as any)
        .select('*')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function usePMExpenseAttachments(expenseId?: string) {
  return useQuery({
    queryKey: ['pm-expense-attachments', expenseId],
    enabled: !!expenseId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pm_expense_attachments' as any)
        .select('*')
        .eq('expense_id', expenseId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreatePMExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data: userData } = await supabase.auth.getUser();
      const insert = { ...payload, created_by: userData.user?.id ?? null };
      const { data, error } = await supabase.from('pm_expenses' as any).insert(insert).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pm-expenses'] });
      toast({ title: 'Expense created' });
    },
    onError: (e: any) => toast({ title: 'Could not create expense', description: e.message, variant: 'destructive' }),
  });
}

export function useUpdatePMExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await supabase.from('pm_expenses' as any).update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pm-expenses'] });
      qc.invalidateQueries({ queryKey: ['pm-expense'] });
      toast({ title: 'Expense updated' });
    },
    onError: (e: any) => toast({ title: 'Could not update expense', description: e.message, variant: 'destructive' }),
  });
}

export function useDeletePMExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('pm_expenses' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pm-expenses'] });
      toast({ title: 'Expense deleted' });
    },
    onError: (e: any) => toast({ title: 'Could not delete expense', description: e.message, variant: 'destructive' }),
  });
}

export function useUploadPMReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ expenseId, file, ownerVisible }: { expenseId: string; file: File; ownerVisible?: boolean }) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id ?? 'anon';
      const path = `${expenseId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const { error: upErr } = await supabase.storage.from('pm-receipts').upload(path, file, {
        upsert: false,
        contentType: file.type || undefined,
      });
      if (upErr) throw upErr;
      const { data, error } = await supabase.from('pm_expense_attachments' as any).insert({
        expense_id: expenseId,
        storage_bucket: 'pm-receipts',
        storage_path: path,
        file_name: file.name,
        mime_type: file.type || null,
        size_bytes: file.size,
        is_owner_visible: !!ownerVisible,
        uploaded_by: userId,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['pm-expense-attachments', vars.expenseId] });
      toast({ title: 'Receipt uploaded' });
    },
    onError: (e: any) => toast({ title: 'Upload failed', description: e.message, variant: 'destructive' }),
  });
}

export function useDeletePMReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, expenseId, path }: { id: string; expenseId: string; path: string }) => {
      await supabase.storage.from('pm-receipts').remove([path]);
      const { error } = await supabase.from('pm_expense_attachments' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['pm-expense-attachments', vars.expenseId] });
      toast({ title: 'Receipt removed' });
    },
    onError: (e: any) => toast({ title: 'Could not remove receipt', description: e.message, variant: 'destructive' }),
  });
}

export async function getPMReceiptSignedUrl(path: string, expiresIn = 300) {
  const { data, error } = await supabase.storage.from('pm-receipts').createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}
