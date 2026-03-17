import { Card, CardContent } from '@/components/ui/card';
import { Settings } from 'lucide-react';

export default function SubcontractorSettings() {
  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <h1 className="text-lg font-bold text-foreground">Settings</h1>
      <div className="rounded-lg border border-dashed border-muted-foreground/20 p-6 text-center">
        <Settings className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">Account settings coming soon</p>
        <p className="text-xs text-muted-foreground mt-1">Contact admin for account changes.</p>
      </div>
    </div>
  );
}
