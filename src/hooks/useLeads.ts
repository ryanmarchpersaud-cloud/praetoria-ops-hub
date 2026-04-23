import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Lead = Database['public']['Tables']['leads']['Row'];
type LeadInsert = Database['public']['Tables']['leads']['Insert'];
type LeadUpdate = Database['public']['Tables']['leads']['Update'];

export function useLeads(filters?: { status?: string; service_type?: string; search?: string }) {
  return useQuery({
    queryKey: ['leads', filters],
    queryFn: async () => {
      let query = supabase.from('leads').select('*').order('created_at', { ascending: false });
      if (filters?.status) query = query.eq('status', filters.status as any);
      if (filters?.service_type) query = query.eq('service_type', filters.service_type as any);
      if (filters?.search) {
        query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,company_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as Lead[];
    },
  });
}

export function useLead(id: string | undefined) {
  return useQuery({
    queryKey: ['lead', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase.from('leads').select('*').eq('id', id).single();
      if (error) throw error;
      return data as Lead;
    },
    enabled: !!id,
  });
}

/**
 * Errors that are safe to retry once (network blips, transient 5xx, abort).
 * Postgres / RLS / validation errors are NOT retried.
 */
function isTransientError(err: any): boolean {
  if (!err) return false;
  const msg = String(err?.message ?? '').toLowerCase();
  if (msg.includes('failed to fetch')) return true;
  if (msg.includes('networkerror')) return true;
  if (msg.includes('network error')) return true;
  if (msg.includes('load failed')) return true;
  if (msg.includes('timeout')) return true;
  if (msg.includes('aborted')) return true;
  const status = Number(err?.status ?? err?.code);
  if (status >= 500 && status < 600) return true;
  return false;
}

async function findRecentDuplicateLead(
  payload: LeadInsert,
  createdBy: string,
): Promise<Lead | null> {
  const sinceIso = new Date(Date.now() - 60_000).toISOString();
  let query = supabase
    .from('leads')
    .select('*')
    .gte('created_at', sinceIso)
    .eq('created_by', createdBy)
    .ilike('first_name', payload.first_name ?? '')
    .ilike('last_name', payload.last_name ?? '')
    .limit(1);

  if (payload.phone) {
    query = query.eq('phone', payload.phone);
  } else if (payload.email) {
    query = query.ilike('email', payload.email);
  } else {
    return null;
  }

  const { data, error } = await query.maybeSingle();
  if (error) return null;
  return (data as Lead) ?? null;
}

export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lead: LeadInsert) => {
      // IMPORTANT (iOS): Use getSession() which reads the cached session
      // synchronously from local storage. supabase.auth.getUser() makes a
      // network round-trip to /auth/v1/user that iOS Safari frequently
      // cancels when the dialog closes / the on-screen keyboard collapses
      // right after the user taps "Submit", causing the entire mutation to
      // silently abort before the lead is ever inserted.
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;
      if (!userId) {
        throw new Error('You must be signed in to submit a lead.');
      }

      const payload: LeadInsert = {
        ...lead,
        created_by: userId,
      };

      // Pre-check: if THIS user just submitted the same lead in the last 60s,
      // return that one instead of creating a duplicate. Scoped by created_by
      // so we never collapse two different users' leads into one.
      const preExisting = await findRecentDuplicateLead(payload, userId);
      if (preExisting) return preExisting;

      const insertOnce = async () => {
        const { data, error } = await supabase
          .from('leads')
          .insert(payload)
          .select()
          .single();
        if (error) {
          const raw = String(error.message ?? '');
          // Translate confusing Postgres / PostgREST errors into something
          // a field user can actually act on.
          if (
            raw.toLowerCase().includes('row-level security') ||
            raw.toLowerCase().includes('row level security') ||
            (error as any).code === '42501'
          ) {
            throw new Error(
              "Your account isn't set up to submit field leads yet. Please ask an admin to enable portal access for you."
            );
          }
          if (raw.toLowerCase().includes('schema cache')) {
            throw new Error(
              'We couldn\'t save this lead because the form sent an unexpected field. Please refresh the app and try again.'
            );
          }
          throw error;
        }
        return data as Lead;
      };

      try {
        return await insertOnce();
      } catch (err: any) {
        if (!isTransientError(err)) throw err;

        // The insert may have actually landed before the network failed.
        const landed = await findRecentDuplicateLead(payload, userId);
        if (landed) return landed;

        try {
          return await insertOnce();
        } catch (retryErr: any) {
          const afterRetry = await findRecentDuplicateLead(payload, userId);
          if (afterRetry) return afterRetry;
          throw retryErr;
        }
      }
    },
    onMutate: async (lead) => {
      // Optimistically reflect the new lead on the dashboard so ops sees it
      // immediately, even if the network round-trip is slow.
      await qc.cancelQueries({ queryKey: ['dashboard_leads'] });
      const previous = qc.getQueryData<any[]>(['dashboard_leads']);
      const optimistic = {
        id: `optimistic-${Date.now()}`,
        status: lead.status ?? 'New',
        first_name: lead.first_name ?? '',
        last_name: lead.last_name ?? '',
        company_name: lead.company_name ?? null,
        service_type: lead.service_type ?? null,
        created_at: new Date().toISOString(),
        __optimistic: true,
      };
      qc.setQueryData<any[]>(['dashboard_leads'], (old) => [optimistic, ...(old ?? [])]);
      return { previous };
    },
    onError: (_err, _lead, context) => {
      if (context?.previous) {
        qc.setQueryData(['dashboard_leads'], context.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['dashboard_leads'] });
    },
  });
}

export function useUpdateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: LeadUpdate & { id: string }) => {
      const { data, error } = await supabase.from('leads').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['lead', data.id] });
    },
  });
}

export function useDeleteLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  });
}
