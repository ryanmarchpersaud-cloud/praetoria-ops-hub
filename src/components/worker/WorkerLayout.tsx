import { ReactNode } from 'react';
import { WorkerBottomNav } from './WorkerBottomNav';
import { WorkerFAB } from './WorkerFAB';
import { AnnouncementBanner } from '@/components/AnnouncementBanner';
import { ServiceLinksSection } from '@/components/ServiceLinksSection';

export function WorkerLayout({ children }: { children: ReactNode }) {
  return (
    <div
      data-portal-scroll-shell
      className="worker-portal-shell scrollable h-[100svh] bg-background pb-20 overscroll-y-contain safe-area-x"
    >
      <AnnouncementBanner />
      <div className="max-w-lg mx-auto">
        {children}
        <ServiceLinksSection variant="compact" />
      </div>
      <WorkerFAB />
      <WorkerBottomNav />
    </div>
  );
}
