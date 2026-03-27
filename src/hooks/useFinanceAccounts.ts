import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useFinanceAccounts() {
  return useQuery({
    queryKey: ['finance_accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finance_accounts')
        .select('*')
        .order('account_name');
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateFinanceAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (account: any) => {
      const { data, error } = await supabase.from('finance_accounts').insert(account).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['finance_accounts'] }); toast.success('Account created'); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateFinanceAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { error } = await supabase.from('finance_accounts').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['finance_accounts'] }); toast.success('Account updated'); },
    onError: (e: any) => toast.error(e.message),
  });
}
