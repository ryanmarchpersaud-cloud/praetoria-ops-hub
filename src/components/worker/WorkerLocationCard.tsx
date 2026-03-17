import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Navigation, ExternalLink, Loader2, Route, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Coords {
  lat: number;
  lng: number;
  accuracy: number;
}

interface NextVisitProps {
  propertyName?: string;
  address?: string;
  city?: string;
}

export function WorkerLocationCard({ nextVisit }: { nextVisit?: NextVisitProps | null }) {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setLoading(false);
      },
      (err) => {
        setError(
          err.code === 1
            ? 'Location access denied. Enable in device settings.'
            : 'Could not get location. Try again.'
        );
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => {
    getLocation();
  }, []);

  const openInMaps = () => {
    if (!coords) return;
    const url = `https://www.google.com/maps?q=${coords.lat},${coords.lng}`;
    window.open(url, '_blank');
  };

  const navigateToVisit = () => {
    if (!nextVisit?.address) return;
    const dest = [nextVisit.address, nextVisit.city].filter(Boolean).join(', ');
    const url = coords
      ? `https://www.google.com/maps/dir/${coords.lat},${coords.lng}/${encodeURIComponent(dest)}`
      : `https://www.google.com/maps?daddr=${encodeURIComponent(dest)}`;
    window.open(url, '_blank');
  };

  const hasNextVisit = nextVisit?.address;

  return (
    <Card className={cn(
      'overflow-hidden transition-all',
      coords ? 'border-primary/15' : 'border-dashed bg-muted/20'
    )}>
      <CardContent className="p-0">
        {/* Map preview area */}
        <div className="relative bg-gradient-to-br from-primary/5 via-primary/3 to-background p-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Getting your location…</p>
            </div>
          ) : error ? (
            <button onClick={getLocation} className="w-full text-center space-y-1 py-3 active:opacity-70">
              <MapPin className="h-6 w-6 mx-auto text-destructive/60" />
              <p className="text-xs text-destructive">{error}</p>
              <p className="text-[10px] text-muted-foreground">Tap to retry</p>
            </button>
          ) : coords ? (
            <div className="space-y-3">
              {/* Current location */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Navigation className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground">Your Location</p>
                  <p className="text-[10px] text-muted-foreground font-mono tabular-nums">
                    {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                  </p>
                </div>
                <button
                  onClick={openInMaps}
                  className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center active:scale-90 transition-transform"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-primary" />
                </button>
              </div>

              {/* Route to next visit */}
              {hasNextVisit && (
                <>
                  <div className="flex items-center gap-2 px-1">
                    <div className="w-px h-4 bg-primary/20 ml-4" />
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Route className="h-3 w-3" />
                      <span>Route to next visit</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center shrink-0">
                      <MapPin className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground">{nextVisit.propertyName}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{nextVisit.address}{nextVisit.city && `, ${nextVisit.city}`}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button onClick={getLocation} className="w-full text-center space-y-1 py-3 active:opacity-70">
              <MapPin className="h-6 w-6 mx-auto text-muted-foreground/50" />
              <p className="text-xs text-muted-foreground">Tap to get location</p>
            </button>
          )}
        </div>

        {/* Action buttons */}
        {coords && (
          <div className="flex border-t border-border divide-x divide-border">
            <button
              onClick={openInMaps}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium text-primary active:bg-muted/50 transition-colors"
            >
              <MapPin className="h-3.5 w-3.5" />
              View Map
            </button>
            {hasNextVisit ? (
              <button
                onClick={navigateToVisit}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium text-primary active:bg-muted/50 transition-colors"
              >
                <Navigation className="h-3.5 w-3.5" />
                Navigate
              </button>
            ) : (
              <button
                onClick={getLocation}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium text-muted-foreground active:bg-muted/50 transition-colors"
              >
                <Clock className="h-3.5 w-3.5" />
                Refresh
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
