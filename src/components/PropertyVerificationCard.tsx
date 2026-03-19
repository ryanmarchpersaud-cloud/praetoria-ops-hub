import { Card, CardContent } from '@/components/ui/card';
import { DirectionsButton } from '@/components/DirectionsButton';
import { AlertTriangle, MapPin, Eye, Landmark, ShieldAlert, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface PropertyVerificationCardProps {
  property: any;
  onConfirm?: () => void;
  confirmed?: boolean;
  compact?: boolean;
}

export function PropertyVerificationCard({ property, onConfirm, confirmed, compact }: PropertyVerificationCardProps) {
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  if (!property) return null;

  const photos = [
    { url: property.photo_front_url, label: 'Front' },
    { url: property.photo_winter_url, label: 'Winter' },
    { url: property.photo_night_url, label: 'Night' },
  ].filter(p => p.url);

  const hasVerificationData = photos.length > 0 || property.landmark_notes || property.caution_notes || property.high_risk_flag;

  if (!hasVerificationData && compact) return null;

  return (
    <Card className={cn(
      property.high_risk_flag && 'border-destructive/50 bg-destructive/5 dark:bg-destructive/10',
    )}>
      <CardContent className="p-3 space-y-2.5">
        {/* High risk banner */}
        {property.high_risk_flag && (
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-destructive/10 text-destructive text-xs font-semibold">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            High-Risk / Confusing Property — Verify Carefully
          </div>
        )}

        {/* Photo verification */}
        {photos.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Eye className="h-3 w-3" /> Property Photos
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {(showAllPhotos ? photos : photos.slice(0, 2)).map((photo, i) => (
                <div key={i} className="relative shrink-0 w-28 h-20 rounded-lg overflow-hidden border bg-muted">
                  <img
                    src={photo.url}
                    alt={`${photo.label} view`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <span className="absolute bottom-0.5 left-0.5 text-[9px] font-medium bg-black/60 text-white px-1.5 py-0.5 rounded">
                    {photo.label}
                  </span>
                </div>
              ))}
              {!showAllPhotos && photos.length > 2 && (
                <button
                  onClick={() => setShowAllPhotos(true)}
                  className="shrink-0 w-16 h-20 rounded-lg border bg-muted flex items-center justify-center text-xs text-muted-foreground font-medium"
                >
                  +{photos.length - 2}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Address block */}
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{property.property_name}</p>
            {property.address_line_1 && (
              <p className="text-[11px] text-muted-foreground">
                {property.address_line_1}{property.city && `, ${property.city}`}
              </p>
            )}
            {property.house_number_location && (
              <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                <Home className="h-3 w-3" /> House #: {property.house_number_location}
              </p>
            )}
          </div>
          <DirectionsButton
            address={property.address_line_1}
            city={property.city}
            province={property.province}
            postalCode={property.postal_code}
            variant="icon"
          />
        </div>

        {/* Landmark notes */}
        {property.landmark_notes && (
          <div className="flex items-start gap-2 px-2 py-1.5 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40">
            <Landmark className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Landmarks</p>
              <p className="text-xs text-foreground">{property.landmark_notes}</p>
            </div>
          </div>
        )}

        {/* Caution notes */}
        {property.caution_notes && (
          <div className="flex items-start gap-2 px-2 py-1.5 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Caution</p>
              <p className="text-xs text-foreground">{property.caution_notes}</p>
            </div>
          </div>
        )}

        {/* Access info */}
        {(property.gate_code || property.access_notes || property.access_type) && (
          <div className="text-xs space-y-0.5 pt-1 border-t">
            {property.access_type && <p className="text-muted-foreground">Access: <span className="font-medium text-foreground">{property.access_type}</span></p>}
            {property.gate_code && <p className="text-amber-600 dark:text-amber-400">🔑 Gate code: {property.gate_code}</p>}
            {property.access_notes && <p className="text-muted-foreground italic">{property.access_notes}</p>}
          </div>
        )}

        {/* Confirm button */}
        {onConfirm && !confirmed && (
          <button
            onClick={onConfirm}
            className="w-full mt-1 py-2.5 rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 text-primary text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            <Eye className="h-4 w-4" />
            Confirm Correct Property
          </button>
        )}
        {confirmed && (
          <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium pt-1">
            <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">✓</div>
            Property verified
          </div>
        )}
      </CardContent>
    </Card>
  );
}
