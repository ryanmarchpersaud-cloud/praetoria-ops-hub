import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  APPROVAL_CATEGORIES, APPROVAL_PRIORITIES,
  useCreateOwnerApproval, useSendOwnerApproval,
} from '@/hooks/pm/useOwnerApprovals';
import { formatStatusLabel } from '@/lib/statusLabel';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Prefill / pin owner + property */
  defaultOwnerId?: string;
  defaultPropertyId?: string;
  defaultUnitId?: string | null;
  defaultCategory?: (typeof APPROVAL_CATEGORIES)[number];
  /** Optional record links */
  maintenanceRequestId?: string;
  workOrderId?: string;
  expenseId?: string;
  renewalId?: string;
  moveOutId?: string;
  estimateReference?: string;
  defaultTitle?: string;
  onCreated?: (approvalId: string) => void;
}

export function OwnerApprovalDialog(p: Props) {
  const [title, setTitle] = useState(p.defaultTitle ?? '');
  const [summary, setSummary] = useState('');
  const [ownerVisibleNote, setOwnerVisibleNote] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [category, setCategory] = useState<string>(p.defaultCategory ?? 'other');
  const [priority, setPriority] = useState<string>('normal');
  const [amount, setAmount] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [propertyId, setPropertyId] = useState<string>(p.defaultPropertyId ?? '');
  const [ownerId, setOwnerId] = useState<string>(p.defaultOwnerId ?? '');
  const [sendNow, setSendNow] = useState<boolean>(true);
  const [properties, setProperties] = useState<any[]>([]);
  const [owners, setOwners] = useState<any[]>([]);

  const create = useCreateOwnerApproval();
  const send = useSendOwnerApproval();

  useEffect(() => {
    if (!p.open) return;
    // Load property + owner options if not pinned
    (async () => {
      if (!p.defaultPropertyId) {
        const { data } = await supabase
          .from('pm_managed_properties' as any)
          .select('id,property_name,primary_owner_id')
          .order('property_name');
        setProperties(data ?? []);
      }
      if (!p.defaultOwnerId) {
        const { data } = await supabase
          .from('pm_property_owners' as any)
          .select('id,owner_name,company_name')
          .eq('is_active', true)
          .order('owner_name');
        setOwners(data ?? []);
      }
    })();
  }, [p.open, p.defaultPropertyId, p.defaultOwnerId]);

  // Auto-select owner from property if unpinned
  useEffect(() => {
    if (!p.defaultOwnerId && propertyId && properties.length) {
      const prop = properties.find(x => x.id === propertyId);
      if (prop?.primary_owner_id && !ownerId) setOwnerId(prop.primary_owner_id);
    }
  }, [propertyId, properties, ownerId, p.defaultOwnerId]);

  const reset = () => {
    setTitle(p.defaultTitle ?? '');
    setSummary(''); setOwnerVisibleNote(''); setAdminNotes('');
    setCategory(p.defaultCategory ?? 'other'); setPriority('normal');
    setAmount(''); setDueDate('');
    if (!p.defaultPropertyId) setPropertyId('');
    if (!p.defaultOwnerId) setOwnerId('');
    setSendNow(true);
  };

  const save = async () => {
    if (!title.trim()) { toast.error('Title is required'); return; }
    if (!ownerId) { toast.error('Select an owner'); return; }
    if (!propertyId) { toast.error('Select a property'); return; }
    try {
      const payload: any = {
        title: title.trim(),
        summary: summary.trim() || null,
        owner_visible_note: ownerVisibleNote.trim() || null,
        admin_notes: adminNotes.trim() || null,
        category,
        priority,
        requested_amount: amount ? Number(amount) : null,
        due_date: dueDate || null,
        property_id: propertyId,
        owner_id: ownerId,
        unit_id: p.defaultUnitId ?? null,
        maintenance_request_id: p.maintenanceRequestId ?? null,
        work_order_id: p.workOrderId ?? null,
        expense_id: p.expenseId ?? null,
        renewal_id: p.renewalId ?? null,
        move_out_id: p.moveOutId ?? null,
        estimate_reference: p.estimateReference ?? null,
        status: sendNow ? 'sent_to_owner' : 'draft',
        sent_at: sendNow ? new Date().toISOString() : null,
      };
      const created: any = await create.mutateAsync(payload);
      if (sendNow) {
        // Log the sent event too (create already logged 'created' as internal)
        await supabase.from('pm_owner_approval_activity' as any).insert({
          approval_id: created.id,
          event_type: 'sent_to_owner',
          message: 'Approval request sent to owner.',
          is_owner_visible: true,
        });
      }
      toast.success(sendNow ? 'Approval sent to owner' : 'Draft saved');
      reset();
      p.onOpenChange(false);
      p.onCreated?.(created.id);
    } catch (e: any) {
      toast.error(e.message || 'Could not create approval');
    }
  };

  return (
    <Dialog open={p.open} onOpenChange={p.onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Request Owner Approval</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Title *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Roof repair estimate approval" />
          </div>

          {!p.defaultPropertyId && (
            <div>
              <Label>Property *</Label>
              <Select value={propertyId} onValueChange={setPropertyId}>
                <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                <SelectContent>
                  {properties.map(pr => <SelectItem key={pr.id} value={pr.id}>{pr.property_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {!p.defaultOwnerId && (
            <div>
              <Label>Owner *</Label>
              <Select value={ownerId} onValueChange={setOwnerId}>
                <SelectTrigger><SelectValue placeholder="Select owner" /></SelectTrigger>
                <SelectContent>
                  {owners.map(o => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.company_name || o.owner_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {APPROVAL_CATEGORIES.map(c => <SelectItem key={c} value={c}>{formatStatusLabel(c)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {APPROVAL_PRIORITIES.map(pr => <SelectItem key={pr} value={pr}>{formatStatusLabel(pr)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Requested amount (CAD)</Label>
              <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <Label>Due date</Label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Summary (owner-visible)</Label>
            <Textarea rows={3} value={summary} onChange={e => setSummary(e.target.value)} placeholder="Short summary the owner will see." />
          </div>

          <div>
            <Label>Owner-visible note</Label>
            <Textarea rows={2} value={ownerVisibleNote} onChange={e => setOwnerVisibleNote(e.target.value)} placeholder="Optional additional context for the owner." />
          </div>

          <div>
            <Label>Admin-only note (never shown to owner)</Label>
            <Textarea rows={2} value={adminNotes} onChange={e => setAdminNotes(e.target.value)} placeholder="Internal notes." />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={sendNow} onChange={e => setSendNow(e.target.checked)} />
            Send to owner now (otherwise save as draft)
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => p.onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={create.isPending}>{sendNow ? 'Send' : 'Save draft'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
