import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { usePayoutRuns, useCreatePayoutRun, useUpdatePayoutRun, usePayoutItems, useCreatePayoutItem, useDeletePayoutItem } from '@/hooks/usePayroll';
import { Plus, ChevronRight, Users, DollarSign, Clock, CheckCircle, Lock, ArrowLeft, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

const fmt = (n: number) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(n);
const statusColor: Record<string, string> = { draft: 'bg-muted text-muted-foreground', approved: 'bg-primary/10 text-primary', processed: 'bg-accent/10 text-accent', cancelled: 'bg-destructive/10 text-destructive' };

export default function FinanceSubcontractorPayouts() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [form, setForm] = useState({ period_start: '', period_end: '', payout_date: '', notes: '' });

  const { data: runs, isLoading } = usePayoutRuns({ status: statusFilter });
  const createRun = useCreatePayoutRun();

  const handleCreate = () => {
    if (!form.period_start || !form.period_end || !form.payout_date) { toast.error('Fill required fields'); return; }
    createRun.mutate(form, { onSuccess: () => { setShowCreate(false); setForm({ period_start: '', period_end: '', payout_date: '', notes: '' }); } });
  };

  if (selectedRunId) return <PayoutRunDetail runId={selectedRunId} onBack={() => setSelectedRunId(null)} />;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Subcontractor Payouts</h1>
          <p className="text-sm text-muted-foreground">Manage subcontractor payout runs</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1" /> New Payout Run</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Draft', value: runs?.filter(r => r.status === 'draft').length ?? 0, icon: Clock },
          { label: 'Approved', value: runs?.filter(r => r.status === 'approved').length ?? 0, icon: CheckCircle },
          { label: 'Processed', value: runs?.filter(r => r.status === 'processed').length ?? 0, icon: Lock },
          { label: 'Total Runs', value: runs?.length ?? 0, icon: Users },
        ].map(k => (
          <Card key={k.label}><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-muted"><k.icon className="h-4 w-4 text-primary" /></div><div><p className="text-xs text-muted-foreground">{k.label}</p><p className="text-lg font-bold">{k.value}</p></div></CardContent></Card>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        {['all', 'draft', 'approved', 'processed', 'cancelled'].map(s => (
          <Button key={s} variant={statusFilter === s ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter(s)}>
            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </Button>
        ))}
      </div>

      {isLoading ? <Skeleton className="h-64" /> : (
        <Card><Table>
          <TableHeader><TableRow>
            <TableHead>Run #</TableHead><TableHead>Period</TableHead><TableHead>Payout Date</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {(runs ?? []).map(r => (
              <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedRunId(r.id)}>
                <TableCell className="font-medium">{r.payout_run_number || '—'}</TableCell>
                <TableCell className="text-sm">{r.period_start} → {r.period_end}</TableCell>
                <TableCell>{r.payout_date}</TableCell>
                <TableCell><Badge className={statusColor[r.status] || ''}>{r.status}</Badge></TableCell>
                <TableCell className="text-right"><ChevronRight className="h-4 w-4 text-muted-foreground inline" /></TableCell>
              </TableRow>
            ))}
            {(!runs || runs.length === 0) && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No payout runs yet</TableCell></TableRow>}
          </TableBody>
        </Table></Card>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Payout Run</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Period Start</Label><Input type="date" value={form.period_start} onChange={e => setForm(f => ({ ...f, period_start: e.target.value }))} /></div>
              <div><Label>Period End</Label><Input type="date" value={form.period_end} onChange={e => setForm(f => ({ ...f, period_end: e.target.value }))} /></div>
            </div>
            <div><Label>Payout Date</Label><Input type="date" value={form.payout_date} onChange={e => setForm(f => ({ ...f, payout_date: e.target.value }))} /></div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button onClick={handleCreate} disabled={createRun.isPending}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PayoutRunDetail({ runId, onBack }: { runId: string; onBack: () => void }) {
  const { user } = useAuth();
  const { data: runs } = usePayoutRuns();
  const run = runs?.find(r => r.id === runId);
  const { data: items, isLoading } = usePayoutItems(runId);
  const updateRun = useUpdatePayoutRun();
  const createItem = useCreatePayoutItem();
  const deleteItem = useDeletePayoutItem();
  const [showAdd, setShowAdd] = useState(false);
  const [itemForm, setItemForm] = useState({ subcontractor_name: '', company_name: '', service_description: '', amount_due: 0, holdback_amount: 0, adjustment_amount: 0 });

  const isLocked = run?.status === 'processed' || run?.status === 'cancelled';
  const calcTotal = (f: typeof itemForm) => Number(f.amount_due) - Number(f.holdback_amount) + Number(f.adjustment_amount);

  const handleAdd = () => {
    if (!itemForm.subcontractor_name) { toast.error('Enter subcontractor name'); return; }
    createItem.mutate({ payout_run_id: runId, ...itemForm, total_payable: calcTotal(itemForm) }, {
      onSuccess: () => { setShowAdd(false); setItemForm({ subcontractor_name: '', company_name: '', service_description: '', amount_due: 0, holdback_amount: 0, adjustment_amount: 0 }); }
    });
  };

  const handleStatus = (s: string) => {
    const u: any = { status: s };
    if (s === 'approved') { u.approved_by = user?.id; u.approved_at = new Date().toISOString(); }
    if (s === 'processed') { u.processed_by = user?.id; u.processed_at = new Date().toISOString(); u.locked_at = new Date().toISOString(); }
    updateRun.mutate({ id: runId, ...u });
  };

  const totalPayable = (items ?? []).reduce((s, i) => s + Number(i.total_payable || 0), 0);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{run?.payout_run_number || 'Payout Run'}</h1>
          <p className="text-sm text-muted-foreground">{run?.period_start} → {run?.period_end} • Payout: {run?.payout_date}</p>
        </div>
        <Badge className={statusColor[run?.status || 'draft']}>{run?.status}</Badge>
        {run?.status === 'draft' && <Button size="sm" onClick={() => handleStatus('approved')}>Approve</Button>}
        {run?.status === 'approved' && <Button size="sm" onClick={() => handleStatus('processed')}>Process</Button>}
        {run?.status === 'draft' && <Button size="sm" variant="destructive" onClick={() => handleStatus('cancelled')}>Cancel</Button>}
      </div>

      <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Total Payable</p><p className="text-2xl font-bold text-accent">{fmt(totalPayable)}</p></CardContent></Card>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">Subcontractors ({items?.length ?? 0})</CardTitle>
          {!isLocked && <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="h-3.5 w-3.5 mr-1" /> Add</Button>}
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? <Skeleton className="h-32 m-4" /> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Subcontractor</TableHead><TableHead>Company</TableHead><TableHead className="text-right">Amount Due</TableHead><TableHead className="text-right">Holdback</TableHead><TableHead className="text-right">Adj.</TableHead><TableHead className="text-right">Total</TableHead>
                {!isLocked && <TableHead className="w-10" />}
              </TableRow></TableHeader>
              <TableBody>
                {(items ?? []).map(i => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">{i.subcontractor_name}</TableCell>
                    <TableCell>{i.company_name || '—'}</TableCell>
                    <TableCell className="text-right">{fmt(Number(i.amount_due))}</TableCell>
                    <TableCell className="text-right text-destructive">{fmt(Number(i.holdback_amount))}</TableCell>
                    <TableCell className="text-right">{fmt(Number(i.adjustment_amount))}</TableCell>
                    <TableCell className="text-right font-medium">{fmt(Number(i.total_payable))}</TableCell>
                    {!isLocked && <TableCell><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteItem.mutate({ id: i.id, payout_run_id: runId })}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></TableCell>}
                  </TableRow>
                ))}
                {(!items || items.length === 0) && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No items yet</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {(run?.approved_by || run?.processed_by) && (
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Audit Trail</CardTitle></CardHeader><CardContent className="text-sm space-y-1">
          {run?.approved_at && <p>Approved: {format(new Date(run.approved_at), 'PPp')}</p>}
          {run?.processed_at && <p>Processed: {format(new Date(run.processed_at), 'PPp')}</p>}
          {run?.locked_at && <p className="flex items-center gap-1"><Lock className="h-3 w-3" /> Locked: {format(new Date(run.locked_at), 'PPp')}</p>}
        </CardContent></Card>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Subcontractor</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Subcontractor Name</Label><Input value={itemForm.subcontractor_name} onChange={e => setItemForm(f => ({ ...f, subcontractor_name: e.target.value }))} /></div>
            <div><Label>Company Name</Label><Input value={itemForm.company_name} onChange={e => setItemForm(f => ({ ...f, company_name: e.target.value }))} /></div>
            <div><Label>Service Description</Label><Input value={itemForm.service_description} onChange={e => setItemForm(f => ({ ...f, service_description: e.target.value }))} /></div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label>Amount Due</Label><Input type="number" step="0.01" value={itemForm.amount_due} onChange={e => setItemForm(f => ({ ...f, amount_due: Number(e.target.value) }))} /></div>
              <div><Label>Holdback</Label><Input type="number" step="0.01" value={itemForm.holdback_amount} onChange={e => setItemForm(f => ({ ...f, holdback_amount: Number(e.target.value) }))} /></div>
              <div><Label>Adjustment</Label><Input type="number" step="0.01" value={itemForm.adjustment_amount} onChange={e => setItemForm(f => ({ ...f, adjustment_amount: Number(e.target.value) }))} /></div>
            </div>
            <Card className="bg-muted/50"><CardContent className="p-3 text-sm font-bold flex justify-between"><span>Total Payable:</span><span>{fmt(calcTotal(itemForm))}</span></CardContent></Card>
          </div>
          <DialogFooter><Button onClick={handleAdd} disabled={createItem.isPending}>Add</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
