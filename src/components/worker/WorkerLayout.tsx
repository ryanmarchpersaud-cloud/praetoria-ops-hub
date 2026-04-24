import { ReactNode } from 'react';
import { WorkerBottomNav } from './WorkerBottomNav';
import { WorkerFAB } from './WorkerFAB';
import { AnnouncementBanner } from '@/components/AnnouncementBanner';
import { ServiceLinksSection } from '@/components/ServiceLinksSection';

export function WorkerLayout({ children }: { children: ReactNode }) {
  return (
    <div
      data-portal-scroll-shell
      className="worker-portal-shell bg-background pb-20 safe-area-x"
      style={{
        minHeight: '100dvh',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <AnnouncementBanner />
      <div className="w-full max-w-lg mx-auto flex-1 min-h-0">
        {children}
        <ServiceLinksSection variant="compact" />
      </div>
      <WorkerFAB />
      <WorkerBottomNav />
    </div>
  );
}
