import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
import { usePayrollRuns, useCreatePayrollRun, useUpdatePayrollRun, usePayrollRunItems, useCreatePayrollRunItem, useUpdatePayrollRunItem, useDeletePayrollRunItem } from '@/hooks/usePayroll';
import { useFinanceAccounts } from '@/hooks/useFinanceAccounts';
import { useEmployees } from '@/hooks/useEmployees';
import { Plus, ChevronRight, Users, DollarSign, Clock, CheckCircle, Lock, ArrowLeft, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

const fmt = (n: number) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(n);
const statusColor: Record<string, string> = { draft: 'bg-muted text-muted-foreground', approved: 'bg-primary/10 text-primary', processed: 'bg-accent/10 text-accent', cancelled: 'bg-destructive/10 text-destructive' };

export default function FinancePayroll() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [form, setForm] = useState({ pay_period_start: '', pay_period_end: '', pay_date: '', notes: '' });

  const { data: runs, isLoading } = usePayrollRuns({ status: statusFilter });
  const createRun = useCreatePayrollRun();

  const handleCreate = () => {
    if (!form.pay_period_start || !form.pay_period_end || !form.pay_date) { toast.error('Fill required fields'); return; }
    createRun.mutate(form, { onSuccess: () => { setShowCreate(false); setForm({ pay_period_start: '', pay_period_end: '', pay_date: '', notes: '' }); } });
  };

  if (selectedRunId) {
    return <PayrollRunDetail runId={selectedRunId} onBack={() => setSelectedRunId(null)} />;
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payroll</h1>
          <p className="text-sm text-muted-foreground">Manage employee payroll runs</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1" /> New Payroll Run</Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Draft Runs', value: runs?.filter(r => r.status === 'draft').length ?? 0, icon: Clock },
          { label: 'Approved', value: runs?.filter(r => r.status === 'approved').length ?? 0, icon: CheckCircle },
          { label: 'Processed', value: runs?.filter(r => r.status === 'processed').length ?? 0, icon: Lock },
          { label: 'Total Runs', value: runs?.length ?? 0, icon: Users },
        ].map(k => (
          <Card key={k.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted"><k.icon className="h-4 w-4 text-primary" /></div>
              <div><p className="text-xs text-muted-foreground">{k.label}</p><p className="text-lg font-bold">{k.value}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'draft', 'approved', 'processed', 'cancelled'].map(s => (
          <Button key={s} variant={statusFilter === s ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter(s)}>
            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </Button>
        ))}
      </div>

      {/* Table */}
      {isLoading ? <Skeleton className="h-64" /> : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Run #</TableHead>
                <TableHead>Pay Period</TableHead>
                <TableHead>Pay Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(runs ?? []).map(r => (
                <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedRunId(r.id)}>
                  <TableCell className="font-medium">{r.run_number || '—'}</TableCell>
                  <TableCell className="text-sm">{r.pay_period_start} → {r.pay_period_end}</TableCell>
                  <TableCell>{r.pay_date}</TableCell>
                  <TableCell><Badge className={statusColor[r.status] || ''}>{r.status}</Badge></TableCell>
                  <TableCell className="text-right"><ChevronRight className="h-4 w-4 text-muted-foreground inline" /></TableCell>
                </TableRow>
              ))}
              {(!runs || runs.length === 0) && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No payroll runs yet</TableCell></TableRow>}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Payroll Run</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Period Start</Label><Input type="date" value={form.pay_period_start} onChange={e => setForm(f => ({ ...f, pay_period_start: e.target.value }))} /></div>
              <div><Label>Period End</Label><Input type="date" value={form.pay_period_end} onChange={e => setForm(f => ({ ...f, pay_period_end: e.target.value }))} /></div>
            </div>
            <div><Label>Pay Date</Label><Input type="date" value={form.pay_date} onChange={e => setForm(f => ({ ...f, pay_date: e.target.value }))} /></div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button onClick={handleCreate} disabled={createRun.isPending}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── Payroll Run Detail ── */
function PayrollRunDetail({ runId, onBack }: { runId: string; onBack: () => void }) {
  const { user } = useAuth();
  const { data: runs } = usePayrollRuns();
  const run = runs?.find(r => r.id === runId);
  const { data: items, isLoading } = usePayrollRunItems(runId);
  const { data: accounts } = useFinanceAccounts();
  const { data: employees = [] } = useEmployees();
  const updateRun = useUpdatePayrollRun();
  const createItem = useCreatePayrollRunItem();
  const updateItem = useUpdatePayrollRunItem();
  const deleteItem = useDeletePayrollRunItem();
  const [showAdd, setShowAdd] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [itemForm, setItemForm] = useState({ employee_name: '', regular_hours: 0, overtime_hours: 0, holiday_hours: 0, sick_hours: 0, vacation_hours: 0, hourly_rate: 0, bonus_amount: 0, cpp_amount: 0, ei_amount: 0, income_tax_amount: 0, other_deductions_amount: 0 });

  const isLocked = run?.status === 'processed' || run?.status === 'cancelled';

  // When employee is selected, auto-fill name and rate
  const handleEmployeeSelect = (userId: string) => {
    setSelectedEmployeeId(userId);
    const emp = employees.find((e: any) => e.user_id === userId);
    if (emp) {
      setItemForm(f => ({
        ...f,
        employee_name: emp.full_name || '',
        hourly_rate: Number(emp.hourly_rate) || 0,
      }));
    }
  };

  const calcGross = (i: typeof itemForm) => {
    const total_hours = Number(i.regular_hours) + (Number(i.overtime_hours) * 1.5) + Number(i.holiday_hours) + Number(i.sick_hours) + Number(i.vacation_hours);
    return Math.round(total_hours * Number(i.hourly_rate) * 100) / 100 + Number(i.bonus_amount);
  };
  const calcDeductions = (i: typeof itemForm) => Number(i.cpp_amount) + Number(i.ei_amount) + Number(i.income_tax_amount) + Number(i.other_deductions_amount);

  const handleAddItem = () => {
    if (!itemForm.employee_name) { toast.error('Select an employee'); return; }
    const gross = calcGross(itemForm);
    const ded = calcDeductions(itemForm);
    createItem.mutate({
      payroll_run_id: runId,
      user_id: selectedEmployeeId || null,
      ...itemForm,
      gross_pay: gross,
      total_deductions: ded,
      net_pay: Math.round((gross - ded) * 100) / 100,
    }, { onSuccess: () => { setShowAdd(false); setSelectedEmployeeId(''); setItemForm({ employee_name: '', regular_hours: 0, overtime_hours: 0, holiday_hours: 0, sick_hours: 0, vacation_hours: 0, hourly_rate: 0, bonus_amount: 0, cpp_amount: 0, ei_amount: 0, income_tax_amount: 0, other_deductions_amount: 0 }); } });
  };

  const handleStatusChange = async (newStatus: string) => {
    const updates: any = { status: newStatus };
    if (newStatus === 'approved') { updates.approved_by = user?.id; updates.approved_at = new Date().toISOString(); }
    if (newStatus === 'processed') {
      updates.processed_by = user?.id;
      updates.processed_at = new Date().toISOString();
      updates.locked_at = new Date().toISOString();

      // Auto-generate pay stubs for each employee in this run
      if (items && items.length > 0 && run) {
        const stubs = items
          .filter((i: any) => i.user_id)
          .map((i: any) => ({
            user_id: i.user_id,
            pay_date: run.pay_date,
            pay_period_start: run.pay_period_start,
            pay_period_end: run.pay_period_end,
            gross_pay: Number(i.gross_pay),
            deductions: Number(i.total_deductions),
            net_pay: Number(i.net_pay),
            ytd_gross: 0,
            ytd_net: 0,
            notes: `Auto-generated from payroll run ${run.run_number || runId}`,
          }));
        if (stubs.length > 0) {
          const { error } = await supabase.from('employee_pay_stubs').insert(stubs);
          if (error) {
            toast.error('Pay stubs generation failed: ' + error.message);
          } else {
            toast.success(`Generated ${stubs.length} pay stub(s)`);
          }
        }
      }
    }
    updateRun.mutate({ id: runId, ...updates });
  };

  const totals = (items ?? []).reduce((acc, i) => ({ gross: acc.gross + Number(i.gross_pay), ded: acc.ded + Number(i.total_deductions), net: acc.net + Number(i.net_pay) }), { gross: 0, ded: 0, net: 0 });

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{run?.run_number || 'Payroll Run'}</h1>
          <p className="text-sm text-muted-foreground">{run?.pay_period_start} → {run?.pay_period_end} • Pay date: {run?.pay_date}</p>
        </div>
        <Badge className={statusColor[run?.status || 'draft']}>{run?.status}</Badge>
        {run?.status === 'draft' && <Button size="sm" onClick={() => handleStatusChange('approved')}>Approve</Button>}
        {run?.status === 'approved' && <Button size="sm" onClick={() => handleStatusChange('processed')}>Process & Generate Pay Stubs</Button>}
        {run?.status === 'draft' && <Button size="sm" variant="destructive" onClick={() => handleStatusChange('cancelled')}>Cancel</Button>}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Gross Pay</p><p className="text-lg font-bold">{fmt(totals.gross)}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Total Deductions</p><p className="text-lg font-bold text-destructive">{fmt(totals.ded)}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Net Pay</p><p className="text-lg font-bold text-accent">{fmt(totals.net)}</p></CardContent></Card>
      </div>

      {/* Items Table */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">Employees ({items?.length ?? 0})</CardTitle>
          {!isLocked && <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="h-3.5 w-3.5 mr-1" /> Add Employee</Button>}
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? <Skeleton className="h-32 m-4" /> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead className="text-right">Reg Hrs</TableHead>
                  <TableHead className="text-right">OT Hrs</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">Deductions</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  {!isLocked && <TableHead className="w-10" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(items ?? []).map(i => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">{i.employee_name || '—'}</TableCell>
                    <TableCell className="text-right">{Number(i.regular_hours).toFixed(1)}</TableCell>
                    <TableCell className="text-right">{Number(i.overtime_hours).toFixed(1)}</TableCell>
                    <TableCell className="text-right">{fmt(Number(i.hourly_rate))}</TableCell>
                    <TableCell className="text-right">{fmt(Number(i.gross_pay))}</TableCell>
                    <TableCell className="text-right text-destructive">{fmt(Number(i.total_deductions))}</TableCell>
                    <TableCell className="text-right font-medium">{fmt(Number(i.net_pay))}</TableCell>
                    {!isLocked && (
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteItem.mutate({ id: i.id, payroll_run_id: runId })}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {(!items || items.length === 0) && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No employees added yet</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Audit */}
      {(run?.approved_by || run?.processed_by) && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Audit Trail</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            {run?.approved_at && <p>Approved: {format(new Date(run.approved_at), 'PPp')}</p>}
            {run?.processed_at && <p>Processed: {format(new Date(run.processed_at), 'PPp')}</p>}
            {run?.locked_at && <p className="flex items-center gap-1"><Lock className="h-3 w-3" /> Locked: {format(new Date(run.locked_at), 'PPp')}</p>}
          </CardContent>
        </Card>
      )}

      {/* Add Employee Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Employee to Run</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Select Employee</Label>
              <Select value={selectedEmployeeId} onValueChange={handleEmployeeSelect}>
                <SelectTrigger><SelectValue placeholder="Choose an employee…" /></SelectTrigger>
                <SelectContent>
                  {employees.map((emp: any) => (
                    <SelectItem key={emp.user_id} value={emp.user_id}>
                      {emp.full_name || emp.work_email || 'Unnamed'} {emp.hourly_rate ? `($${emp.hourly_rate}/hr)` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label>Reg Hrs</Label><Input type="number" value={itemForm.regular_hours} onChange={e => setItemForm(f => ({ ...f, regular_hours: Number(e.target.value) }))} /></div>
              <div><Label>OT Hrs</Label><Input type="number" value={itemForm.overtime_hours} onChange={e => setItemForm(f => ({ ...f, overtime_hours: Number(e.target.value) }))} /></div>
              <div><Label>Rate</Label><Input type="number" step="0.01" value={itemForm.hourly_rate} onChange={e => setItemForm(f => ({ ...f, hourly_rate: Number(e.target.value) }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label>Holiday Hrs</Label><Input type="number" value={itemForm.holiday_hours} onChange={e => setItemForm(f => ({ ...f, holiday_hours: Number(e.target.value) }))} /></div>
              <div><Label>Sick Hrs</Label><Input type="number" value={itemForm.sick_hours} onChange={e => setItemForm(f => ({ ...f, sick_hours: Number(e.target.value) }))} /></div>
              <div><Label>Vacation Hrs</Label><Input type="number" value={itemForm.vacation_hours} onChange={e => setItemForm(f => ({ ...f, vacation_hours: Number(e.target.value) }))} /></div>
            </div>
            <div><Label>Bonus</Label><Input type="number" step="0.01" value={itemForm.bonus_amount} onChange={e => setItemForm(f => ({ ...f, bonus_amount: Number(e.target.value) }))} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>CPP</Label><Input type="number" step="0.01" value={itemForm.cpp_amount} onChange={e => setItemForm(f => ({ ...f, cpp_amount: Number(e.target.value) }))} /></div>
              <div><Label>EI</Label><Input type="number" step="0.01" value={itemForm.ei_amount} onChange={e => setItemForm(f => ({ ...f, ei_amount: Number(e.target.value) }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Income Tax</Label><Input type="number" step="0.01" value={itemForm.income_tax_amount} onChange={e => setItemForm(f => ({ ...f, income_tax_amount: Number(e.target.value) }))} /></div>
              <div><Label>Other Deductions</Label><Input type="number" step="0.01" value={itemForm.other_deductions_amount} onChange={e => setItemForm(f => ({ ...f, other_deductions_amount: Number(e.target.value) }))} /></div>
            </div>
            <Card className="bg-muted/50"><CardContent className="p-3 text-sm">
              <div className="flex justify-between"><span>Gross:</span><span className="font-medium">{fmt(calcGross(itemForm))}</span></div>
              <div className="flex justify-between"><span>Deductions:</span><span className="text-destructive">{fmt(calcDeductions(itemForm))}</span></div>
              <div className="flex justify-between font-bold"><span>Net:</span><span>{fmt(calcGross(itemForm) - calcDeductions(itemForm))}</span></div>
            </CardContent></Card>
          </div>
          <DialogFooter><Button onClick={handleAddItem} disabled={createItem.isPending}>Add Employee</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
