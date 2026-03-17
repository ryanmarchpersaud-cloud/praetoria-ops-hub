import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Shield, HardHat, User, Loader2, FlaskConical, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';

const TEST_ACCOUNTS = [
  { email: 'admin@praetoriagroup.ca', password: 'TestAdmin123!', role: 'Admin', icon: Shield, color: 'text-amber-500', dest: 'Internal Ops dashboard → /' },
  { email: 'worker@praetoriagroup.ca', password: 'TestWorker123!', role: 'Worker', icon: HardHat, color: 'text-blue-500', dest: 'Field Mode → /worker' },
  { email: 'customer@praetoriagroup.ca', password: 'TestCustomer123!', role: 'Customer', icon: User, color: 'text-emerald-500', dest: 'Customer Portal → /portal' },
];

export function DevTestPanel() {
  const [expanded, setExpanded] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [signingIn, setSigningIn] = useState<string | null>(null);
  const { toast } = useToast();

  const seedAccounts = async () => {
    setSeeding(true);
    try {
      const { data, error } = await supabase.functions.invoke('seed-test-accounts');
      if (error) throw error;
      toast({ title: 'Test accounts ready', description: `${data.results?.length || 3} accounts seeded. You can now quick-login below.` });
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
          toast({ title: 'Account not found', description: 'Click "Seed Test Accounts" first to create the test users.', variant: 'destructive' });
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
          🧪 Role Testing — Quick Login
        </span>
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Step 1 */}
          <div className="space-y-1.5">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Step 1 — Create test accounts (one-time)</p>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs h-8 border-amber-500/30 text-amber-600 dark:text-amber-400"
              onClick={seedAccounts}
              disabled={seeding}
            >
              {seeding ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <FlaskConical className="w-3 h-3 mr-1.5" />}
              {seeding ? 'Seeding…' : 'Seed Test Accounts'}
            </Button>
          </div>

          {/* Step 2 */}
          <div className="space-y-1.5">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Step 2 — Quick Login As:</p>
            {TEST_ACCOUNTS.map((account) => {
              const Icon = account.icon;
              const isLoading = signingIn === account.role;
              return (
                <button
                  key={account.role}
                  onClick={() => quickLogin(account.email, account.password, account.role)}
                  disabled={!!signingIn}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md border border-border bg-card hover:bg-muted transition-colors text-left disabled:opacity-50"
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
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground/70">
                    <span className="hidden sm:inline">{account.dest}</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Routing guide */}
          <div className="text-[10px] text-muted-foreground space-y-1.5 pt-2 border-t border-border">
            <p className="font-semibold text-foreground">Where each role goes:</p>
            <div className="space-y-1">
              <p>🛡️ <strong>Admin</strong> → Internal Ops dashboard at <code className="bg-muted px-1 rounded">/</code></p>
              <p className="pl-4 text-muted-foreground/70">Dashboard, Leads, Quotes, Customers, Jobs, Invoices, Schedule, Settings</p>
            </div>
            <div className="space-y-1">
              <p>🔧 <strong>Worker</strong> → Field Mode at <code className="bg-muted px-1 rounded">/worker</code></p>
              <p className="pl-4 text-muted-foreground/70">Field Dashboard, Schedule, Timesheet, Visit Execution, Quick Actions</p>
            </div>
            <div className="space-y-1">
              <p>👤 <strong>Customer</strong> → Customer Portal at <code className="bg-muted px-1 rounded">/portal</code></p>
              <p className="pl-4 text-muted-foreground/70">My Properties, Visits, Photos, Quotes, Billing, Requests, Account</p>
            </div>
            <div className="mt-2 pt-1.5 border-t border-border/50">
              <p className="font-semibold text-foreground">Admin quick-switch (after login):</p>
              <p>• Sidebar → <strong>Field Mode</strong> to enter Worker view</p>
              <p>• Sidebar → <strong>Portal Preview</strong> to enter Customer view</p>
              <p>• Worker → More → <strong>Admin Dashboard</strong> to go back</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
