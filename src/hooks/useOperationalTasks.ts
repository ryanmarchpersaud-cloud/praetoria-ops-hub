import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Task = Database['public']['Tables']['operational_tasks']['Row'];
type TaskInsert = Database['public']['Tables']['operational_tasks']['Insert'];
type TaskUpdate = Database['public']['Tables']['operational_tasks']['Update'];

export function useOperationalTasks(filters?: { status?: string; assignee_type?: string; assigned_to?: string }) {
  return useQuery({
    queryKey: ['operational_tasks', filters],
    queryFn: async () => {
      let query = supabase
        .from('operational_tasks')
        .select('*, customers(first_name, last_name, company_name), properties(property_name, address_line_1, city)')
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
      const { data, error } = await supabase
        .from('operational_tasks')
        .select('*, customers(first_name, last_name, company_name), properties(property_name, address_line_1, city)')
        .eq('assigned_to', userId)
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
        .select('*, customers(first_name, last_name, company_name), properties(property_name, address_line_1, city), jobs(job_title, job_number), visits(visit_number)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (task: TaskInsert) => {
      const { data, error } = await supabase.from('operational_tasks').insert(task).select().single();
      if (error) throw error;
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
    mutationFn: async ({ id, ...updates }: TaskUpdate & { id: string }) => {
      const payload: any = { ...updates };
      if (updates.status === 'Completed' as any) {
        payload.completed_at = new Date().toISOString();
      }
      const { data, error } = await supabase.from('operational_tasks').update(payload).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['operational_tasks'] });
      qc.invalidateQueries({ queryKey: ['my_operational_tasks'] });
      qc.invalidateQueries({ queryKey: ['operational_task', data.id] });
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
