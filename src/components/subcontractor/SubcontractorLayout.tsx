import { ReactNode } from 'react';
import { SubcontractorBottomNav } from './SubcontractorBottomNav';
import { SubcontractorFAB } from './SubcontractorFAB';
import { AnnouncementBanner } from '@/components/AnnouncementBanner';
import { ServiceLinksSection } from '@/components/ServiceLinksSection';

export function SubcontractorLayout({ children }: { children: ReactNode }) {
  return (
    <div
      data-portal-scroll-shell
      className="bg-background pb-20 safe-area-x"
      style={{
        paddingTop: 'env(safe-area-inset-top, 44px)',
        minHeight: '100dvh',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
      }}
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
