import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/** Phase 5B — Admin Property Management ledger hooks (rent, payments, credits). */

export type PmLedgerEntry = {
  id: string;
  tenant_id: string;
  lease_id: string | null;
  property_id: string | null;
  unit_id: string | null;
  entry_date: string;
  due_date: string | null;
  paid_date: string | null;
  period_start: string | null;
  period_end: string | null;
  type: string;
  status: string;
  amount: number;
  description: string | null;
  reference: string | null;
  payment_method: string | null;
  related_charge_id: string | null;
  reverses_entry_id: string | null;
  receipt_path: string | null;
  receipt_tenant_visible: boolean;
  tenant_visible: boolean;
  tenant_note: string | null;
  admin_note: string | null;
  created_at: string;
};

const CHARGE_TYPES = new Set([
  'rent_charge', 'late_fee', 'deposit',
  'adjustment_charge', 'other_charge', 'nsf_fee',
]);
const CREDIT_TYPES = new Set([
  'payment', 'credit', 'adjustment_credit',
  'deposit_refund', 'other_credit',
]);

export function signedAmount(e: Pick<PmLedgerEntry, 'type' | 'amount' | 'status'>): number {
  if (['waived', 'cancelled', 'reversed', 'note'].includes(e.status)) return 0;
  const amt = Number(e.amount) || 0;
  if (CHARGE_TYPES.has(e.type)) return amt;
  if (CREDIT_TYPES.has(e.type)) return -amt;
  return 0;
}

export function computeBalance(entries: PmLedgerEntry[]): number {
  return entries.reduce((sum, e) => sum + signedAmount(e), 0);
}

/** Admin list — RLS restricts to ops staff. Scope by tenant or lease. */
export function usePmLedgerFor(opts: { tenantId?: string | null; leaseId?: string | null }) {
  const { tenantId, leaseId } = opts;
  return useQuery({
    enabled: !!(tenantId || leaseId),
    queryKey: ['pm-ledger', tenantId ?? null, leaseId ?? null],
    queryFn: async () => {
      let q = (supabase as any).from('pm_tenant_ledger').select('*')
        .order('entry_date', { ascending: false })
        .order('created_at', { ascending: false });
      if (tenantId) q = q.eq('tenant_id', tenantId);
      if (leaseId) q = q.eq('lease_id', leaseId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as PmLedgerEntry[];
    },
  });
}

export function useCreatePmLedgerEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<PmLedgerEntry>) => {
      const { data: userRes } = await supabase.auth.getUser();
      const payload: any = {
        ...input,
        created_by: userRes.user?.id ?? null,
      };
      const { data, error } = await (supabase as any)
        .from('pm_tenant_ledger')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as PmLedgerEntry;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ['pm-ledger'] });
      qc.invalidateQueries({ queryKey: ['tenant-portal', 'ledger'] });
      qc.invalidateQueries({ queryKey: ['pm-tenant-balance', row.tenant_id] });
    },
  });
}

export function useUpdatePmLedgerEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<PmLedgerEntry> }) => {
      const { data, error } = await (supabase as any)
        .from('pm_tenant_ledger')
        .update(patch)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as PmLedgerEntry;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ['pm-ledger'] });
      qc.invalidateQueries({ queryKey: ['tenant-portal', 'ledger'] });
      qc.invalidateQueries({ queryKey: ['pm-tenant-balance', row.tenant_id] });
    },
  });
}

export function useDeletePmLedgerEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('pm_tenant_ledger').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pm-ledger'] });
      qc.invalidateQueries({ queryKey: ['tenant-portal', 'ledger'] });
      qc.invalidateQueries({ queryKey: ['pm-tenant-balance'] });
    },
  });
}

/** Balance via SECURITY DEFINER RPC (safe aggregate). */
export function usePmTenantBalance(tenantId?: string | null) {
  return useQuery({
    enabled: !!tenantId,
    queryKey: ['pm-tenant-balance', tenantId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('pm_get_tenant_balance', { p_tenant_id: tenantId });
      if (error) throw error;
      return Number(data ?? 0);
    },
  });
}
