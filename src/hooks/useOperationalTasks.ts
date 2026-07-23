import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Task = Database['public']['Tables']['operational_tasks']['Row'];
type TaskInsert = Database['public']['Tables']['operational_tasks']['Insert'];
type TaskUpdate = Database['public']['Tables']['operational_tasks']['Update'];

export type TaskAssignee = {
  id: string;
  task_id: string;
  user_id: string;
  assignee_type: 'worker' | 'subcontractor';
  notified_at: string | null;
  created_at: string;
};

const TASK_SELECT = '*, customers(first_name, last_name, company_name), properties(property_name, address_line_1, city), operational_task_assignees(id, user_id, assignee_type, notified_at, created_at)';

export function useOperationalTasks(filters?: { status?: string; assignee_type?: string; assigned_to?: string }) {
  return useQuery({
    queryKey: ['operational_tasks', filters],
    queryFn: async () => {
      let query = supabase
        .from('operational_tasks')
        .select(TASK_SELECT)
        .order('created_at', { ascending: false });
      if (filters?.status) query = query.eq('status', filters.status as any);
      if (filters?.assignee_type) query = query.eq('assignee_type', filters.assignee_type);
      if (filters?.assigned_to) query = query.eq('assigned_to', filters.assigned_to);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useMyTasks(userId: string | undefined) {
  return useQuery({
    queryKey: ['my_operational_tasks', userId],
    queryFn: async () => {
      if (!userId) return [];
      // Get task ids where I am an assignee (multi) OR legacy single assignment
      const [{ data: linkRows, error: linkErr }, { data: legacyRows, error: legacyErr }] = await Promise.all([
        supabase.from('operational_task_assignees').select('task_id').eq('user_id', userId),
        supabase.from('operational_tasks').select('id').eq('assigned_to', userId),
      ]);
      if (linkErr) throw linkErr;
      if (legacyErr) throw legacyErr;
      const ids = Array.from(new Set([
        ...(linkRows ?? []).map((r: any) => r.task_id),
        ...(legacyRows ?? []).map((r: any) => r.id),
      ]));
      if (ids.length === 0) return [];
      const { data, error } = await supabase
        .from('operational_tasks')
        .select('*, customers(first_name, last_name, company_name), properties(property_name, address_line_1, city)')
        .in('id', ids)
        .not('status', 'in', '("Completed","Cancelled")')
        .order('due_date', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

export function useOperationalTask(id: string | undefined) {
  return useQuery({
    queryKey: ['operational_task', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('operational_tasks')
        .select('*, customers(first_name, last_name, company_name), properties(property_name, address_line_1, city), jobs(job_title, job_number), visits(visit_number), operational_task_assignees(id, user_id, assignee_type, notified_at, created_at)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

async function syncAssignees(taskId: string, desired: { user_id: string; assignee_type: 'worker' | 'subcontractor' }[]) {
  const { data: existing, error } = await supabase
    .from('operational_task_assignees')
    .select('id, user_id')
    .eq('task_id', taskId);
  if (error) throw error;
  const existingIds = new Set((existing ?? []).map((r: any) => r.user_id));
  const desiredIds = new Set(desired.map(d => d.user_id));

  // Insert new
  const toInsert = desired.filter(d => !existingIds.has(d.user_id));
  if (toInsert.length) {
    const { error: insErr } = await supabase.from('operational_task_assignees').insert(
      toInsert.map(d => ({ task_id: taskId, user_id: d.user_id, assignee_type: d.assignee_type }))
    );
    if (insErr) throw insErr;
  }

  // Remove ones no longer desired
  const toRemove = (existing ?? []).filter((r: any) => !desiredIds.has(r.user_id)).map((r: any) => r.id);
  if (toRemove.length) {
    const { error: delErr } = await supabase.from('operational_task_assignees').delete().in('id', toRemove);
    if (delErr) throw delErr;
  }
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      task: TaskInsert & { assignees?: { user_id: string; assignee_type: 'worker' | 'subcontractor' }[] }
    ) => {
      const { assignees = [], ...taskData } = task as any;
      // Set legacy assigned_to to first assignee for back-compat
      const first = assignees[0];
      const payload = {
        ...taskData,
        assigned_to: taskData.assigned_to ?? first?.user_id ?? null,
        assignee_type: taskData.assignee_type ?? first?.assignee_type ?? 'worker',
        status: taskData.status ?? (assignees.length ? ('Assigned' as any) : ('New' as any)),
      };
      const { data, error } = await supabase.from('operational_tasks').insert(payload).select().single();
      if (error) throw error;
      if (assignees.length) {
        await syncAssignees(data.id, assignees);
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['operational_tasks'] });
      qc.invalidateQueries({ queryKey: ['my_operational_tasks'] });
    },
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      assignees,
      ...updates
    }: TaskUpdate & { id: string; assignees?: { user_id: string; assignee_type: 'worker' | 'subcontractor' }[] }) => {
      const payload: any = { ...updates };
      if (updates.status === 'Completed' as any) {
        payload.completed_at = new Date().toISOString();
      }
      // Only send update if there are non-assignee changes
      let data: any = null;
      if (Object.keys(payload).length > 0) {
        const res = await supabase.from('operational_tasks').update(payload).eq('id', id).select().single();
        if (res.error) throw res.error;
        data = res.data;
      }
      if (assignees) {
        await syncAssignees(id, assignees);
        // Keep legacy assigned_to pointing at the first assignee (or null)
        const first = assignees[0];
        const res2 = await supabase
          .from('operational_tasks')
          .update({
            assigned_to: first?.user_id ?? null,
            assignee_type: first?.assignee_type ?? 'worker',
          })
          .eq('id', id)
          .select()
          .single();
        if (res2.error) throw res2.error;
        data = res2.data;
      }
      return data ?? { id };
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['operational_tasks'] });
      qc.invalidateQueries({ queryKey: ['my_operational_tasks'] });
      if (data?.id) qc.invalidateQueries({ queryKey: ['operational_task', data.id] });
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('operational_tasks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['operational_tasks'] });
      qc.invalidateQueries({ queryKey: ['my_operational_tasks'] });
    },
  });
}

/** Fetch worker & subcontractor directories combined for assignment pickers */
export function useAssignableUsers() {
  return useQuery({
    queryKey: ['assignable_users'],
    queryFn: async () => {
      const [{ data: workers, error: wErr }, { data: subs, error: sErr }] = await Promise.all([
        supabase.from('worker_profiles').select('user_id, full_name, email').order('full_name'),
        supabase.from('subcontractors').select('user_id, contact_name, company_name').order('contact_name'),
      ]);
      if (wErr) throw wErr;
      if (sErr) throw sErr;
      const list: { user_id: string; label: string; sublabel?: string; assignee_type: 'worker' | 'subcontractor' }[] = [];
      (workers ?? []).forEach((w: any) => {
        if (!w.user_id) return;
        list.push({ user_id: w.user_id, label: w.full_name || w.email || 'Worker', sublabel: 'Worker', assignee_type: 'worker' });
      });
      (subs ?? []).forEach((s: any) => {
        if (!s.user_id) return;
        list.push({
          user_id: s.user_id,
          label: s.contact_name || s.company_name || 'Subcontractor',
          sublabel: s.company_name ? `Subcontractor · ${s.company_name}` : 'Subcontractor',
          assignee_type: 'subcontractor',
        });
      });
      return list;
    },
  });
}

export const TASK_CATEGORIES = [
  'Shopping / Materials Pickup',
  'Parts Purchase',
  'Property Check',
  'Site Inspection',
  'Delivery / Drop-off',
  'Estimate Support',
  'Photo Verification',
  'Maintenance Check',
  'Other',
] as const;

export const TASK_STATUSES = ['New', 'Assigned', 'In Progress', 'Waiting', 'Completed', 'Cancelled'] as const;
export const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
