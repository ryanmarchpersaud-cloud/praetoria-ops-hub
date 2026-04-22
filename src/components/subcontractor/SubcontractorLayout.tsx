import { ReactNode } from 'react';
import { SubcontractorBottomNav } from './SubcontractorBottomNav';
import { SubcontractorFAB } from './SubcontractorFAB';
import { AnnouncementBanner } from '@/components/AnnouncementBanner';
import { ServiceLinksSection } from '@/components/ServiceLinksSection';

export function SubcontractorLayout({ children }: { children: ReactNode }) {
  return (
    <div
      data-portal-scroll-shell
      className="safe-area-top-buffer scrollable h-[100svh] bg-background pb-20 overscroll-y-contain safe-area-x"
    >
      <AnnouncementBanner />
      <div className="max-w-lg mx-auto">
        {children}
        <ServiceLinksSection variant="compact" />
      </div>
      <SubcontractorFAB />
      <SubcontractorBottomNav />
    </div>
  );
}
