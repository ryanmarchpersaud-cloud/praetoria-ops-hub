import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

let loadedIds = new Set<string>();

function injectGtagScript(measurementId: string) {
  if (loadedIds.has(measurementId)) return;
  loadedIds.add(measurementId);

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  const inline = document.createElement('script');
  inline.textContent = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${measurementId}');
  `;
  document.head.appendChild(inline);
}

function configAdsConversion(adsId: string) {
  if (loadedIds.has(adsId)) return;
  loadedIds.add(adsId);

  const w = window as any;
  if (typeof w.gtag === 'function') {
    w.gtag('config', adsId);
  } else {
    // Retry after a short delay if gtag isn't ready yet
    setTimeout(() => {
      if (typeof w.gtag === 'function') w.gtag('config', adsId);
    }, 2000);
  }
}

export default function GoogleAnalytics() {
  const location = useLocation();
  const idsRef = useRef<{ ga4?: string; ads?: string }>({});

  // Initial load: fetch settings and inject scripts
  useEffect(() => {
    let cancelled = false;
    supabase
      .from('company_settings')
      .select('ga4_measurement_id, google_ads_conversion_id')
      .limit(1)
      .single()
      .then(({ data }) => {
        if (cancelled || !data) return;
        idsRef.current.ga4 = data.ga4_measurement_id || undefined;
        idsRef.current.ads = data.google_ads_conversion_id || undefined;
        if (idsRef.current.ga4) injectGtagScript(idsRef.current.ga4);
        if (idsRef.current.ads) configAdsConversion(idsRef.current.ads);
      });
    return () => { cancelled = true; };
  }, []);

  // Track SPA page views on route change
  useEffect(() => {
    const w = window as any;
    if (typeof w.gtag === 'function' && idsRef.current.ga4) {
      w.gtag('event', 'page_view', {
        page_path: location.pathname + location.search,
        page_location: window.location.href,
      });
    }
  }, [location.pathname, location.search]);

  return null;
}
