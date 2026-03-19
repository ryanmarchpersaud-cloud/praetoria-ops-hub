import { ReactNode } from 'react';
import { WorkerBottomNav } from './WorkerBottomNav';
import { WorkerFAB } from './WorkerFAB';
import { AnnouncementBanner } from '@/components/AnnouncementBanner';

export function WorkerLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background pb-20">
      <AnnouncementBanner />
      <div className="max-w-lg mx-auto">
        {children}
      </div>
      <WorkerFAB />
      <WorkerBottomNav />
    </div>
  );
}
