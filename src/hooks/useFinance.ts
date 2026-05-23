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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance_expenses'] });
      qc.invalidateQueries({ queryKey: ['finance_dashboard'] });
      toast.success('Expense created');
    },
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance_expenses'] });
      qc.invalidateQueries({ queryKey: ['finance_dashboard'] });
      toast.success('Expense updated');
    },
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance_receipts'] });
      qc.invalidateQueries({ queryKey: ['finance_dashboard'] });
      toast.success('Receipt uploaded');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateFinanceReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { error } = await supabase.from('finance_receipts').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance_receipts'] });
      qc.invalidateQueries({ queryKey: ['finance_dashboard'] });
      toast.success('Receipt updated');
    },
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance_bills'] });
      qc.invalidateQueries({ queryKey: ['finance_dashboard'] });
      toast.success('Bill created');
    },
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance_bills'] });
      qc.invalidateQueries({ queryKey: ['finance_dashboard'] });
      toast.success('Bill updated');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

/* ── Jobs (for linking) ── */
export function useJobsForLinking() {
  return useQuery({
    queryKey: ['jobs_for_linking'],
    queryFn: async () => {
      const { data, error } = await supabase.from('jobs').select('id, job_number, job_title').order('created_at', { ascending: false }).limit(200);
      if (error) throw error;
      return data;
    },
  });
}

export function useCustomersForLinking() {
  return useQuery({
    queryKey: ['customers_for_linking'],
    queryFn: async () => {
      const { data, error } = await supabase.from('customers').select('id, first_name, last_name, company_name').order('first_name').limit(200);
      if (error) throw error;
      return data;
    },
  });
}

export function usePropertiesForLinking() {
  return useQuery({
    queryKey: ['properties_for_linking'],
    queryFn: async () => {
      const { data, error } = await supabase.from('properties').select('id, address_line_1, city').order('address_line_1').limit(200);
      if (error) throw error;
      return data;
    },
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
export function useFinanceDashboard(dateRange?: { from?: string; to?: string }) {
  return useQuery({
    queryKey: ['finance_dashboard', dateRange],
    queryFn: async () => {
      let expQ = supabase.from('finance_expenses').select('amount_total, status, category, vendor_id, expense_date');
      let billQ = supabase.from('finance_bills').select('total, balance_due, status, due_date');
      const recQ = supabase.from('finance_receipts').select('review_status');
      let invQ = supabase.from('invoices').select('total, balance_due, status, issue_date');
      let workerClaimQ = supabase.from('worker_expense_claims').select('status, created_at');

      if (dateRange?.from) {
        expQ = expQ.gte('expense_date', dateRange.from);
        billQ = billQ.gte('bill_date', dateRange.from);
        invQ = invQ.gte('issue_date', dateRange.from);
        workerClaimQ = workerClaimQ.gte('created_at', `${dateRange.from}T00:00:00`);
      }
      if (dateRange?.to) {
        expQ = expQ.lte('expense_date', dateRange.to);
        billQ = billQ.lte('bill_date', dateRange.to);
        invQ = invQ.lte('issue_date', dateRange.to);
        workerClaimQ = workerClaimQ.lte('created_at', `${dateRange.to}T23:59:59.999`);
      }

      const [expRes, billRes, recRes, invRes, workerClaimsRes] = await Promise.all([expQ, billQ, recQ, invQ, workerClaimQ]);

      if (expRes.error) throw expRes.error;
      if (billRes.error) throw billRes.error;
      if (recRes.error) throw recRes.error;
      if (invRes.error) throw invRes.error;

      const expenses = expRes.data || [];
      const bills = billRes.data || [];
      const receipts = recRes.data || [];
      const invoices = invRes.data || [];
      const workerClaims = workerClaimsRes.error ? [] : (workerClaimsRes.data || []);

      const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount_total || 0), 0);
      // Revenue = only Paid invoices (Draft/Sent/Voided shouldn't count as earned revenue)
      const totalRevenue = invoices
        .filter(i => String(i.status || '').toLowerCase() === 'paid')
        .reduce((s, i) => s + Number(i.total || 0), 0);
      // Outstanding = any invoice with a remaining balance that isn't paid/void/draft
      const outstandingInvoices = invoices
        .filter(i => !['paid', 'voided', 'draft'].includes(String(i.status || '').toLowerCase()) && Number(i.balance_due || 0) > 0)
        .reduce((s, i) => s + Number(i.balance_due || 0), 0);
      const openBills = bills
        .filter(b => ['open', 'partial', 'overdue'].includes(String(b.status || '').toLowerCase()) && Number(b.balance_due || 0) > 0)
        .reduce((s, b) => s + Number(b.balance_due || 0), 0);
      const receiptsAwaitingReview = receipts.filter(r => r.review_status === 'unreviewed').length;
      const overdueBills = bills.filter(b => b.status === 'overdue' || (b.due_date && new Date(b.due_date) < new Date() && ['open', 'partial'].includes(b.status)));
      const workerClaimsAwaitingReview = workerClaims.filter((claim: any) => claim.status === 'submitted').length;
      const workerClaimsAwaitingReimbursement = workerClaims.filter((claim: any) => claim.status === 'approved').length;

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
        overdueBillCount: overdueBills.length,
        workerClaimsAwaitingReview,
        workerClaimsAwaitingReimbursement,
      };
    },
  });
}
