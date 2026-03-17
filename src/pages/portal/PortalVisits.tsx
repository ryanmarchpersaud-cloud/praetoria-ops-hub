import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCustomerProfile } from '@/hooks/useUserRole';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  ClipboardCheck, ChevronDown, ChevronRight, MapPin, Camera,
  Snowflake, Sun, Leaf, Filter, Image, ChevronLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<string, string> = {
  Completed: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  'In Progress': 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  Scheduled: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'En Route': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  Skipped: 'bg-muted text-muted-foreground',
  Rescheduled: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
};

const TAG_COLORS: Record<string, string> = {
  Before: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  After: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  Progress: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  Issue: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

type Visit = {
  id: string;
  visit_number: string;
  service_date: string;
  visit_status: string;
  visit_type: string;
  service_summary: string | null;
  customer_visible_notes: string | null;
  weather_notes: string | null;
  snow_depth: string | null;
  properties: { id: string; property_name: string } | null;
  visit_photos: { id: string; file_url: string; photo_tag: string; caption: string | null }[];
};

/** Determine season label from a date: Winter 2025–2026, Summer 2025, etc. */
function getSeasonLabel(dateStr: string) {
  const d = new Date(dateStr);
  const month = d.getMonth(); // 0-based
  const year = d.getFullYear();

  if (month >= 11) return { key: `winter-${year}`, label: `Winter ${year}–${year + 1}`, icon: Snowflake, sort: year * 10 + 4 };
  if (month <= 2) return { key: `winter-${year - 1}`, label: `Winter ${year - 1}–${year}`, icon: Snowflake, sort: (year - 1) * 10 + 4 };
  if (month <= 4) return { key: `spring-${year}`, label: `Spring ${year}`, icon: Leaf, sort: year * 10 + 1 };
  if (month <= 7) return { key: `summer-${year}`, label: `Summer ${year}`, icon: Sun, sort: year * 10 + 2 };
  return { key: `fall-${year}`, label: `Fall ${year}`, icon: Leaf, sort: year * 10 + 3 };
}

const VISIBLE_STATUSES = ['Completed', 'In Progress', 'Scheduled', 'En Route', 'Skipped', 'Rescheduled'];

export default function PortalVisits() {
  const { data: customer } = useCustomerProfile();
  const [propertyFilter, setPropertyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [collapsedSeasons, setCollapsedSeasons] = useState<Set<string>>(new Set());
  const [expandedVisit, setExpandedVisit] = useState<string | null>(null);
  const [lightboxPhotos, setLightboxPhotos] = useState<Visit['visit_photos']>([]);
  const [lightboxIdx, setLightboxIdx] = useState(0);

  const { data: visits = [], isLoading } = useQuery({
    queryKey: ['portal_visits', customer?.id],
    queryFn: async () => {
      if (!customer) return [];
      const { data, error } = await supabase
        .from('visits')
        .select('id, visit_number, service_date, visit_status, visit_type, service_summary, customer_visible_notes, weather_notes, snow_depth, properties(id, property_name), visit_photos(id, file_url, photo_tag, caption)')
        .eq('customer_id', customer.id)
        .in('visit_status', VISIBLE_STATUSES as any)
        .order('service_date', { ascending: false });
      if (error) throw error;
      return data as unknown as Visit[];
    },
    enabled: !!customer,
  });

  // Unique properties for filter
  const properties = useMemo(() => {
    const map = new Map<string, string>();
    visits.forEach(v => {
      if (v.properties) map.set(v.properties.id, v.properties.property_name);
    });
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [visits]);

  // Filter
  const filtered = useMemo(() =>
    visits.filter(v => {
      if (propertyFilter !== 'all' && v.properties?.id !== propertyFilter) return false;
      if (statusFilter !== 'all' && v.visit_status !== statusFilter) return false;
      return true;
    }),
  [visits, propertyFilter, statusFilter]);

  // Group by season
  const seasons = useMemo(() => {
    const map = new Map<string, { label: string; icon: typeof Snowflake; sort: number; visits: Visit[] }>();
    filtered.forEach(v => {
      const s = getSeasonLabel(v.service_date);
      if (!map.has(s.key)) map.set(s.key, { label: s.label, icon: s.icon, sort: s.sort, visits: [] });
      map.get(s.key)!.visits.push(v);
    });
    return Array.from(map.values()).sort((a, b) => b.sort - a.sort);
  }, [filtered]);

  const toggleSeason = (label: string) => {
    setCollapsedSeasons(prev => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  };

  const openLightbox = (photos: Visit['visit_photos'], idx: number) => {
    setLightboxPhotos(photos);
    setLightboxIdx(idx);
  };

  const activeStatuses = useMemo(() => {
    const s = new Set<string>();
    visits.forEach(v => s.add(v.visit_status));
    return Array.from(s);
  }, [visits]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold flex items-center gap-2">
        <ClipboardCheck className="h-5 w-5 text-primary" /> Visit History
      </h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {properties.length > 1 && (
          <select
            value={propertyFilter}
            onChange={e => setPropertyFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-xs focus:ring-1 focus:ring-ring"
          >
            <option value="all">All Properties</option>
            {properties.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
        {activeStatuses.length > 1 && (
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => setStatusFilter('all')}
              className={cn(
                'text-xs px-3 py-1.5 rounded-full border transition-colors',
                statusFilter === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:bg-muted'
              )}
            >
              All
            </button>
            {activeStatuses.map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'text-xs px-3 py-1.5 rounded-full border transition-colors',
                  statusFilter === s ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:bg-muted'
                )}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      {!isLoading && filtered.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {filtered.length} visit{filtered.length !== 1 ? 's' : ''} across {seasons.length} season{seasons.length !== 1 ? 's' : ''}
        </p>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-2">
            <ClipboardCheck className="h-10 w-10 mx-auto text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No visits found.</p>
            <p className="text-xs text-muted-foreground">
              {visits.length > 0 ? 'Try adjusting your filters.' : 'Your visit history will appear here once services are scheduled.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {seasons.map(season => {
            const isCollapsed = collapsedSeasons.has(season.label);
            const SeasonIcon = season.icon;
            const completedCount = season.visits.filter(v => v.visit_status === 'Completed').length;

            return (
              <div key={season.label}>
                {/* Season header */}
                <button
                  onClick={() => toggleSeason(season.label)}
                  className="w-full flex items-center gap-2 py-2 px-1 text-left group"
                >
                  {isCollapsed ? <ChevronRight className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  <SeasonIcon className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">{season.label}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {completedCount}/{season.visits.length} completed
                  </span>
                </button>

                {!isCollapsed && (
                  <div className="space-y-2 ml-1">
                    {season.visits.map(visit => {
                      const isExpanded = expandedVisit === visit.id;
                      const photos = visit.visit_photos || [];
                      const hasPhotos = photos.length > 0;

                      return (
                        <Card
                          key={visit.id}
                          className={cn('transition-shadow', isExpanded && 'ring-1 ring-primary/20')}
                        >
                          <CardContent className="pt-3 pb-3 px-3 space-y-1.5">
                            {/* Top row */}
                            <button
                              onClick={() => setExpandedVisit(isExpanded ? null : visit.id)}
                              className="w-full flex items-center justify-between gap-2 text-left"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-mono text-xs font-medium text-foreground">{visit.visit_number}</span>
                                <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full', STATUS_STYLES[visit.visit_status] || 'bg-muted text-muted-foreground')}>
                                  {visit.visit_status}
                                </span>
                                {hasPhotos && <Camera className="h-3 w-3 text-muted-foreground shrink-0" />}
                              </div>
                              <span className="text-[11px] text-muted-foreground shrink-0">
                                {new Date(visit.service_date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                              </span>
                            </button>

                            {/* Property */}
                            {visit.properties && propertyFilter === 'all' && (
                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                {visit.properties.property_name}
                              </div>
                            )}

                            {/* Weather / snow for completed */}
                            {visit.visit_status === 'Completed' && (visit.weather_notes || visit.snow_depth) && (
                              <p className="text-[10px] text-muted-foreground">
                                {[visit.weather_notes, visit.snow_depth && `Snow: ${visit.snow_depth}`].filter(Boolean).join(' · ')}
                              </p>
                            )}

                            {/* Expanded content */}
                            {isExpanded && (
                              <div className="pt-2 space-y-2 border-t border-border">
                                {visit.service_summary && (
                                  <div>
                                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Summary</p>
                                    <p className="text-xs text-foreground">{visit.service_summary}</p>
                                  </div>
                                )}
                                {visit.customer_visible_notes && (
                                  <div>
                                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Notes</p>
                                    <p className="text-xs text-foreground italic">{visit.customer_visible_notes}</p>
                                  </div>
                                )}

                                {/* Photos */}
                                {hasPhotos && (
                                  <div>
                                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Photos</p>
                                    <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                                      {photos.map((photo, idx) => (
                                        <button
                                          key={photo.id}
                                          onClick={() => openLightbox(photos, idx)}
                                          className="relative shrink-0 w-16 h-16 rounded-md overflow-hidden border hover:ring-2 hover:ring-primary/50 transition-all"
                                        >
                                          <img src={photo.file_url} alt={photo.caption || ''} className="w-full h-full object-cover" loading="lazy" />
                                          <span className={cn('absolute bottom-0 inset-x-0 text-[7px] font-medium text-center py-0.5', TAG_COLORS[photo.photo_tag] || 'bg-muted text-muted-foreground')}>
                                            {photo.photo_tag}
                                          </span>
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {!visit.service_summary && !visit.customer_visible_notes && !hasPhotos && (
                                  <p className="text-xs text-muted-foreground italic">No additional details available.</p>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox */}
      <Dialog open={lightboxPhotos.length > 0} onOpenChange={() => setLightboxPhotos([])}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden mx-2 bg-black/95">
          {lightboxPhotos.length > 0 && lightboxPhotos[lightboxIdx] && (
            <div className="relative">
              <div className="flex items-center justify-center min-h-[250px] max-h-[70vh]">
                <img
                  src={lightboxPhotos[lightboxIdx].file_url}
                  alt={lightboxPhotos[lightboxIdx].caption || ''}
                  className="max-w-full max-h-[70vh] object-contain"
                />
              </div>
              {lightboxPhotos.length > 1 && (
                <>
                  <button
                    onClick={() => setLightboxIdx(Math.max(0, lightboxIdx - 1))}
                    disabled={lightboxIdx === 0}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 rounded-full p-1.5 disabled:opacity-20"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setLightboxIdx(Math.min(lightboxPhotos.length - 1, lightboxIdx + 1))}
                    disabled={lightboxIdx === lightboxPhotos.length - 1}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 rounded-full p-1.5 disabled:opacity-20"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
              <div className="bg-background p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded', TAG_COLORS[lightboxPhotos[lightboxIdx].photo_tag])}>
                    {lightboxPhotos[lightboxIdx].photo_tag}
                  </span>
                  <span className="text-xs text-muted-foreground">{lightboxIdx + 1}/{lightboxPhotos.length}</span>
                </div>
                {lightboxPhotos[lightboxIdx].caption && (
                  <p className="text-xs text-foreground">{lightboxPhotos[lightboxIdx].caption}</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
