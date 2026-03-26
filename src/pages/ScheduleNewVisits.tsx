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
import { format } from 'date-fns';
import {
  CalendarIcon, ArrowLeft, Check, X, Search, Filter, MapPinOff,
  AlertTriangle, Heart, Accessibility, Dog, Lock, Mountain, Zap, Crown,
  Wrench, Snowflake, Shovel, TreePine
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

  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});

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

  // Load site alerts & customer warnings
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

  // Build alert icons for a job
  const getAlertIcons = (job: any) => {
    const icons: { icon: typeof AlertTriangle; tooltip: string; color: string }[] = [];
    const alert = job.property_id ? siteAlerts[job.property_id] : null;
    const warnings = job.customer_id ? customerWarnings[job.customer_id] : null;

    // Priority tier
    if (alert?.priority_tier === 'vip') {
      icons.push({ icon: Crown, tooltip: 'VIP Customer', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' });
    }

    // Customer warnings
    if (warnings && warnings.length > 0) {
      const desc = warnings.map(w => w.description).filter(Boolean).join('; ');
      icons.push({ icon: AlertTriangle, tooltip: `⚠ ${desc || 'Customer warning'}`, color: 'bg-destructive/15 text-destructive' });
    }

    // Accessibility
    if (alert?.has_wheelchair_ramp || alert?.has_mobility_impaired) {
      icons.push({ icon: Accessibility, tooltip: alert.accessibility_notes || 'Wheelchair ramp / mobility access', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' });
    }
    if (alert?.has_elderly_resident) {
      icons.push({ icon: Heart, tooltip: alert.accessibility_notes || 'Elderly resident on site', color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-400' });
    }

    // Medical
    if (alert?.medical_alert) {
      icons.push({ icon: Heart, tooltip: `🏥 ${alert.medical_alert_text || 'Medical alert on site'}`, color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' });
    }

    // Hazards
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

    // Equipment
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
    const cat = CATEGORY_COLORS[job.service_category];

    let html = `<div style="font-size:12px;min-width:180px">`;
    html += `<strong>${customerName}</strong>`;
    if (alert?.priority_tier === 'vip') html += ` <span style="background:#fef3c7;color:#92400e;padding:1px 5px;border-radius:4px;font-size:10px;font-weight:600">VIP</span>`;
    html += `<br/>${job.job_number} – ${job.job_title}`;
    if (cat) html += `<br/><span style="color:${cat.url.includes('blue') ? '#2563eb' : cat.url.includes('green') ? '#16a34a' : '#ea580c'};font-size:11px">● ${cat.label}</span>`;
    html += `<br/><span style="color:#888">${address}</span>`;

    // Warnings
    if (warnings && warnings.length > 0) {
      html += `<div style="margin-top:4px;padding:3px 6px;background:#fef2f2;border-radius:4px;color:#dc2626;font-size:11px">⚠ ${warnings[0].description || 'Customer warning'}</div>`;
    }

    // Site flags summary
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

  // Update markers with color-coded icons
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    const selectedIcon = new L.Icon({ iconUrl: SELECTED_MARKER_URL, shadowUrl: SHADOW_URL, ...ICON_OPTS });

    const bounds: L.LatLngExpression[] = [];
    const coordCounts: Record<string, number> = {};

    filteredJobs.forEach((j: any) => {
      if (!j.property_id || !propertyLocations[j.property_id]) return;
      const loc = propertyLocations[j.property_id];
      const isSelected = selectedJobIds.has(j.id);
      const customerName = j.customers ? `${j.customers.first_name} ${j.customers.last_name}` : 'Unknown';

      // Color by service category (unless selected → red)
      const catColor = CATEGORY_COLORS[j.service_category];
      const normalIcon = new L.Icon({
        iconUrl: catColor?.url || DEFAULT_MARKER_URL,
        shadowUrl: SHADOW_URL,
        ...ICON_OPTS,
      });

      // Offset co-located markers
      const coordKey = `${loc.lat},${loc.lng}`;
      const idx = coordCounts[coordKey] || 0;
      coordCounts[coordKey] = idx + 1;
      const offsetLat = loc.lat + idx * 0.0008;
      const offsetLng = loc.lng + idx * 0.0008;

      // Build tooltip with alert summary
      const alert = siteAlerts[j.property_id];
      const warnings = customerWarnings[j.customer_id];
      let tooltipExtra = '';
      if (alert?.priority_tier === 'vip') tooltipExtra += ' ⭐';
      if (warnings && warnings.length > 0) tooltipExtra += ' ⚠️';
      if (alert?.medical_alert) tooltipExtra += ' 🏥';
      if (alert?.has_dog) tooltipExtra += ' 🐕';
      const tooltipText = `${customerName} – #${j.job_number}${tooltipExtra}`;

      const marker = L.marker([offsetLat, offsetLng], { icon: isSelected ? selectedIcon : normalIcon })
        .addTo(map)
        .bindTooltip(tooltipText, { permanent: false, direction: 'top', offset: [0, -35] })
        .bindPopup(buildPopupHtml(j, loc.address));

      marker.on('click', () => toggleJob(j.id));
      markersRef.current[j.id] = marker;
      bounds.push([offsetLat, offsetLng]);
    });

    if (bounds.length > 0) {
      map.fitBounds(L.latLngBounds(bounds as any), { padding: [40, 40], maxZoom: 13 });
    }
  }, [filteredJobs, propertyLocations, selectedJobIds, toggleJob, siteAlerts, customerWarnings]);

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

  // Category legend items
  const activeCats = useMemo(() => {
    const cats = new Set(filteredJobs.map((j: any) => j.service_category));
    return [...cats].filter(Boolean);
  }, [filteredJobs]);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/schedule')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Schedule New Visits</h1>
            <p className="text-sm text-muted-foreground">Quickly create visits for active <strong>recurring jobs</strong>.</p>
          </div>
        </div>
        <Button
          disabled={selectedJobIds.size === 0}
          onClick={() => setShowModal(true)}
          className="gap-2"
        >
          {selectedJobIds.size > 0 ? `${selectedJobIds.size} Selected` : '0 Selected'} – Next
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5" /> Filter recurring jobs
            </p>
            <div className="flex items-center gap-2 flex-1 flex-wrap">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search client, job #..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="h-9 pl-8 text-sm"
                />
              </div>
              <div className="relative flex-1 min-w-[180px]">
                <Input
                  placeholder="Description contains..."
                  value={descriptionFilter}
                  onChange={(e) => setDescriptionFilter(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
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

        {/* Right: Map */}
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
          </div>

          {/* Alert legend */}
          <div className="flex items-center gap-2 flex-wrap px-1">
            <span className="text-xs font-medium text-muted-foreground">Alerts:</span>
            <span className="text-[10px] text-muted-foreground">⭐ VIP</span>
            <span className="text-[10px] text-muted-foreground">⚠️ Warning</span>
            <span className="text-[10px] text-muted-foreground">♿ Access</span>
            <span className="text-[10px] text-muted-foreground">🏥 Medical</span>
            <span className="text-[10px] text-muted-foreground">🐕 Dog</span>
            <span className="text-[10px] text-muted-foreground">🔒 Gate</span>
          </div>
        </div>
      </div>

      {/* Create Visits Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create {selectedJobIds.size} Visit{selectedJobIds.size !== 1 ? 's' : ''}</DialogTitle>
          </DialogHeader>

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

            {/* Team Selection */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Assign Team</label>
              {selectedTeam.length === 0 ? (
                <p className="text-sm text-muted-foreground">No users are currently assigned</p>
              ) : (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {selectedTeam.map((uid) => {
                    const emp = (employees as any[]).find((e: any) => e.user_id === uid);
                    return (
                      <Badge key={uid} variant="secondary" className="gap-1 pr-1">
                        {emp?.full_name || 'Unknown'}
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
                    .map((emp: any) => (
                    <label
                      key={emp.user_id}
                      className="flex items-center gap-2.5 px-3 py-2 hover:bg-muted/50 cursor-pointer text-sm border-b last:border-b-0"
                    >
                      <Checkbox
                        checked={selectedTeam.includes(emp.user_id)}
                        onCheckedChange={() => toggleEmployee(emp.user_id)}
                      />
                      <div className="min-w-0">
                        <span className="font-medium">{emp.full_name || 'Unnamed'}</span>
                        {emp.role_title && <span className="text-muted-foreground ml-1.5 text-xs">· {emp.role_title}</span>}
                      </div>
                    </label>
                  ))
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
