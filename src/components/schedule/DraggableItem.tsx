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
  onVisitClick?: (visit: any) => void;
}

export function DraggableItem({ id, type, data, isDragDisabled, onVisitClick }: DraggableItemProps) {
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

  const customerName = data.customers
    ? `${data.customers.first_name} ${data.customers.last_name}`
    : null;
  const displayTitle = customerName
    ? `${customerName} – ${data.jobs?.job_title || data.visit_type || 'Visit'}`
    : `${data.visit_number} — ${data.jobs?.job_title || 'Unknown'}`;

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
      <button
        onClick={(e) => {
          e.preventDefault();
          onVisitClick?.(data);
        }}
        className="flex-1 flex items-center gap-2 p-2 rounded-md border hover:bg-muted/50 transition-colors min-w-0 text-left"
      >
        <ClipboardCheck className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">{displayTitle}</p>
          <p className="text-[10px] text-muted-foreground truncate">
            {data.visit_type}
            {data.arrival_time && ` · ${format(parseISO(data.arrival_time), 'h:mm a')}`}
            {data.properties?.property_name && ` · ${data.properties.property_name}`}
          </p>
          {(data.worker_profiles?.full_name || (data.crew_names?.length ?? 0) > 0 || (data.subcontractor_names?.length ?? 0) > 0) && (
            <p className="text-[10px] text-muted-foreground truncate mt-0.5">
              {data.worker_profiles?.full_name && <span>👷 {data.worker_profiles.full_name}</span>}
              {(data.crew_names?.length ?? 0) > 0 && (
                <span>{data.worker_profiles?.full_name ? ', ' : '👷 '}{data.crew_names.join(', ')}</span>
              )}
              {(data.subcontractor_names?.length ?? 0) > 0 && (
                <span className="ml-1">🤝 {data.subcontractor_names.join(', ')}</span>
              )}
            </p>
          )}
        </div>
        <StatusBadge status={data.visit_status} showIcon={false} />
      </button>
    </div>
  );
}

/** Compact chip for month grid cells — draggable + clickable */
export function MonthDraggableChip({ id, type, data, onVisitClick }: { id: string; type: 'visit' | 'job'; data: any; onVisitClick?: (visit: any) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `${type}-${id}`,
    data: { type, id, item: data },
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.3 : 1 }
    : undefined;

  const isVisit = type === 'visit';
  const customerName = isVisit && data.customers
    ? `${data.customers.first_name} ${data.customers.last_name}`
    : null;
  const label = isVisit
    ? (customerName ? `${customerName}` : data.visit_number)
    : data.job_number;

  if (isVisit && onVisitClick) {
    return (
      <div className="flex items-center gap-0">
        <div
          ref={setNodeRef}
          style={style}
          {...listeners}
          {...attributes}
          className="shrink-0 cursor-grab active:cursor-grabbing touch-none px-0.5"
        >
          <GripVertical className="h-2.5 w-2.5 text-muted-foreground/40" />
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onVisitClick(data); }}
          className="text-[9px] leading-tight truncate px-1 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer flex-1 text-left"
        >
          {label}
        </button>
      </div>
    );
  }

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
