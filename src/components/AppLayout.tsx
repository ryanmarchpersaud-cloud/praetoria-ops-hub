import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { NotificationCenter } from './NotificationCenter';
import { AnnouncementBanner } from './AnnouncementBanner';
import { useIncidentAlerts } from '@/hooks/useIncidentAlerts';

export function AppLayout({ children }: { children: ReactNode }) {
  // Subscribe to realtime incident alerts for admins
  useIncidentAlerts();
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 md:h-14 flex items-center justify-between border-b border-border px-3 md:px-4 bg-card shrink-0 sticky top-0 z-10">
            <div className="flex items-center">
              <SidebarTrigger className="mr-3" />
              <span className="text-xs md:text-sm font-medium text-muted-foreground truncate">
                <span className="hidden sm:inline">Praetoria Group — </span>Admin Portal
              </span>
            </div>
            <NotificationCenter />
          </header>
          <AnnouncementBanner />
          <main className="flex-1 p-3 md:p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
