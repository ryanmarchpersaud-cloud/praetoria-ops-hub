import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DeleteAccountSection } from '@/components/DeleteAccountSection';
import { ShieldAlert, ArrowLeft, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * Universal Account & Privacy page reachable by ALL authenticated users
 * (Admin, Worker, Subcontractor, Customer). Built specifically so Apple
 * App Review can locate the Delete Account flow without hunting.
 *
 * Route: /account-privacy
 */
export default function AccountPrivacyPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-10 space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="-ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>

        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-destructive" />
            Account &amp; Privacy
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your Praetoria Group account, privacy and data.
          </p>
        </div>

        {/* Apple App Review helper line */}
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-3 flex items-start gap-2 text-sm">
            <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <p>
              <strong>Account deletion can be initiated from this page.</strong>{' '}
              Scroll down to the &ldquo;Delete Account&rdquo; section and tap{' '}
              <em>Start Account Deletion</em>.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Signed in as</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{user?.email}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">What happens when you delete your account</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              Tapping <strong>Start Account Deletion</strong> below submits your
              account for permanent deletion. Your account will be scheduled for
              deletion and our team will remove or anonymize your personal
              profile, login credentials, contact info and saved preferences.
            </p>
            <p>
              Business records that Praetoria Group is legally required to keep
              (such as invoices, tax records, signed agreements, and completed
              job/service history) may be retained in anonymized form to comply
              with Canadian record-keeping laws.
            </p>
            <p>
              You will receive an email confirmation once your account has been
              fully removed. This action cannot be undone.
            </p>
          </CardContent>
        </Card>

        {/* The destructive delete flow with confirmation dialog */}
        <DeleteAccountSection />
      </div>
    </div>
  );
}
