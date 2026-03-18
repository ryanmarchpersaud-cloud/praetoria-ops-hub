import { useAuth } from '@/hooks/useAuth';
import { useAuthorization } from '@/hooks/useAuthorization';
import { Navigate, Link } from 'react-router-dom';
import { ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AccessDenied() {
  const { user } = useAuth();
  const { isCustomer, isStaff, canAccessAdminPortal, isActiveUser } = useAuthorization();

  // Determine best redirect for this user
  let homePath = '/login';
  if (user) {
    if (!isActiveUser) homePath = '/login'; // blocked user
    else if (isCustomer) homePath = '/portal/properties';
    else if (isStaff && !canAccessAdminPortal) homePath = '/worker';
    else homePath = '/';
  }

  const message = user && !isActiveUser
    ? 'Your account has been deactivated. Please contact your administrator.'
    : "You don't have permission to view this page. If you think this is a mistake, contact your administrator.";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center space-y-4 max-w-sm">
        <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <ShieldX className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
        <p className="text-muted-foreground text-sm">{message}</p>
        <Button asChild>
          <Link to={homePath}>Go to Home</Link>
        </Button>
      </div>
    </div>
  );
}
