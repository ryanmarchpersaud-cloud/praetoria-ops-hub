import { TaskFormDialog } from '@/components/tasks/TaskFormDialog';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultAssigneeType?: 'worker' | 'subcontractor';
  defaultAssignedTo?: string;
}

// Back-compat wrapper for existing call sites.
export function CreateTaskDialog({ open, onOpenChange }: Props) {
  return <TaskFormDialog open={open} onOpenChange={onOpenChange} />;
}
