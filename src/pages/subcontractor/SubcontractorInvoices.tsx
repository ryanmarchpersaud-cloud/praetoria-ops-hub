import { useSubcontractorProfile, useSubcontractorInvoices } from '@/hooks/useSubcontractor';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Receipt, Plus, FileUp, Loader2, Paperclip } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { z } from 'zod';

const ACCEPTED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const invoiceSchema = z.object({
  amount: z
    .string()
    .min(1, 'Amount is required')
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0, 'Enter a valid amount greater than $0')
    .refine((v) => parseFloat(v) <= 1000000, 'Amount cannot exceed $1,000,000'),
  invoiceDate: z.string().min(1, 'Invoice date is required'),
  file: z
    .instanceof(File, { message: 'Please attach your invoice (PDF or image)' })
    .refine((f) => ACCEPTED_FILE_TYPES.includes(f.type), 'File must be a PDF or image (JPG, PNG, WebP)')
    .refine((f) => f.size <= MAX_FILE_SIZE, 'File must be 10MB or smaller'),
});

type InvoiceErrors = Partial<Record<'amount' | 'invoiceDate' | 'file', string>>;

function StatusChip({ status }: { status: string }) {
  const colors: Record<string, string> = {
    submitted: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    paid: 'bg-primary/10 text-primary',
    rejected: 'bg-destructive/10 text-destructive',
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${colors[status] || 'bg-muted text-muted-foreground'}`}>{status}</span>;
}

export default function SubcontractorInvoices() {
  const { data: profile } = useSubcontractorProfile();
  const { data: invoices = [], isLoading } = useSubcontractorInvoices(profile?.id);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setOpen(true);
      // Clean the URL so back/forward doesn't keep reopening it.
      const next = new URLSearchParams(searchParams);
      next.delete('new');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  const [submitting, setSubmitting] = useState(false);
  const [amount, setAmount] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const totals = {
    pending: invoices.filter((i: any) => i.status === 'submitted' || i.status === 'pending').reduce((s: number, i: any) => s + Number(i.amount), 0),
    approved: invoices.filter((i: any) => i.status === 'approved').reduce((s: number, i: any) => s + Number(i.amount), 0),
    paid: invoices.filter((i: any) => i.status === 'paid').reduce((s: number, i: any) => s + Number(i.amount), 0),
  };

  const resetForm = () => {
    setAmount('');
    setInvoiceDate(format(new Date(), 'yyyy-MM-dd'));
    setPeriodStart('');
    setPeriodEnd('');
    setNotes('');
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (!profile || !amount || !invoiceDate) {
      toast.error('Please enter the invoice amount and date.');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Please enter a valid amount.');
      return;
    }

    setSubmitting(true);
    try {
      // Upload attachment if provided
      let attachmentUrl: string | null = null;
      if (selectedFile) {
        const ext = selectedFile.name.split('.').pop();
        const filePath = `${profile.id}/invoices/${Date.now()}-invoice.${ext}`;
        const { error: storageError } = await supabase.storage
          .from('subcontractor-documents')
          .upload(filePath, selectedFile);
        if (storageError) throw storageError;

        const { data: { publicUrl } } = supabase.storage
          .from('subcontractor-documents')
          .getPublicUrl(filePath);
        attachmentUrl = publicUrl;
      }

      // Generate invoice number: SUB-INV-XXXXX
      const { count } = await supabase
        .from('subcontractor_invoices')
        .select('*', { count: 'exact', head: true })
        .eq('subcontractor_id', profile.id);
      const invoiceNumber = `SUB-INV-${String((count || 0) + 1).padStart(5, '0')}`;

      const { data: insertedInvoice, error: dbError } = await supabase
        .from('subcontractor_invoices')
        .insert({
          subcontractor_id: profile.id,
          invoice_number: invoiceNumber,
          amount: parsedAmount,
          invoice_date: invoiceDate,
          service_period_start: periodStart || null,
          service_period_end: periodEnd || null,
          notes: notes || null,
          attachment_url: attachmentUrl,
          status: 'submitted',
        })
        .select('id')
        .single();

      if (dbError) throw dbError;

      // Log activity for admin visibility
      await supabase.from('activities').insert({
        user_id: user?.id,
        action_name: 'subcontractor_invoice_submitted',
        record_type: 'subcontractor_invoice',
        record_id: insertedInvoice.id,
        status: 'completed',
        payload_summary: {
          invoice_number: invoiceNumber,
          amount: parsedAmount,
          company: profile.company_name,
        },
      });

      toast.success(`Invoice ${invoiceNumber} submitted successfully!`);
      queryClient.invalidateQueries({ queryKey: ['subcontractor_invoices'] });
      resetForm();
      setOpen(false);
    } catch (err: any) {
      console.error('Invoice submit error:', err);
      toast.error(err.message || 'Failed to submit invoice.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">Invoices</h1>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> Submit Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Submit Invoice</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>Invoice Amount (CAD) *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="pl-7"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Invoice Date *</Label>
                <Input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Service Period Start</Label>
                  <Input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Service Period End</Label>
                  <Input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Notes / Description</Label>
                <Textarea
                  placeholder="Describe the work completed, materials used, etc."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Attach Invoice (PDF, Image)</Label>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                  onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                />
                {selectedFile && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Paperclip className="h-3 w-3" /> {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)
                  </p>
                )}
              </div>
              <Button onClick={handleSubmit} disabled={submitting} className="w-full gap-2">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
                {submitting ? 'Submitting...' : 'Submit Invoice'}
              </Button>
              <p className="text-[10px] text-muted-foreground text-center">
                Invoices are reviewed by admin. Payment terms are Net 30.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Card><CardContent className="p-3 text-center">
          <p className="text-lg font-bold text-foreground">${totals.pending.toFixed(0)}</p>
          <p className="text-[9px] text-muted-foreground uppercase">Pending</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-lg font-bold text-foreground">${totals.approved.toFixed(0)}</p>
          <p className="text-[9px] text-muted-foreground uppercase">Approved</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-lg font-bold text-foreground">${totals.paid.toFixed(0)}</p>
          <p className="text-[9px] text-muted-foreground uppercase">Paid</p>
        </CardContent></Card>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-muted-foreground text-sm">Loading...</div>
      ) : invoices.length === 0 ? (
        <Card><CardContent className="py-8 text-center">
          <Receipt className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">No invoices submitted yet</p>
          <p className="text-xs text-muted-foreground mt-1">Tap "Submit Invoice" to send your first invoice</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {invoices.map((inv: any) => (
            <Link key={inv.id} to={`/subcontractor/invoices/${inv.id}`} className="block">
              <Card className="hover:bg-muted/30 transition-colors">
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{inv.invoice_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(inv.invoice_date), 'MMM d, yyyy')} · ${Number(inv.amount).toFixed(2)}
                    </p>
                    {inv.service_period_start && inv.service_period_end && (
                      <p className="text-[10px] text-muted-foreground/70">
                        Period: {format(new Date(inv.service_period_start), 'MMM d')} – {format(new Date(inv.service_period_end), 'MMM d')}
                      </p>
                    )}
                  </div>
                  <StatusChip status={inv.status} />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
