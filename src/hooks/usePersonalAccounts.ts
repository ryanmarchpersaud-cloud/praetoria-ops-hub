import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export function useIsPersonalOwner() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['personal_owner', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from('personal_account_owners')
        .select('user_id')
        .eq('user_id', user!.id)
        .maybeSingle();
      return !!data;
    },
  });
}

export function useClaimPersonalOwnership() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      // Use insert-only RPC-style: we need a way to add owner. Since RLS only allows SELECT for self,
      // we insert via service-side trigger? Simpler: allow self-insert.
      const { error } = await supabase.from('personal_account_owners').insert({ user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['personal_owner'] });
      toast.success('Personal Accounts unlocked for your user');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function usePersonalExpenses() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['personal_expenses', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('personal_expenses')
        .select('*, personal_funding_sources(name, source_type, color)')
        .eq('owner_id', user!.id)
        .order('next_due_date', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function usePersonalFundingSources() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['personal_funding', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('personal_funding_sources')
        .select('*')
        .eq('owner_id', user!.id)
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function usePersonalIncome() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['personal_income', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('personal_income')
        .select('*')
        .eq('owner_id', user!.id)
        .order('source_name');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function usePersonalPayments() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['personal_payments', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('personal_expense_payments')
        .select('*, personal_expenses(account_name, category)')
        .eq('owner_id', user!.id)
        .order('paid_date', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertPersonalExpense() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: any) => {
      const payload = { ...row, owner_id: user!.id };
      if (row.id) {
        const { error } = await supabase.from('personal_expenses').update(payload).eq('id', row.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('personal_expenses').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['personal_expenses'] });
      toast.success('Saved');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeletePersonalExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('personal_expenses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['personal_expenses'] });
      toast.success('Deleted');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpsertFundingSource() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: any) => {
      const payload = { ...row, owner_id: user!.id };
      if (row.id) {
        const { error } = await supabase.from('personal_funding_sources').update(payload).eq('id', row.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('personal_funding_sources').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['personal_funding'] });
      toast.success('Saved');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteFundingSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('personal_funding_sources').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['personal_funding'] });
      qc.invalidateQueries({ queryKey: ['personal_expenses'] });
      toast.success('Deleted');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpsertIncome() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: any) => {
      const payload = { ...row, owner_id: user!.id };
      if (row.id) {
        const { error } = await supabase.from('personal_income').update(payload).eq('id', row.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('personal_income').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['personal_income'] });
      toast.success('Saved');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteIncome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('personal_income').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['personal_income'] }),
    onError: (e: any) => toast.error(e.message),
  });
}

export function useMarkPaid() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { expense_id: string; amount_paid: number; paid_date: string; payment_type: string; funding_source_id?: string | null; notes?: string }) => {
      const { error } = await supabase.from('personal_expense_payments').insert({ ...p, owner_id: user!.id });
      if (error) throw error;
      // Push next_due_date forward by one month by re-saving the same due_day
      const { data: exp } = await supabase.from('personal_expenses').select('due_day').eq('id', p.expense_id).single();
      if (exp) {
        await supabase.from('personal_expenses').update({ due_day: exp.due_day }).eq('id', p.expense_id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['personal_expenses'] });
      qc.invalidateQueries({ queryKey: ['personal_payments'] });
      toast.success('Marked as paid');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// Seed the 29 accounts from the user's notepad
export const SEED_EXPENSES = [
  { category: 'payment', account_name: 'Flexiti Card', minimum_amount: 200, due_day: 27 },
  { category: 'payment', account_name: 'Capital One Card', minimum_amount: 160, due_day: 12 },
  { category: 'payment', account_name: 'CIBC Aventura Card', minimum_amount: 300, due_day: 25 },
  { category: 'payment', account_name: 'CIBC Line of Credit', minimum_amount: 100, due_day: 1 },
  { category: 'payment', account_name: 'CIBC Mortgage', minimum_amount: 2238.41, due_day: 2 },
  { category: 'payment', account_name: 'AVIVA Insurance (Home)', minimum_amount: 302.38, due_day: 30 },
  { category: 'payment', account_name: 'Truck — TFG Financial Corp', minimum_amount: 1266.98, due_day: 15, is_business_writeoff: true },
  { category: 'bill', account_name: 'Property Tax', minimum_amount: 461.00, due_day: 1 },
  { category: 'payment', account_name: 'SGI #1', minimum_amount: 168.54, due_day: 2, is_business_writeoff: true },
  { category: 'payment', account_name: 'SGI #2', minimum_amount: 62.05, due_day: 2, is_business_writeoff: true },
  { category: 'bill', account_name: 'Cell Phone — Telus (old)', minimum_amount: 80.00, due_day: 5 },
  { category: 'bill', account_name: 'Cell Phone — Bell (new)', minimum_amount: 140.00, due_day: 17 },
  { category: 'business_writeoff', account_name: 'WCB Insurance', minimum_amount: 150.00, due_day: 30, is_business_writeoff: true },
  { category: 'business_writeoff', account_name: 'Jobber', minimum_amount: 53.00, due_day: 30, is_business_writeoff: true },
  { category: 'subscription', account_name: 'Canvas', minimum_amount: 28.00, due_day: 30, is_business_writeoff: true },
  { category: 'payment', account_name: 'Upgrade Inc — Flexpay', minimum_amount: 155.00, due_day: 24 },
  { category: 'subscription', account_name: 'ChatGPT', minimum_amount: 30.00, due_day: 30, is_business_writeoff: true },
  { category: 'subscription', account_name: 'Microsoft 365', minimum_amount: 12.08, due_day: 28, is_business_writeoff: true },
  { category: 'subscription', account_name: 'Ionos Email', minimum_amount: 80.00, due_day: 17, is_business_writeoff: true },
  { category: 'subscription', account_name: 'Resend', minimum_amount: 28.11, due_day: 18, is_business_writeoff: true },
  { category: 'subscription', account_name: 'Lovable Lab', minimum_amount: 65.50, due_day: 25, is_business_writeoff: true },
  { category: 'subscription', account_name: 'Adobe Inc', minimum_amount: 51.05, due_day: 25, is_business_writeoff: true },
  { category: 'bill', account_name: 'SaskEnergy', minimum_amount: 70.00, due_day: 13 },
  { category: 'bill', account_name: 'SaskPower', minimum_amount: 147.00, due_day: 13 },
  { category: 'bill', account_name: 'SaskTel', minimum_amount: 83.25, due_day: 22 },
  { category: 'bill', account_name: 'SaskWater', minimum_amount: 122.98, due_day: 19 },
  { category: 'business_writeoff', account_name: 'Twilio SMS', minimum_amount: 28.00, due_day: 30, is_business_writeoff: true },
  { category: 'subscription', account_name: 'Stripe Platform', minimum_amount: 29.00, due_day: 30, is_business_writeoff: true },
  { category: 'subscription', account_name: 'Supabase', minimum_amount: 25.00, due_day: 30, is_business_writeoff: true },
];

export const SEED_INCOME = [
  { source_name: 'Rent — Tenant', income_type: 'recurring', monthly_amount: 1800, expected_day: 1 },
  { source_name: 'Wholesale Club Store (Work)', income_type: 'recurring', monthly_amount: 1200, expected_day: 15 },
];

export function useSeedFromNotepad() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const expenses = SEED_EXPENSES.map((e, i) => ({ ...e, owner_id: user!.id, position: i }));
      const income = SEED_INCOME.map(i => ({ ...i, owner_id: user!.id }));
      const { error: e1 } = await supabase.from('personal_expenses').insert(expenses);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from('personal_income').insert(income);
      if (e2) throw e2;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['personal_expenses'] });
      qc.invalidateQueries({ queryKey: ['personal_income'] });
      toast.success('Seeded 29 expenses + 2 income sources from your notepad');
    },
    onError: (e: any) => toast.error(e.message),
  });
}
