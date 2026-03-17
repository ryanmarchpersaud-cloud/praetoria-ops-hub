import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export type SubQuickActionType = 'contact_admin' | null;

interface Props {
  activeAction: SubQuickActionType;
  onClose: () => void;
}

export function SubcontractorQuickActionDialogs({ activeAction, onClose }: Props) {
  return (
    <>
      <ContactAdminDialog open={activeAction === 'contact_admin'} onClose={onClose} />
    </>
  );
}

function ContactAdminDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [message, setMessage] = useState('');
  const [urgency, setUrgency] = useState('normal');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => { setMessage(''); setUrgency('normal'); };

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast({ title: 'Enter a message', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('activities').insert([{
      action_name: 'Subcontractor message to admin',
      user_id: user?.id ?? null,
      workflow_name: 'subcontractor',
      payload_summary: { message: message.trim(), urgency } as any,
      status: 'completed',
    }]);
    setSubmitting(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Message sent', description: 'Praetoria admin will be notified.' });
      qc.invalidateQueries({ queryKey: ['activities'] });
      reset();
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => { reset(); onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-slate-500" /> Contact Praetoria
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
            <Textarea rows={3} placeholder="What do you need to tell Praetoria?" value={message} onChange={e => setMessage(e.target.value)} />
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
