import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Navigation, ExternalLink, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Coords {
  lat: number;
  lng: number;
  accuracy: number;
}

export function WorkerLocationCard() {
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

  return (
    <Card
      className={cn(
        'transition-all active:scale-[0.98] cursor-pointer',
        coords ? 'bg-primary/5 border-primary/20' : 'bg-muted/30 border-dashed'
      )}
      onClick={coords ? openInMaps : getLocation}
    >
      <CardContent className="py-4 px-4">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Getting your location…</p>
          </div>
        ) : error ? (
          <div className="text-center space-y-1 py-2">
            <MapPin className="h-6 w-6 mx-auto text-destructive/60" />
            <p className="text-xs text-destructive">{error}</p>
            <p className="text-[10px] text-muted-foreground">Tap to retry</p>
          </div>
        ) : coords ? (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Navigation className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground flex items-center gap-1">
                Current Location
                <ExternalLink className="h-3 w-3 text-muted-foreground" />
              </p>
              <p className="text-[11px] text-muted-foreground font-mono tabular-nums">
                {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                ±{Math.round(coords.accuracy)}m accuracy • Tap to open map
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-1 py-2">
            <MapPin className="h-6 w-6 mx-auto text-muted-foreground/50" />
            <p className="text-xs text-muted-foreground">Tap to get location</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
