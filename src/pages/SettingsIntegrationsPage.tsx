import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Webhook, Copy, Check } from 'lucide-react';
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
  {
    action: 'test_handoff',
    description: 'Send a synthetic stripe.test_checkout_created event to n8n',
    example: { action: 'test_handoff' },
  },
  {
    action: 'test_email_ops',
    description: 'Send a synthetic email.ops_notification event to n8n',
    example: { action: 'test_email_ops' },
  },
];

export default function SettingsIntegrationsPage() {
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
          <h1 className="text-2xl font-bold">Integrations</h1>
          <p className="text-sm text-muted-foreground">Manage webhook endpoints and external connections</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Webhook className="w-4 h-4" />
              n8n Webhook Integration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Webhook URL</label>
              <div className="mt-1 flex items-center gap-2">
                <code className="flex-1 text-xs bg-muted rounded px-3 py-2 break-all font-mono">{webhookUrl}</code>
                <Button
                  size="icon"
                  variant="outline"
                  className="shrink-0 h-8 w-8"
                  onClick={() => copyToClipboard(webhookUrl, 'url')}
                >
                  {copied === 'url' ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Authentication</label>
              <p className="text-sm text-muted-foreground mt-1">
                Set the <code className="text-xs bg-muted px-1 py-0.5 rounded">x-webhook-secret</code> header with your <code className="text-xs bg-muted px-1 py-0.5 rounded">N8N_WEBHOOK_SECRET</code> secret value, or use a Bearer token.
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Available Actions</label>
              {WEBHOOK_ACTIONS.map((wa) => (
                <div key={wa.action} className="rounded-lg border bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium font-mono">{wa.action}</p>
                      <p className="text-xs text-muted-foreground">{wa.description}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs h-7"
                      onClick={() => copyToClipboard(JSON.stringify(wa.example, null, 2), wa.action)}
                    >
                      {copied === wa.action ? <Check className="w-3 h-3 mr-1 text-primary" /> : <Copy className="w-3 h-3 mr-1" />}
                      Copy
                    </Button>
                  </div>
                  <pre className="text-[11px] bg-background rounded p-2 overflow-x-auto font-mono leading-relaxed">
                    {JSON.stringify(wa.example, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </SettingsLayout>
  );
}
