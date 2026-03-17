import { ReactNode } from 'react';
import { WorkerBottomNav } from './WorkerBottomNav';

export function WorkerLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-lg mx-auto">
        {children}
      </div>
      <WorkerBottomNav />
    </div>
  );
}
