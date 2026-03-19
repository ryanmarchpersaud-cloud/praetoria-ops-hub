import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, LogOut, Mail, HelpCircle, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function WorkerSettings() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'User';
  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.charAt(0).toUpperCase() || '?';

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="px-4 pt-3 pb-4 space-y-4 max-w-lg">
      {/* Profile Banner */}
      <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-5 text-primary-foreground">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary-foreground/20 flex items-center justify-center text-xl font-bold border-2 border-primary-foreground/30">
            {initials}
          </div>
          <div>
            <p className="text-lg font-bold">{user?.user_metadata?.full_name || firstName}</p>
            <p className="text-xs opacity-80">Field Worker</p>
            <p className="text-[11px] opacity-60 mt-0.5">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Account Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" /> Login
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </CardContent>
      </Card>

      {/* Support */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-primary" /> Support
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Need help? Contact your supervisor or the operations team.
          </p>
          <div className="space-y-1.5">
            <a href="tel:306-555-0100" className="flex items-center gap-2 text-xs text-primary hover:underline">
              <Phone className="h-3.5 w-3.5" /> 306-555-0100
            </a>
            <a href="mailto:ops@praetoriagroup.ca" className="flex items-center gap-2 text-xs text-primary hover:underline">
              <Mail className="h-3.5 w-3.5" /> ops@praetoriagroup.ca
            </a>
          </div>
        </CardContent>
      </Card>

      {/* App Info */}
      <Card>
        <CardContent className="p-4 space-y-1 text-sm text-muted-foreground">
          <p>Praetoria Group v1.0</p>
          <p>Worker Portal</p>
        </CardContent>
      </Card>

      <Button variant="destructive" className="w-full" onClick={handleLogout}>
        <LogOut className="h-4 w-4 mr-2" /> Sign Out
      </Button>
    </div>
  );
}
