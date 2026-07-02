import { ReactNode } from 'react';
import { TenantBottomNav } from './TenantBottomNav';
import { AnnouncementBanner } from '@/components/AnnouncementBanner';
import { isAndroidMobile } from '@/lib/platform';

export function TenantLayout({ children }: { children: ReactNode }) {
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
      <header className="bg-emerald-700 text-white px-4 py-3">
        <div className="max-w-lg mx-auto">
          <p className="text-[11px] uppercase tracking-wider text-emerald-200">Praetoria Group</p>
          <h1 className="text-lg font-bold">Tenant Portal</h1>
        </div>
      </header>
      <div className="w-full max-w-lg mx-auto">{children}</div>
      <TenantBottomNav />
    </div>
  );
}
