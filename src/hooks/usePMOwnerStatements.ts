import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const STATEMENT_STATUSES = ['draft','under_review','finalized','shared','void','cancelled'] as const;
export type StatementStatus = typeof STATEMENT_STATUSES[number];

export const STATEMENT_LINE_TYPES = [
  'rent_charge','rent_payment','property_expense','maintenance_expense',
  'management_fee','adjustment','credit','owner_contribution',
  'owner_payout_placeholder','other',
] as const;
export type StatementLineType = typeof STATEMENT_LINE_TYPES[number];

export interface OwnerStatement {
  id: string;
  statement_number: string;
  owner_id: string;
  property_id: string | null;
  period_start: string;
  period_end: string;
  status: StatementStatus;
  prepared_at: string | null;
  finalized_at: string | null;
  shared_at: string | null;
  opening_balance: number;
  rent_charged: number;
  rent_collected: number;
  property_expenses: number;
  maintenance_expenses: number;
  management_fees: number;
  adjustments: number;
  net_owner_amount: number;
  admin_notes: string | null;
  owner_visible_notes: string | null;
  owner_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface OwnerStatementLine {
  id: string;
  statement_id: string;
  line_date: string | null;
  property_id: string | null;
  unit_id: string | null;
  lease_id: string | null;
  line_type: StatementLineType;
  description: string | null;
  amount: number;
  gst_amount: number;
  pst_amount: number;
  source_table: string | null;
  source_id: string | null;
  owner_visible_note: string | null;
  admin_note: string | null;
  sort_order: number;
}

export function useOwnerStatements(filters: { ownerId?: string; propertyId?: string; status?: string } = {}) {
  return useQuery({
    queryKey: ['pm-owner-statements', filters],
    queryFn: async () => {
      let q = supabase.from('pm_owner_statements' as any).select('*').order('period_end', { ascending: false });
      if (filters.ownerId) q = q.eq('owner_id', filters.ownerId);
      if (filters.propertyId) q = q.eq('property_id', filters.propertyId);
      if (filters.status && filters.status !== 'all') q = q.eq('status', filters.status);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as OwnerStatement[];
    },
  });
}

export function useOwnerStatement(id?: string) {
  return useQuery({
    queryKey: ['pm-owner-statement', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('pm_owner_statements' as any).select('*').eq('id', id!).maybeSingle();
      if (error) throw error;
      return data as unknown as OwnerStatement | null;
    },
  });
}

export function useOwnerStatementLines(statementId?: string) {
  return useQuery({
    queryKey: ['pm-owner-statement-lines', statementId],
    enabled: !!statementId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pm_owner_statement_lines' as any)
        .select('*')
        .eq('statement_id', statementId!)
        .order('sort_order', { ascending: true })
        .order('line_date', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as OwnerStatementLine[];
    },
  });
}

export function useCreateOwnerStatement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      owner_id: string; property_id?: string | null;
      period_start: string; period_end: string;
      opening_balance?: number; admin_notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('pm_owner_statements' as any)
        .insert({ ...payload, status: 'draft', prepared_at: new Date().toISOString() })
        .select('*').single();
      if (error) throw error;
      return data as unknown as OwnerStatement;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pm-owner-statements'] }),
  });
}

export function useUpdateOwnerStatement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<OwnerStatement> }) => {
      const { data, error } = await supabase
        .from('pm_owner_statements' as any).update(patch).eq('id', id).select('*').single();
      if (error) throw error;
      return data as unknown as OwnerStatement;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['pm-owner-statements'] });
      qc.invalidateQueries({ queryKey: ['pm-owner-statement', v.id] });
    },
  });
}

export function useDeleteOwnerStatement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('pm_owner_statements' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pm-owner-statements'] }),
  });
}

export function useAddStatementLine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (line: Partial<OwnerStatementLine> & { statement_id: string; line_type: StatementLineType; amount: number }) => {
      const { data, error } = await supabase
        .from('pm_owner_statement_lines' as any).insert(line).select('*').single();
      if (error) throw error;
      return data as unknown as OwnerStatementLine;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['pm-owner-statement-lines', v.statement_id] });
      qc.invalidateQueries({ queryKey: ['pm-owner-statement', v.statement_id] });
    },
  });
}

export function useUpdateStatementLine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<OwnerStatementLine> }) => {
      const { data, error } = await supabase
        .from('pm_owner_statement_lines' as any).update(patch).eq('id', id).select('*').single();
      if (error) throw error;
      return data as unknown as OwnerStatementLine;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['pm-owner-statement-lines', data.statement_id] });
      qc.invalidateQueries({ queryKey: ['pm-owner-statement', data.statement_id] });
    },
  });
}

export function useDeleteStatementLine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, statement_id }: { id: string; statement_id: string }) => {
      const { error } = await supabase.from('pm_owner_statement_lines' as any).delete().eq('id', id);
      if (error) throw error;
      return { statement_id };
    },
    onSuccess: (v) => {
      qc.invalidateQueries({ queryKey: ['pm-owner-statement-lines', v.statement_id] });
      qc.invalidateQueries({ queryKey: ['pm-owner-statement', v.statement_id] });
    },
  });
}

/** Draft helper: prepare initial lines from pm_tenant_ledger & pm_expenses for a period. */
export async function fetchStatementDraftData(propertyId: string, periodStart: string, periodEnd: string) {
  const [ledger, exp] = await Promise.all([
    (supabase as any).from('pm_tenant_ledger').select('id, tenant_id, entry_date, type, amount, description, lease_id')
      .gte('entry_date', periodStart).lte('entry_date', periodEnd)
      .in('type', ['rent_charge','payment']),
    (supabase as any).from('pm_expenses').select('id, expense_date, description, total, category, is_owner_visible, maintenance_request_id, unit_id')
      .eq('property_id', propertyId)
      .gte('expense_date', periodStart).lte('expense_date', periodEnd),
  ]);
  // Filter ledger by lease→unit→property is complex; caller may pass lease list. Return raw.
  return { ledger: ledger.data ?? [], expenses: exp.data ?? [] };
}
