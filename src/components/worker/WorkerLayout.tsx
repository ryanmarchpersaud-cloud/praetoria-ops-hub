import { ReactNode } from 'react';
import { WorkerBottomNav } from './WorkerBottomNav';
import { WorkerFAB } from './WorkerFAB';
import { AnnouncementBanner } from '@/components/AnnouncementBanner';
import { ServiceLinksSection } from '@/components/ServiceLinksSection';

export function WorkerLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background pb-20 safe-area-top safe-area-x">
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
