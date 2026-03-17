import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import {
  Plus, X, Play, CheckCircle, Camera, StickyNote, AlertTriangle, Receipt,
  UserPlus, FileText, Briefcase, FilePlus, Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const workerActions = [
  { icon: Play, label: 'Start Visit', color: 'bg-emerald-500', action: '/worker/schedule' },
  { icon: CheckCircle, label: 'Complete Visit', color: 'bg-blue-500', action: '/worker/schedule' },
  { icon: Camera, label: 'Add Photos', color: 'bg-violet-500', action: '/worker/schedule' },
  { icon: StickyNote, label: 'Add Note', color: 'bg-amber-500', action: '/worker/schedule' },
  { icon: AlertTriangle, label: 'Report Issue', color: 'bg-rose-500', action: '/worker/schedule' },
  { icon: Receipt, label: 'Expense', color: 'bg-cyan-500', action: '/worker/timesheet' },
];

const adminActions = [
  { icon: UserPlus, label: 'New Lead', color: 'bg-blue-500', action: '/leads' },
  { icon: FileText, label: 'New Quote', color: 'bg-amber-500', action: '/quotes' },
  { icon: Briefcase, label: 'New Job', color: 'bg-emerald-500', action: '/jobs' },
  { icon: FilePlus, label: 'New Invoice', color: 'bg-violet-500', action: '/worker' },
  { icon: Building2, label: 'New Client', color: 'bg-cyan-500', action: '/customers' },
];

export function WorkerFAB() {
  const [open, setOpen] = useState(false);
  const { isAdmin, isStaff } = useUserRole();
  const navigate = useNavigate();

  const actions = isAdmin ? [...workerActions, ...adminActions] : workerActions;

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Action menu */}
      {open && (
        <div className="fixed bottom-24 right-4 z-50 flex flex-col-reverse gap-2 animate-fade-in">
          {actions.map((a, i) => (
            <button
              key={a.label}
              onClick={() => { setOpen(false); navigate(a.action); }}
              className="flex items-center gap-3 pl-3 pr-4 py-2.5 bg-card rounded-full shadow-lg border border-border active:scale-95 transition-all"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', a.color)}>
                <a.icon className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-medium text-foreground whitespace-nowrap">{a.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* FAB button */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'fixed bottom-[72px] right-4 z-50 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all active:scale-90',
          open
            ? 'bg-foreground rotate-45'
            : 'bg-primary'
        )}
      >
        {open ? (
          <X className="h-6 w-6 text-background" />
        ) : (
          <Plus className="h-6 w-6 text-primary-foreground" />
        )}
      </button>
    </>
  );
}
