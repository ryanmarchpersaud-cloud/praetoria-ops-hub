import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useEmployees() {
  return useQuery({
    queryKey: ['employees_admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('worker_profiles')
        .select('*')
        .order('full_name', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useEmployee(userId: string | undefined) {
  return useQuery({
    queryKey: ['employee_admin', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('worker_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

export function useEmployeeCertifications(userId: string | undefined) {
  return useQuery({
    queryKey: ['employee_certifications', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('worker_certifications')
        .select('*')
        .eq('user_id', userId)
        .order('expiry_date', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!userId,
  });
}

export function useEmployeeDocuments(userId: string | undefined) {
  return useQuery({
    queryKey: ['employee_documents', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('worker_documents')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!userId,
  });
}

export function useEmployeePayStubs(userId: string | undefined) {
  return useQuery({
    queryKey: ['employee_pay_stubs_admin', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('employee_pay_stubs')
        .select('*')
        .eq('user_id', userId)
        .order('pay_date', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!userId,
  });
}

export function useEmployeeTimeOff(userId: string | undefined) {
  return useQuery({
    queryKey: ['employee_time_off_admin', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('employee_time_off_requests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!userId,
  });
}

export function useEmployeeEmergencyContacts(userId: string | undefined) {
  return useQuery({
    queryKey: ['employee_emergency_contacts_admin', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('employee_emergency_contacts')
        .select('*')
        .eq('user_id', userId)
        .order('is_primary', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!userId,
  });
}

export function useEmployeeEquipment(userId: string | undefined) {
  return useQuery({
    queryKey: ['employee_equipment_admin', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('worker_equipment_items')
        .select('*')
        .eq('user_id', userId)
        .order('issued_date', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!userId,
  });
}

export function useEmployeeTrainingRecords(userId: string | undefined) {
  return useQuery({
    queryKey: ['employee_training_admin', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('worker_training_records')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!userId,
  });
}

export function useIssueEquipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: {
      user_id: string;
      item_name: string;
      item_type: string;
      serial_number?: string;
      condition: string;
      issued_date: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('worker_equipment_items')
        .insert(item as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['employee_equipment_admin', variables.user_id] });
      qc.invalidateQueries({ queryKey: ['worker_equipment'] });
    },
  });
}

export function useUpdateEquipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; user_id: string; condition?: string; return_date?: string; replacement_requested?: boolean; notes?: string }) => {
      const { user_id, ...fields } = updates;
      const { error } = await supabase
        .from('worker_equipment_items')
        .update(fields as any)
        .eq('id', id);
      if (error) throw error;
      return { user_id };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['employee_equipment_admin'] });
      qc.invalidateQueries({ queryKey: ['worker_equipment'] });
    },
  });
}

export function useAssignTraining() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (record: {
      user_id: string;
      training_name: string;
      training_type: string;
      expiry_date?: string;
      notes?: string;
      file_url?: string;
    }) => {
      const { data, error } = await supabase
        .from('worker_training_records')
        .insert({ ...record, status: 'pending' } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['employee_training_admin', variables.user_id] });
      qc.invalidateQueries({ queryKey: ['worker_training_records'] });
    },
  });
}

export function useApproveCertificate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, user_id }: { id: string; status: 'valid' | 'revoked'; user_id: string }) => {
      const { error } = await supabase
        .from('worker_certifications')
        .update({ status } as any)
        .eq('id', id);
      if (error) throw error;
      return { user_id };
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['employee_certifications', variables.user_id] });
      qc.invalidateQueries({ queryKey: ['worker_certifications'] });
    },
  });
}
