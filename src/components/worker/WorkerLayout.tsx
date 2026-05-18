import { ReactNode } from 'react';
import { WorkerBottomNav } from './WorkerBottomNav';
import { WorkerFAB } from './WorkerFAB';
import { AnnouncementBanner } from '@/components/AnnouncementBanner';
import { ServiceLinksSection } from '@/components/ServiceLinksSection';

export function WorkerLayout({ children }: { children: ReactNode }) {
  return (
    <div
      data-portal-scroll-shell
      className="worker-portal-shell bg-background safe-area-x"
      style={{
        minHeight: '100dvh',
        boxSizing: 'border-box',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 180px)',
      }}
    >
      <AnnouncementBanner />
      <div className="w-full max-w-lg mx-auto">
        {children}
        <ServiceLinksSection variant="compact" />
      </div>
      <WorkerFAB />
      <WorkerBottomNav />
    </div>
  );
}
