import { ReactNode } from 'react';
import { SubcontractorBottomNav } from './SubcontractorBottomNav';
import { SubcontractorFAB } from './SubcontractorFAB';
import { AnnouncementBanner } from '@/components/AnnouncementBanner';
import { ServiceLinksSection } from '@/components/ServiceLinksSection';

export function SubcontractorLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background pb-20 safe-area-top-buffer safe-area-x">
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
