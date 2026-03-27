import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

/* ── Payroll Runs ── */
export function usePayrollRuns(filters?: { status?: string }) {
  return useQuery({
    queryKey: ['payroll_runs', filters],
    queryFn: async () => {
      let q = supabase.from('payroll_runs').select('*').order('pay_date', { ascending: false });
      if (filters?.status && filters.status !== 'all') q = q.eq('status', filters.status);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreatePayrollRun() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (run: any) => {
      const { data, error } = await supabase.from('payroll_runs').insert({ ...run, created_by: user?.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payroll_runs'] }); toast.success('Payroll run created'); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdatePayrollRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { error } = await supabase.from('payroll_runs').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payroll_runs'] }); toast.success('Payroll run updated'); },
    onError: (e: any) => toast.error(e.message),
  });
}

/* ── Payroll Run Items ── */
export function usePayrollRunItems(runId?: string) {
  return useQuery({
    queryKey: ['payroll_run_items', runId],
    enabled: !!runId,
    queryFn: async () => {
      const { data, error } = await supabase.from('payroll_run_items').select('*').eq('payroll_run_id', runId!).order('employee_name');
      if (error) throw error;
      return data;
    },
  });
}

export function useCreatePayrollRunItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: any) => {
      const { data, error } = await supabase.from('payroll_run_items').insert(item).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, v) => { qc.invalidateQueries({ queryKey: ['payroll_run_items', v.payroll_run_id] }); toast.success('Employee added'); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdatePayrollRunItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payroll_run_id, ...updates }: any) => {
      const { error } = await supabase.from('payroll_run_items').update(updates).eq('id', id);
      if (error) throw error;
      return payroll_run_id;
    },
    onSuccess: (runId) => { qc.invalidateQueries({ queryKey: ['payroll_run_items', runId] }); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeletePayrollRunItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payroll_run_id }: { id: string; payroll_run_id: string }) => {
      const { error } = await supabase.from('payroll_run_items').delete().eq('id', id);
      if (error) throw error;
      return payroll_run_id;
    },
    onSuccess: (runId) => { qc.invalidateQueries({ queryKey: ['payroll_run_items', runId] }); toast.success('Item removed'); },
    onError: (e: any) => toast.error(e.message),
  });
}

/* ── Deduction Rules ── */
export function useDeductionRules() {
  return useQuery({
    queryKey: ['payroll_deduction_rules'],
    queryFn: async () => {
      const { data, error } = await supabase.from('payroll_deduction_rules').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });
}

/* ── Remittances ── */
export function useRemittances(filters?: { status?: string; type?: string }) {
  return useQuery({
    queryKey: ['payroll_remittances', filters],
    queryFn: async () => {
      let q = supabase.from('payroll_remittances').select('*, finance_accounts(account_name)').order('due_date', { ascending: true });
      if (filters?.status && filters.status !== 'all') q = q.eq('status', filters.status);
      if (filters?.type && filters.type !== 'all') q = q.eq('remittance_type', filters.type);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateRemittance() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (rem: any) => {
      const { data, error } = await supabase.from('payroll_remittances').insert({ ...rem, created_by: user?.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payroll_remittances'] }); toast.success('Remittance created'); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateRemittance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { error } = await supabase.from('payroll_remittances').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payroll_remittances'] }); toast.success('Remittance updated'); },
    onError: (e: any) => toast.error(e.message),
  });
}

/* ── Subcontractor Payout Runs ── */
export function usePayoutRuns(filters?: { status?: string }) {
  return useQuery({
    queryKey: ['subcontractor_payout_runs', filters],
    queryFn: async () => {
      let q = supabase.from('subcontractor_payout_runs').select('*').order('payout_date', { ascending: false });
      if (filters?.status && filters.status !== 'all') q = q.eq('status', filters.status);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreatePayoutRun() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (run: any) => {
      const { data, error } = await supabase.from('subcontractor_payout_runs').insert({ ...run, created_by: user?.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['subcontractor_payout_runs'] }); toast.success('Payout run created'); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdatePayoutRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { error } = await supabase.from('subcontractor_payout_runs').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['subcontractor_payout_runs'] }); toast.success('Payout run updated'); },
    onError: (e: any) => toast.error(e.message),
  });
}

/* ── Subcontractor Payout Items ── */
export function usePayoutItems(runId?: string) {
  return useQuery({
    queryKey: ['subcontractor_payout_items', runId],
    enabled: !!runId,
    queryFn: async () => {
      const { data, error } = await supabase.from('subcontractor_payout_items').select('*').eq('payout_run_id', runId!).order('subcontractor_name');
      if (error) throw error;
      return data;
    },
  });
}

export function useCreatePayoutItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: any) => {
      const { data, error } = await supabase.from('subcontractor_payout_items').insert(item).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, v) => { qc.invalidateQueries({ queryKey: ['subcontractor_payout_items', v.payout_run_id] }); toast.success('Subcontractor added'); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdatePayoutItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payout_run_id, ...updates }: any) => {
      const { error } = await supabase.from('subcontractor_payout_items').update(updates).eq('id', id);
      if (error) throw error;
      return payout_run_id;
    },
    onSuccess: (runId) => { qc.invalidateQueries({ queryKey: ['subcontractor_payout_items', runId] }); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeletePayoutItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payout_run_id }: { id: string; payout_run_id: string }) => {
      const { error } = await supabase.from('subcontractor_payout_items').delete().eq('id', id);
      if (error) throw error;
      return payout_run_id;
    },
    onSuccess: (runId) => { qc.invalidateQueries({ queryKey: ['subcontractor_payout_items', runId] }); toast.success('Item removed'); },
    onError: (e: any) => toast.error(e.message),
  });
}

/* ── Payroll Dashboard Stats ── */
export function usePayrollDashboard() {
  return useQuery({
    queryKey: ['payroll_dashboard'],
    queryFn: async () => {
      const [runsRes, remRes, payoutRes] = await Promise.all([
        supabase.from('payroll_runs').select('id, status, pay_date, created_at'),
        supabase.from('payroll_remittances').select('id, status, due_date, amount'),
        supabase.from('subcontractor_payout_runs').select('id, status, payout_date'),
      ]);
      const runs = runsRes.data || [];
      const rems = remRes.data || [];
      const payouts = payoutRes.data || [];

      const now = new Date();
      const thisMonth = now.toISOString().slice(0, 7);

      return {
        draftPayrollRuns: runs.filter(r => r.status === 'draft').length,
        awaitingApproval: runs.filter(r => r.status === 'draft').length,
        processedThisMonth: runs.filter(r => r.status === 'processed' && r.pay_date?.startsWith(thisMonth)).length,
        remittancesDueSoon: rems.filter(r => {
          if (r.status === 'paid' || r.status === 'filed') return false;
          const d = r.due_date ? new Date(r.due_date) : null;
          return d && d >= now && (d.getTime() - now.getTime()) / 86400000 <= 7;
        }).length,
        overdueRemittances: rems.filter(r => r.status !== 'paid' && r.status !== 'filed' && r.due_date && new Date(r.due_date) < now).length,
        totalRemittancesDue: rems.filter(r => r.status !== 'paid' && r.status !== 'filed').reduce((s, r) => s + Number(r.amount || 0), 0),
        draftPayoutRuns: payouts.filter(p => p.status === 'draft').length,
        processedPayoutsThisMonth: payouts.filter(p => p.status === 'processed' && p.payout_date?.startsWith(thisMonth)).length,
      };
    },
  });
}
