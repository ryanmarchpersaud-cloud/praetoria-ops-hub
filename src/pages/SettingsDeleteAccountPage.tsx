import { SettingsLayout } from '@/components/SettingsLayout';
import { DeleteAccountSection } from '@/components/DeleteAccountSection';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert } from 'lucide-react';

export default function SettingsDeleteAccountPage() {
  return (
    <SettingsLayout>
      <div className="space-y-4 max-w-2xl">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" /> Delete Account
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Submit a request to permanently delete your Praetoria Group account.
            Our team will process it manually and email you when complete.
          </p>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">What happens when you submit a request</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              Clicking the button below does <strong>not</strong> immediately delete anything.
              It creates a deletion request that our team reviews and processes.
            </p>
            <p>
              Your personal profile and login will be removed or anonymized. Business records
              we are legally required to retain (invoices, tax records, signed agreements,
              and job/service history) may be kept in anonymized form to comply with
              Canadian record-keeping laws.
            </p>
          </CardContent>
        </Card>

        <DeleteAccountSection />
      </div>
    </SettingsLayout>
  );
}
