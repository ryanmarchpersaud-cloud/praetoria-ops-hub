import { ReactNode } from 'react';
import { PMStaffBottomNav } from './PMStaffBottomNav';
import { AnnouncementBanner } from '@/components/AnnouncementBanner';
import { NotificationCenter } from '@/components/NotificationCenter';
import { isAndroidMobile } from '@/lib/platform';
import praetoriaLogo from '@/assets/praetoria-logo-white.png';
import { Building2 } from 'lucide-react';
import { useAuthorization } from '@/hooks/useAuthorization';

export function PMStaffLayout({ children }: { children: ReactNode }) {
  const androidMobileScroll = isAndroidMobile();
  const { isLeasingAgent, isPropertyManager, isAdmin } = useAuthorization();
  const badge = isPropertyManager
    ? 'Property Manager'
    : isLeasingAgent
      ? 'Leasing Agent'
      : isAdmin
        ? 'Admin Preview'
        : 'PM Staff';
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
          <div className="h-11 w-11 rounded-xl bg-white/10 ring-1 ring-white/20 flex items-center justify-center shrink-0 overflow-hidden">
            <img src={praetoriaLogo} alt="Praetoria Group" className="h-8 w-8 object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-100 font-semibold">
              Praetoria Group · Property Management
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
