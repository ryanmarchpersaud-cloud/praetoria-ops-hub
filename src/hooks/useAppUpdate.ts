import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';

// Current app version — bump this each time you publish a new TWA/Play Store build
export const APP_VERSION = '1.0.0';

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

export function useAppUpdate() {
  const [dismissed, setDismissed] = useState(false);

  const { data: versionInfo } = useQuery({
    queryKey: ['app_version', 'android'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_versions' as any)
        .select('*')
        .eq('platform', 'android')
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    staleTime: 30 * 60 * 1000, // check every 30 min
    refetchOnWindowFocus: true,
  });

  // Reset dismiss when a new version is detected
  useEffect(() => {
    if (versionInfo?.current_version) {
      const lastDismissed = localStorage.getItem('update_dismissed_version');
      if (lastDismissed !== versionInfo.current_version) {
        setDismissed(false);
      }
    }
  }, [versionInfo?.current_version]);

  const currentVersion = versionInfo?.current_version || APP_VERSION;
  const minimumVersion = versionInfo?.minimum_version || APP_VERSION;
  const storeUrl = versionInfo?.store_url || 'https://play.google.com/store/apps/details?id=ca.praetoriagroup.opshub';
  const releaseNotes = versionInfo?.release_notes || null;
  const forceUpdate = versionInfo?.force_update || false;

  const hasUpdate = compareVersions(currentVersion, APP_VERSION) > 0;
  const isCritical = forceUpdate || compareVersions(minimumVersion, APP_VERSION) > 0;

  const dismiss = () => {
    if (!isCritical) {
      setDismissed(true);
      localStorage.setItem('update_dismissed_version', currentVersion);
    }
  };

  return {
    hasUpdate,
    isCritical,
    dismissed,
    dismiss,
    currentVersion,
    storeUrl,
    releaseNotes,
    showBanner: hasUpdate && !dismissed,
  };
}
