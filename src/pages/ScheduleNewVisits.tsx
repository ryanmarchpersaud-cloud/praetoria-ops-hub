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
import { useToast } from '@/hooks/use-toast';
import { useJobs } from '@/hooks/useJobs';
import { useEmployees } from '@/hooks/useEmployees';
import { useCreateVisit } from '@/hooks/useVisits';
import { supabase } from '@/integrations/supabase/client';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { format } from 'date-fns';
import { CalendarIcon, ArrowLeft, Check, X, Search, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const [propertyLocations, setPropertyLocations] = useState<Record<string, { lat: number; lng: number; address: string }>>({});
  const [locationsLoaded, setLocationsLoaded] = useState(false);

  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});

  // Filter recurring jobs
  const recurringJobs = useMemo(() => {
    return (allJobs as any[]).filter((j) => {
      const isRecurring = j.service_frequency && j.service_frequency !== 'one_time';
      const isActive = j.status === 'active' || j.status === 'scheduled' || j.status === 'in_progress';
      return isRecurring && isActive;
    });
  }, [allJobs]);

  // Load property locations
  useEffect(() => {
    if (locationsLoaded || recurringJobs.length === 0) return;
    const propertyIds = [...new Set(recurringJobs.map((j: any) => j.property_id).filter(Boolean))];
    if (propertyIds.length === 0) return;

    supabase
      .from('properties')
      .select('id, property_name, address_line_1, city, province, postal_code, latitude, longitude')
      .in('id', propertyIds)
      .then(({ data }) => {
        if (!data) return;
        const locs: Record<string, { lat: number; lng: number; address: string }> = {};
        data.forEach((p: any) => {
          if (p.latitude && p.longitude) {
            locs[p.id] = {
              lat: p.latitude,
              lng: p.longitude,
              address: [p.address_line_1, p.city, p.province].filter(Boolean).join(', '),
            };
          }
        });
        setPropertyLocations(locs);
        setLocationsLoaded(true);
      });
  }, [recurringJobs, locationsLoaded]);

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

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current).setView([53.5461, -113.4938], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>',
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove old markers
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    const greenIcon = new L.Icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
    });
    const redIcon = new L.Icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
    });

    const bounds: L.LatLngExpression[] = [];

    filteredJobs.forEach((j: any) => {
      if (!j.property_id || !propertyLocations[j.property_id]) return;
      const loc = propertyLocations[j.property_id];
      const isSelected = selectedJobIds.has(j.id);
      const customerName = j.customers ? `${j.customers.first_name} ${j.customers.last_name}` : 'Unknown';

      const marker = L.marker([loc.lat, loc.lng], { icon: isSelected ? redIcon : greenIcon })
        .addTo(map)
        .bindPopup(`<div style="font-size:12px"><strong>${customerName}</strong><br/>${j.job_number} – ${j.job_title}<br/><span style="color:#888">${loc.address}</span></div>`);

      marker.on('click', () => toggleJob(j.id));
      markersRef.current[j.id] = marker;
      bounds.push([loc.lat, loc.lng]);
    });

    if (bounds.length > 0) {
      map.fitBounds(L.latLngBounds(bounds as any), { padding: [40, 40], maxZoom: 13 });
    }
  }, [filteredJobs, propertyLocations, selectedJobIds, toggleJob]);

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
          service_category: (job as any).service_category || 'snow_removal',
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
      <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-3 min-h-[400px]">
        {/* Left: Job list */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-sm font-medium">Select</p>
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
                        <p className="font-medium text-foreground truncate">
                          {customerName} - #{job.job_number}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {job.job_title}
                          {job.properties?.property_name && ` · ${job.properties.property_name}`}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Map */}
        <Card className="overflow-hidden">
          <div ref={mapContainerRef} className="h-[500px] w-full" />
        </Card>
      </div>

      {/* Create Visits Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-lg">
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
              <div className="border rounded-md max-h-[160px] overflow-y-auto">
                {(employees as any[]).length === 0 ? (
                  <p className="text-sm text-muted-foreground p-3">No team members found</p>
                ) : (
                  (employees as any[]).map((emp: any) => (
                    <label
                      key={emp.user_id}
                      className="flex items-center gap-2.5 px-3 py-2 hover:bg-muted/50 cursor-pointer text-sm border-b last:border-b-0"
                    >
                      <Checkbox
                        checked={selectedTeam.includes(emp.user_id)}
                        onCheckedChange={() => toggleEmployee(emp.user_id)}
                      />
                      {emp.full_name || 'Unnamed'}
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
