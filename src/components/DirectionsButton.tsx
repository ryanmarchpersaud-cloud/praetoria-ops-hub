import { Navigation } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DirectionsButtonProps {
  address?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  className?: string;
  variant?: 'icon' | 'button' | 'compact';
}

function buildMapsUrl(parts: { address?: string | null; city?: string | null; province?: string | null; postalCode?: string | null }) {
  const segments = [parts.address, parts.city, parts.province, parts.postalCode].filter(Boolean);
  if (segments.length === 0) return null;
  const query = encodeURIComponent(segments.join(', '));
  // Universal link: opens Apple Maps on iOS, Google Maps on Android/desktop
  return `https://maps.google.com/maps?daddr=${query}`;
}

export function DirectionsButton({ address, city, province, postalCode, className, variant = 'button' }: DirectionsButtonProps) {
  const url = buildMapsUrl({ address, city, province, postalCode });
  if (!url) return null;

  if (variant === 'icon') {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center active:scale-95 transition-transform',
          className
        )}
        onClick={e => e.stopPropagation()}
        title="Get directions"
      >
        <Navigation className="h-3.5 w-3.5 text-primary" />
      </a>
    );
  }

  if (variant === 'compact') {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'inline-flex items-center gap-1 text-[11px] font-medium text-primary active:opacity-70 transition-opacity',
          className
        )}
        onClick={e => e.stopPropagation()}
      >
        <Navigation className="h-3 w-3" />
        Directions
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium active:scale-95 transition-transform shadow-sm',
        className
      )}
      onClick={e => e.stopPropagation()}
    >
      <Navigation className="h-4 w-4" />
      Get Directions
    </a>
  );
}
