import { useEffect, useRef, useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Navigation, ChevronRight, Route } from 'lucide-react';
import { cn } from '@/lib/utils';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface RouteStop {
  id: string;
  label: string;
  address: string;
  city?: string;
  status: string;
  lat?: number;
  lng?: number;
}

interface DailyRouteMapProps {
  stops: RouteStop[];
  className?: string;
}

// Geocode using OpenStreetMap Nominatim (free, no key)
async function geocodeAddress(address: string, city?: string): Promise<{ lat: number; lng: number } | null> {
  const q = [address, city].filter(Boolean).join(', ');
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`,
      { headers: { 'User-Agent': 'PraetoriaOpsHub/1.0' } }
    );
    const data = await res.json();
    if (data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch {
    // silent fail
  }
  return null;
}

const statusDot: Record<string, string> = {
  Completed: 'bg-emerald-500',
  'In Progress': 'bg-primary',
  'En Route': 'bg-amber-500',
  Scheduled: 'bg-blue-400',
  Planned: 'bg-muted-foreground',
  completed: 'bg-emerald-500',
  in_progress: 'bg-primary',
  en_route: 'bg-amber-500',
  assigned: 'bg-blue-400',
};

function createNumberedIcon(index: number, status: string) {
  const isCompleted = status === 'Completed' || status === 'completed';
  const isActive = status === 'In Progress' || status === 'in_progress' || status === 'En Route' || status === 'en_route';
  const bg = isCompleted ? '#10b981' : isActive ? 'hsl(215,65%,48%)' : '#3b82f6';
  const size = isActive ? 36 : 30;

  return L.divIcon({
    className: 'custom-route-marker',
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${bg};color:white;font-weight:700;font-size:${isActive ? 14 : 12}px;
      display:flex;align-items:center;justify-content:center;
      border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);
      ${isActive ? 'animation:pulse 2s infinite;' : ''}
    ">${index + 1}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export function DailyRouteMap({ stops, className }: DailyRouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const [geocoded, setGeocoded] = useState<(RouteStop & { lat: number; lng: number })[]>([]);
  const [loading, setLoading] = useState(true);

  // Geocode all stops
  useEffect(() => {
    if (stops.length === 0) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function resolve() {
      const results: (RouteStop & { lat: number; lng: number })[] = [];
      for (const stop of stops) {
        if (stop.lat && stop.lng) {
          results.push({ ...stop, lat: stop.lat, lng: stop.lng });
        } else {
          const coords = await geocodeAddress(stop.address, stop.city);
          if (coords && !cancelled) {
            results.push({ ...stop, ...coords });
          }
          // Rate limit for Nominatim (1 req/sec)
          await new Promise(r => setTimeout(r, 1100));
        }
        if (cancelled) return;
      }
      if (!cancelled) {
        setGeocoded(results);
        setLoading(false);
      }
    }
    resolve();
    return () => { cancelled = true; };
  }, [stops]);

  // Render map
  useEffect(() => {
    if (!mapRef.current || geocoded.length === 0) return;

    // Clean up old map
    if (mapInstance.current) {
      mapInstance.current.remove();
      mapInstance.current = null;
    }

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
    });
    mapInstance.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
    }).addTo(map);

    const markers: L.LatLng[] = [];

    geocoded.forEach((stop, i) => {
      const latlng = L.latLng(stop.lat, stop.lng);
      markers.push(latlng);
      L.marker(latlng, { icon: createNumberedIcon(i, stop.status) })
        .bindPopup(`<b>${i + 1}. ${stop.label}</b><br/>${stop.address}`)
        .addTo(map);
    });

    // Draw route line
    if (markers.length > 1) {
      L.polyline(markers, {
        color: 'hsl(215,65%,48%)',
        weight: 3,
        opacity: 0.5,
        dashArray: '8 6',
      }).addTo(map);
    }

    // Fit bounds
    if (markers.length === 1) {
      map.setView(markers[0], 14);
    } else {
      map.fitBounds(L.latLngBounds(markers), { padding: [30, 30] });
    }

    // Force Leaflet to recalculate container size after paint
    setTimeout(() => {
      map.invalidateSize();
      if (markers.length === 1) {
        map.setView(markers[0], 14);
      } else {
        map.fitBounds(L.latLngBounds(markers), { padding: [30, 30] });
      }
    }, 200);

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, [geocoded]);

  if (stops.length === 0) return null;

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Route className="h-4 w-4 text-primary" /> Today's Route
        </h2>
        <span className="text-[10px] text-muted-foreground">{stops.length} stop{stops.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Map */}
      <Card className="overflow-hidden mb-2">
        <div className="relative">
          {loading && (
            <div className="absolute inset-0 z-10 bg-muted/80 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-[11px] text-muted-foreground">Loading map…</span>
              </div>
            </div>
          )}
          <div
            ref={mapRef}
            className="h-[200px] w-full rounded-t-lg"
            style={{ zIndex: 0 }}
          />
        </div>
      </Card>

      {/* Stop list */}
      <div className="space-y-1">
        {stops.map((stop, i) => {
          const isCompleted = stop.status === 'Completed' || stop.status === 'completed';
          const isActive = stop.status === 'In Progress' || stop.status === 'in_progress'
            || stop.status === 'En Route' || stop.status === 'en_route';
          const navUrl = `https://maps.google.com/maps?daddr=${encodeURIComponent([stop.address, stop.city].filter(Boolean).join(', '))}`;

          return (
            <Card
              key={stop.id}
              className={cn(
                'transition-shadow',
                isActive && 'ring-2 ring-primary/30',
                isCompleted && 'opacity-60'
              )}
            >
              <CardContent className="p-2.5 flex items-center gap-2.5">
                {/* Number badge */}
                <div className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0',
                  isCompleted ? 'bg-emerald-500' : isActive ? 'bg-primary' : 'bg-blue-400'
                )}>
                  {i + 1}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-xs font-medium truncate',
                    isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'
                  )}>
                    {stop.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate flex items-center gap-0.5">
                    <MapPin className="h-2.5 w-2.5 shrink-0" /> {stop.address}
                  </p>
                </div>

                {/* Status dot */}
                <span className={cn(
                  'w-2 h-2 rounded-full shrink-0',
                  statusDot[stop.status] || 'bg-muted-foreground'
                )} />

                {/* Navigate button */}
                {!isCompleted && (
                  <a
                    href={navUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center active:scale-95 transition-transform"
                    onClick={e => e.stopPropagation()}
                  >
                    <Navigation className="h-3.5 w-3.5 text-primary" />
                  </a>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
