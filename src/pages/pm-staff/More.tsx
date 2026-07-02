import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, LogIn, LogOut, User, Home } from 'lucide-react';

const items = [
  { to: '/pm-staff/applications', label: 'Applications', icon: FileText },
  { to: '/pm-staff/move-ins', label: 'Move-In Checklists', icon: LogIn },
  { to: '/pm-staff/move-outs', label: 'Move-Out (Phase 6B)', icon: LogOut },
  { to: '/pm-staff/account', label: 'Account', icon: User },
  { to: '/pm-staff', label: 'Home', icon: Home },
];

export default function More() {
  return (
    <div className="p-4 space-y-2">
      <h2 className="text-lg font-semibold mb-2">More</h2>
      {items.map(({ to, label, icon: Icon }) => (
        <Link key={to} to={to}>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-indigo-50 flex items-center justify-center">
                <Icon className="h-5 w-5 text-indigo-700" />
              </div>
              <span className="font-medium">{label}</span>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
