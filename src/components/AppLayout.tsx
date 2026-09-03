import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { NotificationCenter } from './NotificationCenter';
import { AnnouncementBanner } from './AnnouncementBanner';
// Phase 1D.2 — the legacy lower-right AI Co-pilot has been removed from the UI.
// Prae (top-header launcher below) is the only official user-facing assistant.
// The old component is quarantined at src/legacy/AICopilot.quarantined.tsx and is
// not imported or rendered anywhere.
import PraeLauncher from './prae/PraeLauncher';
import { useIncidentAlerts } from '@/hooks/useIncidentAlerts';

export function AppLayout({ children }: { children: ReactNode }) {
  // Subscribe to realtime incident alerts for admins
  useIncidentAlerts();
  return (
    <SidebarProvider>
      <div
        className="flex w-full"
        style={{
          paddingTop: 'env(safe-area-inset-top, 44px)',
          minHeight: '100dvh',
          boxSizing: 'border-box',
        }}
      >
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="border-b border-border bg-card shrink-0 sticky top-0 z-30">
            <div className="flex min-h-12 items-center justify-between pt-[env(safe-area-inset-top,0px)] pl-[calc(env(safe-area-inset-left,0px)+0.75rem)] pr-[calc(env(safe-area-inset-right,0px)+0.75rem)] md:min-h-14 md:pl-[calc(env(safe-area-inset-left,0px)+1rem)] md:pr-[calc(env(safe-area-inset-right,0px)+1rem)]">
              <div className="flex min-w-0 items-center">
                <SidebarTrigger className="mr-2 md:mr-3" />
                <span className="text-xs md:text-sm font-medium text-muted-foreground truncate">
                  <span className="hidden sm:inline">Praetoria Group — </span>Admin Portal
                </span>
              </div>
              <div className="flex items-center gap-1">
                <PraeLauncher context="Admin Portal" />
                <NotificationCenter />
              </div>
            </div>
          </header>
          <AnnouncementBanner />
          <main className="admin-main-shell flex-1 p-3 md:p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
      <AICopilot />
    </SidebarProvider>
  );
}
