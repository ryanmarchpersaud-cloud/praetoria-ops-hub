import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Receipt, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { format, addDays } from 'date-fns';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedVisits: any[];
}

export function BulkInvoiceDialog({ open, onOpenChange, selectedVisits }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null);

  // Group visits by customer
  const grouped = selectedVisits.reduce((acc: Record<string, any[]>, v) => {
    const custId = v.customer_id || 'unknown';
    if (!acc[custId]) acc[custId] = [];
    acc[custId].push(v);
    return acc;
  }, {});

  // Separate billable from already-invoiced
  const billable = selectedVisits.filter(v =>
    v.visit_status === 'Completed' && v.billing_status !== 'invoiced'
  );
  const alreadyInvoiced = selectedVisits.filter(v =>
    v.billing_status === 'invoiced'
  );
  const notCompleted = selectedVisits.filter(v =>
    v.visit_status !== 'Completed' && v.billing_status !== 'invoiced'
  );

  const handleCreate = async () => {
    if (billable.length === 0) return;
    setSaving(true);
    try {
      let created = 0;

      // Group billable by customer
      const byCustomer: Record<string, any[]> = {};
      billable.forEach(v => {
        const key = v.customer_id || 'unknown';
        if (!byCustomer[key]) byCustomer[key] = [];
        byCustomer[key].push(v);
      });

      const today = format(new Date(), 'yyyy-MM-dd');
      const dueDate = format(addDays(new Date(), 30), 'yyyy-MM-dd');

      for (const [custId, visits] of Object.entries(byCustomer)) {
        if (custId === 'unknown') continue;

        // Create one invoice per customer
        const { data: invoice, error } = await supabase.from('invoices').insert({
          invoice_number: '',
          customer_id: custId,
          property_id: visits[0]?.property_id || null,
          job_id: visits[0]?.job_id || null,
          issue_date: today,
          due_date: dueDate,
          tax_rate: 0.13,
          status: 'Draft' as any,
          billing_mode: 'per_visit',
          internal_notes: `Bulk invoice from ${visits.length} visit(s)`,
        } as any).select().single();

        if (error) throw error;

        // Create line items from visits
        const items = visits.map((v: any, idx: number) => ({
          invoice_id: invoice.id,
          item_name: `Visit ${v.visit_number} — ${v.service_date}`,
          description: v.service_summary || v.crew_notes || null,
          quantity: 1,
          unit_price: 0, // Admin sets price
          sort_order: idx,
        }));
        await supabase.from('invoice_line_items').insert(items as any);

        // Mark visits as invoiced
        for (const v of visits) {
          await supabase.from('visits').update({
            billing_status: 'invoiced',
          } as any).eq('id', v.id);
        }

        created++;
      }

      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['visits'] });
      qc.invalidateQueries({ queryKey: ['dashboard_invoices'] });

      setResult({ created, skipped: alreadyInvoiced.length + notCompleted.length });
    } catch (err: any) {
      toast({ title: 'Bulk creation failed', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Bulk Create Draft Invoices
          </DialogTitle>
          <DialogDescription>
            Create draft invoices from {selectedVisits.length} selected visit(s), grouped by customer.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="text-center py-6 space-y-3">
            <CheckCircle className="h-12 w-12 text-accent mx-auto" />
            <p className="text-lg font-bold">{result.created} invoice draft{result.created !== 1 ? 's' : ''} created</p>
            {result.skipped > 0 && (
              <p className="text-sm text-muted-foreground">{result.skipped} visit(s) skipped (already invoiced or not completed)</p>
            )}
            <Button onClick={handleClose}>Done</Button>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <Card><CardContent className="p-3 text-sm space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Selected Visits</span>
                  <span className="font-medium">{selectedVisits.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Billable (Completed)</span>
                  <Badge variant="outline" className="text-accent">{billable.length}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Customer Groups</span>
                  <span>{Object.keys(grouped).length}</span>
                </div>
                {alreadyInvoiced.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Already Invoiced (skip)</span>
                    <Badge variant="destructive" className="text-[10px]">{alreadyInvoiced.length}</Badge>
                  </div>
                )}
                {notCompleted.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Not Completed (skip)</span>
                    <Badge variant="secondary" className="text-[10px]">{notCompleted.length}</Badge>
                  </div>
                )}
              </CardContent></Card>

              {alreadyInvoiced.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    {alreadyInvoiced.length} visit(s) already invoiced and will be skipped to prevent duplicate billing.
                  </AlertDescription>
                </Alert>
              )}

              {billable.length === 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    No billable visits selected. Only completed, un-invoiced visits can be bulk-invoiced.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleCreate} disabled={saving || billable.length === 0} className="gap-1.5">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />}
                Create {billable.length > 0 ? `${Object.keys(grouped).length} Draft Invoice(s)` : 'No Billable Visits'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
