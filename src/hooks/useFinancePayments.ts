import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export function useFinancePayments(filters?: { billId?: string; invoiceId?: string; expenseId?: string }) {
  return useQuery({
    queryKey: ['finance_payments', filters],
    queryFn: async () => {
      let q = supabase.from('finance_payments').select('*, finance_accounts(account_name)').order('payment_date', { ascending: false });
      if (filters?.billId) q = q.eq('bill_id', filters.billId);
      if (filters?.invoiceId) q = q.eq('invoice_id', filters.invoiceId);
      if (filters?.expenseId) q = q.eq('expense_id', filters.expenseId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!(filters?.billId || filters?.invoiceId || filters?.expenseId || filters === undefined),
  });
}

export function useAllFinancePayments(filters?: { dateFrom?: string; dateTo?: string; accountId?: string; reconciled?: boolean }) {
  return useQuery({
    queryKey: ['finance_payments_all', filters],
    queryFn: async () => {
      let q = supabase.from('finance_payments')
        .select('*, finance_accounts(account_name), finance_bills(bill_number, finance_vendors(vendor_name)), invoices(invoice_number)')
        .eq('is_reversed', false)
        .order('payment_date', { ascending: false });
      if (filters?.dateFrom) q = q.gte('payment_date', filters.dateFrom);
      if (filters?.dateTo) q = q.lte('payment_date', filters.dateTo);
      if (filters?.accountId) q = q.eq('account_id', filters.accountId);
      if (filters?.reconciled !== undefined) q = q.eq('reconciled', filters.reconciled);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useRecordPayment() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (payment: any) => {
      const { data, error } = await supabase.from('finance_payments')
        .insert({ ...payment, entered_by: user?.id })
        .select().single();
      if (error) throw error;

      // Update bill or invoice balance
      if (payment.bill_id) {
        const { data: bill } = await supabase.from('finance_bills').select('total, amount_paid').eq('id', payment.bill_id).single();
        if (bill) {
          const newPaid = Number(bill.amount_paid) + Number(payment.amount);
          const newBalance = Number(bill.total) - newPaid;
          await supabase.from('finance_bills').update({
            amount_paid: Math.min(newPaid, Number(bill.total)),
            balance_due: Math.max(newBalance, 0),
            status: newBalance <= 0 ? 'paid' : 'partial',
          }).eq('id', payment.bill_id);
        }
      }
      if (payment.invoice_id) {
        const { data: inv } = await supabase.from('invoices').select('total, amount_paid').eq('id', payment.invoice_id).single();
        if (inv) {
          const newPaid = Number(inv.amount_paid) + Number(payment.amount);
          const newBalance = Number(inv.total) - newPaid;
          await supabase.from('invoices').update({
            amount_paid: Math.min(newPaid, Number(inv.total)),
            balance_due: Math.max(newBalance, 0),
            status: newBalance <= 0 ? 'Paid' : 'Partially Paid',
          }).eq('id', payment.invoice_id);
        }
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance_payments'] });
      qc.invalidateQueries({ queryKey: ['finance_payments_all'] });
      qc.invalidateQueries({ queryKey: ['finance_bills'] });
      qc.invalidateQueries({ queryKey: ['finance_dashboard'] });
      qc.invalidateQueries({ queryKey: ['finance_reports_invoices'] });
      toast.success('Payment recorded');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useReversePayment() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ paymentId, reason }: { paymentId: string; reason: string }) => {
      const { data: payment } = await supabase.from('finance_payments').select('*').eq('id', paymentId).single();
      if (!payment) throw new Error('Payment not found');
      if (payment.is_reversed) throw new Error('Already reversed');
      if (payment.reconciled) throw new Error('Cannot reverse reconciled payment');

      await supabase.from('finance_payments').update({
        is_reversed: true,
        reversed_at: new Date().toISOString(),
        reversed_reason: reason,
      }).eq('id', paymentId);

      // Reverse bill balance
      if (payment.bill_id) {
        const { data: bill } = await supabase.from('finance_bills').select('total, amount_paid').eq('id', payment.bill_id).single();
        if (bill) {
          const newPaid = Math.max(Number(bill.amount_paid) - Number(payment.amount), 0);
          const newBalance = Number(bill.total) - newPaid;
          await supabase.from('finance_bills').update({
            amount_paid: newPaid,
            balance_due: newBalance,
            status: newPaid === 0 ? 'open' : 'partial',
          }).eq('id', payment.bill_id);
        }
      }
      // Reverse invoice balance
      if (payment.invoice_id) {
        const { data: inv } = await supabase.from('invoices').select('total, amount_paid').eq('id', payment.invoice_id).single();
        if (inv) {
          const newPaid = Math.max(Number(inv.amount_paid) - Number(payment.amount), 0);
          const newBalance = Number(inv.total) - newPaid;
          await supabase.from('invoices').update({
            amount_paid: newPaid,
            balance_due: newBalance,
            status: newPaid === 0 ? 'Sent' : 'Partially Paid',
          }).eq('id', payment.invoice_id);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance_payments'] });
      qc.invalidateQueries({ queryKey: ['finance_payments_all'] });
      qc.invalidateQueries({ queryKey: ['finance_bills'] });
      qc.invalidateQueries({ queryKey: ['finance_dashboard'] });
      toast.success('Payment reversed');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdatePaymentReconciled() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ paymentId, reconciled }: { paymentId: string; reconciled: boolean }) => {
      const { error } = await supabase.from('finance_payments').update({
        reconciled,
        reconciled_at: reconciled ? new Date().toISOString() : null,
        reconciled_by: reconciled ? user?.id : null,
      }).eq('id', paymentId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance_payments'] });
      qc.invalidateQueries({ queryKey: ['finance_payments_all'] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}
