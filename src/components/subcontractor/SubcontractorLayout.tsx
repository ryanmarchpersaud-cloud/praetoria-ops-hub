import { ReactNode } from 'react';
import { SubcontractorBottomNav } from './SubcontractorBottomNav';
import { SubcontractorFAB } from './SubcontractorFAB';
import { AnnouncementBanner } from '@/components/AnnouncementBanner';

export function SubcontractorLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background pb-20">
      <AnnouncementBanner />
      <div className="max-w-lg mx-auto">
        {children}
      </div>
      <SubcontractorFAB />
      <SubcontractorBottomNav />
    </div>
  );
}
