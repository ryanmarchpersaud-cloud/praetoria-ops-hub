import { useNotificationPreferences, useUpsertNotificationPreference } from '@/hooks/useNotifications';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, Mail, MessageSquare, Smartphone } from 'lucide-react';

const NOTIFICATION_EVENTS = [
  { value: 'quote_sent', label: 'Quote Ready' },
  { value: 'visit_scheduled', label: 'Visit Scheduled' },
  { value: 'worker_assigned', label: 'Worker Assigned' },
  { value: 'worker_en_route', label: 'Worker En Route' },
  { value: 'visit_completed', label: 'Visit Completed' },
  { value: 'invoice_sent', label: 'Invoice Sent' },
  { value: 'invoice_overdue', label: 'Invoice Overdue' },
  { value: 'payment_received', label: 'Payment Received' },
  { value: 'payment_failed', label: 'Payment Failed' },
] as const;

interface Props {
  customerId: string;
}

export function NotificationPreferencesCard({ customerId }: Props) {
  const { data: prefs = [] } = useNotificationPreferences(customerId);
  const upsertMut = useUpsertNotificationPreference();

  const getPref = (event: string) => {
    const existing = prefs.find(p => p.event === event);
    return existing || { email_enabled: true, sms_enabled: false, in_app_enabled: true };
  };

  const togglePref = (event: string, channel: 'email_enabled' | 'sms_enabled' | 'in_app_enabled') => {
    const current = getPref(event);
    upsertMut.mutate({
      customer_id: customerId,
      event,
      email_enabled: current.email_enabled,
      sms_enabled: current.sms_enabled,
      in_app_enabled: current.in_app_enabled,
      [channel]: !current[channel],
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <Bell className="h-4 w-4" /> Notification Preferences
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {/* Header row */}
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center pb-2 border-b text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            <span>Event</span>
            <span className="w-10 text-center"><Mail className="h-3 w-3 mx-auto" /></span>
            <span className="w-10 text-center"><Smartphone className="h-3 w-3 mx-auto" /></span>
            <span className="w-10 text-center"><MessageSquare className="h-3 w-3 mx-auto" /></span>
          </div>

          {NOTIFICATION_EVENTS.map(ev => {
            const p = getPref(ev.value);
            return (
              <div key={ev.value} className="grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center py-1.5">
                <Label className="text-xs font-normal">{ev.label}</Label>
                <div className="w-10 flex justify-center">
                  <Switch
                    checked={p.email_enabled}
                    onCheckedChange={() => togglePref(ev.value, 'email_enabled')}
                    className="scale-75"
                  />
                </div>
                <div className="w-10 flex justify-center">
                  <Switch
                    checked={p.sms_enabled}
                    onCheckedChange={() => togglePref(ev.value, 'sms_enabled')}
                    className="scale-75"
                  />
                </div>
                <div className="w-10 flex justify-center">
                  <Switch
                    checked={p.in_app_enabled}
                    onCheckedChange={() => togglePref(ev.value, 'in_app_enabled')}
                    className="scale-75"
                  />
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-muted-foreground mt-3">
          Email and SMS delivery requires active integration. In-app notifications are always available.
        </p>
      </CardContent>
    </Card>
  );
}
