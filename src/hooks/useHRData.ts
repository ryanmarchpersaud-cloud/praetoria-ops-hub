import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/** All emergency contacts across all employees */
export function useAllEmergencyContacts() {
  return useQuery({
    queryKey: ['all_emergency_contacts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_emergency_contacts')
        .select('*')
        .order('is_primary', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** All time-off requests across all employees */
export function useAllTimeOffRequests() {
  return useQuery({
    queryKey: ['all_time_off_requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_time_off_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** All certifications across all employees */
export function useAllCertifications() {
  return useQuery({
    queryKey: ['all_certifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('worker_certifications')
        .select('*')
        .order('expiry_date', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** All equipment items across all employees */
export function useAllEquipment() {
  return useQuery({
    queryKey: ['all_equipment_items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('worker_equipment_items')
        .select('*')
        .order('issued_date', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** All incident reports (admin view) */
export function useAllIncidentReports() {
  return useQuery({
    queryKey: ['all_incident_reports_hr'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incident_reports')
        .select('*')
        .order('date_time', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** All worker documents across all employees */
export function useAllWorkerDocuments() {
  return useQuery({
    queryKey: ['all_worker_documents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('worker_documents')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Policy signoffs across all users */
export function useAllPolicySignoffs() {
  return useQuery({
    queryKey: ['all_policy_signoffs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_policy_signoffs')
        .select('*')
        .order('signed_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}
