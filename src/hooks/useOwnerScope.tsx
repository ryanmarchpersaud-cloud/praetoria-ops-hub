import { createContext, useContext, useMemo, ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useAuthorization } from './useAuthorization';

/**
 * Owner portal scope.
 *
 * Two modes:
 *  - "self": the signed-in user is a real property_owner. RLS scopes their reads.
 *  - "preview": an admin is previewing the portal for a specific owner id
 *    (`/owner?adminPreview=<ownerId>`). Because admin RLS lets them read all rows,
 *    the client MUST additionally filter every owner query by the scope below so
 *    the preview mirrors what the real owner would see.
 */
export type OwnerScope = {
  isPreview: boolean;
  ownerId?: string;          // pm_property_owners.id being viewed
  propertyIds?: string[];    // property ids linked to that owner (preview only)
  ready: boolean;            // false while resolving preview scope
};

const Ctx = createContext<OwnerScope>({ isPreview: false, ready: true });

export function OwnerScopeProvider({ children }: { children: ReactNode }) {
  const [params] = useSearchParams();
  const raw = params.get('adminPreview');
  const { user } = useAuth();
  const { isAdmin, isOwner } = useAuthorization();
  const canPreview = !!(user && (isAdmin || isOwner));

  // Accept `?adminPreview=<uuid>` or the legacy `?adminPreview=1`.
  const isUuid = !!raw && /^[0-9a-f-]{36}$/i.test(raw);
  const previewOwnerId = canPreview && isUuid ? raw! : undefined;
  const isPreview = canPreview && !!raw;

  const scopeQuery = useQuery({
    queryKey: ['owner-preview-scope', previewOwnerId],
    enabled: !!previewOwnerId,
    queryFn: async () => {
      const [linked, primary] = await Promise.all([
        supabase.from('pm_owner_properties').select('property_id').eq('owner_id', previewOwnerId!),
        supabase.from('pm_managed_properties').select('id').eq('primary_owner_id', previewOwnerId!),
      ]);
      if (linked.error) throw linked.error;
      if (primary.error) throw primary.error;
      const ids = new Set<string>();
      (linked.data ?? []).forEach((r: any) => r.property_id && ids.add(r.property_id));
      (primary.data ?? []).forEach((r: any) => r.id && ids.add(r.id));
      return Array.from(ids);
    },
  });

  const value = useMemo<OwnerScope>(() => {
    if (!isPreview) return { isPreview: false, ready: true };
    if (!previewOwnerId) {
      // adminPreview=1 without an owner id — nothing to scope to.
      return { isPreview: true, ready: true, propertyIds: [] };
    }
    return {
      isPreview: true,
      ownerId: previewOwnerId,
      propertyIds: scopeQuery.data,
      ready: !scopeQuery.isLoading,
    };
  }, [isPreview, previewOwnerId, scopeQuery.data, scopeQuery.isLoading]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOwnerScope(): OwnerScope {
  return useContext(Ctx);
}

/** true = current owner query should return nothing (preview owner has no properties). */
export function scopeBlocksAll(scope: OwnerScope) {
  return scope.isPreview && (!scope.propertyIds || scope.propertyIds.length === 0);
}
