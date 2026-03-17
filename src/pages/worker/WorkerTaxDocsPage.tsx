import { useWorkerTaxDocuments } from '@/hooks/useWorkerTaxDocs';
import { useWorkerPayStubs } from '@/hooks/useWorkerProfile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, DollarSign, Download } from 'lucide-react';
import { format } from 'date-fns';

export default function WorkerTaxDocsPage() {
  const { data: taxDocs = [], isLoading: loadingTax } = useWorkerTaxDocuments();
  const { data: payStubs = [], isLoading: loadingPay } = useWorkerPayStubs();
  const isLoading = loadingTax || loadingPay;

  // YTD summary from latest pay stub
  const latestStub = payStubs[0];

  if (isLoading) {
    return (
      <div className="px-4 pt-3 pb-4 space-y-4">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-36 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-3 pb-4 space-y-4 animate-fade-in">
      <h1 className="text-lg font-bold">Tax Documents</h1>

      {/* YTD Summary */}
      {latestStub && (
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Year-to-Date Summary</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Gross Earnings</p>
                <p className="text-lg font-bold text-foreground">${Number(latestStub.ytd_gross).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Net Earnings</p>
                <p className="text-lg font-bold text-foreground">${Number(latestStub.ytd_net).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tax Documents */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" /> Tax Slips
          </CardTitle>
        </CardHeader>
        <CardContent>
          {taxDocs.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No tax documents available yet.</p>
          ) : (
            <div className="space-y-2">
              {taxDocs.map((d: any) => (
                <div key={d.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{d.document_name}</p>
                      <p className="text-xs text-muted-foreground">{d.document_type} · {d.tax_year}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{d.document_type}</Badge>
                    {d.file_url && <Download className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Pay Statements */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4" /> Recent Pay Statements
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payStubs.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No pay statements available.</p>
          ) : (
            <div className="space-y-2">
              {payStubs.slice(0, 5).map((s: any) => (
                <div key={s.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">
                      {format(new Date(s.pay_period_start), 'MMM d')} – {format(new Date(s.pay_period_end), 'MMM d, yyyy')}
                    </p>
                    <p className="text-xs text-muted-foreground">Paid: {format(new Date(s.pay_date), 'MMM d, yyyy')}</p>
                  </div>
                  <p className="text-sm font-bold">${Number(s.net_pay).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
