import { ReactNode } from 'react';
import { SubcontractorBottomNav } from './SubcontractorBottomNav';
import { SubcontractorFAB } from './SubcontractorFAB';
import { AnnouncementBanner } from '@/components/AnnouncementBanner';
import { ServiceLinksSection } from '@/components/ServiceLinksSection';

export function SubcontractorLayout({ children }: { children: ReactNode }) {
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
      <SubcontractorFAB />
      <SubcontractorBottomNav />
    </div>
  );
}
