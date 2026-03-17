import { useSubcontractorProfile } from '@/hooks/useSubcontractor';
import { useSubcontractorTaxDocuments } from '@/hooks/useWorkerTaxDocs';
import { useSubcontractorPayments } from '@/hooks/useSubcontractor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, DollarSign, Download } from 'lucide-react';
import { format } from 'date-fns';

export default function SubcontractorTaxDocsPage() {
  const { data: profile } = useSubcontractorProfile();
  const { data: taxDocs = [], isLoading: loadingTax } = useSubcontractorTaxDocuments(profile?.id);
  const { data: payments = [], isLoading: loadingPay } = useSubcontractorPayments(profile?.id);
  const isLoading = loadingTax || loadingPay;

  if (isLoading) {
    return (
      <div className="px-4 pt-3 pb-4 space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-36 w-full rounded-xl" />
      </div>
    );
  }

  // Calculate total paid
  const totalPaid = payments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);

  return (
    <div className="px-4 pt-3 pb-4 space-y-4 animate-fade-in">
      <h1 className="text-lg font-bold">Tax & Payment Documents</h1>

      {/* Payout Summary */}
      <Card>
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Payout Summary</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Total Payments</p>
              <p className="text-lg font-bold text-foreground">${totalPaid.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Payments Count</p>
              <p className="text-lg font-bold text-foreground">{payments.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tax Slips */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" /> Tax Slips
          </CardTitle>
        </CardHeader>
        <CardContent>
          {taxDocs.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-xs text-muted-foreground">No tax documents available yet.</p>
              <p className="text-[10px] text-muted-foreground mt-1">T4A or T5018 slips will appear here when issued.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {taxDocs.map((d: any) => (
                <div key={d.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{d.document_name}</p>
                      <p className="text-xs text-muted-foreground">{d.document_type} · {d.tax_year}</p>
                    </div>
                  </div>
                  {d.file_url && <Download className="h-4 w-4 text-muted-foreground" />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Payments */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4" /> Recent Payments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No payment history available.</p>
          ) : (
            <div className="space-y-2">
              {payments.slice(0, 10).map((p: any) => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">${Number(p.amount).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.payment_date ? format(new Date(p.payment_date), 'MMM d, yyyy') : 'Pending'}
                      {p.payment_method && ` · ${p.payment_method}`}
                    </p>
                  </div>
                  {p.reference_number && (
                    <Badge variant="outline" className="text-[10px]">Ref: {p.reference_number}</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
