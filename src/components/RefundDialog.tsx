import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import { callEdgeFunction } from '@/lib/edgeFunctionClient';
import { useQueryClient } from '@tanstack/react-query';
import { logAuditEvent } from '@/lib/auditLog';

interface RefundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: {
    id: string;
    invoice_number: string;
    total: number;
    amount_paid: number;
    balance_due: number;
    customer_id: string;
  };
}

export function RefundDialog({ open, onOpenChange, invoice }: RefundDialogProps) {
  const qc = useQueryClient();
  const [refundType, setRefundType] = useState<string>('partial');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const amountPaid = Number(invoice.amount_paid || 0);

  const handleOpen = (v: boolean) => {
    if (v) {
      setRefundType('partial');
      setAmount('');
      setReason('');
      setNotes('');
    }
    onOpenChange(v);
  };

  const handleRefundTypeChange = (type: string) => {
    setRefundType(type);
    if (type === 'full') {
      setAmount(amountPaid.toFixed(2));
    } else if (type === 'duplicate') {
      setAmount((amountPaid / 2).toFixed(2));
    } else {
      setAmount('');
    }
  };

  const handleSubmit = async () => {
    const refundAmount = parseFloat(amount);
    if (isNaN(refundAmount) || refundAmount <= 0) {
      toast.error('Enter a valid refund amount');
      return;
    }
    if (refundAmount > amountPaid) {
      toast.error(`Refund cannot exceed amount paid ($${amountPaid.toFixed(2)})`);
      return;
    }

    setProcessing(true);
    try {
      const { data, error } = await callEdgeFunction('process-refund', {
        invoice_id: invoice.id,
        refund_type: refundType,
        amount: refundAmount,
        reason,
        internal_notes: notes,
      });

      if (error) throw new Error(typeof error === 'string' ? error : (error as any)?.message || 'Refund failed');

      logAuditEvent({
        action: 'payment.refund',
        targetType: 'invoice',
        targetId: invoice.id,
        customerId: invoice.customer_id,
        success: true,
        metadata: {
          invoice_number: invoice.invoice_number,
          refund_type: refundType,
          amount: refundAmount,
          reason,
        },
      });

      toast.success(`$${refundAmount.toFixed(2)} refund processed successfully`);
      qc.invalidateQueries({ queryKey: ['invoice', invoice.id] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['finance_refunds'] });
      handleOpen(false);
    } catch (err: any) {
      logAuditEvent({
        action: 'payment.refund',
        targetType: 'invoice',
        targetId: invoice.id,
        customerId: invoice.customer_id,
        success: false,
        metadata: {
          invoice_number: invoice.invoice_number,
          refund_type: refundType,
          amount: refundAmount,
          error: err?.message ?? String(err),
        },
      });
      toast.error(err.message || 'Failed to process refund');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Undo2 className="h-4 w-4" /> Issue Refund
          </DialogTitle>
          <DialogDescription>
            Refund against {invoice.invoice_number}. Amount paid: ${amountPaid.toFixed(2)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Refund Type</Label>
            <Select value={refundType} onValueChange={handleRefundTypeChange}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Full Refund</SelectItem>
                <SelectItem value="partial">Partial Refund</SelectItem>
                <SelectItem value="duplicate">Duplicate Payment</SelectItem>
                <SelectItem value="credit_note">Credit Note</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Amount</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              max={amountPaid}
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              className="h-9"
            />
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" className="text-[10px] h-6" onClick={() => setAmount(amountPaid.toFixed(2))}>
                Full (${amountPaid.toFixed(2)})
              </Button>
              {amountPaid > invoice.total && (
                <Button type="button" variant="outline" size="sm" className="text-[10px] h-6" onClick={() => setAmount((amountPaid - invoice.total).toFixed(2))}>
                  Overpayment (${(amountPaid - invoice.total).toFixed(2)})
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select reason..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Customer request">Customer request</SelectItem>
                <SelectItem value="Duplicate payment">Duplicate payment</SelectItem>
                <SelectItem value="Service not provided">Service not provided</SelectItem>
                <SelectItem value="Billing error">Billing error</SelectItem>
                <SelectItem value="Goodwill credit">Goodwill credit</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Internal Notes (optional)</Label>
            <Textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Admin-only notes about this refund..."
              className="text-xs"
            />
          </div>

          {parseFloat(amount) > 0 && (
            <div className="rounded-lg border p-3 bg-muted/30 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current Amount Paid</span>
                <span className="font-medium">${amountPaid.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-destructive">
                <span>Refund</span>
                <span className="font-medium">-${parseFloat(amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-1">
                <span>New Amount Paid</span>
                <span>${Math.max(0, amountPaid - parseFloat(amount)).toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={processing || !amount || parseFloat(amount) <= 0}
            variant="destructive"
            className="gap-1.5"
          >
            {processing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Undo2 className="h-3.5 w-3.5" />}
            Process Refund
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
