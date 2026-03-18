import { SettingsLayout } from '@/components/SettingsLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Construction } from 'lucide-react';

export default function SettingsPlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <SettingsLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Construction className="h-10 w-10 text-muted-foreground mb-3" />
            <h3 className="font-semibold text-foreground mb-1">Coming Soon</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              This section is planned and will be built out in a future update.
            </p>
          </CardContent>
        </Card>
      </div>
    </SettingsLayout>
  );
}
