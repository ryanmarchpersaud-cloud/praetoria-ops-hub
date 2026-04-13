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
import { format } from 'date-fns';

export type QuickActionType = 'expense' | 'message_admin' | 'equipment_issue' | 'materials_used' | null;

interface Props {
  activeAction: QuickActionType;
  onClose: () => void;
}

function assertMutation(error: { message: string } | null | undefined) {
  if (error) throw error;
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

/* ─── Expense ─── */
function ExpenseDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Fuel / Gas / Diesel');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const CATEGORIES = [
    'Fuel / Gas / Diesel', 'Materials & Supplies', 'Equipment Repair',
    'Vehicle Maintenance', 'Tools', 'Safety Gear', 'Food / Meals (on-site)',
    'Parking / Tolls', 'Other',
  ];

  const reset = () => { setAmount(''); setCategory('Fuel / Gas / Diesel'); setDescription(''); };

  const handleSubmit = async () => {
    if (!amount || isNaN(Number(amount)) || !user) {
      toast({ title: 'Enter a valid amount', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      // Insert into the actual worker_expense_claims table
      const { data, error } = await supabase.from('worker_expense_claims').insert([{
        user_id: user.id,
        amount: Number(amount),
        category,
        description: description.trim() || null,
        expense_date: format(new Date(), 'yyyy-MM-dd'),
        status: 'submitted',
      }]).select('id').single();
      assertMutation(error);

      // Log to activity feed
      const { error: activityError } = await supabase.from('activities').insert([{
        action_name: `Expense claim submitted: $${Number(amount).toFixed(2)} — ${category}`,
        user_id: user.id,
        workflow_name: 'field_worker',
        record_type: 'expense_claim',
        record_id: data.id,
        payload_summary: { amount: Number(amount), category, description: description.trim() || undefined } as any,
        status: 'completed',
      }]);
      assertMutation(activityError);

      // Notify admin in-app
      const { error: notificationError } = await supabase.from('notifications').insert([{
        event: 'expense_submitted',
        channel: 'in_app',
        audience: 'admin',
        record_type: 'expense_claim',
        record_id: data.id,
        subject: `New Expense Claim: $${Number(amount).toFixed(2)}`,
        body: `A worker submitted a $${Number(amount).toFixed(2)} expense (${category})${user.email ? ` from ${user.email}` : ''}. Review in Expense Tracking.`,
        status: 'sent',
        sent_at: new Date().toISOString(),
      }]);
      assertMutation(notificationError);

      qc.invalidateQueries({ queryKey: ['worker_expense_claims'] });
      qc.invalidateQueries({ queryKey: ['admin_worker_expense_claims'] });
      qc.invalidateQueries({ queryKey: ['activities'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications_unread'] });
      qc.invalidateQueries({ queryKey: ['notifications_all_recent'] });
      toast({ title: 'Expense submitted', description: `$${Number(amount).toFixed(2)} — ${category}` });
      reset();
      onClose();
    } catch (e: any) {
      toast({ title: 'Failed to submit expense', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => { reset(); onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" /> Log Expense
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
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
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
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [urgency, setUrgency] = useState('normal');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const reset = () => { setMessage(''); setUrgency('normal'); };

  const handleSubmit = async () => {
    if (!message.trim() || !user) {
      toast({ title: 'Enter a message', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      // Log to activity feed
      const { error: activityError } = await supabase.from('activities').insert([{
        action_name: `Message to admin`,
        user_id: user.id,
        workflow_name: 'field_worker',
        record_type: 'worker_message',
        payload_summary: { message: message.trim(), urgency } as any,
        status: 'completed',
      }]);
      assertMutation(activityError);

      // Create in-app notification for admin
      const { error: notificationError } = await supabase.from('notifications').insert([{
        event: 'worker_message',
        channel: 'in_app',
        audience: 'admin',
        record_type: 'worker_message',
        subject: `Worker Message (${urgency === 'high' ? '🔴 HIGH' : urgency === 'normal' ? 'Normal' : 'Low'})`,
        body: `${message.trim()}${user.email ? `\n\nFrom: ${user.email}` : ''}`,
        status: 'sent',
        sent_at: new Date().toISOString(),
      }]);
      assertMutation(notificationError);

      // Send email notification for high urgency
      if (urgency === 'high') {
        try {
          await supabase.functions.invoke('send-email', {
            body: {
              action: 'worker_message',
              message: message.trim(),
              urgency,
              reporter_name: user.email,
            },
          });
        } catch { /* non-critical */ }
      }

      qc.invalidateQueries({ queryKey: ['activities'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications_unread'] });
      qc.invalidateQueries({ queryKey: ['notifications_all_recent'] });
      toast({ title: 'Message sent', description: 'Admin has been notified.' });
      reset();
      onClose();
    } catch (e: any) {
      toast({ title: 'Failed to send message', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => { reset(); onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-muted-foreground" /> Message Admin
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
  const { user } = useAuth();
  const [equipment, setEquipment] = useState('');
  const [severity, setSeverity] = useState('minor');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const reset = () => { setEquipment(''); setSeverity('minor'); setDescription(''); };

  const handleSubmit = async () => {
    if (!equipment.trim() || !user) {
      toast({ title: 'Enter equipment name', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      // Log to activity feed
      const { error: activityError } = await supabase.from('activities').insert([{
        action_name: `Equipment issue reported: ${equipment.trim()}`,
        user_id: user.id,
        workflow_name: 'field_worker',
        record_type: 'equipment_issue',
        payload_summary: { equipment: equipment.trim(), severity, description: description.trim() || undefined } as any,
        status: 'completed',
      }]);
      assertMutation(activityError);

      // Create in-app notification for admin
      const { error: notificationError } = await supabase.from('notifications').insert([{
        event: 'equipment_issue',
        channel: 'in_app',
        audience: 'admin',
        record_type: 'equipment_issue',
        subject: `Equipment Issue: ${equipment.trim()} (${severity})`,
        body: `A worker reported a ${severity} issue with ${equipment.trim()}.${description.trim() ? ' ' + description.trim() : ''}${user.email ? ` Reported by ${user.email}.` : ''}`,
        status: 'sent',
        sent_at: new Date().toISOString(),
      }]);
      assertMutation(notificationError);

      qc.invalidateQueries({ queryKey: ['activities'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications_unread'] });
      qc.invalidateQueries({ queryKey: ['notifications_all_recent'] });
      toast({ title: 'Issue reported', description: `${equipment} — ${severity}` });
      reset();
      onClose();
    } catch (e: any) {
      toast({ title: 'Failed to report issue', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => { reset(); onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-destructive" /> Equipment Issue
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
  const { user } = useAuth();
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('bags');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const reset = () => { setItemName(''); setQuantity(''); setUnit('bags'); setNotes(''); };

  const handleSubmit = async () => {
    if (!itemName.trim() || !user) {
      toast({ title: 'Enter material name', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      await supabase.from('activities').insert([{
        action_name: `Materials used: ${quantity ? quantity + ' ' + unit + ' of ' : ''}${itemName.trim()}`,
        user_id: user.id,
        workflow_name: 'field_worker',
        record_type: 'materials_used',
        payload_summary: {
          item_name: itemName.trim(),
          quantity: quantity ? Number(quantity) : undefined,
          unit,
          notes: notes.trim() || undefined,
        } as any,
        status: 'completed',
      }]);

      qc.invalidateQueries({ queryKey: ['activities'] });
      toast({ title: 'Materials logged', description: `${quantity ? quantity + ' ' + unit + ' of ' : ''}${itemName}` });
      reset();
      onClose();
    } catch (e: any) {
      toast({ title: 'Failed to log materials', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => { reset(); onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-accent-foreground" /> Materials Used
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
