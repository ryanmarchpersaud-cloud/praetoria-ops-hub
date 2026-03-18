import { SettingsLayout } from '@/components/SettingsLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Webhook, CloudSun, CreditCard, FileText, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const apps = [
  {
    name: 'n8n Webhook',
    icon: Webhook,
    status: 'connected' as const,
    description: 'Workflow automation — triggers on lead, quote, job, and visit events.',
    settingsLink: '/settings/integrations',
  },
  {
    name: 'Weather API',
    icon: CloudSun,
    status: 'active' as const,
    description: 'Real-time weather data for scheduling decisions and crew safety alerts.',
    settingsLink: null,
  },
  {
    name: 'Stripe Payments',
    icon: CreditCard,
    status: 'coming_soon' as const,
    description: 'Accept online payments, auto-reconcile invoices, and enable customer autopay.',
    settingsLink: null,
  },
  {
    name: 'QuickBooks Online',
    icon: FileText,
    status: 'coming_soon' as const,
    description: 'Two-way sync of invoices, payments, and customer records with your accounting software.',
    settingsLink: null,
  },
];

const statusConfig = {
  connected: { label: 'Connected', variant: 'default' as const },
  active: { label: 'Active', variant: 'default' as const },
  coming_soon: { label: 'Coming Soon', variant: 'secondary' as const },
};

export default function ConnectedAppsPage() {
  const navigate = useNavigate();

  return (
    <SettingsLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold">Connected Apps</h1>
          <p className="text-sm text-muted-foreground">Third-party services and integrations linked to your account.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {apps.map((app) => {
            const sc = statusConfig[app.status];
            return (
              <Card key={app.name} className={app.status === 'coming_soon' ? 'opacity-60' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <app.icon className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">{app.name}</CardTitle>
                    </div>
                    <Badge variant={sc.variant}>{sc.label}</Badge>
                  </div>
                  <CardDescription>{app.description}</CardDescription>
                </CardHeader>
                {app.settingsLink && (
                  <CardContent>
                    <Button variant="outline" size="sm" onClick={() => navigate(app.settingsLink!)}>
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                      Configure
                    </Button>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </SettingsLayout>
  );
}
