import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  INSPECTION_TYPES, PmInspectionType, useCreatePmInspection,
} from '@/hooks/pm/usePmInspections';
import { useNavigate } from 'react-router-dom';

interface Props {
  trigger?: React.ReactNode;
  defaults?: {
    property_id?: string | null;
    unit_id?: string | null;
    tenant_id?: string | null;
    owner_id?: string | null;
    lease_id?: string | null;
    maintenance_request_id?: string | null;
    work_order_id?: string | null;
  };
  defaultType?: PmInspectionType;
  onCreated?: (id: string) => void;
}

export function CreateInspectionDialog({ trigger, defaults, defaultType, onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<PmInspectionType>(defaultType ?? 'routine');
  const [scheduledFor, setScheduledFor] = useState('');
  const [summary, setSummary] = useState('');
  const create = useCreatePmInspection();
  const navigate = useNavigate();

  const submit = async () => {
    if (!title.trim()) { toast.error('Title required'); return; }
    try {
      const row = await create.mutateAsync({
        title: title.trim(),
        inspection_type: type,
        scheduled_for: scheduledFor ? new Date(scheduledFor).toISOString() : null,
        summary: summary.trim() || null,
        ...defaults,
      });
      toast.success('Inspection created');
      setOpen(false);
      setTitle(''); setSummary(''); setScheduledFor('');
      if (onCreated) onCreated(row.id);
      else navigate(`/property-management/inspections/${row.id}`);
    } catch (e: any) {
      toast.error(e.message ?? 'Failed');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button size="sm">New inspection</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create inspection</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Move-in — Unit 4B" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as PmInspectionType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INSPECTION_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Scheduled for</Label>
              <Input type="datetime-local" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Summary (optional)</Label>
            <Textarea rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={create.isPending}>
            {create.isPending ? 'Creating…' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
