import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateOwnerThread, type OwnerThreadCategory } from '@/hooks/pm/useOwnerMessages';

interface Props {
  approval: {
    id: string;
    title: string;
    owner_id: string;
    property_id: string | null;
    unit_id?: string | null;
  };
  size?: 'sm' | 'default';
  variant?: 'outline' | 'default' | 'secondary';
  categoryOverride?: OwnerThreadCategory;
  label?: string;
}

/**
 * Adds a "Message Owner" button that opens a small dialog to create a
 * new owner message thread linked to the given approval. Admin-only notes are
 * never copied into the owner-visible message.
 */
export function MessageOwnerFromApprovalButton({ approval, size = 'sm', variant = 'outline', categoryOverride, label = 'Message owner' }: Props) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState(`More information requested: ${approval.title}`);
  const [body, setBody] = useState('');
  const create = useCreateOwnerThread();

  const submit = async () => {
    if (!subject.trim() || !body.trim()) return toast.error('Subject and message required');
    try {
      await create.mutateAsync({
        subject,
        first_message: body,
        category: categoryOverride ?? 'approval',
        owner_id: approval.owner_id,
        property_id: approval.property_id,
        unit_id: approval.unit_id ?? null,
        related_approval_id: approval.id,
      });
      toast.success('Message sent to owner');
      setOpen(false);
      setBody('');
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <>
      <Button size={size} variant={variant} onClick={() => setOpen(true)}>
        <MessageSquare className="h-3 w-3 mr-1" /> {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Message owner about this approval</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Subject</Label>
              <Input value={subject} onChange={e => setSubject(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Owner-visible message *</Label>
              <Textarea rows={5} value={body} onChange={e => setBody(e.target.value)} placeholder="e.g. Could you clarify your preferred timing for this repair?" />
              <p className="text-[10px] text-muted-foreground mt-1">Only this message will be visible to the owner. Internal notes are not shared.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={create.isPending}>Send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
