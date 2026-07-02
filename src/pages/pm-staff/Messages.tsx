import { Card, CardContent } from '@/components/ui/card';
import { Bell } from 'lucide-react';
import { NotificationCenter } from '@/components/NotificationCenter';

export default function PMStaffMessagesPage() {
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-emerald-700" />
          <h2 className="text-lg font-semibold">Messages & Notifications</h2>
        </div>
        <NotificationCenter />
      </div>
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          Use the bell above (also in the header) to view your notifications.
          Direct messaging with admin/HR will appear here.
        </CardContent>
      </Card>
    </div>
  );
}
