import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { StatusBadge } from '@/components/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { Receipt, Loader2 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { format, addDays } from 'date-fns';

const GST_RATE = 0.05;
const PST_RATE = 0.06;
const COMBINED_TAX_RATE = GST_RATE + PST_RATE; // SK GST + PST
const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName: string;
}

export function SelectJobsToInvoiceDialog({ open, onOpenChange, customerId, customerName }: Props) {
  const { toast } = useToast();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['uninvoiced_jobs', customerId],
    queryFn: async () => {
      const { data, error } = await supabase.from('jobs')
        .select('id, job_number, job_title, status, billing_status, estimated_total, properties(id, property_name, city), job_line_items(line_total)')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((j: any) => ({
        ...j,
        address: j.properties?.property_name ? `${j.properties.property_name}${j.properties.city ? ', ' + j.properties.city : ''}` : '—',
        uninvoiced: (j.job_line_items || []).reduce((sum: number, item: any) => sum + Number(item.line_total || 0), 0) || Number(j.estimated_total || 0),
        subtotal: (j.job_line_items || []).reduce((sum: number, item: any) => sum + Number(item.line_total || 0), 0) || Number(j.estimated_total || 0),
        requiresInvoicing: (j.status === 'Completed' || j.status === 'Closed') && j.billing_status !== 'invoiced',
      }));
    },
    enabled: open && !!customerId,
  });

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectedJobs = jobs.filter((j: any) => selected.has(j.id));
  const totalSubtotal = selectedJobs.reduce((s: number, j: any) => s + j.subtotal, 0);

  const handleContinue = async () => {
    if (selectedJobs.length === 0) return;
    setSaving(true);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const dueDate = format(addDays(new Date(), 30), 'yyyy-MM-dd');

      const { data: invoice, error } = await supabase.from('invoices').insert({
        invoice_number: '',
        customer_id: customerId,
        property_id: selectedJobs[0]?.properties?.id || null,
        issue_date: today,
        due_date: dueDate,
        tax_rate: COMBINED_TAX_RATE,
        gst_rate: GST_RATE,
        pst_rate: PST_RATE,
        status: 'Draft' as any,
        billing_mode: 'quoted_fixed' as any,
        internal_notes: `Combined invoice from ${selectedJobs.length} job(s)`,
      } as any).select().single();
      if (error) throw error;

      // Create line items from selected jobs
      const lineItems = selectedJobs.map((j: any, idx: number) => ({
        invoice_id: invoice.id,
        item_name: `${j.job_number} ${j.job_title}`,
        description: j.address,
        quantity: 1,
        unit_price: money(j.subtotal / (1 + GST_RATE)),
        sort_order: idx,
      }));
      if (lineItems.length > 0) {
        await supabase.from('invoice_line_items').insert(lineItems as any);
      }

      // Mark completed/closed jobs as fully invoiced; leave ongoing monthly jobs available for future billing cycles.
      for (const j of selectedJobs) {
        if (j.status === 'Completed' || j.status === 'Closed') {
          await supabase.from('jobs').update({ billing_status: 'invoiced' } as any).eq('id', j.id);
        }
      }

      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['jobs'] });
      qc.invalidateQueries({ queryKey: ['cwo_jobs', customerId] });
      qc.invalidateQueries({ queryKey: ['cbl_invoices', customerId] });

      toast({ title: 'Draft invoice created', description: invoice.invoice_number });
      onOpenChange(false);
      nav(`/invoices/${invoice.id}`);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base">Select jobs to invoice for {customerName}</DialogTitle>
          <DialogDescription>
            Choose one or more jobs to combine into a single draft invoice.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto border rounded-md">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-card z-10">
              <tr className="border-b bg-muted/30">
                <th className="w-8 px-3 py-2" />
                <th className="text-left font-medium px-3 py-2">Status</th>
                <th className="text-left font-medium px-3 py-2">Title</th>
                <th className="text-left font-medium px-3 py-2">Address</th>
                <th className="text-right font-medium px-3 py-2">Uninvoiced</th>
                <th className="text-right font-medium px-3 py-2">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b"><td colSpan={6} className="p-3"><Skeleton className="h-8 w-full" /></td></tr>
                ))
              ) : jobs.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No jobs for this customer</td></tr>
              ) : jobs.map((j: any) => (
                <tr key={j.id}
                  className={`border-b last:border-0 cursor-pointer transition-colors ${selected.has(j.id) ? 'bg-primary/5' : 'hover:bg-muted/30'}`}
                  onClick={() => toggle(j.id)}
                >
                  <td className="px-3 py-2.5">
                    <Checkbox checked={selected.has(j.id)} onCheckedChange={() => toggle(j.id)} />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      {j.requiresInvoicing ? (
                        <Badge variant="outline" className="text-[9px] border-warning text-warning bg-warning/5">
                          Requires Invoicing
                        </Badge>
                      ) : (
                        <StatusBadge status={j.status} showIcon={false} />
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <p className="font-medium">{j.job_number} {j.job_title}</p>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground max-w-[200px] truncate">{j.address}</td>
                  <td className="px-3 py-2.5 text-right font-mono">${j.uninvoiced.toFixed(2)}</td>
                  <td className="px-3 py-2.5 text-right font-mono font-medium">${j.subtotal.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {selected.size} selected · Total: <span className="font-mono font-medium">${totalSubtotal.toFixed(2)}</span>
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleContinue} disabled={saving || selected.size === 0} className="gap-1.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />}
              Continue
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
