import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

/**
 * Property Owner Portal — data hooks
 * All queries rely on RLS: the property_owner role can only see rows
 * scoped to properties they are linked to. Ops staff access is unchanged.
 */

export function useOwnerRecord() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['owner-portal', 'owner-record', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('pm_property_owners')
        .select('id, owner_name, company_name, email, phone, mailing_address, is_active')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useOwnerProperties() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['owner-portal', 'properties', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pm_managed_properties')
        .select('id, property_name, address_line_1, city, province, postal_code, property_type, is_active')
        .order('property_name');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });
}

export function useOwnerProperty(id?: string) {
  return useQuery({
    queryKey: ['owner-portal', 'property', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('pm_managed_properties')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useOwnerUnitsForProperty(propertyId?: string) {
  return useQuery({
    queryKey: ['owner-portal', 'units', propertyId],
    queryFn: async () => {
      if (!propertyId) return [];
      const { data, error } = await supabase
        .from('pm_units')
        .select('id, unit_label, bedrooms, bathrooms, status')
        .eq('property_id', propertyId)
        .order('unit_label');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!propertyId,
  });
}

export function useOwnerLeasesForProperty(propertyId?: string) {
  return useQuery({
    queryKey: ['owner-portal', 'leases', propertyId],
    queryFn: async () => {
      if (!propertyId) return [];
      const { data, error } = await supabase
        .from('pm_leases')
        .select(`
          id, start_date, end_date, monthly_rent, status, rent_frequency, unit_id,
          tenant:pm_tenants(id, first_name, last_name)
        `)
        .eq('property_id', propertyId)
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!propertyId,
  });
}

export function useOwnerMaintenanceRequests(propertyId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['owner-portal', 'maintenance', propertyId ?? 'all', user?.id],
    queryFn: async () => {
      let q = supabase
        .from('pm_maintenance_requests')
        .select(`
          id, title, category, priority, status, created_at, completed_at,
          property_id, unit_id, is_urgent_safety,
          property:pm_managed_properties(id, property_name),
          unit:pm_units(id, unit_label)
        `)
        .order('created_at', { ascending: false });
      if (propertyId) q = q.eq('property_id', propertyId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });
}
