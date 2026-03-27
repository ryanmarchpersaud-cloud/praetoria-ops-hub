import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useRemittances, useCreateRemittance, useUpdateRemittance } from '@/hooks/usePayroll';
import { useFinanceAccounts } from '@/hooks/useFinanceAccounts';
import { Plus, AlertTriangle, DollarSign, Clock, CheckCircle, Lock } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

const fmt = (n: number) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(n);
const TYPES = ['CPP', 'EI', 'INCOME_TAX', 'GST', 'PST', 'WCB', 'OTHER'];
const statusColor: Record<string, string> = { draft: 'bg-muted text-muted-foreground', due: 'bg-warning/10 text-warning', paid: 'bg-accent/10 text-accent', filed: 'bg-primary/10 text-primary' };

export default function FinanceRemittances() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ remittance_type: 'CPP', period_start: '', period_end: '', due_date: '', amount: 0, account_id: '', notes: '' });
  const { user } = useAuth();

  const { data: rems, isLoading } = useRemittances({ status: statusFilter, type: typeFilter });
  const { data: accounts } = useFinanceAccounts();
  const createRem = useCreateRemittance();
  const updateRem = useUpdateRemittance();

  const handleCreate = () => {
    if (!form.period_start || !form.period_end || !form.due_date) { toast.error('Fill required fields'); return; }
    const payload: any = { ...form, amount: Number(form.amount) };
    if (!payload.account_id) delete payload.account_id;
    createRem.mutate(payload, { onSuccess: () => { setShowCreate(false); setForm({ remittance_type: 'CPP', period_start: '', period_end: '', due_date: '', amount: 0, account_id: '', notes: '' }); } });
  };

  const handleStatus = (id: string, newStatus: string) => {
    const u: any = { status: newStatus };
    if (newStatus === 'paid') { u.paid_by = user?.id; u.paid_at = new Date().toISOString(); u.payment_date = new Date().toISOString().split('T')[0]; }
    if (newStatus === 'filed') { u.filed_by = user?.id; u.filed_at = new Date().toISOString(); u.locked_at = new Date().toISOString(); }
    updateRem.mutate({ id, ...u });
  };

  const now = new Date();
  const dueSoon = (rems ?? []).filter(r => r.status !== 'paid' && r.status !== 'filed' && r.due_date && differenceInDays(new Date(r.due_date), now) <= 7 && differenceInDays(new Date(r.due_date), now) >= 0).length;
  const overdue = (rems ?? []).filter(r => r.status !== 'paid' && r.status !== 'filed' && r.due_date && new Date(r.due_date) < now).length;
  const totalOutstanding = (rems ?? []).filter(r => r.status !== 'paid' && r.status !== 'filed').reduce((s, r) => s + Number(r.amount || 0), 0);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Remittances</h1>
          <p className="text-sm text-muted-foreground">Tax and statutory remittance tracking</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1" /> New Remittance</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Due Soon (7d)', value: dueSoon, icon: Clock, color: 'text-warning' },
          { label: 'Overdue', value: overdue, icon: AlertTriangle, color: 'text-destructive' },
          { label: 'Outstanding', value: fmt(totalOutstanding), icon: DollarSign, color: 'text-primary' },
          { label: 'Paid/Filed', value: (rems ?? []).filter(r => r.status === 'paid' || r.status === 'filed').length, icon: CheckCircle, color: 'text-accent' },
        ].map(k => (
          <Card key={k.label}><CardContent className="p-4 flex items-center gap-3"><div className={`p-2 rounded-lg bg-muted ${k.color}`}><k.icon className="h-4 w-4" /></div><div><p className="text-xs text-muted-foreground">{k.label}</p><p className="text-lg font-bold">{k.value}</p></div></CardContent></Card>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        {['all', 'draft', 'due', 'paid', 'filed'].map(s => (
          <Button key={s} variant={statusFilter === s ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter(s)}>
            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </Button>
        ))}
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[120px] h-8"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? <Skeleton className="h-64" /> : (
        <Card><Table>
          <TableHeader><TableRow>
            <TableHead>Rem #</TableHead><TableHead>Type</TableHead><TableHead>Period</TableHead><TableHead>Due Date</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Account</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {(rems ?? []).map(r => {
              const isDue = r.due_date && new Date(r.due_date) < now && r.status !== 'paid' && r.status !== 'filed';
              return (
                <TableRow key={r.id} className={isDue ? 'bg-destructive/5' : ''}>
                  <TableCell className="font-medium">{r.remittance_number || '—'}</TableCell>
                  <TableCell><Badge variant="outline">{r.remittance_type}</Badge></TableCell>
                  <TableCell className="text-sm">{r.period_start} → {r.period_end}</TableCell>
                  <TableCell className={isDue ? 'text-destructive font-medium' : ''}>{r.due_date}</TableCell>
                  <TableCell className="text-right font-medium">{fmt(Number(r.amount))}</TableCell>
                  <TableCell className="text-sm">{(r as any).finance_accounts?.account_name || '—'}</TableCell>
                  <TableCell><Badge className={statusColor[r.status] || ''}>{r.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      {r.status === 'draft' && <Button size="sm" variant="outline" onClick={() => handleStatus(r.id, 'due')}>Mark Due</Button>}
                      {(r.status === 'draft' || r.status === 'due') && <Button size="sm" variant="outline" onClick={() => handleStatus(r.id, 'paid')}>Paid</Button>}
                      {r.status === 'paid' && <Button size="sm" variant="outline" onClick={() => handleStatus(r.id, 'filed')}>Filed</Button>}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {(!rems || rems.length === 0) && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No remittances yet</TableCell></TableRow>}
          </TableBody>
        </Table></Card>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Remittance</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Type</Label>
              <Select value={form.remittance_type} onValueChange={v => setForm(f => ({ ...f, remittance_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Period Start</Label><Input type="date" value={form.period_start} onChange={e => setForm(f => ({ ...f, period_start: e.target.value }))} /></div>
              <div><Label>Period End</Label><Input type="date" value={form.period_end} onChange={e => setForm(f => ({ ...f, period_end: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} /></div>
              <div><Label>Amount</Label><Input type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))} /></div>
            </div>
            <div><Label>Account</Label>
              <Select value={form.account_id} onValueChange={v => setForm(f => ({ ...f, account_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>{(accounts ?? []).filter(a => a.is_active).map(a => <SelectItem key={a.id} value={a.id}>{a.account_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button onClick={handleCreate} disabled={createRem.isPending}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
