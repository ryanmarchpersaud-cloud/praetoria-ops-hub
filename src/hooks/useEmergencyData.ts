import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useWorkerMedicalProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['worker_medical_profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('worker_profiles')
        .select('id, allergies, carries_epipen, carries_inhaler, diabetes_alert, seizure_or_fainting_alert, blood_pressure_alert, emergency_medical_notes, medical_info_last_updated_at, medical_info_consent')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useUpdateWorkerMedical() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (fields: Record<string, any>) => {
      const { error } = await supabase
        .from('worker_profiles')
        .update({ ...fields, medical_info_last_updated_at: new Date().toISOString() })
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['worker_medical_profile'] });
      qc.invalidateQueries({ queryKey: ['worker_profile'] });
    },
  });
}

export function useSubcontractorEmergencyProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['subcontractor_emergency_profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subcontractors')
        .select('id, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, secondary_emergency_contact_name, secondary_emergency_contact_phone, secondary_emergency_contact_relationship, allergies, carries_epipen, carries_inhaler, diabetes_alert, seizure_or_fainting_alert, blood_pressure_alert, emergency_medical_notes, medical_info_last_updated_at, medical_info_consent')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useUpdateSubcontractorEmergency() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (fields: Record<string, any>) => {
      const { error } = await supabase
        .from('subcontractors')
        .update({ ...fields, medical_info_last_updated_at: new Date().toISOString() })
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subcontractor_emergency_profile'] });
      qc.invalidateQueries({ queryKey: ['subcontractor_profile'] });
    },
  });
}

export function usePropertyEmergencyInfo(propertyId?: string) {
  return useQuery({
    queryKey: ['property_emergency_info', propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('id, property_name, address_line_1, city, high_risk_flag, caution_notes, muster_point_name, muster_point_description, muster_point_photo_url, muster_point_map_notes, emergency_exit_notes, first_aid_kit_location, fire_extinguisher_location, site_emergency_notes')
        .eq('id', propertyId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!propertyId,
  });
}

export function useWorkerEmergencyContacts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['worker_emergency_contacts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_emergency_contacts')
        .select('*')
        .eq('user_id', user!.id)
        .order('is_primary', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
}
