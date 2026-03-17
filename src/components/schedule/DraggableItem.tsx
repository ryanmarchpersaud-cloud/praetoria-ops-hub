import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { StatusBadge } from '@/components/StatusBadge';
import { Briefcase, ClipboardCheck, GripVertical } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';

interface DraggableItemProps {
  id: string;
  type: 'visit' | 'job';
  data: any;
  isDragDisabled?: boolean;
}

export function DraggableItem({ id, type, data, isDragDisabled }: DraggableItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `${type}-${id}`,
    data: { type, id, item: data },
    disabled: isDragDisabled,
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.4 : 1 }
    : undefined;

  if (type === 'job') {
    return (
      <div ref={setNodeRef} style={style} className="flex items-center gap-1.5">
        <button
          {...listeners}
          {...attributes}
          className="touch-none shrink-0 p-0.5 rounded text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50 cursor-grab active:cursor-grabbing"
          aria-label="Drag to reschedule"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <Link
          to={`/jobs/${data.id}`}
          className="flex-1 flex items-center gap-2 p-2 rounded-md border border-dashed hover:bg-muted/50 transition-colors min-w-0"
        >
          <Briefcase className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{data.job_title}</p>
            <p className="text-[10px] text-muted-foreground">{data.job_number} · {data.service_category}</p>
          </div>
          <StatusBadge status={data.status} showIcon={false} />
        </Link>
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-1.5">
      <button
        {...listeners}
        {...attributes}
        className="touch-none shrink-0 p-0.5 rounded text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50 cursor-grab active:cursor-grabbing"
        aria-label="Drag to reschedule"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <Link
        to={`/visits/${data.id}`}
        className="flex-1 flex items-center gap-2 p-2 rounded-md border hover:bg-muted/50 transition-colors min-w-0"
      >
        <ClipboardCheck className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">{data.visit_number} — {data.jobs?.job_title || 'Unknown'}</p>
          <p className="text-[10px] text-muted-foreground">
            {data.visit_type}
            {data.arrival_time && ` · ${format(parseISO(data.arrival_time), 'h:mm a')}`}
            {data.properties?.property_name && ` · ${data.properties.property_name}`}
          </p>
        </div>
        <StatusBadge status={data.visit_status} showIcon={false} />
      </Link>
    </div>
  );
}

/** Compact chip for month grid cells — draggable */
export function MonthDraggableChip({ id, type, data }: { id: string; type: 'visit' | 'job'; data: any }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `${type}-${id}`,
    data: { type, id, item: data },
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.3 : 1 }
    : undefined;

  const label = type === 'visit' ? data.visit_number : data.job_number;
  const isVisit = type === 'visit';

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}
      className={`block text-[9px] leading-tight truncate px-1 py-0.5 rounded mb-0.5 cursor-grab active:cursor-grabbing touch-none ${
        isVisit
          ? 'bg-primary/10 text-primary hover:bg-primary/20'
          : 'bg-accent/50 text-accent-foreground hover:bg-accent'
      }`}
    >
      {label}
    </div>
  );
}

/** Compact render for DragOverlay — no link behavior, just visual */
export function DragOverlayItem({ type, data }: { type: 'visit' | 'job'; data: any }) {
  const Icon = type === 'job' ? Briefcase : ClipboardCheck;
  const label = type === 'job' ? data.job_title : `${data.visit_number} — ${data.jobs?.job_title || ''}`;
  const status = type === 'job' ? data.status : data.visit_status;

  return (
    <div className="flex items-center gap-2 p-2 rounded-md border bg-card shadow-lg max-w-[320px] cursor-grabbing">
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <p className="text-xs font-medium truncate flex-1">{label}</p>
      <StatusBadge status={status} showIcon={false} />
    </div>
  );
}
