import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Link, useNavigate } from 'react-router-dom';
import { Monitor, Settings, LogOut, User, ChevronRight } from 'lucide-react';

export default function WorkerMore() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const menuItems = [
    { icon: Monitor, label: 'Admin Dashboard', to: '/', description: 'Switch to desktop view' },
    { icon: Settings, label: 'Settings', to: '/settings', description: 'Account & app settings' },
  ];

  return (
    <div className="px-4 pt-6 space-y-4">
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
        </CardContent>
      </Card>

      {/* Menu items */}
      <div className="space-y-2">
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
      <button
        onClick={handleLogout}
        className="w-full"
      >
        <Card className="active:shadow-sm transition-shadow border-destructive/20">
          <CardContent className="p-4 flex items-center gap-3">
            <LogOut className="h-5 w-5 text-destructive shrink-0" />
            <p className="text-sm font-medium text-destructive">Sign Out</p>
          </CardContent>
        </Card>
      </button>
    </div>
  );
}
