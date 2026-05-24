import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  ClipboardCheck, ChevronDown, ChevronRight, MapPin, Camera,
  Snowflake, Sun, Leaf, ChevronLeft, ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SignedVisitPhotoImg } from '@/components/SignedVisitPhotoImg';

const STATUS_STYLES: Record<string, string> = {
  Completed: 'bg-green-100 text-green-700',
  'In Progress': 'bg-blue-100 text-blue-700',
  Scheduled: 'bg-amber-100 text-amber-700',
  'En Route': 'bg-cyan-100 text-cyan-700',
  Skipped: 'bg-muted text-muted-foreground',
  Rescheduled: 'bg-orange-100 text-orange-700',
  Planned: 'bg-slate-100 text-slate-700',
};

const TAG_COLORS: Record<string, string> = {
  Before: 'bg-blue-100 text-blue-700',
  After: 'bg-green-100 text-green-700',
  Progress: 'bg-amber-100 text-amber-700',
  Issue: 'bg-red-100 text-red-700',
};

type Visit = {
  id: string;
  visit_number: string;
  service_date: string;
  visit_status: string;
  visit_type: string | null;
  service_summary: string | null;
  customer_visible_notes: string | null;
  crew_notes: string | null;
  weather_notes: string | null;
  snow_depth: string | null;
  arrival_time: string | null;
  completion_time: string | null;
  properties: { id: string; property_name: string } | null;
  visit_photos: { id: string; file_url: string; photo_tag: string; caption: string | null }[];
};

function parseLocalDate(s: string): Date {
  const m = s?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  return new Date(s);
}

function getSeasonLabel(dateStr: string) {
  const d = parseLocalDate(dateStr);
  const month = d.getMonth();
  const year = d.getFullYear();
  if (month >= 11) return { key: `winter-${year}`, label: `Winter ${year}–${year + 1}`, icon: Snowflake, sort: year * 10 + 4 };
  if (month <= 2) return { key: `winter-${year - 1}`, label: `Winter ${year - 1}–${year}`, icon: Snowflake, sort: (year - 1) * 10 + 4 };
  if (month <= 4) return { key: `spring-${year}`, label: `Spring ${year}`, icon: Leaf, sort: year * 10 + 1 };
  if (month <= 7) return { key: `summer-${year}`, label: `Summer ${year}`, icon: Sun, sort: year * 10 + 2 };
  return { key: `fall-${year}`, label: `Fall ${year}`, icon: Leaf, sort: year * 10 + 3 };
}

function fmtTime(iso: string | null) {
  if (!iso) return null;
  try { return new Date(iso).toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' }); }
  catch { return null; }
}

export function CustomerServiceHistory({ customerId }: { customerId: string }) {
  const [collapsedSeasons, setCollapsedSeasons] = useState<Set<string>>(new Set());
  const [expandedVisit, setExpandedVisit] = useState<string | null>(null);
  const [lightboxPhotos, setLightboxPhotos] = useState<Visit['visit_photos']>([]);
  const [lightboxIdx, setLightboxIdx] = useState(0);

  const { data: visits = [], isLoading } = useQuery({
    queryKey: ['admin_customer_visits', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visits')
        .select('id, visit_number, service_date, visit_status, visit_type, service_summary, customer_visible_notes, crew_notes, weather_notes, snow_depth, arrival_time, completion_time, properties(id, property_name), visit_photos(id, file_url, photo_tag, caption)')
        .eq('customer_id', customerId)
        .order('service_date', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Visit[];
    },
    enabled: !!customerId,
  });

  const seasons = useMemo(() => {
    const map = new Map<string, { label: string; icon: typeof Snowflake; sort: number; visits: Visit[] }>();
    visits.forEach(v => {
      const s = getSeasonLabel(v.service_date);
      if (!map.has(s.key)) map.set(s.key, { label: s.label, icon: s.icon, sort: s.sort, visits: [] });
      map.get(s.key)!.visits.push(v);
    });
    return Array.from(map.values()).sort((a, b) => b.sort - a.sort);
  }, [visits]);

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

  const totalPhotos = visits.reduce((sum, v) => sum + (v.visit_photos?.length || 0), 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-primary" />
          Service History
          {!isLoading && visits.length > 0 && (
            <span className="text-xs font-normal text-muted-foreground ml-auto">
              {visits.length} visit{visits.length !== 1 ? 's' : ''} · {totalPhotos} photo{totalPhotos !== 1 ? 's' : ''}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-14 rounded-md bg-muted animate-pulse" />)}
          </div>
        ) : visits.length === 0 ? (
          <div className="py-8 text-center space-y-1">
            <ClipboardCheck className="h-8 w-8 mx-auto text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No visits yet.</p>
            <p className="text-xs text-muted-foreground">All past and future visits for this customer will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {seasons.map(season => {
              const isCollapsed = collapsedSeasons.has(season.label);
              const SeasonIcon = season.icon;
              const completed = season.visits.filter(v => v.visit_status === 'Completed').length;
              return (
                <div key={season.label}>
                  <button
                    onClick={() => toggleSeason(season.label)}
                    className="w-full flex items-center gap-2 py-1.5 text-left"
                  >
                    {isCollapsed ? <ChevronRight className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    <SeasonIcon className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-sm">{season.label}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {completed}/{season.visits.length} completed
                    </span>
                  </button>
                  {!isCollapsed && (
                    <div className="space-y-1.5 ml-1">
                      {season.visits.map(visit => {
                        const isExpanded = expandedVisit === visit.id;
                        const photos = visit.visit_photos || [];
                        const hasPhotos = photos.length > 0;
                        return (
                          <div key={visit.id} className={cn('rounded-md border bg-card', isExpanded && 'ring-1 ring-primary/20')}>
                            <button
                              onClick={() => setExpandedVisit(isExpanded ? null : visit.id)}
                              className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left"
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                <span className="font-mono text-xs font-medium">{visit.visit_number}</span>
                                <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full', STATUS_STYLES[visit.visit_status] || 'bg-muted text-muted-foreground')}>
                                  {visit.visit_status}
                                </span>
                                {visit.visit_type && (
                                  <span className="text-[10px] text-muted-foreground">{visit.visit_type}</span>
                                )}
                                {hasPhotos && (
                                  <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                                    <Camera className="h-3 w-3" /> {photos.length}
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-muted-foreground shrink-0">
                                {parseLocalDate(visit.service_date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            </button>
                            {visit.properties && (
                              <div className="px-3 pb-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                {visit.properties.property_name}
                              </div>
                            )}
                            {isExpanded && (
                              <div className="px-3 pb-3 pt-1 space-y-2 border-t border-border">
                                <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground pt-2">
                                  {fmtTime(visit.arrival_time) && <span>Arrived: {fmtTime(visit.arrival_time)}</span>}
                                  {fmtTime(visit.completion_time) && <span>Completed: {fmtTime(visit.completion_time)}</span>}
                                  {visit.weather_notes && <span>Weather: {visit.weather_notes}</span>}
                                  {visit.snow_depth && <span>Snow: {visit.snow_depth}</span>}
                                </div>
                                {visit.service_summary && (
                                  <div>
                                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Service Summary</p>
                                    <p className="text-xs text-foreground whitespace-pre-wrap">{visit.service_summary}</p>
                                  </div>
                                )}
                                {visit.customer_visible_notes && (
                                  <div>
                                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Customer Notes</p>
                                    <p className="text-xs text-foreground whitespace-pre-wrap italic">{visit.customer_visible_notes}</p>
                                  </div>
                                )}
                                {visit.crew_notes && (
                                  <div>
                                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Crew Notes (internal)</p>
                                    <p className="text-xs text-foreground whitespace-pre-wrap">{visit.crew_notes}</p>
                                  </div>
                                )}
                                {hasPhotos && (
                                  <div>
                                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Photos</p>
                                    <div className="flex gap-1.5 overflow-x-auto pb-1">
                                      {photos.map((photo, idx) => (
                                        <button
                                          key={photo.id}
                                          onClick={() => openLightbox(photos, idx)}
                                          className="relative shrink-0 w-20 h-20 rounded-md overflow-hidden border hover:ring-2 hover:ring-primary/50"
                                        >
                                          <img src={photo.file_url} alt={photo.caption || ''} className="w-full h-full object-cover" loading="lazy" />
                                          <span className={cn('absolute bottom-0 inset-x-0 text-[8px] font-medium text-center py-0.5', TAG_COLORS[photo.photo_tag] || 'bg-muted text-muted-foreground')}>
                                            {photo.photo_tag}
                                          </span>
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                <div className="pt-1">
                                  <Link
                                    to={`/visits/${visit.id}`}
                                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                  >
                                    Open full visit <ExternalLink className="h-3 w-3" />
                                  </Link>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

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
    </Card>
  );
}
