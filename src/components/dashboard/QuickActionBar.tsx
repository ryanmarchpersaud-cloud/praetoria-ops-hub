import { Link } from 'react-router-dom';
import { FileText, Briefcase, Receipt, UserPlus, Calendar, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

const actions = [
  { label: 'New Quote', to: '/quotes/new', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50 hover:bg-blue-100 border-blue-200 dark:bg-blue-950/30 dark:hover:bg-blue-950/50 dark:border-blue-900/50' },
  { label: 'New Job', to: '/jobs/new', icon: Briefcase, color: 'text-violet-600', bg: 'bg-violet-50 hover:bg-violet-100 border-violet-200 dark:bg-violet-950/30 dark:hover:bg-violet-950/50 dark:border-violet-900/50' },
  { label: 'New Invoice', to: '/finance/invoices/new', icon: Receipt, color: 'text-emerald-600', bg: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 dark:border-emerald-900/50' },
  { label: 'New Lead', to: '/leads/new', icon: UserPlus, color: 'text-amber-600', bg: 'bg-amber-50 hover:bg-amber-100 border-amber-200 dark:bg-amber-950/30 dark:hover:bg-amber-950/50 dark:border-amber-900/50' },
  { label: 'New Visit', to: '/visits/new', icon: Calendar, color: 'text-cyan-600', bg: 'bg-cyan-50 hover:bg-cyan-100 border-cyan-200 dark:bg-cyan-950/30 dark:hover:bg-cyan-950/50 dark:border-cyan-900/50' },
];

export function QuickActionBar() {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-3 md:p-4">
      <div className="flex items-center gap-2 mb-2">
        <Plus className="h-4 w-4 text-primary" />
        <h2 className="text-xs md:text-sm font-extrabold tracking-wide uppercase text-muted-foreground">Quick Create</h2>
      </div>
      <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
        {actions.map(a => (
          <Link
            key={a.label}
            to={a.to}
            className={cn(
              'rounded-lg border p-2.5 md:p-3 flex flex-col items-center justify-center gap-1.5 transition-all active:scale-[0.97] hover:shadow-sm',
              a.bg
            )}
          >
            <a.icon className={cn('h-5 w-5 md:h-6 md:w-6', a.color)} />
            <span className="text-[11px] md:text-xs font-bold text-foreground text-center leading-tight">{a.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
