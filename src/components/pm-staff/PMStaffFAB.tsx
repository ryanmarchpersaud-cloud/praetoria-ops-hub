import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useActiveTimesheet, useClockIn, useClockOut } from '@/hooks/useTimesheets';
import {
  Zap, X, UserPlus, CalendarClock, FileText, LogIn, LogOut,
  ClipboardList, MessageSquare, Clock, Receipt, AlertTriangle,
  StickyNote, Upload, KeyRound,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface QuickAction {
  icon: React.ElementType;
  label: string;
  color: string;
  action: string | (() => void);
}

export function PMStaffFAB() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: active } = useActiveTimesheet();
  const clockIn = useClockIn('pm_staff');
  const clockOut = useClockOut();

  const handleClock = useCallback(() => {
    if (active) {
      clockOut.mutate(active.id);
      toast({ title: 'Clocked out' });
    } else {
      clockIn.mutate();
      toast({ title: 'Clocked in' });
    }
  }, [active, clockIn, clockOut, toast]);

  const leasingActions: QuickAction[] = useMemo(() => [
    { icon: UserPlus, label: 'Add Prospect', color: 'bg-emerald-500', action: '/pm-staff/prospects?new=1' },
    { icon: CalendarClock, label: 'Schedule Showing', color: 'bg-sky-500', action: '/pm-staff/showings?new=1' },
    { icon: FileText, label: 'Add Application', color: 'bg-violet-500', action: '/pm-staff/applications?new=1' },
    { icon: KeyRound, label: 'Start Move-In', color: 'bg-amber-500', action: '/pm-staff/move-ins?new=1' },
    { icon: KeyRound, label: 'Start Move-Out', color: 'bg-orange-600', action: '/pm-staff/move-outs?new=1' },
    { icon: ClipboardList, label: 'Create Task', color: 'bg-blue-500', action: '/pm-staff/tasks?new=1' },
    { icon: MessageSquare, label: 'Message Admin', color: 'bg-slate-500', action: '/pm-staff/messages' },
  ], []);

  const staffActions: QuickAction[] = useMemo(() => [
    { icon: active ? LogOut : LogIn, label: active ? 'Clock Out' : 'Clock In', color: active ? 'bg-orange-500' : 'bg-emerald-600', action: handleClock },
    { icon: Clock, label: 'Timesheet', color: 'bg-sky-600', action: '/pm-staff/timesheets' },
    { icon: Receipt, label: 'Submit Expense', color: 'bg-cyan-500', action: '/pm-staff/expenses' },
    { icon: AlertTriangle, label: 'Report Incident', color: 'bg-rose-500', action: '/pm-staff/incidents' },
    { icon: Upload, label: 'Upload Document', color: 'bg-indigo-500', action: '/pm-staff/documents' },
    { icon: StickyNote, label: 'Add Note', color: 'bg-yellow-500', action: '/pm-staff/tasks?new=1&type=note' },
  ], [active, handleClock]);

  const handleAction = (a: QuickAction) => {
    setOpen(false);
    if (typeof a.action === 'function') a.action();
    else if (a.action) navigate(a.action);
  };

  const renderGrid = (items: QuickAction[]) => (
    <div className="grid grid-cols-4 gap-2">
      {items.map((a) => (
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
  );

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

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

            <div className="max-h-[65vh] overflow-y-auto overscroll-contain px-3 pb-4 space-y-4">
              <div>
                <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-widest px-1 mb-2">
                  Leasing
                </p>
                {renderGrid(leasingActions)}
              </div>
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-1 mb-2">
                  Staff Self-Service
                </p>
                {renderGrid(staffActions)}
              </div>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        aria-label="Quick actions"
        className={cn(
          'fixed right-4 z-50 w-14 h-14 rounded-2xl shadow-xl flex items-center justify-center transition-all active:scale-90',
          open ? 'bg-foreground rotate-180 rounded-full' : 'bg-emerald-600'
        )}
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 96px)' }}
      >
        {open ? <X className="h-6 w-6 text-background" /> : <Zap className="h-6 w-6 text-white" />}
      </button>
    </>
  );
}
