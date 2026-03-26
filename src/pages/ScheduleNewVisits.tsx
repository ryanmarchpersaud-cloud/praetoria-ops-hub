import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { useJobs } from '@/hooks/useJobs';
import { useEmployees } from '@/hooks/useEmployees';
import { useCreateVisit } from '@/hooks/useVisits';
import { supabase } from '@/integrations/supabase/client';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import { format } from 'date-fns';
import {
  CalendarIcon, ArrowLeft, Check, X, Search, Filter, MapPinOff,
  AlertTriangle, Heart, Accessibility, Dog, Lock, Mountain, Zap, Crown,
  Wrench, Snowflake, Shovel, TreePine, Route, DollarSign, Clock,
  CloudRain, Users, History
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Service category → marker color mapping
const CATEGORY_COLORS: Record<string, { url: string; label: string; icon: typeof Snowflake }> = {
  'Snow & Ice': {
    url: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    label: 'Snow & Ice',
    icon: Snowflake,
  },
  'Landscaping & Grounds': {
    url: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    label: 'Landscaping',
    icon: TreePine,
  },
  'Maintenance & Repairs': {
    url: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
    label: 'Maintenance',
    icon: Wrench,
  },
};

const DEFAULT_MARKER_URL = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png';
const SELECTED_MARKER_URL = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png';
const SHADOW_URL = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png';
const ICON_OPTS = { iconSize: [25, 41] as [number, number], iconAnchor: [12, 41] as [number, number], popupAnchor: [1, -34] as [number, number], shadowSize: [41, 41] as [number, number] };

type SiteAlert = {
  property_id: string;
  has_wheelchair_ramp: boolean;
  has_elderly_resident: boolean;
  has_mobility_impaired: boolean;
  accessibility_notes: string | null;
  medical_alert: boolean;
  medical_alert_text: string | null;
  has_dog: boolean;
  dog_notes: string | null;
  has_locked_gate: boolean;
  gate_access_notes: string | null;
  has_steep_grade: boolean;
  has_low_wires: boolean;
  has_icy_spots: boolean;
  hazard_notes: string | null;
  required_equipment: string[];
  hand_shovel_only: boolean;
  equipment_notes: string | null;
  priority_tier: string;
};

type CustomerWarning = {
  customer_id: string;
  warning_type: string;
  severity: string;
  description: string | null;
  is_active: boolean;
};

type VisitHistory = {
  visit_count: number;
  last_visit: string | null;
  missed_count: number;
};

type WeatherData = {
  condition: string;
  temperature: number | null;
  windSpeed: number | null;
  windGust: number | null;
  hasWarning: boolean;
  warningText: string;
};

// Small icon badge component
function AlertIcon({ icon: Icon, tooltip, color }: { icon: typeof AlertTriangle; tooltip: string; color: string }) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn('inline-flex items-center justify-center h-5 w-5 rounded-full shrink-0', color)}>
            <Icon className="h-3 w-3" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px] text-xs">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Nearest-neighbor route optimization (greedy TSP)
function optimizeRoute(points: { id: string; lat: number; lng: number }[]): string[] {
  if (points.length <= 2) return points.map(p => p.id);
  const remaining = [...points];
  const route: typeof points = [remaining.shift()!];
  while (remaining.length > 0) {
    const last = route[route.length - 1];
    let nearestIdx = 0;
    let nearestDist = Infinity;
    remaining.forEach((p, i) => {
      const d = Math.sqrt(Math.pow(p.lat - last.lat, 2) + Math.pow(p.lng - last.lng, 2));
      if (d < nearestDist) { nearestDist = d; nearestIdx = i; }
    });
    route.push(remaining.splice(nearestIdx, 1)[0]);
  }
  return route.map(p => p.id);
}

export default function ScheduleNewVisits() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: allJobs = [], isLoading: jobsLoading } = useJobs();
  const { data: employees = [] } = useEmployees();
  const createVisit = useCreateVisit();

  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [selectedTeam, setSelectedTeam] = useState<string[]>([]);
  const [instructions, setInstructions] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [descriptionFilter, setDescriptionFilter] = useState('');
  const [teamSearch, setTeamSearch] = useState('');
  const [propertyLocations, setPropertyLocations] = useState<Record<string, { lat: number; lng: number; address: string }>>({});
  const [locationsLoaded, setLocationsLoaded] = useState(false);
  const [siteAlerts, setSiteAlerts] = useState<Record<string, SiteAlert>>({});
  const [customerWarnings, setCustomerWarnings] = useState<Record<string, CustomerWarning[]>>({});
  const [visitHistory, setVisitHistory] = useState<Record<string, VisitHistory>>({});
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [crewCounts, setCrewCounts] = useState<Record<string, number>>({});
  const [showRouteOptimization, setShowRouteOptimization] = useState(false);
  const [clusteringEnabled, setClusteringEnabled] = useState(true);

  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);

  // Filter recurring jobs
  const recurringJobs = useMemo(() => {
    return (allJobs as any[]).filter((j) => {
      const isRecurring = j.service_frequency && j.service_frequency !== 'one-time';
      const isActive = j.status === 'Scheduled' || j.status === 'In Progress';
      return isRecurring && isActive;
    });
  }, [allJobs]);

  // Load property locations + geocode fallback
  useEffect(() => {
    if (recurringJobs.length === 0) return;
    const propertyIds = [...new Set(recurringJobs.map((j: any) => j.property_id).filter(Boolean))];
    if (propertyIds.length === 0) return;

    supabase
      .from('properties')
      .select('id, property_name, address_line_1, city, province, postal_code, latitude, longitude')
      .in('id', propertyIds)
      .then(async ({ data }) => {
        if (!data) return;
        const locs: Record<string, { lat: number; lng: number; address: string }> = {};
        const toGeocode: any[] = [];

        data.forEach((p: any) => {
          const address = [p.address_line_1, p.city, p.province, p.postal_code].filter(Boolean).join(', ');
          if (p.latitude && p.longitude) {
            locs[p.id] = { lat: p.latitude, lng: p.longitude, address };
          } else if (address.length > 3) {
            toGeocode.push({ ...p, address });
          }
        });

        for (const prop of toGeocode) {
          try {
            const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(prop.address)}&limit=1`);
            const results = await resp.json();
            if (results.length > 0) {
              const lat = parseFloat(results[0].lat);
              const lng = parseFloat(results[0].lon);
              locs[prop.id] = { lat, lng, address: prop.address };
              supabase.from('properties').update({ latitude: lat, longitude: lng } as any).eq('id', prop.id).then(() => {});
            }
          } catch { /* skip */ }
        }

        setPropertyLocations(locs);
        setLocationsLoaded(true);
      });
  }, [recurringJobs]);

  // Load site alerts, customer warnings, and visit history
  useEffect(() => {
    if (recurringJobs.length === 0) return;
    const propertyIds = [...new Set(recurringJobs.map((j: any) => j.property_id).filter(Boolean))];
    const customerIds = [...new Set(recurringJobs.map((j: any) => j.customer_id).filter(Boolean))];

    if (propertyIds.length > 0) {
      supabase.from('property_site_alerts').select('*').in('property_id', propertyIds).then(({ data }) => {
        if (!data) return;
        const map: Record<string, SiteAlert> = {};
        (data as any[]).forEach((a) => { map[a.property_id] = a; });
        setSiteAlerts(map);
      });

      // Visit history per property
      supabase
        .from('visits')
        .select('property_id, service_date, visit_status')
        .in('property_id', propertyIds)
        .then(({ data }) => {
          if (!data) return;
          const hist: Record<string, VisitHistory> = {};
          (data as any[]).forEach((v) => {
            if (!hist[v.property_id]) {
              hist[v.property_id] = { visit_count: 0, last_visit: null, missed_count: 0 };
            }
            hist[v.property_id].visit_count++;
            if (!hist[v.property_id].last_visit || v.service_date > hist[v.property_id].last_visit!) {
              hist[v.property_id].last_visit = v.service_date;
            }
            if (v.visit_status === 'missed' || v.visit_status === 'cancelled') {
              hist[v.property_id].missed_count++;
            }
          });
          setVisitHistory(hist);
        });
    }

    if (customerIds.length > 0) {
      supabase.from('customer_warnings').select('*').in('customer_id', customerIds).eq('is_active', true).then(({ data }) => {
        if (!data) return;
        const map: Record<string, CustomerWarning[]> = {};
        (data as any[]).forEach((w) => {
          if (!map[w.customer_id]) map[w.customer_id] = [];
          map[w.customer_id].push(w);
        });
        setCustomerWarnings(map);
      });
    }
  }, [recurringJobs]);

  // Load weather for the selected date
  useEffect(() => {
    const fetchWeather = async () => {
      setWeatherLoading(true);
      try {
        const { data: fnData } = await supabase.functions.invoke('weather', {
          body: { city: 'regina' },
        });
        if (fnData) {
          const current = fnData.current;
          const forecast = fnData.forecast;
          const dateStr = format(startDate, 'yyyy-MM-dd');

          // Check if selected date has bad weather in forecast
          let dayForecast: any = null;
          if (forecast) {
            dayForecast = forecast.find((f: any) => f.date === dateStr);
          }

          const temp = current?.temperature ?? null;
          const condition = dayForecast?.condition || current?.condition || 'Unknown';
          const isBadWeather = /rain|storm|thunder|blizzard|freezing|heavy snow|ice pellet/i.test(condition);
          const isExtremeCold = temp !== null && temp < -25;
          const isHighWind = (current?.windGust ?? 0) > 60;

          const warnings: string[] = [];
          if (isBadWeather) warnings.push(`⛈ ${condition} expected`);
          if (isExtremeCold) warnings.push(`🥶 Extreme cold: ${temp}°C`);
          if (isHighWind) warnings.push(`💨 High wind gusts: ${current.windGust} km/h`);

          setWeatherData({
            condition,
            temperature: temp,
            windSpeed: current?.windSpeed ?? null,
            windGust: current?.windGust ?? null,
            hasWarning: warnings.length > 0,
            warningText: warnings.join(' | '),
          });
        }
      } catch {
        // Weather fetch failed silently
      }
      setWeatherLoading(false);
    };
    fetchWeather();
  }, [startDate]);

  // Load crew capacity for selected date
  useEffect(() => {
    const dateStr = format(startDate, 'yyyy-MM-dd');
    supabase
      .from('visits')
      .select('assigned_worker_id')
      .eq('service_date', dateStr)
      .not('assigned_worker_id', 'is', null)
      .then(({ data }) => {
        if (!data) return;
        const counts: Record<string, number> = {};
        (data as any[]).forEach((v) => {
          counts[v.assigned_worker_id] = (counts[v.assigned_worker_id] || 0) + 1;
        });
        setCrewCounts(counts);
      });
  }, [startDate]);

  // Filtered list
  const filteredJobs = useMemo(() => {
    let filtered = recurringJobs;
    if (searchFilter) {
      const s = searchFilter.toLowerCase();
      filtered = filtered.filter((j: any) => {
        const customerName = j.customers ? `${j.customers.first_name} ${j.customers.last_name}`.toLowerCase() : '';
        const companyName = j.customers?.company_name?.toLowerCase() || '';
        const jobNum = j.job_number?.toLowerCase() || '';
        const jobTitle = j.job_title?.toLowerCase() || '';
        return customerName.includes(s) || companyName.includes(s) || jobNum.includes(s) || jobTitle.includes(s);
      });
    }
    if (descriptionFilter) {
      const d = descriptionFilter.toLowerCase();
      filtered = filtered.filter((j: any) =>
        j.job_title?.toLowerCase().includes(d) || j.scope_of_work?.toLowerCase().includes(d)
      );
    }
    return filtered;
  }, [recurringJobs, searchFilter, descriptionFilter]);

  const toggleJob = useCallback((jobId: string) => {
    setSelectedJobIds((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  }, []);

  const selectAll = () => setSelectedJobIds(new Set(filteredJobs.map((j: any) => j.id)));
  const selectNone = () => setSelectedJobIds(new Set());

  const toggleEmployee = (userId: string) => {
    setSelectedTeam((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  // Estimated revenue for selected jobs
  const estimatedRevenue = useMemo(() => {
    return filteredJobs
      .filter((j: any) => selectedJobIds.has(j.id))
      .reduce((sum: number, j: any) => sum + (parseFloat(j.estimated_total) || 0), 0);
  }, [filteredJobs, selectedJobIds]);

  // Build alert icons for a job
  const getAlertIcons = (job: any) => {
    const icons: { icon: typeof AlertTriangle; tooltip: string; color: string }[] = [];
    const alert = job.property_id ? siteAlerts[job.property_id] : null;
    const warnings = job.customer_id ? customerWarnings[job.customer_id] : null;

    if (alert?.priority_tier === 'vip') {
      icons.push({ icon: Crown, tooltip: 'VIP Customer', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' });
    }
    if (warnings && warnings.length > 0) {
      const desc = warnings.map(w => w.description).filter(Boolean).join('; ');
      icons.push({ icon: AlertTriangle, tooltip: `⚠ ${desc || 'Customer warning'}`, color: 'bg-destructive/15 text-destructive' });
    }
    if (alert?.has_wheelchair_ramp || alert?.has_mobility_impaired) {
      icons.push({ icon: Accessibility, tooltip: alert.accessibility_notes || 'Wheelchair ramp / mobility access', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' });
    }
    if (alert?.has_elderly_resident) {
      icons.push({ icon: Heart, tooltip: alert.accessibility_notes || 'Elderly resident on site', color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-400' });
    }
    if (alert?.medical_alert) {
      icons.push({ icon: Heart, tooltip: `🏥 ${alert.medical_alert_text || 'Medical alert on site'}`, color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' });
    }
    if (alert?.has_dog) {
      icons.push({ icon: Dog, tooltip: alert.dog_notes || 'Dog on property', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400' });
    }
    if (alert?.has_locked_gate) {
      icons.push({ icon: Lock, tooltip: alert.gate_access_notes || 'Locked gate - access required', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' });
    }
    if (alert?.has_steep_grade) {
      icons.push({ icon: Mountain, tooltip: 'Steep grade on property', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' });
    }
    if (alert?.has_low_wires || alert?.has_icy_spots) {
      icons.push({ icon: Zap, tooltip: alert.hazard_notes || 'Site hazard present', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400' });
    }
    if (alert?.hand_shovel_only) {
      icons.push({ icon: Shovel, tooltip: 'Hand shovel only areas', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' });
    }
    if (alert?.required_equipment && alert.required_equipment.length > 0) {
      icons.push({ icon: Wrench, tooltip: `Equipment: ${alert.required_equipment.join(', ')}`, color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400' });
    }
    return icons;
  };

  // Build popup HTML with alerts
  const buildPopupHtml = (job: any, address: string) => {
    const customerName = job.customers ? `${job.customers.first_name} ${job.customers.last_name}` : 'Unknown';
    const alert = job.property_id ? siteAlerts[job.property_id] : null;
    const warnings = job.customer_id ? customerWarnings[job.customer_id] : null;
    const hist = job.property_id ? visitHistory[job.property_id] : null;
    const cat = CATEGORY_COLORS[job.service_category];
    const revenue = parseFloat(job.estimated_total) || 0;

    let html = `<div style="font-size:12px;min-width:200px">`;
    html += `<strong>${customerName}</strong>`;
    if (alert?.priority_tier === 'vip') html += ` <span style="background:#fef3c7;color:#92400e;padding:1px 5px;border-radius:4px;font-size:10px;font-weight:600">VIP</span>`;
    html += `<br/>${job.job_number} – ${job.job_title}`;
    if (cat) html += `<br/><span style="font-size:11px">● ${cat.label}</span>`;
    if (revenue > 0) html += `<br/><span style="color:#16a34a;font-size:11px;font-weight:600">$${revenue.toFixed(2)}</span>`;
    html += `<br/><span style="color:#888">${address}</span>`;

    // Visit history
    if (hist) {
      html += `<div style="margin-top:4px;font-size:10px;color:#6b7280">`;
      html += `📋 ${hist.visit_count} visits this season`;
      if (hist.last_visit) html += ` · Last: ${hist.last_visit}`;
      if (hist.missed_count > 0) html += ` · <span style="color:#dc2626">${hist.missed_count} missed</span>`;
      html += `</div>`;
    }

    if (warnings && warnings.length > 0) {
      html += `<div style="margin-top:4px;padding:3px 6px;background:#fef2f2;border-radius:4px;color:#dc2626;font-size:11px">⚠ ${warnings[0].description || 'Customer warning'}</div>`;
    }

    const flags: string[] = [];
    if (alert?.has_wheelchair_ramp) flags.push('♿ Ramp');
    if (alert?.has_elderly_resident) flags.push('👴 Elderly');
    if (alert?.medical_alert) flags.push('🏥 Medical');
    if (alert?.has_dog) flags.push('🐕 Dog');
    if (alert?.has_locked_gate) flags.push('🔒 Gate');
    if (alert?.has_steep_grade) flags.push('⛰ Steep');
    if (alert?.has_icy_spots) flags.push('🧊 Icy');
    if (alert?.hand_shovel_only) flags.push('🧹 Hand shovel');

    if (flags.length > 0) {
      html += `<div style="margin-top:3px;font-size:10px;color:#6b7280">${flags.join(' · ')}</div>`;
    }
    if (alert?.required_equipment && alert.required_equipment.length > 0) {
      html += `<div style="margin-top:2px;font-size:10px;color:#4f46e5">🔧 ${alert.required_equipment.join(', ')}</div>`;
    }

    html += `</div>`;
    return html;
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, { zoomControl: true }).setView([50.4452, -104.6189], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>',
    }).addTo(map);

    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 200);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers with clustering + route line
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Cleanup old
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};
    if (clusterGroupRef.current) {
      map.removeLayer(clusterGroupRef.current);
      clusterGroupRef.current = null;
    }
    if (routeLineRef.current) {
      map.removeLayer(routeLineRef.current);
      routeLineRef.current = null;
    }

    const selectedIcon = new L.Icon({ iconUrl: SELECTED_MARKER_URL, shadowUrl: SHADOW_URL, ...ICON_OPTS });
    const bounds: L.LatLngExpression[] = [];
    const coordCounts: Record<string, number> = {};

    // Create cluster group
    const clusterGroup = (L as any).markerClusterGroup({
      maxClusterRadius: clusteringEnabled ? 40 : 0,
      disableClusteringAtZoom: 14,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
    });

    // Track points for route optimization
    const routePoints: { id: string; lat: number; lng: number }[] = [];

    filteredJobs.forEach((j: any) => {
      if (!j.property_id || !propertyLocations[j.property_id]) return;
      const loc = propertyLocations[j.property_id];
      const isSelected = selectedJobIds.has(j.id);
      const customerName = j.customers ? `${j.customers.first_name} ${j.customers.last_name}` : 'Unknown';

      const catColor = CATEGORY_COLORS[j.service_category];
      const normalIcon = new L.Icon({ iconUrl: catColor?.url || DEFAULT_MARKER_URL, shadowUrl: SHADOW_URL, ...ICON_OPTS });

      const coordKey = `${loc.lat},${loc.lng}`;
      const idx = coordCounts[coordKey] || 0;
      coordCounts[coordKey] = idx + 1;
      const offsetLat = loc.lat + idx * 0.0008;
      const offsetLng = loc.lng + idx * 0.0008;

      const alert = siteAlerts[j.property_id];
      const warnings = customerWarnings[j.customer_id];
      let tooltipExtra = '';
      if (alert?.priority_tier === 'vip') tooltipExtra += ' ⭐';
      if (warnings && warnings.length > 0) tooltipExtra += ' ⚠️';
      if (alert?.medical_alert) tooltipExtra += ' 🏥';
      if (alert?.has_dog) tooltipExtra += ' 🐕';
      const tooltipText = `${customerName} – #${j.job_number}${tooltipExtra}`;

      const marker = L.marker([offsetLat, offsetLng], { icon: isSelected ? selectedIcon : normalIcon })
        .bindTooltip(tooltipText, { permanent: false, direction: 'top', offset: [0, -35] })
        .bindPopup(buildPopupHtml(j, loc.address));

      marker.on('click', () => toggleJob(j.id));
      markersRef.current[j.id] = marker;
      bounds.push([offsetLat, offsetLng]);

      if (isSelected) {
        routePoints.push({ id: j.id, lat: offsetLat, lng: offsetLng });
      }

      if (clusteringEnabled) {
        clusterGroup.addLayer(marker);
      } else {
        marker.addTo(map);
      }
    });

    if (clusteringEnabled) {
      map.addLayer(clusterGroup);
      clusterGroupRef.current = clusterGroup;
    }

    // Draw route line for selected jobs
    if (showRouteOptimization && routePoints.length >= 2) {
      const optimizedOrder = optimizeRoute(routePoints);
      const routeLatLngs = optimizedOrder.map(id => {
        const pt = routePoints.find(p => p.id === id)!;
        return L.latLng(pt.lat, pt.lng);
      });

      const polyline = L.polyline(routeLatLngs, {
        color: 'hsl(var(--primary))',
        weight: 3,
        opacity: 0.7,
        dashArray: '8, 6',
      }).addTo(map);

      // Add numbered labels along route
      routeLatLngs.forEach((ll, i) => {
        const numberIcon = L.divIcon({
          className: 'route-number-icon',
          html: `<div style="background:hsl(var(--primary));color:white;width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,.3)">${i + 1}</div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });
        L.marker(ll, { icon: numberIcon, interactive: false }).addTo(map);
      });

      routeLineRef.current = polyline;
    }

    if (bounds.length > 0) {
      map.fitBounds(L.latLngBounds(bounds as any), { padding: [40, 40], maxZoom: 13 });
    }
  }, [filteredJobs, propertyLocations, selectedJobIds, toggleJob, siteAlerts, customerWarnings, visitHistory, clusteringEnabled, showRouteOptimization]);

  const handleCreateVisits = async () => {
    if (selectedJobIds.size === 0) return;
    setIsCreating(true);

    const dateStr = format(startDate, 'yyyy-MM-dd');
    const selectedJobs = recurringJobs.filter((j: any) => selectedJobIds.has(j.id));
    let successCount = 0;
    let errorCount = 0;

    for (const job of selectedJobs) {
      try {
        const visitPayload: any = {
          job_id: job.id,
          customer_id: job.customer_id,
          property_id: job.property_id || null,
          service_date: dateStr,
          visit_type: 'recurring',
          visit_status: 'scheduled',
          service_summary: job.job_title,
          crew_notes: instructions || null,
          assigned_worker_id: selectedTeam.length === 1 ? selectedTeam[0] : null,
          service_category: (job as any).service_category || 'Snow & Ice',
        };
        await createVisit.mutateAsync(visitPayload);
        successCount++;
      } catch (err: any) {
        errorCount++;
        console.error(`Failed to create visit for job ${job.job_number}:`, err.message);
      }
    }

    setIsCreating(false);
    setShowModal(false);

    if (successCount > 0) {
      toast({
        title: `${successCount} visit${successCount > 1 ? 's' : ''} created`,
        description: `Scheduled for ${format(startDate, 'MMM d, yyyy')}${errorCount > 0 ? `. ${errorCount} failed.` : ''}`,
      });
      setSelectedJobIds(new Set());
      setInstructions('');
      setSelectedTeam([]);
    } else {
      toast({ title: 'Failed to create visits', description: 'Please try again.', variant: 'destructive' });
    }
  };

  const activeCats = useMemo(() => {
    const cats = new Set(filteredJobs.map((j: any) => j.service_category));
    return [...cats].filter(Boolean);
  }, [filteredJobs]);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/schedule')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Schedule New Visits</h1>
            <p className="text-sm text-muted-foreground">Quickly create visits for active <strong>recurring jobs</strong>.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Revenue estimate */}
          {selectedJobIds.size > 0 && estimatedRevenue > 0 && (
            <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800">
              <DollarSign className="h-3 w-3" />
              ${estimatedRevenue.toFixed(2)}
            </Badge>
          )}
          <Button
            disabled={selectedJobIds.size === 0}
            onClick={() => setShowModal(true)}
            className="gap-2"
          >
            {selectedJobIds.size > 0 ? `${selectedJobIds.size} Selected` : '0 Selected'} – Next
          </Button>
        </div>
      </div>

      {/* Weather warning banner */}
      {weatherData?.hasWarning && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700">
          <CardContent className="p-3 flex items-center gap-2">
            <CloudRain className="h-4 w-4 text-amber-600 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                Weather Alert for {format(startDate, 'MMM d')}
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400">{weatherData.warningText}</p>
            </div>
            <Badge variant="outline" className="text-amber-700 border-amber-300 text-xs shrink-0">
              {weatherData.temperature !== null ? `${weatherData.temperature}°C` : '--'}
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* Filters + map controls */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5" /> Filter
            </p>
            <div className="flex items-center gap-2 flex-1 flex-wrap">
              <div className="relative flex-1 min-w-[160px]">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search client, job #..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="h-9 pl-8 text-sm"
                />
              </div>
              <div className="relative flex-1 min-w-[160px]">
                <Input
                  placeholder="Description contains..."
                  value={descriptionFilter}
                  onChange={(e) => setDescriptionFilter(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>
            {/* Map toggles */}
            <div className="flex items-center gap-1">
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={showRouteOptimization ? 'default' : 'outline'}
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setShowRouteOptimization(!showRouteOptimization)}
                    >
                      <Route className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Route optimization</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={clusteringEnabled ? 'default' : 'outline'}
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setClusteringEnabled(!clusteringEnabled)}
                    >
                      <Users className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Cluster nearby markers</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main content: List + Map */}
      <div className="grid grid-cols-1 md:grid-cols-[340px_1fr] gap-3 min-h-[400px]">
        {/* Left: Job list */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-sm font-medium">{filteredJobs.length} Recurring Jobs</p>
            <div className="flex items-center gap-2">
              <button onClick={selectAll} className="text-xs text-primary font-medium hover:underline">All</button>
              <span className="text-muted-foreground text-xs">|</span>
              <button onClick={selectNone} className="text-xs text-primary font-medium hover:underline">None</button>
            </div>
          </div>

          <div className="max-h-[500px] overflow-y-auto space-y-1 pr-1">
            {jobsLoading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Loading jobs...</p>
            ) : filteredJobs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No active recurring jobs found</p>
            ) : (
              filteredJobs.map((job: any) => {
                const isSelected = selectedJobIds.has(job.id);
                const customerName = job.customers
                  ? `${job.customers.first_name} ${job.customers.last_name}`
                  : 'Unknown Client';
                const hasLocation = job.property_id && propertyLocations[job.property_id];
                const alertIcons = getAlertIcons(job);
                const catInfo = CATEGORY_COLORS[job.service_category];
                const hist = job.property_id ? visitHistory[job.property_id] : null;
                const revenue = parseFloat(job.estimated_total) || 0;

                return (
                  <button
                    key={job.id}
                    onClick={() => toggleJob(job.id)}
                    className={cn(
                      'w-full text-left p-2.5 rounded-md border transition-all text-sm',
                      isSelected
                        ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                        : 'border-border bg-card hover:bg-muted/50'
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <div className={cn(
                        'mt-0.5 h-4 w-4 rounded border flex items-center justify-center shrink-0',
                        isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/40'
                      )}>
                        {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-foreground truncate flex-1">
                            {customerName} - #{job.job_number}
                          </p>
                          {catInfo && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 shrink-0 font-normal">
                              {catInfo.label}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{job.job_title}</p>
                        {job.properties?.property_name && (
                          <p className="text-xs text-muted-foreground/70 truncate">📍 {job.properties.property_name}</p>
                        )}

                        {/* Visit history + revenue row */}
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {hist && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <History className="h-2.5 w-2.5" />
                              {hist.visit_count} visits
                              {hist.last_visit && ` · Last: ${hist.last_visit}`}
                              {hist.missed_count > 0 && <span className="text-destructive ml-0.5">({hist.missed_count} missed)</span>}
                            </span>
                          )}
                          {revenue > 0 && (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-0.5">
                              <DollarSign className="h-2.5 w-2.5" />${revenue.toFixed(0)}
                            </span>
                          )}
                        </div>

                        {/* Alert icons row */}
                        {alertIcons.length > 0 && (
                          <div className="flex items-center gap-1 mt-1 flex-wrap">
                            {alertIcons.map((a, i) => (
                              <AlertIcon key={i} icon={a.icon} tooltip={a.tooltip} color={a.color} />
                            ))}
                          </div>
                        )}

                        {!hasLocation && locationsLoaded && (
                          <p className="text-xs text-amber-500 flex items-center gap-1 mt-0.5">
                            <MapPinOff className="h-3 w-3" /> No map location
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Map + legends */}
        <div className="space-y-2">
          <Card className="overflow-hidden" style={{ isolation: 'isolate', position: 'relative', zIndex: 0 }}>
            <div ref={mapContainerRef} className="h-[460px] w-full" />
          </Card>

          {/* Map legend */}
          <div className="flex items-center gap-3 flex-wrap px-1">
            <span className="text-xs font-medium text-muted-foreground">Legend:</span>
            {activeCats.map((cat) => {
              const info = CATEGORY_COLORS[cat];
              if (!info) return null;
              const CatIcon = info.icon;
              return (
                <span key={cat} className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CatIcon className="h-3.5 w-3.5" />
                  {info.label}
                </span>
              );
            })}
            <span className="flex items-center gap-1 text-xs text-destructive">
              <span className="h-2.5 w-2.5 rounded-full bg-destructive inline-block" /> Selected
            </span>
            {showRouteOptimization && selectedJobIds.size >= 2 && (
              <span className="flex items-center gap-1 text-xs text-primary">
                <Route className="h-3 w-3" /> Optimized route
              </span>
            )}
          </div>

          {/* Weather bar */}
          {weatherData && !weatherData.hasWarning && (
            <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
              <CloudRain className="h-3 w-3" />
              <span>{format(startDate, 'MMM d')}: {weatherData.condition} {weatherData.temperature !== null ? `${weatherData.temperature}°C` : ''}</span>
              {weatherData.windSpeed && <span>· Wind {weatherData.windSpeed} km/h</span>}
            </div>
          )}
        </div>
      </div>

      {/* Create Visits Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create {selectedJobIds.size} Visit{selectedJobIds.size !== 1 ? 's' : ''}</DialogTitle>
            {estimatedRevenue > 0 && (
              <p className="text-sm text-emerald-600 font-medium flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5" />
                Estimated run value: ${estimatedRevenue.toFixed(2)}
              </p>
            )}
          </DialogHeader>

          {/* Weather warning in modal */}
          {weatherData?.hasWarning && (
            <div className="p-2.5 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-center gap-2">
              <CloudRain className="h-4 w-4 text-amber-600 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-400">{weatherData.warningText}</p>
            </div>
          )}

          <div className="space-y-4">
            {/* Start Date */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Start Date for New Visits</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !startDate && 'text-muted-foreground')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(d) => d && setStartDate(d)}
                    initialFocus
                    className={cn('p-3 pointer-events-auto')}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Team Selection with capacity */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Assign Team</label>
              {selectedTeam.length === 0 ? (
                <p className="text-sm text-muted-foreground">No users are currently assigned</p>
              ) : (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {selectedTeam.map((uid) => {
                    const emp = (employees as any[]).find((e: any) => e.user_id === uid);
                    const existingCount = crewCounts[uid] || 0;
                    return (
                      <Badge key={uid} variant="secondary" className="gap-1 pr-1">
                        {emp?.full_name || 'Unknown'}
                        {existingCount > 0 && (
                          <span className="text-[10px] text-amber-600 ml-0.5">({existingCount} visits)</span>
                        )}
                        <button onClick={() => toggleEmployee(uid)} className="ml-1 rounded-full hover:bg-muted p-0.5">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
              <Input
                placeholder="Search team members..."
                value={teamSearch}
                onChange={(e) => setTeamSearch(e.target.value)}
                className="h-8 text-sm mb-1.5"
              />
              <div className="border rounded-md max-h-[160px] overflow-y-auto">
                {(employees as any[]).length === 0 ? (
                  <p className="text-sm text-muted-foreground p-3">No team members found</p>
                ) : (
                  (employees as any[])
                    .filter((emp: any) => !teamSearch || emp.full_name?.toLowerCase().includes(teamSearch.toLowerCase()) || emp.role_title?.toLowerCase().includes(teamSearch.toLowerCase()))
                    .map((emp: any) => {
                      const existingCount = crewCounts[emp.user_id] || 0;
                      return (
                        <label
                          key={emp.user_id}
                          className="flex items-center gap-2.5 px-3 py-2 hover:bg-muted/50 cursor-pointer text-sm border-b last:border-b-0"
                        >
                          <Checkbox
                            checked={selectedTeam.includes(emp.user_id)}
                            onCheckedChange={() => toggleEmployee(emp.user_id)}
                          />
                          <div className="min-w-0 flex-1">
                            <span className="font-medium">{emp.full_name || 'Unnamed'}</span>
                            {emp.role_title && <span className="text-muted-foreground ml-1.5 text-xs">· {emp.role_title}</span>}
                          </div>
                          {/* Crew capacity indicator */}
                          <span className={cn(
                            'text-[10px] px-1.5 py-0.5 rounded-full shrink-0',
                            existingCount === 0
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : existingCount <= 3
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          )}>
                            <Clock className="h-2.5 w-2.5 inline mr-0.5" />
                            {existingCount} on {format(startDate, 'MMM d')}
                          </span>
                        </label>
                      );
                    })
                )}
              </div>
            </div>

            {/* Instructions */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Instructions</label>
              <Textarea
                placeholder="Instructions for crew..."
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)} disabled={isCreating}>Cancel</Button>
            <Button onClick={handleCreateVisits} disabled={isCreating || selectedJobIds.size === 0}>
              {isCreating ? 'Creating...' : `Let's make some visits!`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
