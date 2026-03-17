import { ReactNode } from 'react';
import { SubcontractorBottomNav } from './SubcontractorBottomNav';
import { SubcontractorFAB } from './SubcontractorFAB';

export function SubcontractorLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-lg mx-auto">
        {children}
      </div>
      <SubcontractorFAB />
      <SubcontractorBottomNav />
    </div>
  );
}
