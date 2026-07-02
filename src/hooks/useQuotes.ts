import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Quote = Database['public']['Tables']['quotes']['Row'];
type QuoteInsert = Database['public']['Tables']['quotes']['Insert'];
type QuoteUpdate = Database['public']['Tables']['quotes']['Update'];
type LineItem = Database['public']['Tables']['quote_line_items']['Row'];
type LineItemInsert = Database['public']['Tables']['quote_line_items']['Insert'];

export function useQuotes(filters?: { approval_status?: string; search?: string }) {
  return useQuery({
    queryKey: ['quotes', filters],
    queryFn: async () => {
      let query = supabase.from('quotes').select('*, leads(first_name, last_name, company_name), customers(first_name, last_name, company_name, email, phone)').order('created_at', { ascending: false });
      if (filters?.approval_status) query = query.eq('approval_status', filters.approval_status as any);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useQuote(id: string | undefined) {
  return useQuery({
    queryKey: ['quote', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase.from('quotes').select('*, leads(*), customers(*), properties(*)').eq('id', id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useQuoteLineItems(quoteId: string | undefined) {
  return useQuery({
    queryKey: ['quote_line_items', quoteId],
    queryFn: async () => {
      if (!quoteId) return [];
      const { data, error } = await supabase.from('quote_line_items').select('*').eq('quote_id', quoteId).order('sort_order');
      if (error) throw error;
      return data as LineItem[];
    },
    enabled: !!quoteId,
  });
}

export function useCreateQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (quote: QuoteInsert) => {
      const { data, error } = await supabase.from('quotes').insert(quote).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quotes'] }),
  });
}

export function useUpdateQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: QuoteUpdate & { id: string }) => {
      const { data, error } = await supabase.from('quotes').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['quotes'] });
      qc.invalidateQueries({ queryKey: ['quote', data.id] });
    },
  });
}

export function useUpsertLineItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ quoteId, items }: { quoteId: string; items: LineItemInsert[] }) => {
      // Delete existing then insert new
      await supabase.from('quote_line_items').delete().eq('quote_id', quoteId);
      if (items.length > 0) {
        const { error } = await supabase.from('quote_line_items').insert(items);
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['quote_line_items', vars.quoteId] });
      // Refetch quote since DB triggers recalculate subtotal/tax/total
      qc.invalidateQueries({ queryKey: ['quote', vars.quoteId] });
      qc.invalidateQueries({ queryKey: ['quotes'] });
    },
  });
}
