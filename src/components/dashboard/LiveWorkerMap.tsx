import { useEffect, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Radio } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { format } from 'date-fns';

interface WorkerMapPoint {
  id: string;
  workerName: string | null;
  visitNumber: string | null;
  serviceType: string | null;
  propertyName: string | null;
  city: string | null;
  lat: number;
  lng: number;
  status: 'on_site' | 'scheduled' | 'completed';
  scheduledTime: string | null;
  hoursToday: number;
}

function useLiveWorkerMap() {
  const today = format(new Date(), 'yyyy-MM-dd');
  return useQuery({
    queryKey: ['live_worker_map', today],
    refetchInterval: 30000, // 30s auto-refresh
    queryFn: async (): Promise<WorkerMapPoint[]> => {
      const [visitsRes, timesheetsRes] = await Promise.all([
        supabase
          .from('visits')
          .select(`
            id, visit_number, service_category, scheduled_start_time, visit_status,
            assigned_worker_id,
            properties(property_name, city, latitude, longitude)
          `)
          .eq('service_date', today),
        supabase
          .from('timesheets')
          .select('user_id, clock_in, clock_out')
          .gte('clock_in', `${today}T00:00:00`)
          .lte('clock_in', `${today}T23:59:59`),
      ]);

      if (visitsRes.error) throw visitsRes.error;
      if (timesheetsRes.error) throw timesheetsRes.error;

      // Resolve worker names
      const workerIds = Array.from(new Set(
        (visitsRes.data ?? []).map(v => v.assigned_worker_id).filter(Boolean)
      )) as string[];
      let nameMap = new Map<string, string>();
      if (workerIds.length > 0) {
        const { data: profs } = await supabase
          .from('worker_profiles')
          .select('user_id, full_name')
          .in('user_id', workerIds);
        nameMap = new Map((profs ?? []).map((p: any) => [p.user_id, p.full_name ?? 'Worker']));
      }

      // Aggregate hours today + active session by user
      const hoursByUser = new Map<string, number>();
      const activeUsers = new Set<string>();
      const now = Date.now();
      for (const ts of timesheetsRes.data ?? []) {
        if (!ts.user_id) continue;
        const start = new Date(ts.clock_in).getTime();
        const end = ts.clock_out ? new Date(ts.clock_out).getTime() : now;
        const hrs = (end - start) / 3600000;
        hoursByUser.set(ts.user_id, (hoursByUser.get(ts.user_id) ?? 0) + hrs);
        if (!ts.clock_out) activeUsers.add(ts.user_id);
      }

      const points: WorkerMapPoint[] = [];
      for (const v of visitsRes.data ?? []) {
        const prop: any = v.properties;
        if (!prop?.latitude || !prop?.longitude) continue;
        const isActive = v.assigned_worker_id ? activeUsers.has(v.assigned_worker_id) : false;
        const isCompleted = v.visit_status === 'Completed';
        points.push({
          id: v.id,
          workerName: v.assigned_worker_id ? nameMap.get(v.assigned_worker_id) ?? 'Unassigned' : 'Unassigned',
          visitNumber: v.visit_number,
          serviceType: v.service_category,
          propertyName: prop.property_name,
          city: prop.city,
          lat: Number(prop.latitude),
          lng: Number(prop.longitude),
          status: isActive ? 'on_site' : isCompleted ? 'completed' : 'scheduled',
          scheduledTime: v.scheduled_start_time,
          hoursToday: v.assigned_worker_id ? (hoursByUser.get(v.assigned_worker_id) ?? 0) : 0,
        });
      }
      return points;
    },
  });
}

const STATUS_COLOR = {
  on_site: '#10b981', // emerald-500
  scheduled: '#3b82f6', // blue-500
  completed: '#6b7280', // gray-500
};

const STATUS_LABEL = {
  on_site: '🟢 On Site',
  scheduled: '🔵 Scheduled',
  completed: '⚪ Completed',
};

function makeIcon(color: string, pulse: boolean) {
  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:24px;height:24px;">
        ${pulse ? `<span style="position:absolute;inset:0;border-radius:9999px;background:${color};opacity:0.45;animation:lwm-pulse 1.6s ease-out infinite;"></span>` : ''}
        <span style="position:absolute;inset:4px;border-radius:9999px;background:${color};border:2px solid white;box-shadow:0 1px 6px rgba(0,0,0,0.35);"></span>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -10],
  });
}

export function LiveWorkerMap() {
  const { data: points = [], isLoading } = useLiveWorkerMap();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  // Inject pulse keyframes once
  useEffect(() => {
    if (document.getElementById('lwm-pulse-style')) return;
    const style = document.createElement('style');
    style.id = 'lwm-pulse-style';
    style.textContent = `@keyframes lwm-pulse { 0%{transform:scale(1);opacity:.5} 100%{transform:scale(2.4);opacity:0} }`;
    document.head.appendChild(style);
  }, []);

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: false,
      preferCanvas: true,
    }).setView([50.4452, -104.6189], 11); // Regina default
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  // Render pins on data change
  useEffect(() => {
    if (!mapRef.current || !layerRef.current) return;
    layerRef.current.clearLayers();
    if (points.length === 0) return;
    const bounds: [number, number][] = [];
    for (const p of points) {
      const marker = L.marker([p.lat, p.lng], {
        icon: makeIcon(STATUS_COLOR[p.status], p.status === 'on_site'),
      });
      const timeLabel = p.scheduledTime ? p.scheduledTime.slice(0, 5) : '—';
      marker.bindPopup(`
        <div style="font-family:inherit;min-width:180px">
          <p style="font-weight:800;font-size:13px;margin:0 0 4px">${p.workerName}</p>
          <p style="font-size:11px;color:#475569;margin:0 0 6px">${STATUS_LABEL[p.status]}</p>
          <div style="display:grid;gap:2px;font-size:11px">
            <div><b>${p.visitNumber ?? ''}</b> ${p.serviceType ? `· ${p.serviceType}` : ''}</div>
            <div style="color:#64748b">${p.propertyName ?? ''}${p.city ? ` · ${p.city}` : ''}</div>
            <div style="color:#64748b">⏰ ${timeLabel} · ${p.hoursToday.toFixed(1)}h today</div>
          </div>
        </div>
      `);
      marker.addTo(layerRef.current);
      bounds.push([p.lat, p.lng]);
    }
    if (bounds.length > 0) {
      mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    }
  }, [points]);

  const counts = useMemo(() => ({
    onSite: points.filter(p => p.status === 'on_site').length,
    scheduled: points.filter(p => p.status === 'scheduled').length,
    completed: points.filter(p => p.status === 'completed').length,
  }), [points]);

  return (
    <Card>
      <CardHeader className="pb-2 px-3 md:px-6 pt-3 md:pt-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base md:text-lg font-extrabold tracking-tight flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-50 dark:bg-emerald-950/30 relative">
              <MapPin className="h-4 w-4 text-emerald-600" />
              {counts.onSite > 0 && (
                <span className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-card animate-pulse" />
              )}
            </span>
            Live Worker Map
          </CardTitle>
          <div className="flex items-center gap-3 text-[10px] md:text-[11px] font-bold">
            <span className="flex items-center gap-1 text-emerald-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> {counts.onSite} On Site
            </span>
            <span className="flex items-center gap-1 text-blue-600">
              <span className="w-2 h-2 rounded-full bg-blue-500" /> {counts.scheduled} Scheduled
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-gray-400" /> {counts.completed} Done
            </span>
            <span className="flex items-center gap-1 text-muted-foreground ml-1">
              <Radio className="h-3 w-3 animate-pulse" /> Live · 30s
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
        {isLoading && points.length === 0 ? (
          <Skeleton className="h-[360px] w-full rounded-lg" />
        ) : (
          <div className="relative">
            <div
              ref={containerRef}
              className="h-[360px] w-full rounded-lg overflow-hidden border border-border z-0"
              style={{ background: 'hsl(var(--muted))' }}
            />
            {points.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-xs text-muted-foreground bg-card/90 px-3 py-1.5 rounded-md border border-border">
                  No visits with mapped locations today
                </p>
              </div>
            )}
          </div>
        )}
        <p className="text-[10px] text-muted-foreground mt-2 text-center">
          Pins show today's visit locations. Pulsing green = worker clocked in. Click any pin for details.
        </p>
      </CardContent>
    </Card>
  );
}
