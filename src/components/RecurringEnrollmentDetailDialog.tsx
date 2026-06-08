import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/StatusBadge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CheckCircle2,
  XCircle,
  Ban,
  Clock,
  Loader2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import { format } from 'date-fns';

type Props = {
  enrollmentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const BILLING_STATUSES = [
  'Not set',
  'Billing setup required',
  'Quote required',
  'Invoice manually',
  'Payment method on file',
  'Do not auto-charge',
];

type ActionKind = 'Approved' | 'Active' | 'Declined' | 'Cancelled' | 'Follow-up';

export function RecurringEnrollmentDetailDialog({ enrollmentId, open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const [adminNotes, setAdminNotes] = useState('');
  const [billingStatus, setBillingStatus] = useState<string>('Not set');
  const [busyAction, setBusyAction] = useState<ActionKind | null>(null);

  const { data: enrollment, isLoading } = useQuery({
    queryKey: ['recurring_enrollment_detail', enrollmentId],
    enabled: !!enrollmentId && open,
    queryFn: async () => {
      const { data, error } = await (supabase.from('customer_recurring_requests' as any) as any)
        .select('*')
        .eq('id', enrollmentId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;

      const [{ data: customer }, { data: property }] = await Promise.all([
        data.customer_id
          ? supabase
              .from('customers')
              .select('id, first_name, last_name, company_name, email, phone')
              .eq('id', data.customer_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        data.property_id
          ? supabase
              .from('properties')
              .select('id, property_name, address_line_1, city, province, postal_code')
              .eq('id', data.property_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      return { ...(data as any), customer, property };
    },
  });

  useEffect(() => {
    if (enrollment) {
      setAdminNotes((enrollment as any).admin_notes || '');
      setBillingStatus((enrollment as any).billing_setup_status || 'Not set');
    } else {
      setAdminNotes('');
      setBillingStatus('Not set');
    }
  }, [enrollment]);

  const runAction = async (action: ActionKind) => {
    if (!enrollment) return;
    setBusyAction(action);
    try {
      const update: any = {
        status: action,
        admin_notes: adminNotes || null,
        billing_setup_status: billingStatus === 'Not set' ? null : billingStatus,
        actioned_by: user?.id ?? null,
        actioned_at: new Date().toISOString(),
      };
      const { error } = await (supabase.from('customer_recurring_requests' as any) as any)
        .update(update)
        .eq('id', enrollment.id);
      if (error) throw error;

      // Best-effort: log activity (ignore failures so the action still succeeds)
      try {
        await (supabase.from('activities' as any) as any).insert({
          action_name: `recurring_enrollment.${action.toLowerCase().replace(/[^a-z]/g, '_')}`,
          record_type: 'recurring_enrollment',
          record_id: enrollment.id,
          user_id: user?.id ?? null,
          status: 'completed',
          payload_summary: {
            service_category: enrollment.service_category,
            frequency: enrollment.frequency,
            customer_id: enrollment.customer_id,
            property_id: enrollment.property_id,
            billing_setup_status: billingStatus === 'Not set' ? null : billingStatus,
            new_status: action,
          },
        });
      } catch {
        /* non-blocking */
      }

      toast({
        title: `Enrollment ${action.toLowerCase()}`,
        description: 'Status updated. Customer will see the new status in their portal.',
      });
      qc.invalidateQueries({ queryKey: ['admin_recurring_requests'] });
      qc.invalidateQueries({ queryKey: ['admin_recurring_requests_full'] });
      qc.invalidateQueries({ queryKey: ['recurring_enrollment_detail', enrollment.id] });
      qc.invalidateQueries({ queryKey: ['customer_recurring_requests'] });
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: 'Could not update enrollment',
        description: err?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setBusyAction(null);
    }
  };

  const saveNotesOnly = async () => {
    if (!enrollment) return;
    setBusyAction('Follow-up');
    try {
      const { error } = await (supabase.from('customer_recurring_requests' as any) as any)
        .update({
          admin_notes: adminNotes || null,
          billing_setup_status: billingStatus === 'Not set' ? null : billingStatus,
        })
        .eq('id', enrollment.id);
      if (error) throw error;
      toast({ title: 'Notes saved' });
      qc.invalidateQueries({ queryKey: ['admin_recurring_requests'] });
      qc.invalidateQueries({ queryKey: ['admin_recurring_requests_full'] });
      qc.invalidateQueries({ queryKey: ['recurring_enrollment_detail', enrollment.id] });
    } catch (err: any) {
      toast({
        title: 'Could not save notes',
        description: err?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setBusyAction(null);
    }
  };

  const e: any = enrollment;
  const customerName = e?.customer
    ? `${e.customer.first_name || ''} ${e.customer.last_name || ''}`.trim() ||
      e.customer.company_name ||
      'Customer'
    : 'Customer';
  const propertyAddress = e?.property
    ? [e.property.property_name, e.property.address_line_1, e.property.city, e.property.province, e.property.postal_code]
        .filter(Boolean)
        .join(', ')
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Recurring Enrollment Review</DialogTitle>
          <DialogDescription>
            Review enrollment details and take an action. Billing is never auto-charged from this screen.
          </DialogDescription>
        </DialogHeader>

        {isLoading || !e ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Enrollment ID</p>
                  <p className="font-mono text-xs break-all">{e.id}</p>
                </div>
                <StatusBadge status={e.status || 'Pending'} />
              </div>
              <div className="text-xs text-muted-foreground">
                Submitted {e.created_at ? format(new Date(e.created_at), 'MMM d, yyyy h:mm a') : '—'}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Customer</p>
                <p className="font-medium">
                  {e.customer_id ? (
                    <Link to={`/customers/${e.customer_id}`} className="text-primary hover:underline inline-flex items-center gap-1">
                      {customerName} <ExternalLink className="h-3 w-3" />
                    </Link>
                  ) : (
                    customerName
                  )}
                </p>
                {e.customer?.email && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" /> {e.customer.email}
                  </p>
                )}
                {e.customer?.phone && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {e.customer.phone}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Property</p>
                {e.property_id ? (
                  <Link to={`/properties/${e.property_id}`} className="font-medium text-primary hover:underline inline-flex items-center gap-1">
                    {e.property?.property_name || 'Property'} <ExternalLink className="h-3 w-3" />
                  </Link>
                ) : (
                  <p className="font-medium text-muted-foreground">Not specified</p>
                )}
                {propertyAddress && (
                  <p className="text-xs text-muted-foreground flex items-start gap-1">
                    <MapPin className="h-3 w-3 mt-0.5 shrink-0" /> {propertyAddress}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Service Type</p>
                <p className="font-medium">{e.service_category}</p>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Frequency</p>
                <p className="font-medium capitalize">{e.frequency || '—'}</p>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Preferred Start</p>
                <p className="font-medium flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  {e.preferred_start_date || 'No preference'}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Service Window</p>
                <p className="font-medium">{e.preferred_service_window || 'No preference'}</p>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <p className="text-xs text-muted-foreground">Customer payment preference</p>
                <p className="font-medium">{e.payment_preference || '—'}</p>
              </div>

              {e.special_instructions && (
                <div className="space-y-1 sm:col-span-2">
                  <p className="text-xs text-muted-foreground">Customer notes / message</p>
                  <p className="text-sm whitespace-pre-wrap rounded-md border bg-background p-2">{e.special_instructions}</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="billing-status">Billing setup status (admin)</Label>
              <Select value={billingStatus} onValueChange={setBillingStatus}>
                <SelectTrigger id="billing-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BILLING_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                This is a manual tracking field — no automatic Stripe subscription or card charge is created.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-notes">Admin notes (internal)</Label>
              <Textarea
                id="admin-notes"
                value={adminNotes}
                onChange={(ev) => setAdminNotes(ev.target.value)}
                rows={3}
                placeholder="Internal notes about pricing, scheduling, billing setup, etc."
              />
            </div>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={saveNotesOnly}
            disabled={busyAction !== null || !e}
          >
            Save notes only
          </Button>
          <div className="flex flex-wrap gap-2 sm:ml-auto">
            <Button
              variant="outline"
              onClick={() => runAction('Follow-up')}
              disabled={busyAction !== null || !e}
            >
              <Clock className="h-4 w-4 mr-1" /> Mark Follow-Up
            </Button>
            <Button
              variant="outline"
              onClick={() => runAction('Cancelled')}
              disabled={busyAction !== null || !e}
            >
              <Ban className="h-4 w-4 mr-1" /> Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => runAction('Declined')}
              disabled={busyAction !== null || !e}
            >
              <XCircle className="h-4 w-4 mr-1" /> Decline
            </Button>
            <Button
              onClick={() => runAction('Approved')}
              disabled={busyAction !== null || !e}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
            </Button>
            <Button
              onClick={() => runAction('Active')}
              disabled={busyAction !== null || !e}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" /> Activate Plan
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
