import { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useFinanceReceipts, useCreateFinanceReceipt } from '@/hooks/useFinance';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Search, Camera, FileImage, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const fmt = (n: number) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(n);

export default function FinanceReceipts() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: receipts, isLoading } = useFinanceReceipts({ status: statusFilter });
  const createReceipt = useCreateFinanceReceipt();

  const handleUpload = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      const path = `receipts/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from('finance-receipts').upload(path, file);
      if (upErr) { toast.error(`Upload failed: ${upErr.message}`); continue; }
      const { data: urlData } = supabase.storage.from('finance-receipts').getPublicUrl(path);
      createReceipt.mutate({
        file_url: urlData.publicUrl,
        file_name: file.name,
        file_type: file.type,
      });
    }
  };

  const filtered = (receipts ?? []).filter((r: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return r.file_name?.toLowerCase().includes(s) || r.vendor_name_raw?.toLowerCase().includes(s);
  });

  const statusIcon = (s: string) => s === 'reviewed' || s === 'matched' ? <CheckCircle className="h-3.5 w-3.5 text-accent" /> : <Clock className="h-3.5 w-3.5 text-warning" />;

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
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Total</p><p className="text-lg font-bold">{filtered.length}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Unreviewed</p><p className="text-lg font-bold text-warning">{filtered.filter((r: any) => r.review_status === 'unreviewed').length}</p></CardContent></Card>
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <a href={r.file_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium text-sm truncate block max-w-[200px]">
                          {r.file_name}
                        </a>
                      </TableCell>
                      <TableCell className="text-sm">{r.uploaded_at ? format(new Date(r.uploaded_at), 'MMM d, yyyy') : '—'}</TableCell>
                      <TableCell className="text-sm">{r.vendor_name_raw || '—'}</TableCell>
                      <TableCell className="text-right text-sm">{r.total_raw ? fmt(Number(r.total_raw)) : '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="flex items-center gap-1 w-fit">
                          {statusIcon(r.review_status)} {r.review_status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
