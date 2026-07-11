import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Subscribes to realtime UPDATE/INSERT/DELETE events on the visits table
 * and invalidates the given react-query keys so worker/subcontractor
 * portals immediately drop cancelled/archived visits from active views
 * without a manual refresh.
 *
 * Safe by design: only invalidates queries — it never mutates visit data.
 */
export function useVisitRealtimeSync(queryKeyPrefixes: string[]) {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel(`visits-live-sync-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'visits' },
        () => {
          queryKeyPrefixes.forEach((prefix) => {
            qc.invalidateQueries({ queryKey: [prefix] });
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qc, queryKeyPrefixes.join('|')]);
}
