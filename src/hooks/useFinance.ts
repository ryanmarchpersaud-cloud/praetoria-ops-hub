import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

/* ── Categories ── */
export function useFinanceCategories() {
  return useQuery({
    queryKey: ['finance_categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finance_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });
}

/* ── Vendors ── */
export function useFinanceVendors() {
  return useQuery({
    queryKey: ['finance_vendors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finance_vendors')
        .select('*')
        .order('vendor_name');
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateFinanceVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vendor: any) => {
      const { data, error } = await supabase.from('finance_vendors').insert(vendor).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['finance_vendors'] }); toast.success('Vendor created'); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateFinanceVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { error } = await supabase.from('finance_vendors').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['finance_vendors'] }); toast.success('Vendor updated'); },
    onError: (e: any) => toast.error(e.message),
  });
}

/* ── Expenses ── */
export function useFinanceExpenses(filters?: { status?: string; category?: string; vendorId?: string; dateFrom?: string; dateTo?: string }) {
  return useQuery({
    queryKey: ['finance_expenses', filters],
    queryFn: async () => {
      let q = supabase.from('finance_expenses').select('*, finance_vendors(vendor_name)').order('expense_date', { ascending: false });
      if (filters?.status && filters.status !== 'all') q = q.eq('status', filters.status);
      if (filters?.category) q = q.eq('category', filters.category);
      if (filters?.vendorId) q = q.eq('vendor_id', filters.vendorId);
      if (filters?.dateFrom) q = q.gte('expense_date', filters.dateFrom);
      if (filters?.dateTo) q = q.lte('expense_date', filters.dateTo);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateFinanceExpense() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (expense: any) => {
      const { data, error } = await supabase.from('finance_expenses').insert({ ...expense, entered_by: user?.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['finance_expenses'] }); toast.success('Expense created'); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateFinanceExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { error } = await supabase.from('finance_expenses').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['finance_expenses'] }); toast.success('Expense updated'); },
    onError: (e: any) => toast.error(e.message),
  });
}

/* ── Receipts ── */
export function useFinanceReceipts(filters?: { status?: string }) {
  return useQuery({
    queryKey: ['finance_receipts', filters],
    queryFn: async () => {
      let q = supabase.from('finance_receipts').select('*').order('uploaded_at', { ascending: false });
      if (filters?.status && filters.status !== 'all') q = q.eq('review_status', filters.status);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateFinanceReceipt() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (receipt: any) => {
      const { data, error } = await supabase.from('finance_receipts').insert({ ...receipt, uploaded_by: user?.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['finance_receipts'] }); toast.success('Receipt uploaded'); },
    onError: (e: any) => toast.error(e.message),
  });
}

/* ── Bills ── */
export function useFinanceBills(filters?: { status?: string; vendorId?: string }) {
  return useQuery({
    queryKey: ['finance_bills', filters],
    queryFn: async () => {
      let q = supabase.from('finance_bills').select('*, finance_vendors(vendor_name)').order('due_date', { ascending: true });
      if (filters?.status && filters.status !== 'all') q = q.eq('status', filters.status);
      if (filters?.vendorId) q = q.eq('vendor_id', filters.vendorId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateFinanceBill() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (bill: any) => {
      const { data, error } = await supabase.from('finance_bills').insert({ ...bill, created_by: user?.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['finance_bills'] }); toast.success('Bill created'); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateFinanceBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { error } = await supabase.from('finance_bills').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['finance_bills'] }); toast.success('Bill updated'); },
    onError: (e: any) => toast.error(e.message),
  });
}

/* ── Job Cost Snapshots ── */
export function useJobCostSnapshots() {
  return useQuery({
    queryKey: ['finance_job_cost_snapshots'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finance_job_cost_snapshots')
        .select('*, jobs(job_number, job_title, service_category), customers(first_name, last_name, company_name), properties(address_line_1)')
        .order('snapshot_date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

/* ── Dashboard Stats ── */
export function useFinanceDashboard() {
  return useQuery({
    queryKey: ['finance_dashboard'],
    queryFn: async () => {
      const [expRes, billRes, recRes, invRes] = await Promise.all([
        supabase.from('finance_expenses').select('amount_total, status, category'),
        supabase.from('finance_bills').select('total, balance_due, status'),
        supabase.from('finance_receipts').select('review_status'),
        supabase.from('invoices').select('total, balance_due, status'),
      ]);

      const expenses = expRes.data || [];
      const bills = billRes.data || [];
      const receipts = recRes.data || [];
      const invoices = invRes.data || [];

      const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount_total || 0), 0);
      const totalRevenue = invoices.reduce((s, i) => s + Number(i.total || 0), 0);
      const outstandingInvoices = invoices.filter(i => ['sent', 'overdue'].includes(i.status)).reduce((s, i) => s + Number(i.balance_due || 0), 0);
      const openBills = bills.filter(b => ['open', 'partial', 'overdue'].includes(b.status)).reduce((s, b) => s + Number(b.balance_due || 0), 0);
      const receiptsAwaitingReview = receipts.filter(r => r.review_status === 'unreviewed').length;

      const categoryBreakdown: Record<string, number> = {};
      expenses.forEach(e => {
        const cat = e.category || 'Uncategorized';
        categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + Number(e.amount_total || 0);
      });

      return {
        totalRevenue,
        totalExpenses,
        grossMargin: totalRevenue - totalExpenses,
        outstandingInvoices,
        openBills,
        receiptsAwaitingReview,
        categoryBreakdown,
        expenseCount: expenses.length,
        billCount: bills.length,
      };
    },
  });
}
