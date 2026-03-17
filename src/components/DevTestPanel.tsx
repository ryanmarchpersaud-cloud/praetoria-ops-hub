import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Shield, HardHat, User, Loader2, FlaskConical, ChevronDown, ChevronUp } from 'lucide-react';

const TEST_ACCOUNTS = [
  { email: 'admin@praetoriagroup.com', password: 'TestAdmin123!', role: 'Admin', icon: Shield, color: 'text-amber-500' },
  { email: 'worker@praetoriagroup.com', password: 'TestWorker123!', role: 'Worker', icon: HardHat, color: 'text-blue-500' },
  { email: 'customer@praetoriagroup.com', password: 'TestCustomer123!', role: 'Customer', icon: User, color: 'text-emerald-500' },
];

export function DevTestPanel() {
  const [expanded, setExpanded] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [signingIn, setSigningIn] = useState<string | null>(null);
  const { toast } = useToast();

  const seedAccounts = async () => {
    setSeeding(true);
    try {
      const { data, error } = await supabase.functions.invoke('seed-test-accounts');
      if (error) throw error;
      toast({ title: 'Test accounts ready', description: `${data.results?.length || 3} accounts seeded.` });
    } catch (err: any) {
      toast({ title: 'Seed failed', description: err.message, variant: 'destructive' });
    } finally {
      setSeeding(false);
    }
  };

  const quickLogin = async (email: string, password: string, role: string) => {
    setSigningIn(role);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.includes('Invalid login')) {
          toast({ title: 'Account not found', description: 'Run "Seed Test Accounts" first.', variant: 'destructive' });
        } else {
          throw error;
        }
      }
    } catch (err: any) {
      toast({ title: 'Login failed', description: err.message, variant: 'destructive' });
    } finally {
      setSigningIn(null);
    }
  };

  return (
    <div className="border border-dashed border-amber-500/30 rounded-lg bg-amber-500/5 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <FlaskConical className="w-3.5 h-3.5" />
          Dev &middot; Role Testing
        </span>
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs h-8 border-amber-500/30 text-amber-600 dark:text-amber-400"
            onClick={seedAccounts}
            disabled={seeding}
          >
            {seeding ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <FlaskConical className="w-3 h-3 mr-1.5" />}
            {seeding ? 'Seeding…' : '1. Seed Test Accounts'}
          </Button>

          <div className="space-y-1.5">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">2. Quick Login As:</p>
            {TEST_ACCOUNTS.map((account) => {
              const Icon = account.icon;
              const isLoading = signingIn === account.role;
              return (
                <button
                  key={account.role}
                  onClick={() => quickLogin(account.email, account.password, account.role)}
                  disabled={!!signingIn}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md border border-border bg-card hover:bg-muted transition-colors text-left disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className={`w-4 h-4 ${account.color} animate-spin`} />
                  ) : (
                    <Icon className={`w-4 h-4 ${account.color}`} />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground">{account.role}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{account.email}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="text-[10px] text-muted-foreground space-y-1 pt-1 border-t border-border">
            <p className="font-semibold">Role Testing Checklist:</p>
            <p>✓ <strong>Admin</strong> → Dashboard, Leads, Quotes, Jobs, Invoices, Settings</p>
            <p>✓ <strong>Worker</strong> → /worker — Field dashboard, Schedule, Timesheet</p>
            <p>✓ <strong>Customer</strong> → /portal — Properties, Visits, Photos, Billing</p>
          </div>
        </div>
      )}
    </div>
  );
}
