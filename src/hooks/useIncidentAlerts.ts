import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useModuleAccess } from './useModuleAccess';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from './use-toast';
import { useNavigate } from 'react-router-dom';

/**
 * Subscribes to realtime INSERT events on incident_reports.
 * When a new incident is submitted, shows a prominent toast to admins
 * and refreshes sidebar counts + dashboard data.
 */
export function useIncidentAlerts() {
  const { isOwnerOrAdmin, opsFullAccess, isLoading } = useModuleAccess();
  const qc = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();
  const isAdmin = isOwnerOrAdmin || opsFullAccess;
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (isLoading || !isAdmin) return;

    const channel = supabase
      .channel('incident-alerts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'incident_reports' },
        (payload) => {
          const report = payload.new as any;

          // Refresh sidebar counts and any open incident queries
          qc.invalidateQueries({ queryKey: ['sidebar_counts'] });
          qc.invalidateQueries({ queryKey: ['admin_incident_reports'] });
          qc.invalidateQueries({ queryKey: ['dashboard'] });

          // Show prominent toast
          const severity = report.severity || 'medium';
          const isHighSeverity = severity === 'high' || severity === 'critical';

          toast({
            title: `🚨 New Incident Report ${report.report_number || ''}`,
            description: `${report.incident_type} — ${report.reporter_type === 'worker' ? 'Worker' : 'Subcontractor'} reported${report.location ? ` at ${report.location}` : ''}. ${isHighSeverity ? 'HIGH SEVERITY — Immediate attention required.' : 'Tap to review.'}`,
            variant: 'destructive',
            duration: isHighSeverity ? 30000 : 15000,
          });

          // Auto-navigate for high severity
          if (isHighSeverity && report.id) {
            navigate(`/incidents/${report.id}`);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [isAdmin, isLoading]);
}
