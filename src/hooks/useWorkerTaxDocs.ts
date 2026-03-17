import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useWorkerTaxDocuments() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['worker_tax_documents', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('worker_tax_documents')
        .select('*')
        .eq('user_id', user.id)
        .order('tax_year', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });
}

export function useWorkerTrainingRecords() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['worker_training_records', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('worker_training_records')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });
}

export function useWorkerEquipment() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['worker_equipment', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('worker_equipment_items')
        .select('*')
        .eq('user_id', user.id)
        .order('issued_date', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });
}

export function useSubcontractorTaxDocuments(subcontractorId: string | undefined) {
  return useQuery({
    queryKey: ['subcontractor_tax_documents', subcontractorId],
    queryFn: async () => {
      if (!subcontractorId) return [];
      const { data, error } = await supabase
        .from('subcontractor_tax_documents')
        .select('*')
        .eq('subcontractor_id', subcontractorId)
        .order('tax_year', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!subcontractorId,
  });
}
