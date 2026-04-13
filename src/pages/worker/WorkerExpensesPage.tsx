import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Receipt, Plus, FileUp, Loader2, Paperclip, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

const CATEGORIES = [
  'Fuel / Gas / Diesel',
  'Materials & Supplies',
  'Equipment Repair',
  'Vehicle Maintenance',
  'Tools',
  'Safety Gear',
  'Food / Meals (on-site)',
  'Parking / Tolls',
  'Other',
];

function assertMutation(error: { message: string } | null | undefined) {
  if (error) throw error;
}

function StatusChip({ status }: { status: string }) {
  const colors: Record<string, string> = {
    submitted: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    reimbursed: 'bg-primary/10 text-primary',
    rejected: 'bg-destructive/10 text-destructive',
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${colors[status] || 'bg-muted text-muted-foreground'}`}>{status}</span>;
}

export default function WorkerExpensesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { data: claims = [], isLoading } = useQuery({
    queryKey: ['worker_expense_claims', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('worker_expense_claims')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const totals = {
    submitted: claims.filter((c: any) => c.status === 'submitted').reduce((s: number, c: any) => s + Number(c.amount), 0),
    approved: claims.filter((c: any) => c.status === 'approved').reduce((s: number, c: any) => s + Number(c.amount), 0),
    reimbursed: claims.filter((c: any) => c.status === 'reimbursed').reduce((s: number, c: any) => s + Number(c.amount), 0),
  };

  const resetForm = () => {
    setAmount('');
    setExpenseDate(format(new Date(), 'yyyy-MM-dd'));
    setCategory('');
    setDescription('');
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (!user || !amount || !category || !expenseDate) {
      toast.error('Please fill in amount, category, and date.');
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Please enter a valid amount.');
      return;
    }

    setSubmitting(true);
    try {
      let receiptUrl: string | null = null;
      let receiptFileName: string | null = null;

      if (selectedFile) {
        const ext = selectedFile.name.split('.').pop();
        const filePath = `${user.id}/${Date.now()}-receipt.${ext}`;
        const { error: storageError } = await supabase.storage
          .from('worker-receipts')
          .upload(filePath, selectedFile);
        if (storageError) throw storageError;

        const { data: { publicUrl } } = supabase.storage
          .from('worker-receipts')
          .getPublicUrl(filePath);
        receiptUrl = publicUrl;
        receiptFileName = selectedFile.name;
      }

      const { data: claim, error: dbError } = await supabase
        .from('worker_expense_claims')
        .insert({
          user_id: user.id,
          amount: parsedAmount,
          expense_date: expenseDate,
          category,
          description: description || null,
          receipt_url: receiptUrl,
          receipt_file_name: receiptFileName,
          status: 'submitted',
        })
        .select('id')
        .single();

      assertMutation(dbError);

      // Log activity
      const { error: activityError } = await supabase.from('activities').insert({
        user_id: user.id,
        action_name: 'expense_claim_submitted',
        record_type: 'expense_claim',
        record_id: (claim as any).id,
        status: 'completed',
        payload_summary: {
          amount: parsedAmount,
          category,
          has_receipt: !!receiptUrl,
        },
      });
      assertMutation(activityError);

      const { error: notificationError } = await supabase.from('notifications').insert({
        event: 'expense_submitted',
        channel: 'in_app',
        audience: 'admin',
        record_type: 'expense_claim',
        record_id: (claim as any).id,
        subject: `New Expense Claim: $${parsedAmount.toFixed(2)}`,
        body: `A worker submitted a ${category} reimbursement claim${user.email ? ` from ${user.email}` : ''}. Review in Expense Tracking.`,
        status: 'sent',
        sent_at: new Date().toISOString(),
      });
      assertMutation(notificationError);

      toast.success('Expense claim submitted! Admin will review it.');
      queryClient.invalidateQueries({ queryKey: ['worker_expense_claims'] });
      queryClient.invalidateQueries({ queryKey: ['admin_worker_expense_claims'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications_unread'] });
      queryClient.invalidateQueries({ queryKey: ['notifications_all_recent'] });
      resetForm();
      setOpen(false);
    } catch (err: any) {
      console.error('Expense submit error:', err);
      toast.error(err.message || 'Failed to submit expense claim.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/worker/more" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold text-foreground flex-1">Expense Claims</h1>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> Submit Claim
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Submit Expense for Reimbursement</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>Amount (CAD) *</Label>
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
                <Label>Date of Purchase *</Label>
                <Input type="date" value={expenseDate} onChange={e => setExpenseDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Category *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue placeholder="What was it for?" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea
                  placeholder="e.g. Filled up the F-150, 85L diesel at Shell on Hwy 2"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Attach Receipt (Photo or PDF)</Label>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.heic"
                  capture="environment"
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
                {submitting ? 'Submitting...' : 'Submit for Reimbursement'}
              </Button>
              <p className="text-[10px] text-muted-foreground text-center">
                Claims are reviewed by admin. Attach a receipt photo for faster approval.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2">
        <Card><CardContent className="p-3 text-center">
          <p className="text-lg font-bold text-foreground">${totals.submitted.toFixed(0)}</p>
          <p className="text-[9px] text-muted-foreground uppercase">Pending</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-lg font-bold text-foreground">${totals.approved.toFixed(0)}</p>
          <p className="text-[9px] text-muted-foreground uppercase">Approved</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-lg font-bold text-foreground">${totals.reimbursed.toFixed(0)}</p>
          <p className="text-[9px] text-muted-foreground uppercase">Reimbursed</p>
        </CardContent></Card>
      </div>

      {/* Claims list */}
      {isLoading ? (
        <div className="py-8 text-center text-muted-foreground text-sm">Loading...</div>
      ) : claims.length === 0 ? (
        <Card><CardContent className="py-8 text-center">
          <Receipt className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">No expense claims yet</p>
          <p className="text-xs text-muted-foreground mt-1">Tap "Submit Claim" to request reimbursement</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {claims.map((claim: any) => (
            <Card key={claim.id}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">${Number(claim.amount).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">{claim.category}</p>
                    <p className="text-[10px] text-muted-foreground">{format(new Date(claim.expense_date), 'MMM d, yyyy')}</p>
                    {claim.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{claim.description}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <StatusChip status={claim.status} />
                    {claim.receipt_url && (
                      <a href={claim.receipt_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
                        <Paperclip className="h-3 w-3" /> Receipt
                      </a>
                    )}
                  </div>
                </div>
                {claim.admin_notes && (
                  <div className="mt-2 bg-muted/50 rounded p-2">
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Admin Note</p>
                    <p className="text-xs text-foreground">{claim.admin_notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
