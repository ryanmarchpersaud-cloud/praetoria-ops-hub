import { useState, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { useActiveTimesheet, useClockIn, useClockOut } from '@/hooks/useTimesheets';
import {
  Zap, X, Play, CheckCircle, Camera, StickyNote, AlertTriangle, Receipt,
  UserPlus, FileText, Briefcase, FilePlus, Building2, LogIn, LogOut,
  Navigation, Phone, MessageSquare, Clock, Wrench, Package,
  ClipboardList, CreditCard, RotateCcw, PenLine, Home, Send, Construction,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { WorkerQuickActionDialogs, type QuickActionType } from './WorkerQuickActionDialogs';

interface QuickAction {
  icon: React.ElementType;
  label: string;
  color: string;
  action: string | (() => void);
  category: 'field' | 'admin';
  comingSoon?: boolean;
  hidden?: boolean;
}

export function WorkerFAB() {
  const [open, setOpen] = useState(false);
  const [comingSoonLabel, setComingSoonLabel] = useState<string | null>(null);
  const [quickAction, setQuickAction] = useState<QuickActionType>(null);
  const { isAdmin } = useUserRole();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { data: active } = useActiveTimesheet();
  const clockIn = useClockIn();
  const clockOut = useClockOut();

  const visitMatch = location.pathname.match(/\/worker\/visit\/([^/]+)/);
  const currentVisitId = visitMatch?.[1];
  const isOnVisitPage = !!currentVisitId;

  const handleClock = useCallback(() => {
    if (active) {
      clockOut.mutate(active.id);
      toast({ title: 'Clocked out' });
    } else {
      clockIn.mutate();
      toast({ title: 'Clocked in' });
    }
  }, [active, clockIn, clockOut, toast]);

  const fieldActions: QuickAction[] = useMemo(() => [
    // Visit-context actions — only show when on a visit page
    { icon: Play, label: 'Start Visit', color: 'bg-emerald-500', action: `/worker/visit/${currentVisitId}`, category: 'field' as const, hidden: !isOnVisitPage },
    { icon: CheckCircle, label: 'Complete Visit', color: 'bg-blue-500', action: `/worker/visit/${currentVisitId}`, category: 'field' as const, hidden: !isOnVisitPage },
    { icon: Camera, label: 'Add Photos', color: 'bg-violet-500', action: isOnVisitPage ? `/worker/visit/${currentVisitId}` : '', category: 'field' as const, hidden: !isOnVisitPage },
    { icon: StickyNote, label: 'Add Note', color: 'bg-amber-500', action: isOnVisitPage ? `/worker/visit/${currentVisitId}` : '', category: 'field' as const, hidden: !isOnVisitPage },
    { icon: AlertTriangle, label: 'Report Issue', color: 'bg-rose-500', action: isOnVisitPage ? `/worker/visit/${currentVisitId}` : '/worker/incidents', category: 'field' as const },
    // Always-available actions
    { icon: Receipt, label: 'Expense', color: 'bg-cyan-500', action: () => setQuickAction('expense'), category: 'field' as const },
    { icon: active ? LogOut : LogIn, label: active ? 'Clock Out' : 'Clock In', color: active ? 'bg-orange-500' : 'bg-emerald-600', action: handleClock, category: 'field' as const },
    { icon: Clock, label: 'Timesheet', color: 'bg-sky-500', action: '/worker/timesheet', category: 'field' as const },
    { icon: MessageSquare, label: 'Message Admin', color: 'bg-slate-500', action: () => setQuickAction('message_admin'), category: 'field' as const },
    { icon: Wrench, label: 'Equipment Issue', color: 'bg-red-500', action: () => setQuickAction('equipment_issue'), category: 'field' as const },
    { icon: Package, label: 'Materials Used', color: 'bg-teal-500', action: () => setQuickAction('materials_used'), category: 'field' as const },
  ], [currentVisitId, isOnVisitPage, active, handleClock]);

  const visibleFieldActions = fieldActions.filter(a => !a.hidden);

  const adminOnlyActions: QuickAction[] = [
    { icon: UserPlus, label: 'New Lead', color: 'bg-blue-500', action: '/leads?new=1', category: 'admin' },
    { icon: FileText, label: 'New Quote', color: 'bg-amber-500', action: '/quotes?new=1', category: 'admin' },
    { icon: FilePlus, label: 'New Invoice', color: 'bg-violet-500', action: '/invoices/new', category: 'admin' },
    { icon: Briefcase, label: 'New Job', color: 'bg-emerald-500', action: '/jobs?new=1', category: 'admin' },
    { icon: ClipboardList, label: 'New Visit', color: 'bg-sky-500', action: '/visits?new=1', category: 'admin' },
    { icon: Building2, label: 'New Client', color: 'bg-cyan-500', action: '/customers?new=1', category: 'admin' },
    { icon: Home, label: 'New Property', color: 'bg-lime-600', action: '/properties?new=1', category: 'admin' },
    { icon: Send, label: 'New Request', color: 'bg-pink-500', action: '/leads?new=1&source=request', category: 'admin' },
    { icon: CreditCard, label: 'Payment', color: 'bg-green-600', action: '/invoices?filter=unpaid', category: 'admin' },
    { icon: RotateCcw, label: 'Follow-up', color: 'bg-orange-500', action: '/quotes?filter=follow-up', category: 'admin' },
    { icon: PenLine, label: 'Review Draft', color: 'bg-slate-600', action: '/quotes?filter=draft', category: 'admin' },
  ];

  const handleAction = (a: QuickAction) => {
    setOpen(false);
    if (a.comingSoon) {
      setComingSoonLabel(a.label);
      return;
    }
    if (typeof a.action === 'function') {
      a.action();
    } else if (a.action) {
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

            <div className="max-h-[60vh] overflow-y-auto overscroll-contain px-3 pb-4">
              {isAdmin && (
                <>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-1 mb-2">
                    Office
                  </p>
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {adminOnlyActions.map((a) => (
                      <button
                        key={a.label}
                        onClick={() => handleAction(a)}
                        className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl active:scale-95 active:bg-muted/50 transition-all"
                      >
                        <div className={cn('w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm', a.color)}>
                          <a.icon className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-[10px] font-medium text-foreground text-center leading-tight line-clamp-2">
                          {a.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-1 mb-2">
                {isOnVisitPage ? 'Visit Actions' : 'Field'}
              </p>
              <div className="grid grid-cols-4 gap-2">
                {visibleFieldActions.map((a) => (
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

              {!isOnVisitPage && (
                <p className="text-[10px] text-muted-foreground/60 text-center mt-3 px-4">
                  Open a visit to see visit-specific actions like Start, Complete, Photos, and Notes
                </p>
              )}
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
      <WorkerQuickActionDialogs activeAction={quickAction} onClose={() => setQuickAction(null)} />
    </>
  );
}