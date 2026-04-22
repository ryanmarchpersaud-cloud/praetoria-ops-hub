import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useFinanceReceipts, useCreateFinanceReceipt, useUpdateFinanceReceipt, useFinanceVendors, useFinanceCategories, useCreateFinanceExpense, useFinanceExpenses } from '@/hooks/useFinance';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Search, Camera, FileImage, CheckCircle, Clock, XCircle, Eye, Link2, Plus, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const fmt = (n: number) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(n);

const statusIcon = (s: string) => {
  if (s === 'matched') return <CheckCircle className="h-3.5 w-3.5 text-accent" />;
  if (s === 'reviewed') return <Eye className="h-3.5 w-3.5 text-primary" />;
  if (s === 'rejected') return <XCircle className="h-3.5 w-3.5 text-destructive" />;
  return <Clock className="h-3.5 w-3.5 text-warning" />;
};

const statusColor: Record<string, string> = {
  unreviewed: 'border-warning text-warning',
  reviewed: 'border-primary text-primary',
  matched: 'border-accent text-accent',
  rejected: 'border-destructive text-destructive',
};

export default function FinanceReceipts() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [reviewReceipt, setReviewReceipt] = useState<any>(null);
  const [reviewForm, setReviewForm] = useState<any>({});
  const [showCreateExpense, setShowCreateExpense] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: receipts, isLoading } = useFinanceReceipts({ status: statusFilter });
  const { data: vendors } = useFinanceVendors();
  const { data: categories } = useFinanceCategories();
  const { data: expenses } = useFinanceExpenses();
  const createReceipt = useCreateFinanceReceipt();
  const updateReceipt = useUpdateFinanceReceipt();
  const createExpense = useCreateFinanceExpense();

  const handleUpload = async (files: FileList | null) => {
    if (!files) return;
    // Duplicate detection
    const existingNames = new Set((receipts ?? []).map((r: any) => r.file_name?.toLowerCase()));
    for (const file of Array.from(files)) {
      if (existingNames.has(file.name.toLowerCase())) {
        const proceed = confirm(`"${file.name}" may be a duplicate. Upload anyway?`);
        if (!proceed) continue;
      }
      // Staff-only bucket; prefix with org/staff path for future multi-tenant readiness
      const path = `org/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from('finance-receipts').upload(path, file);
      if (upErr) { toast.error(`Upload failed: ${upErr.message}`); continue; }
      const { data: urlData } = supabase.storage.from('finance-receipts').getPublicUrl(path);
      createReceipt.mutate({ file_url: urlData.publicUrl, file_name: file.name, file_type: file.type });
    }
  };

  const filtered = (receipts ?? []).filter((r: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return r.file_name?.toLowerCase().includes(s) || r.vendor_name_raw?.toLowerCase().includes(s);
  });

  const openReview = (r: any) => {
    setReviewReceipt(r);
    setReviewForm({
      vendor_name_raw: r.vendor_name_raw || '',
      total_raw: r.total_raw || '',
      tax_raw: r.tax_raw || '',
      receipt_date: r.receipt_date || '',
      notes: r.notes || '',
      review_status: r.review_status || 'unreviewed',
    });
  };

  const handleSaveReview = () => {
    if (!reviewReceipt) return;
    updateReceipt.mutate({
      id: reviewReceipt.id,
      ...reviewForm,
      total_raw: reviewForm.total_raw ? Number(reviewForm.total_raw) : null,
      tax_raw: reviewForm.tax_raw ? Number(reviewForm.tax_raw) : null,
    }, {
      onSuccess: () => setReviewReceipt(null),
    });
  };

  const handleCreateExpenseFromReceipt = () => {
    if (!reviewReceipt) return;
    const subtotal = Number(reviewForm.total_raw || 0) - Number(reviewForm.tax_raw || 0);
    const tax = Number(reviewForm.tax_raw || 0);
    createExpense.mutate({
      expense_date: reviewForm.receipt_date || new Date().toISOString().split('T')[0],
      amount_subtotal: subtotal,
      amount_tax: tax,
      amount_total: subtotal + tax,
      description: `From receipt: ${reviewReceipt.file_name}`,
      category: reviewForm.category || null,
      vendor_id: reviewForm.vendor_id || null,
      receipt_count: 1,
      status: 'draft',
    }, {
      onSuccess: (data: any) => {
        // Link receipt to expense
        updateReceipt.mutate({
          id: reviewReceipt.id,
          expense_id: data.id,
          review_status: 'matched',
          ...reviewForm,
          total_raw: reviewForm.total_raw ? Number(reviewForm.total_raw) : null,
          tax_raw: reviewForm.tax_raw ? Number(reviewForm.tax_raw) : null,
        });
        setReviewReceipt(null);
        toast.success('Expense created and receipt matched');
      },
    });
  };

  const handleLinkToExpense = (expenseId: string) => {
    if (!reviewReceipt) return;
    updateReceipt.mutate({
      id: reviewReceipt.id,
      expense_id: expenseId,
      review_status: 'matched',
    }, {
      onSuccess: () => { setReviewReceipt(null); toast.success('Receipt linked to expense'); },
    });
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Receipts</h1>
          <p className="text-sm text-muted-foreground">Upload, review, and match receipts to expenses</p>
        </div>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept="image/*,.pdf" multiple className="hidden" onChange={(e) => handleUpload(e.target.files)} />
          <Button variant="outline" size="sm" onClick={() => { if (fileRef.current) { fileRef.current.capture = 'environment'; fileRef.current.click(); } }}>
            <Camera className="h-4 w-4 mr-1" /> Capture
          </Button>
          <Button size="sm" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4 mr-1" /> Upload Receipt
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Total</p><p className="text-lg font-bold">{filtered.length}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Unreviewed</p><p className="text-lg font-bold text-warning">{filtered.filter((r: any) => r.review_status === 'unreviewed').length}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Reviewed</p><p className="text-lg font-bold text-primary">{filtered.filter((r: any) => r.review_status === 'reviewed').length}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Matched</p><p className="text-lg font-bold text-accent">{filtered.filter((r: any) => r.review_status === 'matched').length}</p></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search receipts..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="unreviewed">Unreviewed</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
            <SelectItem value="matched">Matched</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <FileImage className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No receipts uploaded yet</p>
              <Button size="sm" className="mt-3" onClick={() => fileRef.current?.click()}>Upload First Receipt</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Linked</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r: any) => (
                    <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openReview(r)}>
                      <TableCell>
                        <span className="text-primary font-medium text-sm truncate block max-w-[200px]">{r.file_name}</span>
                      </TableCell>
                      <TableCell className="text-sm">{r.uploaded_at ? format(new Date(r.uploaded_at), 'MMM d, yyyy') : '—'}</TableCell>
                      <TableCell className="text-sm">{r.vendor_name_raw || '—'}</TableCell>
                      <TableCell className="text-right text-sm">{r.total_raw ? fmt(Number(r.total_raw)) : '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`flex items-center gap-1 w-fit ${statusColor[r.review_status] || ''}`}>
                          {statusIcon(r.review_status)} {r.review_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {r.expense_id ? <Badge variant="outline" className="text-accent border-accent"><Link2 className="h-3 w-3 mr-1" />Expense</Badge> : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openReview(r); }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Panel Dialog */}
      <Dialog open={!!reviewReceipt} onOpenChange={(open) => { if (!open) setReviewReceipt(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Review Receipt
              {reviewReceipt?.review_status === 'unreviewed' && <Badge variant="outline" className="border-warning text-warning">Unreviewed</Badge>}
              {reviewReceipt?.review_status === 'matched' && <Badge variant="outline" className="border-accent text-accent">Matched</Badge>}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Preview */}
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Receipt Preview</Label>
              {reviewReceipt?.file_type?.startsWith('image/') ? (
                <img src={reviewReceipt.file_url} alt="Receipt" className="w-full rounded-lg border border-border max-h-[400px] object-contain bg-muted" />
              ) : (
                <div className="border border-border rounded-lg p-8 text-center bg-muted">
                  <FileImage className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                  <a href={reviewReceipt?.file_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm">Open PDF</a>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-2">{reviewReceipt?.file_name}</p>
            </div>

            {/* Review Form */}
            <div className="space-y-4">
              <div>
                <Label>Vendor Name</Label>
                <Input value={reviewForm.vendor_name_raw || ''} onChange={e => setReviewForm({ ...reviewForm, vendor_name_raw: e.target.value })} />
              </div>
              <div>
                <Label>Link to Vendor</Label>
                <Select value={reviewForm.vendor_id || '_none'} onValueChange={v => setReviewForm({ ...reviewForm, vendor_id: v === '_none' ? null : v })}>
                  <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">None</SelectItem>
                    {(vendors ?? []).map((v: any) => <SelectItem key={v.id} value={v.id}>{v.vendor_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category</Label>
                <Select value={reviewForm.category || '_none'} onValueChange={v => setReviewForm({ ...reviewForm, category: v === '_none' ? null : v })}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">None</SelectItem>
                    {(categories ?? []).map((c: any) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Total</Label><Input type="number" step="0.01" value={reviewForm.total_raw || ''} onChange={e => setReviewForm({ ...reviewForm, total_raw: e.target.value })} /></div>
                <div><Label>Tax</Label><Input type="number" step="0.01" value={reviewForm.tax_raw || ''} onChange={e => setReviewForm({ ...reviewForm, tax_raw: e.target.value })} /></div>
              </div>
              <div><Label>Receipt Date</Label><Input type="date" value={reviewForm.receipt_date || ''} onChange={e => setReviewForm({ ...reviewForm, receipt_date: e.target.value })} /></div>
              <div><Label>Notes</Label><Textarea rows={2} value={reviewForm.notes || ''} onChange={e => setReviewForm({ ...reviewForm, notes: e.target.value })} /></div>

              <div>
                <Label>Status</Label>
                <Select value={reviewForm.review_status} onValueChange={v => setReviewForm({ ...reviewForm, review_status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unreviewed">Unreviewed</SelectItem>
                    <SelectItem value="reviewed">Reviewed</SelectItem>
                    <SelectItem value="matched">Matched</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Link to existing expense */}
              {!reviewReceipt?.expense_id && (expenses ?? []).length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground">Link to Existing Expense</Label>
                  <Select value="_none" onValueChange={v => { if (v !== '_none') handleLinkToExpense(v); }}>
                    <SelectTrigger><SelectValue placeholder="Select expense..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">None</SelectItem>
                      {(expenses ?? []).slice(0, 50).map((ex: any) => (
                        <SelectItem key={ex.id} value={ex.id}>{ex.expense_number} — {fmt(Number(ex.amount_total))}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex-wrap gap-2">
            {!reviewReceipt?.expense_id && (
              <Button variant="outline" onClick={handleCreateExpenseFromReceipt} disabled={createExpense.isPending}>
                <Plus className="h-4 w-4 mr-1" /> Create Expense from Receipt
              </Button>
            )}
            <Button variant="outline" onClick={() => setReviewReceipt(null)}>Cancel</Button>
            <Button onClick={handleSaveReview} disabled={updateReceipt.isPending}>Save Review</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
