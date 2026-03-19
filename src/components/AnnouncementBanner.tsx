import { useActiveAnnouncements, useDismissAnnouncement } from '@/hooks/useAnnouncements';
import { AlertTriangle, Info, ShieldAlert, X } from 'lucide-react';

const priorityStyles = {
  info: {
    bg: 'bg-primary/10 border-primary/20',
    icon: Info,
    iconColor: 'text-primary',
  },
  warning: {
    bg: 'bg-amber-500/10 border-amber-500/30',
    icon: AlertTriangle,
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  critical: {
    bg: 'bg-destructive/10 border-destructive/30',
    icon: ShieldAlert,
    iconColor: 'text-destructive',
  },
};

export function AnnouncementBanner() {
  const { data: announcements } = useActiveAnnouncements();
  const dismiss = useDismissAnnouncement();

  if (!announcements?.length) return null;

  return (
    <div className="space-y-0">
      {announcements.map((ann) => {
        const style = priorityStyles[ann.priority] || priorityStyles.info;
        const Icon = style.icon;

        return (
          <div
            key={ann.id}
            className={`flex items-center gap-3 px-4 py-2.5 border-b text-sm ${style.bg}`}
          >
            <Icon className={`h-4 w-4 shrink-0 ${style.iconColor}`} />
            <div className="flex-1 min-w-0">
              <span className="font-semibold mr-1.5">{ann.title}</span>
              <span className="text-muted-foreground">{ann.body}</span>
            </div>
            <button
              onClick={() => dismiss.mutate(ann.id)}
              className="shrink-0 p-1 rounded-full hover:bg-background/50 transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
