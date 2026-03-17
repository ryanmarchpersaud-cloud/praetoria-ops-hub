import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Receipt, MessageSquare, Wrench, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export type QuickActionType = 'expense' | 'message_admin' | 'equipment_issue' | 'materials_used' | null;

interface Props {
  activeAction: QuickActionType;
  onClose: () => void;
}

export function WorkerQuickActionDialogs({ activeAction, onClose }: Props) {
  return (
    <>
      <ExpenseDialog open={activeAction === 'expense'} onClose={onClose} />
      <MessageAdminDialog open={activeAction === 'message_admin'} onClose={onClose} />
      <EquipmentIssueDialog open={activeAction === 'equipment_issue'} onClose={onClose} />
      <MaterialsUsedDialog open={activeAction === 'materials_used'} onClose={onClose} />
    </>
  );
}

function useSubmitActivity() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const submit = async (actionName: string, payload: Record<string, unknown>) => {
    const { error } = await supabase.from('activities').insert([{
      action_name: actionName,
      user_id: user?.id ?? null,
      workflow_name: 'field_worker',
      payload_summary: payload as any,
      status: 'completed',
    }]);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    qc.invalidateQueries({ queryKey: ['activities'] });
    return true;
  };
  return submit;
}

/* ─── Expense ─── */
function ExpenseDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('fuel');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submit = useSubmitActivity();
  const { toast } = useToast();

  const reset = () => { setAmount(''); setCategory('fuel'); setDescription(''); };

  const handleSubmit = async () => {
    if (!amount || isNaN(Number(amount))) {
      toast({ title: 'Enter a valid amount', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    const ok = await submit('Expense submitted', {
      amount: Number(amount),
      category,
      description: description || undefined,
    });
    setSubmitting(false);
    if (ok) {
      toast({ title: 'Expense logged', description: `$${Number(amount).toFixed(2)} — ${category}` });
      reset();
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => { reset(); onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-cyan-500" /> Log Expense
          </DialogTitle>
          <DialogDescription>Submit a field expense for reimbursement.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Amount ($)</Label>
            <Input type="number" step="0.01" min="0" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fuel">Fuel</SelectItem>
                <SelectItem value="supplies">Supplies</SelectItem>
                <SelectItem value="equipment">Equipment</SelectItem>
                <SelectItem value="food">Food / Meals</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Textarea rows={2} placeholder="What was the expense for?" value={description} onChange={e => setDescription(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>{submitting ? 'Saving…' : 'Submit'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Message Admin ─── */
function MessageAdminDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [message, setMessage] = useState('');
  const [urgency, setUrgency] = useState('normal');
  const [submitting, setSubmitting] = useState(false);
  const submit = useSubmitActivity();
  const { toast } = useToast();

  const reset = () => { setMessage(''); setUrgency('normal'); };

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast({ title: 'Enter a message', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    const ok = await submit('Message to admin', {
      message: message.trim(),
      urgency,
    });
    setSubmitting(false);
    if (ok) {
      toast({ title: 'Message sent', description: 'Admin will be notified.' });
      reset();
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => { reset(); onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-slate-500" /> Message Admin
          </DialogTitle>
          <DialogDescription>Send a quick message to the office.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Urgency</Label>
            <Select value={urgency} onValueChange={setUrgency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High — Needs attention</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Message</Label>
            <Textarea rows={3} placeholder="What do you need to tell admin?" value={message} onChange={e => setMessage(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>{submitting ? 'Sending…' : 'Send'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Equipment Issue ─── */
function EquipmentIssueDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [equipment, setEquipment] = useState('');
  const [severity, setSeverity] = useState('minor');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submit = useSubmitActivity();
  const { toast } = useToast();

  const reset = () => { setEquipment(''); setSeverity('minor'); setDescription(''); };

  const handleSubmit = async () => {
    if (!equipment.trim()) {
      toast({ title: 'Enter equipment name', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    const ok = await submit('Equipment issue reported', {
      equipment: equipment.trim(),
      severity,
      description: description.trim() || undefined,
    });
    setSubmitting(false);
    if (ok) {
      toast({ title: 'Issue reported', description: `${equipment} — ${severity}` });
      reset();
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => { reset(); onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-red-500" /> Equipment Issue
          </DialogTitle>
          <DialogDescription>Report a broken or malfunctioning piece of equipment.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Equipment</Label>
            <Input placeholder="e.g. Snow blower, Mower #3" value={equipment} onChange={e => setEquipment(e.target.value)} />
          </div>
          <div>
            <Label>Severity</Label>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="minor">Minor — still usable</SelectItem>
                <SelectItem value="major">Major — needs repair</SelectItem>
                <SelectItem value="critical">Critical — unsafe / out of service</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Details (optional)</Label>
            <Textarea rows={2} placeholder="Describe what happened" value={description} onChange={e => setDescription(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={submitting}>{submitting ? 'Reporting…' : 'Report Issue'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Materials Used ─── */
function MaterialsUsedDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('bags');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submit = useSubmitActivity();
  const { toast } = useToast();

  const reset = () => { setItemName(''); setQuantity(''); setUnit('bags'); setNotes(''); };

  const handleSubmit = async () => {
    if (!itemName.trim()) {
      toast({ title: 'Enter material name', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    const ok = await submit('Materials used', {
      item_name: itemName.trim(),
      quantity: quantity ? Number(quantity) : undefined,
      unit,
      notes: notes.trim() || undefined,
    });
    setSubmitting(false);
    if (ok) {
      toast({ title: 'Materials logged', description: `${quantity ? quantity + ' ' + unit + ' of ' : ''}${itemName}` });
      reset();
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => { reset(); onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-teal-500" /> Materials Used
          </DialogTitle>
          <DialogDescription>Log materials consumed on this job.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Material</Label>
            <Input placeholder="e.g. Salt, Mulch, Soil" value={itemName} onChange={e => setItemName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Quantity</Label>
              <Input type="number" min="0" step="0.5" placeholder="0" value={quantity} onChange={e => setQuantity(e.target.value)} />
            </div>
            <div>
              <Label>Unit</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bags">Bags</SelectItem>
                  <SelectItem value="kg">Kg</SelectItem>
                  <SelectItem value="lbs">Lbs</SelectItem>
                  <SelectItem value="litres">Litres</SelectItem>
                  <SelectItem value="gallons">Gallons</SelectItem>
                  <SelectItem value="yards">Yards</SelectItem>
                  <SelectItem value="units">Units</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Textarea rows={2} placeholder="Any details" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>{submitting ? 'Saving…' : 'Log Materials'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
