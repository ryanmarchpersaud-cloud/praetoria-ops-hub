import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────
export type PmPropertyType = 'single_family' | 'duplex' | 'multi_unit' | 'condo' | 'commercial' | 'other';
export type PmUnitStatus = 'vacant' | 'occupied' | 'pending' | 'inactive';
export type PmTenantStatus = 'active' | 'pending' | 'former';
export type PmLeaseStatus = 'draft' | 'active' | 'ended' | 'terminated';

export interface PmOwner {
  id: string;
  owner_name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  mailing_address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}
export interface PmProperty {
  id: string;
  property_name: string;
  address_line_1: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  property_type: PmPropertyType;
  primary_owner_id: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}
export interface PmUnit {
  id: string;
  property_id: string;
  unit_label: string;
  bedrooms: number | null;
  bathrooms: number | null;
  rent_amount: number | null;
  status: PmUnitStatus;
  notes: string | null;
}
export interface PmTenant {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  status: PmTenantStatus;
  notes: string | null;
}
export interface PmLease {
  id: string;
  tenant_id: string;
  property_id: string;
  unit_id: string | null;
  start_date: string;
  end_date: string | null;
  monthly_rent: number;
  deposit_amount: number;
  rent_due_day: number;
  status: PmLeaseStatus;
  lease_document_path: string | null;
  notes: string | null;
}

const t = (name: string) => (supabase as any).from(name);

// ─── Owners ───────────────────────────────────────────────────────────────
export function usePmOwners() {
  return useQuery<PmOwner[]>({
    queryKey: ['pm_owners'],
    queryFn: async () => {
      const { data, error } = await t('pm_property_owners').select('*').order('owner_name');
      if (error) throw error;
      return data ?? [];
    },
  });
}
export function usePmOwner(id?: string) {
  return useQuery<PmOwner | null>({
    queryKey: ['pm_owner', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await t('pm_property_owners').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}
export function useSavePmOwner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Partial<PmOwner> & { id?: string }) => {
      const { id, ...rest } = row;
      const query = id
        ? t('pm_property_owners').update(rest).eq('id', id).select().single()
        : t('pm_property_owners').insert(rest).select().single();
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pm_owners'] }); qc.invalidateQueries({ queryKey: ['pm_owner'] }); },
  });
}
export function useDeletePmOwner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await t('pm_property_owners').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pm_owners'] }),
  });
}

// ─── Properties ───────────────────────────────────────────────────────────
export function usePmProperties() {
  return useQuery<PmProperty[]>({
    queryKey: ['pm_properties'],
    queryFn: async () => {
      const { data, error } = await t('pm_managed_properties').select('*').order('property_name');
      if (error) throw error;
      return data ?? [];
    },
  });
}
export function usePmProperty(id?: string) {
  return useQuery<PmProperty | null>({
    queryKey: ['pm_property', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await t('pm_managed_properties').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}
export function useSavePmProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Partial<PmProperty> & { id?: string }) => {
      const { id, ...rest } = row;
      const query = id
        ? t('pm_managed_properties').update(rest).eq('id', id).select().single()
        : t('pm_managed_properties').insert(rest).select().single();
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pm_properties'] }); qc.invalidateQueries({ queryKey: ['pm_property'] }); },
  });
}
export function useDeletePmProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await t('pm_managed_properties').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pm_properties'] }),
  });
}

// ─── Units ────────────────────────────────────────────────────────────────
export function usePmUnits(propertyId?: string) {
  return useQuery<PmUnit[]>({
    queryKey: ['pm_units', propertyId ?? 'all'],
    queryFn: async () => {
      let q = t('pm_units').select('*').order('unit_label');
      if (propertyId) q = q.eq('property_id', propertyId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}
export function useSavePmUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Partial<PmUnit> & { id?: string }) => {
      const { id, ...rest } = row;
      const query = id
        ? t('pm_units').update(rest).eq('id', id).select().single()
        : t('pm_units').insert(rest).select().single();
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pm_units'] }),
  });
}
export function useDeletePmUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await t('pm_units').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pm_units'] }),
  });
}

// ─── Tenants ──────────────────────────────────────────────────────────────
export function usePmTenants() {
  return useQuery<PmTenant[]>({
    queryKey: ['pm_tenants'],
    queryFn: async () => {
      const { data, error } = await t('pm_tenants').select('*').order('first_name');
      if (error) throw error;
      return data ?? [];
    },
  });
}
export function usePmTenant(id?: string) {
  return useQuery<PmTenant | null>({
    queryKey: ['pm_tenant', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await t('pm_tenants').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}
export function useSavePmTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Partial<PmTenant> & { id?: string }) => {
      const { id, ...rest } = row;
      const query = id
        ? t('pm_tenants').update(rest).eq('id', id).select().single()
        : t('pm_tenants').insert(rest).select().single();
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pm_tenants'] }); qc.invalidateQueries({ queryKey: ['pm_tenant'] }); },
  });
}
export function useDeletePmTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await t('pm_tenants').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pm_tenants'] }),
  });
}

// ─── Leases ───────────────────────────────────────────────────────────────
export function usePmLeases() {
  return useQuery<PmLease[]>({
    queryKey: ['pm_leases'],
    queryFn: async () => {
      const { data, error } = await t('pm_leases').select('*').order('start_date', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}
export function usePmLease(id?: string) {
  return useQuery<PmLease | null>({
    queryKey: ['pm_lease', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await t('pm_leases').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}
export function useSavePmLease() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Partial<PmLease> & { id?: string }) => {
      const { id, ...rest } = row;
      const query = id
        ? t('pm_leases').update(rest).eq('id', id).select().single()
        : t('pm_leases').insert(rest).select().single();
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pm_leases'] }); qc.invalidateQueries({ queryKey: ['pm_lease'] }); },
  });
}
export function useDeletePmLease() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await t('pm_leases').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pm_leases'] }),
  });
}

// ─── Dashboard summary ────────────────────────────────────────────────────
export function usePmSummary() {
  return useQuery({
    queryKey: ['pm_summary'],
    queryFn: async () => {
      const [props, units, tenants, leases, owners] = await Promise.all([
        t('pm_managed_properties').select('id, is_active'),
        t('pm_units').select('id, status'),
        t('pm_tenants').select('id, status'),
        t('pm_leases').select('id, status'),
        t('pm_property_owners').select('id, is_active'),
      ]);
      const p = props.data ?? [];
      const u = units.data ?? [];
      const te = tenants.data ?? [];
      const l = leases.data ?? [];
      const o = owners.data ?? [];
      return {
        totalProperties: p.length,
        activeProperties: p.filter((x: any) => x.is_active).length,
        totalUnits: u.length,
        occupiedUnits: u.filter((x: any) => x.status === 'occupied').length,
        vacantUnits: u.filter((x: any) => x.status === 'vacant').length,
        activeTenants: te.filter((x: any) => x.status === 'active').length,
        totalTenants: te.length,
        activeLeases: l.filter((x: any) => x.status === 'active').length,
        totalOwners: o.length,
      };
    },
  });
}
