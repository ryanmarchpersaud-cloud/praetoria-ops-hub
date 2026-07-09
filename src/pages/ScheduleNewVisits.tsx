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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { useJobs } from '@/hooks/useJobs';
import { useEmployees } from '@/hooks/useEmployees';
import { useCreateVisit } from '@/hooks/useVisits';
import { useActiveSubcontractors } from '@/hooks/useVisitCrew';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { handleProtectedCustomerError } from '@/lib/protectedCustomers';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import { format, eachDayOfInterval } from 'date-fns';
import {
  CalendarIcon, ArrowLeft, Check, X, Search, Filter, MapPinOff,
  AlertTriangle, Heart, Accessibility, Dog, Lock, Mountain, Zap, Crown,
  Wrench, Snowflake, Shovel, TreePine, Route, DollarSign, Clock,
  CloudRain, Users, History, Move, Trash2, MoreVertical, RefreshCw,
  MapPin, Navigation, Car
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Service category → marker color mapping (Phase 1 complete)
const CATEGORY_COLORS: Record<string, { url: string; label: string; icon: typeof Snowflake; hex: string }> = {
  'Snow & Ice': {
    url: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    label: 'Snow & Ice', icon: Snowflake, hex: '#2563eb',
  },
  'Landscaping & Grounds': {
    url: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    label: 'Landscaping', icon: TreePine, hex: '#16a34a',
  },
  'Maintenance & Repairs': {
    url: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
    label: 'Maintenance', icon: Wrench, hex: '#ea580c',
  },
  'Junk Removal': {
    url: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    label: 'Junk Removal', icon: Trash2, hex: '#dc2626',
  },
  'Cleaning': {
    url: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
    label: 'Cleaning', icon: Snowflake, hex: '#7c3aed',
  },
  'Power Washing': {
    url: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    label: 'Power Washing', icon: CloudRain, hex: '#0d9488',
  },
  'Property Care': {
    url: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
    label: 'Property Care', icon: MapPin, hex: '#ca8a04',
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

// Haversine distance in km
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Estimate travel time at ~40 km/h city avg
function estimateTravelMinutes(km: number): number {
  return Math.round(km / 40 * 60);
}

export default function ScheduleNewVisits() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: allJobs = [], isLoading: jobsLoading } = useJobs();
  const { data: employees = [] } = useEmployees();
  const { data: subcontractors = [] } = useActiveSubcontractors();
  const createVisit = useCreateVisit();

  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [selectedTeam, setSelectedTeam] = useState<string[]>([]);
  const [selectedSubcontractorIds, setSelectedSubcontractorIds] = useState<string[]>([]);
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
  const [highlightedJobId, setHighlightedJobId] = useState<string | null>(null);
  const [existingVisits, setExistingVisits] = useState<Record<string, boolean>>({});
  const [pinCorrectionMode, setPinCorrectionMode] = useState(false);
  const [bulkAction, setBulkAction] = useState<'reassign' | 'unschedule' | null>(null);

  // Multi-day scheduling state
  const [scheduleType, setScheduleType] = useState<'single' | 'multiple'>('single');
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [weekdayMask, setWeekdayMask] = useState<Set<number>>(new Set([0, 1, 2, 3, 4, 5, 6]));
  const [includeWeekends, setIncludeWeekends] = useState(true);
  const [removedDates, setRemovedDates] = useState<Set<string>>(new Set());
  const [multiDupes, setMultiDupes] = useState<Record<string, string[]>>({});
  const [dupeStrategy, setDupeStrategy] = useState<'skip' | 'keep_add'>('skip');

  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const routeNumberMarkersRef = useRef<L.Marker[]>([]);
  const listItemRefs = useRef<Record<string, HTMLButtonElement | null>>({});

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

  // Check for duplicate visits on the selected date
  useEffect(() => {
    const dateStr = format(startDate, 'yyyy-MM-dd');
    const jobIds = recurringJobs.map((j: any) => j.id);
    if (jobIds.length === 0) return;

    supabase
      .from('visits')
      .select('job_id')
      .eq('service_date', dateStr)
      .in('job_id', jobIds)
      .then(({ data }) => {
        if (!data) return;
        const dupes: Record<string, boolean> = {};
        (data as any[]).forEach((v) => { dupes[v.job_id] = true; });
        setExistingVisits(dupes);
      });
  }, [startDate, recurringJobs]);

  // Multi-date duplicate detection for selected jobs across all effective dates
  useEffect(() => {
    if (!showModal || selectedJobIds.size === 0 || effectiveDates.length === 0) {
      setMultiDupes({});
      return;
    }
    const jobIds = [...selectedJobIds];
    supabase
      .from('visits')
      .select('job_id, service_date')
      .in('job_id', jobIds)
      .in('service_date', effectiveDates)
      .then(({ data }) => {
        if (!data) { setMultiDupes({}); return; }
        const m: Record<string, string[]> = {};
        (data as any[]).forEach((v) => {
          if (!m[v.job_id]) m[v.job_id] = [];
          m[v.job_id].push(v.service_date);
        });
        setMultiDupes(m);
      });
  }, [showModal, selectedJobIds, effectiveDates]);

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
    setHighlightedJobId(jobId);
  }, []);

  const selectAll = () => setSelectedJobIds(new Set(filteredJobs.map((j: any) => j.id)));
  const selectNone = () => setSelectedJobIds(new Set());

  const toggleEmployee = (userId: string) => {
    setSelectedTeam((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const toggleSubcontractor = (subId: string) => {
    setSelectedSubcontractorIds((prev) =>
      prev.includes(subId) ? prev.filter((id) => id !== subId) : [...prev, subId]
    );
  };


  // Estimated revenue for selected jobs
  const estimatedRevenue = useMemo(() => {
    return filteredJobs
      .filter((j: any) => selectedJobIds.has(j.id))
      .reduce((sum: number, j: any) => sum + (parseFloat(j.estimated_total) || 0), 0);
  }, [filteredJobs, selectedJobIds]);

  // Effective dates for creation (single or multi-day)
  const effectiveDates = useMemo<string[]>(() => {
    if (scheduleType === 'single') return [format(startDate, 'yyyy-MM-dd')];
    const end = endDate < startDate ? startDate : endDate;
    return eachDayOfInterval({ start: startDate, end })
      .filter(d => weekdayMask.has(d.getDay()))
      .filter(d => includeWeekends || (d.getDay() !== 0 && d.getDay() !== 6))
      .map(d => format(d, 'yyyy-MM-dd'))
      .filter(ds => !removedDates.has(ds));
  }, [scheduleType, startDate, endDate, weekdayMask, includeWeekends, removedDates]);

  const totalVisitsToCreate = effectiveDates.length * selectedJobIds.size;

  // Detect fixed-price selected jobs (billing_type !== 'Per Visit')
  const fixedPriceSelectedJobs = useMemo(() => {
    return (recurringJobs as any[]).filter(
      j => selectedJobIds.has(j.id) && (j.billing_type || '').toLowerCase() !== 'per visit'
    );
  }, [recurringJobs, selectedJobIds]);

  // Travel time estimates for optimized route
  const travelEstimates = useMemo(() => {
    if (!showRouteOptimization || selectedJobIds.size < 2) return null;

    const routePoints: { id: string; lat: number; lng: number }[] = [];
    filteredJobs.forEach((j: any) => {
      if (!selectedJobIds.has(j.id) || !j.property_id || !propertyLocations[j.property_id]) return;
      const loc = propertyLocations[j.property_id];
      routePoints.push({ id: j.id, lat: loc.lat, lng: loc.lng });
    });

    if (routePoints.length < 2) return null;

    const order = optimizeRoute(routePoints);
    const segments: { from: string; to: string; km: number; minutes: number }[] = [];
    let totalKm = 0;
    let totalMin = 0;

    for (let i = 0; i < order.length - 1; i++) {
      const p1 = routePoints.find(p => p.id === order[i])!;
      const p2 = routePoints.find(p => p.id === order[i + 1])!;
      const km = haversineKm(p1.lat, p1.lng, p2.lat, p2.lng);
      const min = estimateTravelMinutes(km);
      segments.push({ from: order[i], to: order[i + 1], km, minutes: min });
      totalKm += km;
      totalMin += min;
    }

    return { segments, totalKm, totalMinutes: totalMin, order };
  }, [showRouteOptimization, selectedJobIds, filteredJobs, propertyLocations]);

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
    const hasDupe = existingVisits[job.id];

    let html = `<div style="font-size:12px;min-width:200px">`;
    html += `<strong>${customerName}</strong>`;
    if (alert?.priority_tier === 'vip') html += ` <span style="background:#fef3c7;color:#92400e;padding:1px 5px;border-radius:4px;font-size:10px;font-weight:600">VIP</span>`;
    html += `<br/>${job.job_number} – ${job.job_title}`;
    if (cat) html += `<br/><span style="font-size:11px;color:${cat.hex}">● ${cat.label}</span>`;
    if (revenue > 0) html += `<br/><span style="color:#16a34a;font-size:11px;font-weight:600">$${revenue.toFixed(2)}</span>`;
    html += `<br/><span style="color:#888">${address}</span>`;

    if (hasDupe) {
      html += `<div style="margin-top:4px;padding:3px 6px;background:#fef2f2;border-radius:4px;color:#dc2626;font-size:11px">⚠ Visit already exists for this date</div>`;
    }

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

  // Handle manual pin correction
  const handlePinDragEnd = async (jobId: string, propertyId: string, newLat: number, newLng: number) => {
    // Update local state
    setPropertyLocations(prev => ({
      ...prev,
      [propertyId]: { ...prev[propertyId], lat: newLat, lng: newLng },
    }));

    // Save to DB
    await supabase.from('properties').update({ latitude: newLat, longitude: newLng } as any).eq('id', propertyId);

    // Log audit
    await supabase.from('activities').insert({
      action_name: 'Pin location manually corrected',
      workflow_name: 'dispatch',
      record_type: 'property',
      record_id: propertyId,
      user_id: user?.id || null,
      status: 'completed',
      payload_summary: { lat: newLat, lng: newLng, job_id: jobId },
    });

    toast({ title: 'Pin location updated', description: 'Property coordinates saved.' });
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
    routeNumberMarkersRef.current.forEach(m => m.remove());
    routeNumberMarkersRef.current = [];

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
      const isHighlighted = highlightedJobId === j.id;
      const customerName = j.customers ? `${j.customers.first_name} ${j.customers.last_name}` : 'Unknown';
      const hasDupe = existingVisits[j.id];

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
      if (hasDupe) tooltipExtra += ' 🔁';
      const tooltipText = `${customerName} – #${j.job_number}${tooltipExtra}`;

      const marker = L.marker([offsetLat, offsetLng], {
        icon: isSelected ? selectedIcon : normalIcon,
        draggable: pinCorrectionMode,
      })
        .bindTooltip(tooltipText, { permanent: false, direction: 'top', offset: [0, -35] })
        .bindPopup(buildPopupHtml(j, loc.address));

      marker.on('click', () => {
        toggleJob(j.id);
        // Scroll list item into view (map→list sync)
        const el = listItemRefs.current[j.id];
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });

      if (pinCorrectionMode) {
        marker.on('dragend', (e: any) => {
          const newPos = e.target.getLatLng();
          handlePinDragEnd(j.id, j.property_id, newPos.lat, newPos.lng);
        });
      }

      // Pulse effect for highlighted marker
      if (isHighlighted) {
        marker.openTooltip();
      }

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
        const nm = L.marker(ll, { icon: numberIcon, interactive: false }).addTo(map);
        routeNumberMarkersRef.current.push(nm);
      });

      routeLineRef.current = polyline;
    }

    if (bounds.length > 0) {
      map.fitBounds(L.latLngBounds(bounds as any), { padding: [40, 40], maxZoom: 13 });
    }
  }, [filteredJobs, propertyLocations, selectedJobIds, toggleJob, siteAlerts, customerWarnings, visitHistory, clusteringEnabled, showRouteOptimization, highlightedJobId, pinCorrectionMode, existingVisits]);

  // Pan map to highlighted job (list→map sync)
  useEffect(() => {
    if (!highlightedJobId || !mapRef.current) return;
    const marker = markersRef.current[highlightedJobId];
    if (marker) {
      mapRef.current.panTo(marker.getLatLng(), { animate: true });
      marker.openTooltip();
    }
    const timer = setTimeout(() => setHighlightedJobId(null), 2000);
    return () => clearTimeout(timer);
  }, [highlightedJobId]);

  // Duplicate visit count for selected
  const dupeCount = useMemo(() => {
    return [...selectedJobIds].filter(id => existingVisits[id]).length;
  }, [selectedJobIds, existingVisits]);

  const handleCreateVisits = async () => {
    if (selectedJobIds.size === 0) return;

    // Warn about duplicates
    if (dupeCount > 0) {
      const confirmed = window.confirm(
        `${dupeCount} of the selected jobs already have visits on ${format(startDate, 'MMM d, yyyy')}. Create duplicates anyway?`
      );
      if (!confirmed) return;
    }

    // Worker conflict check
    if (selectedTeam.length > 0) {
      const overloaded = selectedTeam.filter(uid => (crewCounts[uid] || 0) >= 6);
      if (overloaded.length > 0) {
        const names = overloaded.map(uid => {
          const emp = (employees as any[]).find((e: any) => e.user_id === uid);
          return emp?.full_name || 'Unknown';
        });
        const confirmed = window.confirm(
          `Warning: ${names.join(', ')} already ${overloaded.length > 1 ? 'have' : 'has'} 6+ visits on this date. Assign anyway?`
        );
        if (!confirmed) return;
      }
    }

    setIsCreating(true);

    const dateStr = format(startDate, 'yyyy-MM-dd');
    const selectedJobs = recurringJobs.filter((j: any) => selectedJobIds.has(j.id));
    let successCount = 0;
    let errorCount = 0;
    let protectedCount = 0;

    for (const job of selectedJobs) {
      try {
        const leadWorkerId = selectedTeam[0] || null;
        const visitPayload: any = {
          job_id: job.id,
          customer_id: job.customer_id,
          property_id: job.property_id || null,
          service_date: dateStr,
          visit_type: 'Routine',
          visit_status: 'Scheduled',
          service_summary: job.job_title,
          crew_notes: instructions || null,
          assigned_worker_id: leadWorkerId,
          service_category: (job as any).service_category || 'Snow & Ice',
        };
        const createdVisit: any = await createVisit.mutateAsync(visitPayload);

        // Additional crew members (beyond the lead)
        const extraCrew = selectedTeam.slice(1);
        if (createdVisit?.id && extraCrew.length > 0) {
          const crewRows = extraCrew.map((wid) => ({
            visit_id: createdVisit.id,
            worker_user_id: wid,
            created_by: user?.id || null,
          }));
          await supabase.from('visit_crew_members').insert(crewRows as any);
        }

        // Subcontractor assignments
        if (createdVisit?.id && selectedSubcontractorIds.length > 0) {
          const subRows = selectedSubcontractorIds.map((sid) => ({
            visit_id: createdVisit.id,
            subcontractor_id: sid,
            job_id: job.id,
          }));
          await supabase.from('subcontractor_assignments').insert(subRows as any);
        }

        successCount++;
      } catch (err: any) {
        errorCount++;
        if (handleProtectedCustomerError(err)) {
          protectedCount++;
        } else {
          console.error(`Failed to create visit for job ${job.job_number}:`, err.message);
        }
      }
    }

    // Audit trail
    await supabase.from('activities').insert({
      action_name: `Batch created ${successCount} visits`,
      workflow_name: 'dispatch',
      record_type: 'visit',
      user_id: user?.id || null,
      status: 'completed',
      payload_summary: {
        date: dateStr,
        job_count: selectedJobs.length,
        success: successCount,
        errors: errorCount,
        assigned_team: selectedTeam,
      },
    });

    // Send notifications to assigned workers (in-app + email)
    if (selectedTeam.length > 0 && successCount > 0) {
      for (const workerId of selectedTeam) {
        try {
          await supabase.functions.invoke('send-notification', {
            body: {
              event: 'visit_scheduled',
              recipient_id: workerId,
              audience: 'worker',
              channels: ['in_app', 'email'],
              variables: {
                subject: `${successCount} new visit${successCount > 1 ? 's' : ''} assigned`,
                body: `You have been assigned ${successCount} visit${successCount > 1 ? 's' : ''} for ${format(startDate, 'MMM d, yyyy')}.`,
                scheduled_date: format(startDate, 'MMM d, yyyy'),
              },
            },
          });
        } catch { /* notification failures shouldn't block */ }
      }
    }

    // Send customer notifications for scheduled visits
    if (successCount > 0) {
      const uniqueCustomerIds = [...new Set(selectedJobs.map((j: any) => j.customer_id).filter(Boolean))];
      for (const custId of uniqueCustomerIds) {
        try {
          const custJob = selectedJobs.find((j: any) => j.customer_id === custId);
          const { data: cust } = await supabase.from('customers').select('first_name, last_name, email, phone').eq('id', custId).maybeSingle();
          if (!cust) continue;
          const { data: prop } = custJob?.property_id
            ? await supabase.from('properties').select('property_name').eq('id', custJob.property_id).maybeSingle()
            : { data: null };
          await supabase.functions.invoke('send-notification', {
            body: {
              event: 'visit_scheduled',
              customer_id: custId,
              audience: 'customer',
              channels: ['in_app', 'email', 'sms'],
              variables: {
                customer_name: `${cust.first_name} ${cust.last_name}`,
                property: prop?.property_name || '',
                service_type: (custJob as any)?.service_category || '',
                scheduled_date: format(startDate, 'MMM d, yyyy'),
                to_email: cust.email || '',
                to_phone: cust.phone || '',
              },
            },
          });
        } catch { /* notification failures shouldn't block */ }
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
      setSelectedSubcontractorIds([]);
    } else {
      toast({ title: 'Failed to create visits', description: 'Please try again. Check the browser console for details.', variant: 'destructive' });
    }
  };

  // Bulk reassign handler
  const handleBulkReassign = async (newWorkerId: string) => {
    if (selectedJobIds.size === 0) return;
    const dateStr = format(startDate, 'yyyy-MM-dd');
    const jobIds = [...selectedJobIds];

    const { error } = await supabase
      .from('visits')
      .update({ assigned_worker_id: newWorkerId } as any)
      .eq('service_date', dateStr)
      .in('job_id', jobIds);

    if (!error) {
      await supabase.from('activities').insert({
        action_name: `Bulk reassigned ${jobIds.length} visits`,
        workflow_name: 'dispatch',
        record_type: 'visit',
        user_id: user?.id || null,
        status: 'completed',
        payload_summary: { date: dateStr, job_ids: jobIds, new_worker: newWorkerId },
      });

      toast({ title: 'Visits reassigned', description: `${jobIds.length} visits updated.` });
      setBulkAction(null);
    } else {
      toast({ title: 'Reassignment failed', variant: 'destructive' });
    }
  };

  // Bulk unschedule handler
  const handleBulkUnschedule = async () => {
    if (selectedJobIds.size === 0) return;
    const dateStr = format(startDate, 'yyyy-MM-dd');
    const jobIds = [...selectedJobIds];

    const confirmed = window.confirm(`Unschedule ${jobIds.length} visits for ${format(startDate, 'MMM d')}?`);
    if (!confirmed) return;

    const { error } = await supabase
      .from('visits')
      .update({ visit_status: 'unscheduled' } as any)
      .eq('service_date', dateStr)
      .in('job_id', jobIds);

    if (!error) {
      await supabase.from('activities').insert({
        action_name: `Bulk unscheduled ${jobIds.length} visits`,
        workflow_name: 'dispatch',
        record_type: 'visit',
        user_id: user?.id || null,
        status: 'completed',
        payload_summary: { date: dateStr, job_ids: jobIds },
      });

      toast({ title: 'Visits unscheduled', description: `${jobIds.length} visits marked as unscheduled.` });
      setSelectedJobIds(new Set());
    } else {
      toast({ title: 'Failed to unschedule', variant: 'destructive' });
    }
  };

  const activeCats = useMemo(() => {
    const cats = new Set(filteredJobs.map((j: any) => j.service_category));
    return [...cats].filter(Boolean);
  }, [filteredJobs]);

  // Missing location jobs
  const missingLocationJobs = useMemo(() => {
    if (!locationsLoaded) return [];
    return filteredJobs.filter((j: any) => j.property_id && !propertyLocations[j.property_id]);
  }, [filteredJobs, propertyLocations, locationsLoaded]);

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

          {/* Bulk actions dropdown */}
          {selectedJobIds.size > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <MoreVertical className="h-3.5 w-3.5" />
                  Bulk
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setBulkAction('reassign')}>
                  <RefreshCw className="h-3.5 w-3.5 mr-2" /> Bulk Reassign
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleBulkUnschedule} className="text-destructive">
                  <X className="h-3.5 w-3.5 mr-2" /> Bulk Unschedule
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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

      {/* Missing location warning */}
      {missingLocationJobs.length > 0 && (
        <Card className="border-amber-300 bg-amber-50/50 dark:bg-amber-900/10 dark:border-amber-800">
          <CardContent className="p-3 flex items-center gap-2">
            <MapPinOff className="h-4 w-4 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-400">
              <strong>{missingLocationJobs.length}</strong> job{missingLocationJobs.length !== 1 ? 's' : ''} missing map coordinates — they won't appear on the map.
            </p>
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
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={pinCorrectionMode ? 'default' : 'outline'}
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setPinCorrectionMode(!pinCorrectionMode)}
                    >
                      <Move className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{pinCorrectionMode ? 'Exit pin correction mode' : 'Drag pins to correct location'}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          {pinCorrectionMode && (
            <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
              <Move className="h-3 w-3" /> Pin correction mode — drag markers to correct positions. Changes save automatically.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Travel time summary */}
      {travelEstimates && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Car className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Route Summary</span>
              </div>
              <Badge variant="outline" className="gap-1 text-xs">
                <Navigation className="h-3 w-3" />
                {travelEstimates.totalKm.toFixed(1)} km
              </Badge>
              <Badge variant="outline" className="gap-1 text-xs">
                <Clock className="h-3 w-3" />
                ~{travelEstimates.totalMinutes} min travel
              </Badge>
              <Badge variant="outline" className="gap-1 text-xs">
                {travelEstimates.order.length} stops
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

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
                const isHighlighted = highlightedJobId === job.id;
                const customerName = job.customers
                  ? `${job.customers.first_name} ${job.customers.last_name}`
                  : 'Unknown Client';
                const hasLocation = job.property_id && propertyLocations[job.property_id];
                const alertIcons = getAlertIcons(job);
                const catInfo = CATEGORY_COLORS[job.service_category];
                const hist = job.property_id ? visitHistory[job.property_id] : null;
                const revenue = parseFloat(job.estimated_total) || 0;
                const hasDupe = existingVisits[job.id];

                return (
                  <button
                    key={job.id}
                    ref={el => { listItemRefs.current[job.id] = el; }}
                    onClick={() => toggleJob(job.id)}
                    className={cn(
                      'w-full text-left p-2.5 rounded-md border transition-all text-sm',
                      isSelected
                        ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                        : 'border-border bg-card hover:bg-muted/50',
                      isHighlighted && 'ring-2 ring-primary animate-pulse'
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

                        {/* Duplicate warning */}
                        {hasDupe && (
                          <p className="text-[10px] text-destructive font-medium mt-0.5 flex items-center gap-1">
                            <AlertTriangle className="h-2.5 w-2.5" /> Visit already exists for {format(startDate, 'MMM d')}
                          </p>
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

      {/* Bulk Reassign Dialog */}
      <Dialog open={bulkAction === 'reassign'} onOpenChange={(open) => !open && setBulkAction(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Reassign {selectedJobIds.size} Visits</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              placeholder="Search workers..."
              value={teamSearch}
              onChange={(e) => setTeamSearch(e.target.value)}
              className="h-9 text-sm"
            />
            <div className="border rounded-md max-h-[250px] overflow-y-auto">
              {(employees as any[])
                .filter((emp: any) => !teamSearch || emp.full_name?.toLowerCase().includes(teamSearch.toLowerCase()))
                .map((emp: any) => (
                  <button
                    key={emp.user_id}
                    onClick={() => handleBulkReassign(emp.user_id)}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 text-sm border-b last:border-b-0 text-left"
                  >
                    <span className="font-medium">{emp.full_name || 'Unnamed'}</span>
                    {emp.role_title && <span className="text-muted-foreground text-xs">· {emp.role_title}</span>}
                    <span className={cn(
                      'ml-auto text-[10px] px-1.5 py-0.5 rounded-full',
                      (crewCounts[emp.user_id] || 0) <= 3
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    )}>
                      {crewCounts[emp.user_id] || 0} visits
                    </span>
                  </button>
                ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

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

          {/* Duplicate warning in modal */}
          {dupeCount > 0 && (
            <div className="p-2.5 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                <strong>{dupeCount}</strong> selected job{dupeCount !== 1 ? 's' : ''} already {dupeCount !== 1 ? 'have' : 'has'} visits on this date.
              </p>
            </div>
          )}

          {/* Weather warning in modal */}
          {weatherData?.hasWarning && (
            <div className="p-2.5 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-center gap-2">
              <CloudRain className="h-4 w-4 text-amber-600 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-400">{weatherData.warningText}</p>
            </div>
          )}

          {/* Travel summary in modal */}
          {travelEstimates && (
            <div className="p-2.5 rounded-md bg-primary/5 border border-primary/20 flex items-center gap-3">
              <Car className="h-4 w-4 text-primary shrink-0" />
              <div className="text-xs text-foreground">
                <strong>{travelEstimates.order.length} stops</strong> · {travelEstimates.totalKm.toFixed(1)} km · ~{travelEstimates.totalMinutes} min travel
              </div>
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
              {selectedTeam.length === 0 && selectedSubcontractorIds.length === 0 ? (
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
                  {selectedSubcontractorIds.map((sid) => {
                    const sub = (subcontractors as any[]).find((s: any) => s.id === sid);
                    return (
                      <Badge key={sid} variant="outline" className="gap-1 pr-1 border-purple-300 bg-purple-50 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                        {sub?.company_name || sub?.contact_name || 'Subcontractor'} <span className="text-[9px] opacity-70">SUB</span>
                        <button onClick={() => toggleSubcontractor(sid)} className="ml-1 rounded-full hover:bg-muted p-0.5">
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
                {(subcontractors as any[])
                  .filter((s: any) => {
                    if (!teamSearch) return true;
                    const q = teamSearch.toLowerCase();
                    return (s.company_name?.toLowerCase().includes(q)) || (s.contact_name?.toLowerCase().includes(q));
                  })
                  .map((s: any) => (
                    <label
                      key={`sub-${s.id}`}
                      className="flex items-center gap-2.5 px-3 py-2 hover:bg-muted/50 cursor-pointer text-sm border-b last:border-b-0 bg-purple-50/40 dark:bg-purple-900/10"
                    >
                      <Checkbox
                        checked={selectedSubcontractorIds.includes(s.id)}
                        onCheckedChange={() => toggleSubcontractor(s.id)}
                      />
                      <div className="min-w-0 flex-1">
                        <span className="font-medium">{s.company_name || s.contact_name || 'Subcontractor'}</span>
                        {s.contact_name && s.company_name && (
                          <span className="text-muted-foreground ml-1.5 text-xs">· {s.contact_name}</span>
                        )}
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                        Subcontractor
                      </span>
                    </label>
                  ))}
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
