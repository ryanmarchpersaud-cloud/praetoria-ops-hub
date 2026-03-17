import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';

interface DroppableDayProps {
  dateKey: string;
  children: React.ReactNode;
  className?: string;
}

export function DroppableDay({ dateKey, children, className }: DroppableDayProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `day-${dateKey}` });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        className,
        isOver && 'ring-2 ring-primary/60 bg-primary/5 transition-colors'
      )}
    >
      {children}
    </div>
  );
}
