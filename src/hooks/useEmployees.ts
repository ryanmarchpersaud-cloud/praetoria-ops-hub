import { useQuery } from '@tanstack/react-query';
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
