import { Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';

const APPLE_APP_STORE_URL = 'https://apps.apple.com/us/app/praetoria-ops-hub/id6762164364';
// When the Google Play listing goes live, replace this with the real URL and
// the badge will automatically become a working link.
const GOOGLE_PLAY_URL: string | null = null;

interface AppDownloadBadgesProps {
  /** Visual variant: full card with heading + copy, or just the badge row */
  variant?: 'card' | 'inline' | 'compact';
  /** Override default heading */
  title?: string;
  /** Override default description */
  description?: string;
  className?: string;
}

/**
 * Official-style Apple App Store + Google Play download badges for the
 * Praetoria Ops Hub mobile app. Additive surface — never alters the
 * surrounding page logic.
 */
export function AppDownloadBadges({
  variant = 'card',
  title = 'Download Praetoria Ops Hub',
  description = 'Manage requests, quotes, scheduling, visits, invoices, payments and service updates from one connected Praetoria portal.',
  className,
}: AppDownloadBadgesProps) {
  const badges = (
    <div className="flex flex-wrap items-center gap-2.5">
      {/* Apple App Store */}
      <a
        href={APPLE_APP_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Download Praetoria Ops Hub on the App Store"
        title="Download Praetoria Ops Hub on the App Store"
        className="inline-flex items-center gap-2.5 h-12 px-4 rounded-lg bg-[#0F172A] text-white hover:bg-[#1e293b] transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <svg
          className="w-7 h-7 shrink-0"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
        </svg>
        <span className="flex flex-col leading-tight text-left">
          <span className="text-[10px] opacity-80">Download on the</span>
          <span className="text-base font-semibold tracking-tight">App Store</span>
        </span>
      </a>

      {/* Google Play — live link if available, else "Coming Soon" */}
      {GOOGLE_PLAY_URL ? (
        <a
          href={GOOGLE_PLAY_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Get Praetoria Ops Hub on Google Play"
          title="Get Praetoria Ops Hub on Google Play"
          className="inline-flex items-center gap-2.5 h-12 px-4 rounded-lg bg-[#0F172A] text-white hover:bg-[#1e293b] transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <GooglePlayIcon />
          <span className="flex flex-col leading-tight text-left">
            <span className="text-[10px] opacity-80">Get it on</span>
            <span className="text-base font-semibold tracking-tight">Google Play</span>
          </span>
        </a>
      ) : (
        <div
          role="img"
          aria-label="Google Play coming soon"
          title="Google Play coming soon"
          className="inline-flex items-center gap-2.5 h-12 px-4 rounded-lg bg-[#0F172A]/60 text-white/85 shadow-sm cursor-not-allowed select-none"
        >
          <GooglePlayIcon />
          <span className="flex flex-col leading-tight text-left">
            <span className="text-[10px] opacity-80">Get it on</span>
            <span className="text-sm font-semibold tracking-tight">
              Google Play
              <span className="ml-1 text-[9px] uppercase tracking-wider opacity-80">
                Coming Soon
              </span>
            </span>
          </span>
        </div>
      )}
    </div>
  );

  if (variant === 'inline' || variant === 'compact') {
    return (
      <div className={cn('space-y-2', className)}>
        {variant === 'inline' && (
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Smartphone className="h-3.5 w-3.5" />
            {title}
          </p>
        )}
        {badges}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm',
        className,
      )}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Smartphone className="h-4.5 w-4.5 text-primary" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            {description}
          </p>
        </div>
      </div>
      {badges}
    </div>
  );
}

function GooglePlayIcon() {
  return (
    <svg
      className="w-6 h-6 shrink-0"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M3.6 2.3c-.3.3-.5.8-.5 1.4v16.6c0 .6.2 1.1.5 1.4l9.5-9.7L3.6 2.3z" fill="#34A853" />
      <path d="M16.8 8.6 13.1 12l3.7 3.4 4.4-2.5c1.2-.7 1.2-2.5 0-3.2l-4.4-2.5z" fill="#FBBC04" />
      <path d="m3.6 2.3 9.5 9.7 3.7-3.4L5.1 1.7c-.6-.3-1.1-.2-1.5.6z" fill="#EA4335" />
      <path d="m3.6 21.7 9.5-9.7 3.7 3.4-11.7 6.7c-.4.2-.9.2-1.5-.4z" fill="#4285F4" />
    </svg>
  );
}
