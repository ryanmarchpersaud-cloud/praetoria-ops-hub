import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCustomerProfile } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import {
  Zap, X, MessageSquarePlus, AlertTriangle, Phone, Camera,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

type DialogType = 'contact_support' | 'report_issue' | null;

const quickActions = [
  { icon: MessageSquarePlus, label: 'Request Service', color: 'bg-blue-500', route: '/portal/requests/new' },
  { icon: AlertTriangle, label: 'Report Issue', color: 'bg-rose-500', dialog: 'report_issue' as const },
  { icon: Phone, label: 'Contact Support', color: 'bg-emerald-500', dialog: 'contact_support' as const },
  { icon: Camera, label: 'Upload Photos', color: 'bg-violet-500', route: '/portal/photos' },
];

export function PortalFAB() {
  const [open, setOpen] = useState(false);
  const [activeDialog, setActiveDialog] = useState<DialogType>(null);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: customer } = useCustomerProfile();
  const { toast } = useToast();

  const handleAction = (action: typeof quickActions[0]) => {
    setOpen(false);
    if (action.dialog) {
      setActiveDialog(action.dialog);
    } else if (action.route) {
      navigate(action.route);
    }
  };

  const handleSubmitMessage = async (type: 'issue' | 'support') => {
    if (!message.trim() || !user) return;
    setSubmitting(true);
    const customerName = customer ? `${customer.first_name} ${customer.last_name}` : (user.email || 'Customer');
    try {
      // Log to activities
      await supabase.from('activities').insert({
        action_name: type === 'issue' ? 'Customer reported property issue' : 'Customer contacted support',
        user_id: user.id,
        record_type: 'customer',
        record_id: customer?.id ?? null,
        workflow_name: 'customer_portal',
        payload_summary: { message: message.trim(), customer_name: customerName },
        status: 'completed',
      } as any);

      // Send admin notification
      await supabase.functions.invoke('send-notification', {
        body: {
          event: 'new_service_request',
          record_type: 'service_request',
          channels: ['in_app', 'email'],
          audience: 'admin',
          variables: {
            subject: type === 'issue' ? `Property Issue Reported by ${customerName}` : `Support Message from ${customerName}`,
            body: message.trim(),
            customer_name: customerName,
            to_email: 'ops@praetoriagroup.ca',
            reply_to: 'ops@praetoriagroup.ca',
          },
        },
      });

      toast({ title: type === 'issue' ? 'Issue reported' : 'Message sent', description: 'Our team will follow up shortly.' });
      setMessage('');
      setActiveDialog(null);
    } catch {
      toast({ title: 'Error', description: 'Could not send. Please try again.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Action drawer */}
      {open && (
        <div className="fixed inset-x-0 bottom-0 z-50 animate-in slide-in-from-bottom-4 duration-200">
          <div className="max-w-sm mx-auto bg-card rounded-t-2xl border-t border-x border-border shadow-2xl pb-safe">
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <h3 className="text-sm font-semibold text-foreground">Quick Actions</h3>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center active:scale-90"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="mx-auto w-10 h-1 rounded-full bg-muted mb-3" />

            <div className="grid grid-cols-4 gap-2 px-4 pb-5">
              {quickActions.map((a) => (
                <button
                  key={a.label}
                  onClick={() => handleAction(a)}
                  className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl active:scale-95 active:bg-muted/50 transition-all"
                >
                  <div className={cn('w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm', a.color)}>
                    <a.icon className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-[10px] font-medium text-foreground text-center leading-tight line-clamp-2">
                    {a.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FAB trigger */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'fixed bottom-5 right-4 z-50 w-12 h-12 rounded-2xl shadow-xl flex items-center justify-center transition-all active:scale-90',
          open ? 'bg-foreground rotate-180 rounded-full' : 'bg-primary'
        )}
      >
        {open ? (
          <X className="h-5 w-5 text-background" />
        ) : (
          <Zap className="h-5 w-5 text-primary-foreground" />
        )}
      </button>

      {/* Contact Support dialog */}
      <Dialog open={activeDialog === 'contact_support'} onOpenChange={(o) => { if (!o) setActiveDialog(null); }}>
        <DialogContent className="max-w-sm mx-3">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-emerald-500" />
              Contact Support
            </DialogTitle>
            <DialogDescription>
              Send a message to Praetoria support. We'll respond as soon as possible.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Your Message</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="How can we help?"
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Phone className="h-3.5 w-3.5" />
              <span>Or call us: <a href="tel:+13067376269" className="font-bold hover:underline">(306) 737-6269</a></span>
            </div>
            <Button
              className="w-full"
              disabled={!message.trim() || submitting}
              onClick={() => handleSubmitMessage('support')}
            >
              {submitting ? 'Sending...' : 'Send Message'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Report Issue dialog */}
      <Dialog open={activeDialog === 'report_issue'} onOpenChange={(o) => { if (!o) setActiveDialog(null); }}>
        <DialogContent className="max-w-sm mx-3">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-500" />
              Report Property Issue
            </DialogTitle>
            <DialogDescription>
              Let us know about a property concern — damage, safety hazard, or missed service.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Describe the Issue</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="e.g. Ice buildup near the garage, cracked sidewalk..."
              />
            </div>
            <Button
              className="w-full"
              variant="destructive"
              disabled={!message.trim() || submitting}
              onClick={() => handleSubmitMessage('issue')}
            >
              {submitting ? 'Submitting...' : 'Submit Issue Report'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
