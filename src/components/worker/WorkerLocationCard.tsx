import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Navigation, ExternalLink, Loader2, Route, RefreshCw, Compass, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Coords {
  lat: number;
  lng: number;
  accuracy: number;
}

interface NextVisitInfo {
  propertyName?: string;
  address?: string;
  city?: string;
  customerName?: string;
  serviceType?: string;
  visitStatus?: string;
  customerPhone?: string;
}

export function WorkerLocationCard({ nextVisit }: { nextVisit?: NextVisitInfo | null }) {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [watching, setWatching] = useState(false);

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
        setLoading(false);
      },
      (err) => {
        setError(err.code === 1 ? 'Location access denied' : 'Could not get location');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // Watch position for live updates
  useEffect(() => {
    if (!navigator.geolocation) return;
    getLocation();
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
        setWatching(true);
        setError(null);
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 15000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [getLocation]);

  const dest = nextVisit?.address
    ? [nextVisit.address, nextVisit.city].filter(Boolean).join(', ')
    : null;

  const openInMaps = () => {
    if (!coords) return;
    window.open(`https://www.google.com/maps?q=${coords.lat},${coords.lng}`, '_blank');
  };

  const navigateToVisit = () => {
    if (!dest) return;
    const url = coords
      ? `https://www.google.com/maps/dir/${coords.lat},${coords.lng}/${encodeURIComponent(dest)}`
      : `https://www.google.com/maps?daddr=${encodeURIComponent(dest)}`;
    window.open(url, '_blank');
  };

  // Static map thumbnail URL (uses OpenStreetMap static tile - no API key needed)
  const staticMapUrl = coords
    ? `https://staticmap.thisipcan.cyou/?center=${coords.lat},${coords.lng}&zoom=14&size=400x180&markers=${coords.lat},${coords.lng},red-dot`
    : null;

  return (
    <Card className="overflow-hidden border-primary/15">
      <CardContent className="p-0">
        {/* Map visual area */}
        <div className="relative">
          {/* Map background */}
          <div className={cn(
            'relative h-36 bg-gradient-to-br from-primary/8 via-primary/4 to-accent/5 overflow-hidden',
          )}>
            {loading && !coords ? (
              <div className="flex flex-col items-center justify-center h-full gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-[11px] text-muted-foreground">Acquiring GPS…</p>
              </div>
            ) : error && !coords ? (
              <button onClick={getLocation} className="flex flex-col items-center justify-center h-full gap-2 w-full active:opacity-70">
                <Compass className="h-7 w-7 text-destructive/60" />
                <p className="text-[11px] text-destructive font-medium">{error}</p>
                <p className="text-[10px] text-muted-foreground">Tap to retry</p>
              </button>
            ) : coords ? (
              <>
                {/* Grid overlay to simulate map */}
                <div className="absolute inset-0 opacity-[0.04]"
                  style={{
                    backgroundImage: 'linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)',
                    backgroundSize: '24px 24px',
                  }}
                />

                {/* Current location pin */}
                <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10">
                  <div className="w-4 h-4 rounded-full bg-primary border-2 border-primary-foreground shadow-lg relative">
                    <div className="absolute inset-0 rounded-full bg-primary animate-ping opacity-30" />
                  </div>
                  <span className="text-[8px] font-bold text-primary mt-1 bg-background/80 px-1 rounded">YOU</span>
                </div>

                {/* Destination pin */}
                {dest && (
                  <>
                    {/* Route line */}
                    <div className="absolute top-1/2 left-1/3 w-[35%] h-[1px] z-[5]"
                      style={{
                        background: 'repeating-linear-gradient(90deg, hsl(var(--primary)) 0px, hsl(var(--primary)) 6px, transparent 6px, transparent 10px)',
                        transform: 'translateY(-50%) rotate(-15deg)',
                        transformOrigin: 'left center',
                      }}
                    />
                    <div className="absolute top-[35%] right-[22%] flex flex-col items-center z-10">
                      <MapPin className="h-5 w-5 text-destructive drop-shadow-md" />
                      <span className="text-[8px] font-bold text-destructive mt-0.5 bg-background/80 px-1 rounded">NEXT</span>
                    </div>
                  </>
                )}

                {/* Coordinates badge */}
                <div className="absolute bottom-2 left-2 bg-background/90 backdrop-blur-sm rounded-md px-2 py-1 flex items-center gap-1.5 z-10">
                  {watching && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                  <span className="text-[9px] font-mono text-muted-foreground tabular-nums">
                    {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                  </span>
                </div>

                {/* Accuracy badge */}
                <div className="absolute bottom-2 right-2 bg-background/90 backdrop-blur-sm rounded-md px-2 py-1 z-10">
                  <span className="text-[9px] text-muted-foreground">±{Math.round(coords.accuracy)}m</span>
                </div>

                {/* Refresh button */}
                <button
                  onClick={getLocation}
                  className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-background/90 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-transform z-10"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </>
            ) : null}
          </div>
        </div>

        {/* Destination info */}
        {nextVisit?.address && (
          <div className="px-3.5 py-3 border-t border-border space-y-2">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0 mt-0.5">
                <MapPin className="h-4 w-4 text-destructive" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground leading-tight">{nextVisit.propertyName || 'Next Visit'}</p>
                <p className="text-[10px] text-muted-foreground truncate">{nextVisit.address}{nextVisit.city && `, ${nextVisit.city}`}</p>
                {nextVisit.customerName && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {nextVisit.customerName}
                    {nextVisit.serviceType && <span className="text-primary"> • {nextVisit.serviceType}</span>}
                  </p>
                )}
              </div>
              {nextVisit.visitStatus && (
                <span className={cn(
                  'text-[9px] font-semibold px-1.5 py-0.5 rounded-full shrink-0',
                  nextVisit.visitStatus === 'In Progress' || nextVisit.visitStatus === 'En Route'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground'
                )}>
                  {nextVisit.visitStatus}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Action buttons */}
        {coords && (
          <div className="flex border-t border-border">
            <button
              onClick={openInMaps}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 text-[11px] font-semibold text-primary active:bg-primary/5 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open Map
            </button>
            {dest ? (
              <button
                onClick={navigateToVisit}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 text-[11px] font-semibold bg-primary text-primary-foreground active:bg-primary/90 transition-colors"
              >
                <Navigation className="h-3.5 w-3.5" />
                Navigate
              </button>
            ) : (
              <button
                onClick={getLocation}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 text-[11px] font-medium text-muted-foreground active:bg-muted/50 transition-colors border-l border-border"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </button>
            )}
            {nextVisit?.customerPhone && (
              <a
                href={`tel:${nextVisit.customerPhone}`}
                className="flex items-center justify-center gap-1.5 px-4 py-3 text-[11px] font-medium text-foreground active:bg-muted/50 transition-colors border-l border-border"
              >
                <Phone className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
