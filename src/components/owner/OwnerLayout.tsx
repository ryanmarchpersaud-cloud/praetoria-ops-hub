import { ReactNode } from 'react';
import { OwnerBottomNav } from './OwnerBottomNav';
import { AdminPreviewBanner } from './AdminPreviewBanner';
import { AnnouncementBanner } from '@/components/AnnouncementBanner';
import { NotificationCenter } from '@/components/NotificationCenter';
import { isAndroidMobile } from '@/lib/platform';
import praetoriaLogo from '@/assets/praetoria-logo-white.png';
import { ShieldCheck } from 'lucide-react';

export function OwnerLayout({ children }: { children: ReactNode }) {
  const androidMobileScroll = isAndroidMobile();
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
      <AdminPreviewBanner />
      <header
        className="text-white px-4 pt-5 pb-6 shadow-md"
        style={{
          background:
            'linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #334155 100%)',
        }}
      >
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-white/10 ring-1 ring-white/20 flex items-center justify-center shrink-0 overflow-hidden">
            <img src={praetoriaLogo} alt="Praetoria Group" className="h-8 w-8 object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-300 font-semibold">
              Praetoria Group
            </p>
            <h1 className="text-xl font-bold leading-tight">Property Owner Portal</h1>
          </div>
          <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-100/90 bg-white/10 px-2 py-1 rounded-full">
            <ShieldCheck className="h-3.5 w-3.5" /> Secure
          </div>
          <NotificationCenter />
        </div>
      </header>
      <div className="w-full max-w-lg mx-auto">{children}</div>
      <OwnerBottomNav />
    </div>
  );
}
