import { useParams, Link } from 'react-router-dom';
import {
  useSubcontractorById, useSubcontractorDocuments,
  useSubcontractorInvoices, useSubcontractorPayments,
} from '@/hooks/useSubcontractor';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Building2, ShieldCheck, FileText, Receipt, DollarSign, Briefcase } from 'lucide-react';
import { format } from 'date-fns';

function StatusChip({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    signed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    submitted: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    paid: 'bg-primary/10 text-primary',
    expired: 'bg-destructive/10 text-destructive',
    missing: 'bg-muted text-muted-foreground',
    rejected: 'bg-destructive/10 text-destructive',
    inactive: 'bg-muted text-muted-foreground',
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${colors[status] || 'bg-muted text-muted-foreground'}`}>{status}</span>;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">{value || '—'}</span>
    </div>
  );
}

export default function SubcontractorDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: sub, isLoading } = useSubcontractorById(id);
  const { data: docs = [] } = useSubcontractorDocuments(id);
  const { data: invoices = [] } = useSubcontractorInvoices(id);
  const { data: payments = [] } = useSubcontractorPayments(id);

  const { data: assignments = [] } = useQuery({
    queryKey: ['sub_assignments_admin', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from('subcontractor_assignments')
        .select('*, visits(visit_number, visit_status, service_date, properties(property_name))')
        .eq('subcontractor_id', id)
        .order('assigned_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!id,
  });

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  if (!sub) return <div className="p-8 text-center text-muted-foreground">Subcontractor not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/subcontractors" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-foreground truncate">{sub.company_name}</h1>
          <p className="text-sm text-muted-foreground">{sub.contact_name} · {sub.email}</p>
        </div>
        <StatusChip status={sub.status} />
      </div>

      <Tabs defaultValue="company" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="company" className="gap-1.5"><Building2 className="h-3.5 w-3.5" /> Company</TabsTrigger>
          <TabsTrigger value="compliance" className="gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Compliance</TabsTrigger>
          <TabsTrigger value="assignments" className="gap-1.5"><Briefcase className="h-3.5 w-3.5" /> Assignments</TabsTrigger>
          <TabsTrigger value="documents" className="gap-1.5"><FileText className="h-3.5 w-3.5" /> Docs</TabsTrigger>
          <TabsTrigger value="invoices" className="gap-1.5"><Receipt className="h-3.5 w-3.5" /> Invoices</TabsTrigger>
          <TabsTrigger value="payments" className="gap-1.5"><DollarSign className="h-3.5 w-3.5" /> Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="company">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Company Info</CardTitle></CardHeader>
            <CardContent>
              <InfoRow label="Company Name" value={sub.company_name} />
              <InfoRow label="Operating Name" value={sub.operating_name} />
              <InfoRow label="Contact" value={sub.contact_name} />
              <InfoRow label="Email" value={sub.email} />
              <InfoRow label="Phone" value={sub.phone} />
              <InfoRow label="Address" value={sub.mailing_address} />
              <InfoRow label="Business Number" value={sub.business_number} />
              <InfoRow label="Service Area" value={sub.service_area_summary} />
              <InfoRow label="Onboarding" value={<StatusChip status={sub.onboarding_status} />} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance">
          <Card>
            <CardContent className="p-4">
              {[
                { label: 'Insurance', status: sub.insurance_status, expiry: sub.insurance_expiry },
                { label: 'WCB', status: sub.wcb_status, expiry: sub.wcb_expiry },
                { label: 'Business License', status: sub.business_license_status, expiry: sub.business_license_expiry },
                { label: 'Agreement', status: sub.agreement_signed_status },
                { label: 'Safety Docs', status: sub.safety_doc_status },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm text-foreground">{item.label}</p>
                    {item.expiry && <p className="text-[10px] text-muted-foreground">Expires: {format(new Date(item.expiry), 'MMM d, yyyy')}</p>}
                  </div>
                  <StatusChip status={item.status} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Assignments ({assignments.length})</CardTitle></CardHeader>
            <CardContent className="p-0">
              {assignments.length === 0 ? <p className="p-4 text-sm text-muted-foreground">No assignments.</p> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Visit</TableHead><TableHead>Property</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {assignments.map((a: any) => (
                      <TableRow key={a.id}>
                        <TableCell className="text-sm font-medium">{a.visits?.visit_number || '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{a.visits?.properties?.property_name || '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{a.visits?.service_date ? format(new Date(a.visits.service_date), 'MMM d, yyyy') : '—'}</TableCell>
                        <TableCell><StatusChip status={a.assignment_status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Documents ({docs.length})</CardTitle></CardHeader>
            <CardContent className="p-0">
              {docs.length === 0 ? <p className="p-4 text-sm text-muted-foreground">No documents.</p> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {docs.map((d: any) => (
                      <TableRow key={d.id}>
                        <TableCell className="text-sm font-medium">{d.document_name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground capitalize">{d.document_type}</TableCell>
                        <TableCell><StatusChip status={d.status} /></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{format(new Date(d.created_at), 'MMM d, yyyy')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Invoices ({invoices.length})</CardTitle></CardHeader>
            <CardContent className="p-0">
              {invoices.length === 0 ? <p className="p-4 text-sm text-muted-foreground">No invoices.</p> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Invoice #</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {invoices.map((inv: any) => (
                      <TableRow key={inv.id}>
                        <TableCell className="text-sm font-medium">{inv.invoice_number}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{format(new Date(inv.invoice_date), 'MMM d, yyyy')}</TableCell>
                        <TableCell className="text-sm text-right">${Number(inv.amount).toFixed(2)}</TableCell>
                        <TableCell><StatusChip status={inv.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Payments ({payments.length})</CardTitle></CardHeader>
            <CardContent className="p-0">
              {payments.length === 0 ? <p className="p-4 text-sm text-muted-foreground">No payments.</p> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Date</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Method</TableHead><TableHead>Reference</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {payments.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-sm">{p.payment_date ? format(new Date(p.payment_date), 'MMM d, yyyy') : '—'}</TableCell>
                        <TableCell className="text-sm text-right font-medium">${Number(p.amount).toFixed(2)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p.payment_method || '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground font-mono">{p.reference_number || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Admin notes */}
      {sub.notes_admin_only && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Admin Notes</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">{sub.notes_admin_only}</p></CardContent>
        </Card>
      )}
    </div>
  );
}
