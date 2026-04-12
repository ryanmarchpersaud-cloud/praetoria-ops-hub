import { useState } from 'react';
import { useWorkerPayStubs, useWorkerProfile } from '@/hooks/useWorkerProfile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, Calendar, TrendingUp, Info, Eye } from 'lucide-react';
import { format } from 'date-fns';
import PayStubDetailDialog from '@/components/PayStubDetailDialog';

export default function WorkerPayrollPage() {
  const { data: stubs = [], isLoading } = useWorkerPayStubs();
  const { data: profile } = useWorkerProfile();
  const [selectedStub, setSelectedStub] = useState<any>(null);

  if (isLoading) {
    return (
      <div className="px-4 pt-3 pb-4 space-y-4">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-36 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  const latest = stubs[0];

  return (
    <div className="px-4 pt-3 pb-4 space-y-4 animate-fade-in">
      <h1 className="text-lg font-bold">Payroll</h1>

      {/* Pay type info */}
      {profile && (
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground capitalize">{profile.pay_type || 'Hourly'} Pay</p>
              <p className="text-xs text-muted-foreground">
                Rate: ${profile.hourly_rate?.toFixed(2) ?? '—'}/hr
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Latest Pay */}
      {latest ? (
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedStub(latest)}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Latest Pay
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Period</span>
              <span className="font-medium">
                {format(new Date(latest.pay_period_start), 'MMM d')} – {format(new Date(latest.pay_period_end), 'MMM d, yyyy')}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Pay Date</span>
              <span className="font-medium">{format(new Date(latest.pay_date), 'MMM d, yyyy')}</span>
            </div>
            <div className="border-t pt-3 space-y-2">
              <PayRow label="Gross Pay" value={latest.gross_pay} />
              <PayRow label="Deductions" value={latest.deductions} negative />
              <div className="flex items-center justify-between text-sm font-semibold border-t pt-2">
                <span>Net Pay</span>
                <span className="text-emerald-600">${Number(latest.net_pay).toFixed(2)}</span>
              </div>
            </div>
            <Button size="sm" variant="outline" className="w-full mt-2">
              <Eye className="h-4 w-4 mr-1" /> View Pay Stub
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <DollarSign className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm font-medium">No pay stubs yet</p>
            <p className="text-xs mt-1">Pay stubs will appear here once processed.</p>
          </CardContent>
        </Card>
      )}

      {/* YTD Summary */}
      {latest && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Year-to-Date
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">YTD Gross</span>
              <span className="font-medium">${Number(latest.ytd_gross).toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">YTD Net</span>
              <span className="font-medium text-emerald-600">${Number(latest.ytd_net).toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pay History */}
      {stubs.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Pay History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stubs.slice(1).map(s => (
                <div key={s.id} className="flex items-center justify-between py-2 border-b last:border-0 cursor-pointer hover:bg-muted/50 rounded px-1" onClick={() => setSelectedStub(s)}>
                  <div>
                    <p className="text-sm font-medium">
                      {format(new Date(s.pay_period_start), 'MMM d')} – {format(new Date(s.pay_period_end), 'MMM d')}
                    </p>
                    <p className="text-xs text-muted-foreground">Paid {format(new Date(s.pay_date), 'MMM d, yyyy')}</p>
                  </div>
                  <span className="text-sm font-semibold text-emerald-600">${Number(s.net_pay).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Support card */}
      <Card className="border-dashed">
        <CardContent className="p-4 flex items-start gap-3">
          <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Payroll questions?</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Contact the admin office for pay discrepancies, tax forms, or direct deposit changes.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Pay Stub Detail Dialog */}
      <PayStubDetailDialog
        stub={selectedStub}
        open={!!selectedStub}
        onOpenChange={(o) => { if (!o) setSelectedStub(null); }}
        employeeName={profile?.full_name}
        employeeRole={profile?.role_title}
      />
    </div>
  );
}

function PayRow({ label, value, negative }: { label: string; value: number; negative?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={negative ? 'text-destructive' : ''}>
        {negative ? '–' : ''}${Number(value).toFixed(2)}
      </span>
    </div>
  );
}
