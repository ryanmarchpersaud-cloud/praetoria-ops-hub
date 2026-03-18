import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Webhook, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { SettingsLayout } from '@/components/SettingsLayout';

const WEBHOOK_ACTIONS = [
  {
    action: 'create_activity',
    description: 'Log an activity entry',
    example: { action: 'create_activity', action_name: 'Email sent to client', workflow_name: 'n8n', record_type: 'lead', record_id: '<uuid>' },
  },
  {
    action: 'update_lead_status',
    description: 'Change a lead\'s status',
    example: { action: 'update_lead_status', lead_id: '<uuid>', status: 'Reviewing', internal_notes: 'Auto-triaged by n8n' },
  },
  {
    action: 'create_quote_draft',
    description: 'Create a quote with optional line items',
    example: { action: 'create_quote_draft', lead_id: '<uuid>', service_category: 'Snow & Ice', scope_of_work: 'Driveway clearing', line_items: [{ item_name: 'Snow removal', quantity: 1, unit_price: 150 }] },
  },
  {
    action: 'set_follow_up',
    description: 'Set a follow-up reminder on a quote',
    example: { action: 'set_follow_up', quote_id: '<uuid>', follow_up_due_at: '2026-03-20T09:00:00Z' },
  },
];

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const [copied, setCopied] = useState<string | null>(null);
  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/n8n-webhook`;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <SettingsLayout>
      <div className="space-y-6 animate-fade-in max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold">General Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your account and system preferences</p>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Account</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <p className="font-medium">{user?.email}</p>
                <p className="text-sm text-muted-foreground">Staff account</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">System</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Praetoria Ops v1.0</p>
            <p>n8n webhook endpoint active</p>
            <p>Activity logging enabled</p>
          </CardContent>
        </Card>

        <Button variant="destructive" onClick={signOut}>Sign Out</Button>
      </div>
    </SettingsLayout>
  );
}
