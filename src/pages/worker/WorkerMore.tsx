import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent } from '@/components/ui/card';
import { Link, useNavigate } from 'react-router-dom';
import { Monitor, Settings, LogOut, User, ChevronRight, HardHat, Eye } from 'lucide-react';

export default function WorkerMore() {
  const { user, signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const menuItems = [
    ...(isAdmin ? [
      { icon: Monitor, label: 'Admin Dashboard', to: '/', description: 'Switch to desktop admin view' },
      { icon: Eye, label: 'Customer Portal Preview', to: '/portal/properties', description: 'Preview the customer experience' },
    ] : []),
    { icon: Settings, label: 'Settings', to: '/settings', description: 'Account & app settings' },
  ];

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <h1 className="text-lg font-bold text-foreground">More</h1>

      {/* User info */}
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground truncate">
              {user?.user_metadata?.full_name || user?.email || 'Worker'}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
            Field Mode
          </span>
        </CardContent>
      </Card>

      {/* Current mode indicator */}
      <div className="flex items-center gap-2 px-1">
        <HardHat className="h-4 w-4 text-blue-500" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">You are in Field Mode</span>
      </div>

      {/* Switch portals */}
      <div className="space-y-1.5">
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider px-1">Switch View</p>
        {menuItems.map(item => (
          <Link key={item.to} to={item.to}>
            <Card className="active:shadow-sm transition-shadow">
              <CardContent className="p-4 flex items-center gap-3">
                <item.icon className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-[11px] text-muted-foreground">{item.description}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Logout */}
      <button onClick={handleLogout} className="w-full">
        <Card className="active:shadow-sm transition-shadow border-destructive/20">
          <CardContent className="p-4 flex items-center gap-3">
            <LogOut className="h-5 w-5 text-destructive shrink-0" />
            <p className="text-sm font-medium text-destructive">Sign Out</p>
          </CardContent>
        </Card>
      </button>

      {/* Test credentials helper */}
      <div className="rounded-lg border border-dashed border-amber-500/30 bg-amber-500/5 p-3 space-y-1.5">
        <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">🧪 Testing Tip</p>
        <p className="text-[11px] text-muted-foreground">
          Sign out and use the <strong>Dev · Role Testing</strong> panel on the login page to switch between Admin, Worker, and Customer accounts.
        </p>
        <div className="text-[10px] text-muted-foreground/80 space-y-0.5">
          <p>• <strong>Admin</strong> → admin@praetoriagroup.ca</p>
          <p>• <strong>Worker</strong> → worker@praetoriagroup.ca</p>
          <p>• <strong>Customer</strong> → customer@praetoriagroup.ca</p>
        </div>
      </div>
    </div>
  );
}
