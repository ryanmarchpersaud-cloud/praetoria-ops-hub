import { useSubcontractorProfile, useSubcontractorDocuments } from '@/hooks/useSubcontractor';
import { Card, CardContent } from '@/components/ui/card';
import { FileText } from 'lucide-react';
import { format } from 'date-fns';

function StatusChip({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    expired: 'bg-destructive/10 text-destructive',
    missing: 'bg-muted text-muted-foreground',
    rejected: 'bg-destructive/10 text-destructive',
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${colors[status] || 'bg-muted text-muted-foreground'}`}>{status}</span>;
}

export default function SubcontractorDocuments() {
  const { data: profile } = useSubcontractorProfile();
  const { data: docs = [], isLoading } = useSubcontractorDocuments(profile?.id);

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <h1 className="text-lg font-bold text-foreground">Documents & Compliance</h1>

      {/* Compliance overview from profile */}
      {profile && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Compliance Status</p>
            {[
              { label: 'Insurance', status: profile.insurance_status, expiry: profile.insurance_expiry },
              { label: 'WCB', status: profile.wcb_status, expiry: profile.wcb_expiry },
              { label: 'Business License', status: profile.business_license_status, expiry: profile.business_license_expiry },
              { label: 'Agreement', status: profile.agreement_signed_status },
              { label: 'Safety Docs', status: profile.safety_doc_status },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                <div>
                  <p className="text-sm text-foreground">{item.label}</p>
                  {item.expiry && <p className="text-[10px] text-muted-foreground">Expires: {format(new Date(item.expiry), 'MMM d, yyyy')}</p>}
                </div>
                <StatusChip status={item.status} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Uploaded documents */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-2">Uploaded Documents</h2>
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground text-sm">Loading...</div>
        ) : docs.length === 0 ? (
          <Card><CardContent className="py-8 text-center">
            <FileText className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No documents uploaded yet</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-2">
            {docs.map((d: any) => (
              <Card key={d.id}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{d.document_name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{d.document_type} · {format(new Date(d.created_at), 'MMM d, yyyy')}</p>
                  </div>
                  <StatusChip status={d.status} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
