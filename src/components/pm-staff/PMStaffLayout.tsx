import { ReactNode } from 'react';
import { PMStaffBottomNav } from './PMStaffBottomNav';
import { PMStaffFAB } from './PMStaffFAB';
import { AnnouncementBanner } from '@/components/AnnouncementBanner';
import { NotificationCenter } from '@/components/NotificationCenter';
import { isAndroidMobile } from '@/lib/platform';

import { Building2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAuthorization } from '@/hooks/useAuthorization';
import { usePMStaffProfile } from '@/hooks/usePMStaffProfile';

export function PMStaffLayout({ children }: { children: ReactNode }) {
  const androidMobileScroll = isAndroidMobile();
  const { user } = useAuth();
  const { isLeasingAgent, isPropertyManager, isAdmin } = useAuthorization();
  const { data: profile } = usePMStaffProfile();
  const badge = isPropertyManager
    ? 'Property Manager'
    : isLeasingAgent
      ? 'Leasing Agent'
      : isAdmin
        ? 'Admin Preview'
        : 'PM Staff';
  const displayName = profile?.display_name || user?.email || '';
  const initials = (displayName || '?').slice(0, 2).toUpperCase();

  return (
    <div
      data-portal-scroll-shell
      className={`worker-portal-shell bg-background safe-area-x${androidMobileScroll ? ' android-mobile-scroll' : ''}`}
      style={{
        minHeight: '100dvh',
        boxSizing: 'border-box',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 96px)',
      }}
    >
      <AnnouncementBanner />
      <header
        className="text-white px-4 pt-5 pb-6 shadow-md"
        style={{
          background:
            'linear-gradient(135deg, #064e3b 0%, #065f46 45%, #4338ca 100%)',
        }}
      >
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link
            to="/pm-staff/profile"
            className="shrink-0"
            aria-label="Open my profile"
            title={displayName || 'My profile'}
          >
            <Avatar className="h-11 w-11 ring-2 ring-white/30 hover:ring-white/70 transition">
              <AvatarImage src={profile?.avatar_url || undefined} alt={displayName} />
              <AvatarFallback className="bg-white/15 text-white text-sm font-semibold">{initials}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-100 font-semibold truncate">
              {displayName}
            </p>
            <h1 className="text-lg sm:text-xl font-bold leading-tight text-white truncate">
              Staff / Leasing Portal
            </h1>
          </div>
          <div className="hidden sm:flex items-center gap-1 text-[11px] text-white/90 bg-white/10 px-2 py-1 rounded-full shrink-0">
            <Building2 className="h-3.5 w-3.5" /> {badge}
          </div>
          <div className="shrink-0 [&_button>svg]:text-emerald-300">
            <NotificationCenter />
          </div>
        </div>
      </header>
      <div className="w-full max-w-lg mx-auto">{children}</div>
      <PMStaffBottomNav />
    </div>
  );
}
