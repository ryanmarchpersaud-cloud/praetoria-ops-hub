import { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Zap, X, Play, CheckCircle, Camera, StickyNote,
  AlertTriangle, Navigation, MessageSquare, Receipt,
  FileUp, CalendarDays, Construction,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { SubcontractorQuickActionDialogs, type SubQuickActionType } from './SubcontractorQuickActionDialogs';

interface QuickAction {
  icon: React.ElementType;
  label: string;
  color: string;
  action: string | (() => void);
  comingSoon?: boolean;
}

export function SubcontractorFAB() {
  const [open, setOpen] = useState(false);
  const [comingSoonLabel, setComingSoonLabel] = useState<string | null>(null);
  const [quickAction, setQuickAction] = useState<SubQuickActionType>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const visitMatch = location.pathname.match(/\/subcontractor\/visit\/([^/]+)/);
  const currentVisitId = visitMatch?.[1];

  const actions: QuickAction[] = [
    { icon: Play, label: 'Open Visit', color: 'bg-emerald-500', action: '/subcontractor/schedule' },
    { icon: CheckCircle, label: 'Complete Visit', color: 'bg-blue-500', action: currentVisitId ? `/subcontractor/visit/${currentVisitId}?action=complete` : '/subcontractor/schedule' },
    { icon: Camera, label: 'Add Photos', color: 'bg-violet-500', action: currentVisitId ? `/subcontractor/visit/${currentVisitId}?action=photos` : '/subcontractor/schedule' },
    { icon: StickyNote, label: 'Add Note', color: 'bg-amber-500', action: currentVisitId ? `/subcontractor/visit/${currentVisitId}?action=note` : '/subcontractor/schedule' },
    { icon: AlertTriangle, label: 'Report Issue', color: 'bg-rose-500', action: '/subcontractor/incidents/new' },
    { icon: Navigation, label: 'Open Directions', color: 'bg-indigo-500', action: '/subcontractor/schedule?action=directions' },
    { icon: MessageSquare, label: 'Contact Admin', color: 'bg-slate-500', action: () => setQuickAction('contact_admin') },
    { icon: Receipt, label: 'Submit Invoice', color: 'bg-cyan-500', action: '/subcontractor/invoices' },
    { icon: FileUp, label: 'Upload Document', color: 'bg-teal-500', action: '/subcontractor/documents' },
    { icon: CalendarDays, label: 'View Schedule', color: 'bg-sky-500', action: '/subcontractor/schedule' },
  ];

  const handleAction = (a: QuickAction) => {
    setOpen(false);
    if (a.comingSoon) {
      setComingSoonLabel(a.label);
      return;
    }
    if (typeof a.action === 'function') {
      a.action();
    } else {
      navigate(a.action);
    }
  };

  return (
    <>
      {/* Coming Soon dialog */}
      <Dialog open={!!comingSoonLabel} onOpenChange={() => setComingSoonLabel(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Construction className="h-5 w-5 text-amber-500" />
              Coming Soon
            </DialogTitle>
            <DialogDescription>
              <strong>{comingSoonLabel}</strong> is under development and will be available in a future update.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Action grid drawer */}
      {open && (
        <div className="fixed inset-x-0 bottom-0 z-50 animate-in slide-in-from-bottom-4 duration-200">
          <div className="max-w-lg mx-auto bg-card rounded-t-2xl border-t border-x border-border shadow-2xl pb-safe">
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <h3 className="text-sm font-semibold text-foreground">Quick Actions</h3>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center active:scale-90"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="mx-auto w-10 h-1 rounded-full bg-muted mb-2" />

            <div className="max-h-[50vh] overflow-y-auto overscroll-contain px-3 pb-4">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-1 mb-2">
                Field
              </p>
              <div className="grid grid-cols-4 gap-2">
                {actions.map((a) => (
                  <button
                    key={a.label}
                    onClick={() => handleAction(a)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl active:scale-95 active:bg-muted/50 transition-all",
                      a.comingSoon && "opacity-50"
                    )}
                  >
                    <div className={cn('w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm relative', a.color)}>
                      <a.icon className="h-5 w-5 text-white" />
                      {a.comingSoon && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center">
                          <Construction className="h-2.5 w-2.5 text-white" />
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] font-medium text-foreground text-center leading-tight line-clamp-2">
                      {a.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FAB trigger */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'fixed bottom-[68px] right-4 z-50 w-14 h-14 rounded-2xl shadow-xl flex items-center justify-center transition-all active:scale-90',
          open
            ? 'bg-foreground rotate-180 rounded-full'
            : 'bg-primary'
        )}
      >
        {open ? (
          <X className="h-6 w-6 text-background" />
        ) : (
          <Zap className="h-6 w-6 text-primary-foreground" />
        )}
      </button>

      {/* Quick action dialogs */}
      <SubcontractorQuickActionDialogs activeAction={quickAction} onClose={() => setQuickAction(null)} />
    </>
  );
}
