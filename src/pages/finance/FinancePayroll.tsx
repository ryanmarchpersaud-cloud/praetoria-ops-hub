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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { usePayrollRuns, useCreatePayrollRun, useUpdatePayrollRun, usePayrollRunItems, useCreatePayrollRunItem, useUpdatePayrollRunItem, useDeletePayrollRunItem } from '@/hooks/usePayroll';
import { useFinanceAccounts } from '@/hooks/useFinanceAccounts';
import { useEmployees } from '@/hooks/useEmployees';
import { useAggregatedApprovedHours } from '@/hooks/useTimesheets';
import { Plus, ChevronRight, Users, DollarSign, Clock, CheckCircle, Lock, ArrowLeft, Trash2, Pencil, Download } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

const fmt = (n: number) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(n);
const statusColor: Record<string, string> = { draft: 'bg-muted text-muted-foreground', approved: 'bg-primary/10 text-primary', processed: 'bg-accent/10 text-accent', cancelled: 'bg-destructive/10 text-destructive' };

const EMPTY_ITEM_FORM = {
  employee_name: '', regular_hours: 0, overtime_hours: 0, holiday_hours: 0, sick_hours: 0, vacation_hours: 0,
  hourly_rate: 0, salary_override: 0, bonus_amount: 0, allowance_amount: 0, reimbursement_amount: 0, vacation_pay_amount: 0,
  // Statutory deductions
  cpp_amount: 0, ei_amount: 0, income_tax_amount: 0,
  // Employee-paid benefit deductions
  union_dues: 0, pension_rpp: 0, rrsp_prpp: 0,
  employee_health_premium: 0, employee_dental_premium: 0, employee_vision_premium: 0,
  group_life_premium: 0, ltd_premium: 0, eap_premium: 0,
  voluntary_deductions: 0, garnishments: 0, overpayment_recovery: 0, other_deductions_amount: 0,
  // Employer contributions
  employer_cpp: 0, employer_ei: 0, employer_pension_match: 0,
  employer_health_premium: 0, employer_dental_premium: 0, employer_group_life: 0,
  employer_ltd: 0, employer_benefit_contribution: 0, employer_retirement_match: 0,
  // Pay method
  pay_method: 'direct_deposit',
};

type ItemForm = typeof EMPTY_ITEM_FORM;

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
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [itemForm, setItemForm] = useState<ItemForm>({ ...EMPTY_ITEM_FORM });

  const isLocked = run?.status === 'processed' || run?.status === 'cancelled';

  const handleEmployeeSelect = (userId: string) => {
    setSelectedEmployeeId(userId);
    const emp = employees.find((e: any) => e.user_id === userId);
    if (emp) {
      setItemForm(f => ({ ...f, employee_name: emp.full_name || '', hourly_rate: Number(emp.hourly_rate) || 0 }));
    }
  };

  const calcGross = (i: ItemForm) => {
    const hourly = (Number(i.regular_hours) + (Number(i.overtime_hours) * 1.5) + Number(i.holiday_hours) + Number(i.sick_hours) + Number(i.vacation_hours)) * Number(i.hourly_rate);
    return Math.round((hourly + Number(i.salary_override) + Number(i.bonus_amount) + Number(i.allowance_amount) + Number(i.reimbursement_amount) + Number(i.vacation_pay_amount)) * 100) / 100;
  };

  const calcEmployeeDeductions = (i: ItemForm) =>
    Number(i.cpp_amount) + Number(i.ei_amount) + Number(i.income_tax_amount) +
    Number(i.union_dues) + Number(i.pension_rpp) + Number(i.rrsp_prpp) +
    Number(i.employee_health_premium) + Number(i.employee_dental_premium) + Number(i.employee_vision_premium) +
    Number(i.group_life_premium) + Number(i.ltd_premium) + Number(i.eap_premium) +
    Number(i.voluntary_deductions) + Number(i.garnishments) + Number(i.overpayment_recovery) + Number(i.other_deductions_amount);

  const calcEmployerContributions = (i: ItemForm) =>
    Number(i.employer_cpp) + Number(i.employer_ei) + Number(i.employer_pension_match) +
    Number(i.employer_health_premium) + Number(i.employer_dental_premium) + Number(i.employer_group_life) +
    Number(i.employer_ltd) + Number(i.employer_benefit_contribution) + Number(i.employer_retirement_match);

  const openAddDialog = () => {
    setEditingItemId(null);
    setSelectedEmployeeId('');
    setItemForm({ ...EMPTY_ITEM_FORM });
    setShowAdd(true);
  };

  // Pull approved hours from timesheets for the run's pay period
  const { data: approvedHours = [], refetch: refetchApproved, isFetching: pullLoading } = useAggregatedApprovedHours(
    run?.pay_period_start ?? null,
    run?.pay_period_end ?? null,
  );

  const handlePullFromTimesheets = async () => {
    if (!run) return;
    const { data: fresh } = await refetchApproved();
    const rows = fresh ?? [];
    if (!rows.length) {
      toast.info('No approved timesheets found in this pay period');
      return;
    }
    const existingUserIds = new Set((items ?? []).map((it: any) => it.user_id));
    const toAdd = rows.filter((r) => !existingUserIds.has(r.user_id));
    if (!toAdd.length) {
      toast.info('All workers with approved hours are already in this run');
      return;
    }
    let created = 0;
    for (const r of toAdd) {
      const regular_hours = Math.min(40, Number(r.total_hours));
      const overtime_hours = Math.max(0, Number(r.total_hours) - 40);
      const hourly_rate = Number(r.hourly_rate);
      const gross_pay = Math.round((regular_hours * hourly_rate + overtime_hours * hourly_rate * 1.5) * 100) / 100;
      try {
        await new Promise<void>((resolve, reject) => {
          createItem.mutate(
            {
              payroll_run_id: runId,
              user_id: r.user_id,
              employee_name: r.full_name,
              regular_hours,
              overtime_hours,
              hourly_rate,
              gross_pay,
              net_pay: gross_pay,
              total_deductions: 0,
              memo: `Auto-pulled from ${r.entry_count} approved timesheet(s)`,
            } as any,
            { onSuccess: () => { created++; resolve(); }, onError: (e: any) => reject(e) },
          );
        });
      } catch (e: any) {
        toast.error(`Failed to add ${r.full_name}: ${e.message}`);
      }
    }
    toast.success(`Added ${created} employees with approved hours`);
  };


    setEditingItemId(item.id);
    setSelectedEmployeeId(item.user_id || '');
    setItemForm({
      employee_name: item.employee_name || '',
      regular_hours: Number(item.regular_hours) || 0,
      overtime_hours: Number(item.overtime_hours) || 0,
      holiday_hours: Number(item.holiday_hours) || 0,
      sick_hours: Number(item.sick_hours) || 0,
      vacation_hours: Number(item.vacation_hours) || 0,
      hourly_rate: Number(item.hourly_rate) || 0,
      salary_override: Number(item.salary_override) || 0,
      bonus_amount: Number(item.bonus_amount) || 0,
      allowance_amount: Number(item.allowance_amount) || 0,
      reimbursement_amount: Number(item.reimbursement_amount) || 0,
      vacation_pay_amount: Number(item.vacation_pay_amount) || 0,
      cpp_amount: Number(item.cpp_amount) || 0,
      ei_amount: Number(item.ei_amount) || 0,
      income_tax_amount: Number(item.income_tax_amount) || 0,
      union_dues: Number(item.union_dues) || 0,
      pension_rpp: Number(item.pension_rpp) || 0,
      rrsp_prpp: Number(item.rrsp_prpp) || 0,
      employee_health_premium: Number(item.employee_health_premium) || 0,
      employee_dental_premium: Number(item.employee_dental_premium) || 0,
      employee_vision_premium: Number(item.employee_vision_premium) || 0,
      group_life_premium: Number(item.group_life_premium) || 0,
      ltd_premium: Number(item.ltd_premium) || 0,
      eap_premium: Number(item.eap_premium) || 0,
      voluntary_deductions: Number(item.voluntary_deductions) || 0,
      garnishments: Number(item.garnishments) || 0,
      overpayment_recovery: Number(item.overpayment_recovery) || 0,
      other_deductions_amount: Number(item.other_deductions_amount) || 0,
      employer_cpp: Number(item.employer_cpp) || 0,
      employer_ei: Number(item.employer_ei) || 0,
      employer_pension_match: Number(item.employer_pension_match) || 0,
      employer_health_premium: Number(item.employer_health_premium) || 0,
      employer_dental_premium: Number(item.employer_dental_premium) || 0,
      employer_group_life: Number(item.employer_group_life) || 0,
      employer_ltd: Number(item.employer_ltd) || 0,
      employer_benefit_contribution: Number(item.employer_benefit_contribution) || 0,
      employer_retirement_match: Number(item.employer_retirement_match) || 0,
      pay_method: item.pay_method || 'direct_deposit',
    });
    setShowAdd(true);
  };

  const handleSaveItem = () => {
    if (!itemForm.employee_name) { toast.error('Select an employee'); return; }
    const gross = calcGross(itemForm);
    const ded = calcEmployeeDeductions(itemForm);
    const payload: any = {
      ...itemForm,
      gross_pay: gross,
      total_deductions: Math.round(ded * 100) / 100,
      net_pay: Math.round((gross - ded) * 100) / 100,
    };

    if (editingItemId) {
      updateItem.mutate({ id: editingItemId, payroll_run_id: runId, ...payload }, {
        onSuccess: () => { setShowAdd(false); setEditingItemId(null); }
      });
    } else {
      payload.payroll_run_id = runId;
      payload.user_id = selectedEmployeeId || null;
      createItem.mutate(payload, {
        onSuccess: () => { setShowAdd(false); setSelectedEmployeeId(''); setItemForm({ ...EMPTY_ITEM_FORM }); }
      });
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    const updates: any = { status: newStatus };
    if (newStatus === 'approved') { updates.approved_by = user?.id; updates.approved_at = new Date().toISOString(); }
    if (newStatus === 'processed') {
      updates.processed_by = user?.id;
      updates.processed_at = new Date().toISOString();
      updates.locked_at = new Date().toISOString();

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
  const gross = calcGross(itemForm);
  const ded = calcEmployeeDeductions(itemForm);
  const empContrib = calcEmployerContributions(itemForm);

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
          {!isLocked && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handlePullFromTimesheets} disabled={pullLoading || createItem.isPending}>
                <Download className="h-3.5 w-3.5 mr-1" /> Pull Approved Hours
              </Button>
              <Button size="sm" onClick={openAddDialog}><Plus className="h-3.5 w-3.5 mr-1" /> Add Employee</Button>
            </div>
          )}
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
                  {!isLocked && <TableHead className="w-20" />}
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
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(i)}>
                            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteItem.mutate({ id: i.id, payroll_run_id: runId })}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
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

      {/* Add / Edit Employee Dialog */}
      <Dialog open={showAdd} onOpenChange={(o) => { if (!o) { setShowAdd(false); setEditingItemId(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle>{editingItemId ? 'Edit Employee Payroll' : 'Add Employee to Run'}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] px-6 pb-2">
            <div className="space-y-5 pb-4">
              {/* Employee Selection */}
              {!editingItemId && (
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
              )}
              {editingItemId && <p className="text-sm font-semibold text-foreground">{itemForm.employee_name}</p>}

              {/* ── Earnings ── */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-2">Earnings</h4>
                <div className="grid grid-cols-3 gap-2">
                  <NumField label="Reg Hrs" value={itemForm.regular_hours} onChange={v => setItemForm(f => ({ ...f, regular_hours: v }))} />
                  <NumField label="OT Hrs" value={itemForm.overtime_hours} onChange={v => setItemForm(f => ({ ...f, overtime_hours: v }))} />
                  <NumField label="Hourly Rate" value={itemForm.hourly_rate} onChange={v => setItemForm(f => ({ ...f, hourly_rate: v }))} step="0.01" />
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <NumField label="Holiday Hrs" value={itemForm.holiday_hours} onChange={v => setItemForm(f => ({ ...f, holiday_hours: v }))} />
                  <NumField label="Sick Hrs" value={itemForm.sick_hours} onChange={v => setItemForm(f => ({ ...f, sick_hours: v }))} />
                  <NumField label="Vacation Hrs" value={itemForm.vacation_hours} onChange={v => setItemForm(f => ({ ...f, vacation_hours: v }))} />
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <NumField label="Bonus" value={itemForm.bonus_amount} onChange={v => setItemForm(f => ({ ...f, bonus_amount: v }))} step="0.01" />
                  <NumField label="Allowance" value={itemForm.allowance_amount} onChange={v => setItemForm(f => ({ ...f, allowance_amount: v }))} step="0.01" />
                  <NumField label="Reimbursement" value={itemForm.reimbursement_amount} onChange={v => setItemForm(f => ({ ...f, reimbursement_amount: v }))} step="0.01" />
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <NumField label="Salary Override" value={itemForm.salary_override} onChange={v => setItemForm(f => ({ ...f, salary_override: v }))} step="0.01" />
                  <NumField label="Vacation Pay $" value={itemForm.vacation_pay_amount} onChange={v => setItemForm(f => ({ ...f, vacation_pay_amount: v }))} step="0.01" />
                  <div>
                    <Label className="text-xs">Pay Method</Label>
                    <Select value={itemForm.pay_method} onValueChange={v => setItemForm(f => ({ ...f, pay_method: v }))}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="direct_deposit">Direct Deposit</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="e_transfer">E-Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              {/* ── Statutory Deductions ── */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-destructive mb-2">Statutory Deductions</h4>
                <div className="grid grid-cols-3 gap-2">
                  <NumField label="CPP" value={itemForm.cpp_amount} onChange={v => setItemForm(f => ({ ...f, cpp_amount: v }))} step="0.01" />
                  <NumField label="EI" value={itemForm.ei_amount} onChange={v => setItemForm(f => ({ ...f, ei_amount: v }))} step="0.01" />
                  <NumField label="Income Tax" value={itemForm.income_tax_amount} onChange={v => setItemForm(f => ({ ...f, income_tax_amount: v }))} step="0.01" />
                </div>
              </div>

              <Separator />

              {/* ── Employee-Paid Benefit Deductions ── */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-orange-600 mb-2">Employee Benefit Deductions</h4>
                <div className="grid grid-cols-3 gap-2">
                  <NumField label="Union Dues" value={itemForm.union_dues} onChange={v => setItemForm(f => ({ ...f, union_dues: v }))} step="0.01" />
                  <NumField label="Pension / RPP" value={itemForm.pension_rpp} onChange={v => setItemForm(f => ({ ...f, pension_rpp: v }))} step="0.01" />
                  <NumField label="RRSP / PRPP" value={itemForm.rrsp_prpp} onChange={v => setItemForm(f => ({ ...f, rrsp_prpp: v }))} step="0.01" />
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <NumField label="Health Premium" value={itemForm.employee_health_premium} onChange={v => setItemForm(f => ({ ...f, employee_health_premium: v }))} step="0.01" />
                  <NumField label="Dental Premium" value={itemForm.employee_dental_premium} onChange={v => setItemForm(f => ({ ...f, employee_dental_premium: v }))} step="0.01" />
                  <NumField label="Vision Premium" value={itemForm.employee_vision_premium} onChange={v => setItemForm(f => ({ ...f, employee_vision_premium: v }))} step="0.01" />
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <NumField label="Group Life" value={itemForm.group_life_premium} onChange={v => setItemForm(f => ({ ...f, group_life_premium: v }))} step="0.01" />
                  <NumField label="LTD / Disability" value={itemForm.ltd_premium} onChange={v => setItemForm(f => ({ ...f, ltd_premium: v }))} step="0.01" />
                  <NumField label="EAP" value={itemForm.eap_premium} onChange={v => setItemForm(f => ({ ...f, eap_premium: v }))} step="0.01" />
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <NumField label="Voluntary Ded." value={itemForm.voluntary_deductions} onChange={v => setItemForm(f => ({ ...f, voluntary_deductions: v }))} step="0.01" />
                  <NumField label="Garnishments" value={itemForm.garnishments} onChange={v => setItemForm(f => ({ ...f, garnishments: v }))} step="0.01" />
                  <NumField label="Overpayment Rec." value={itemForm.overpayment_recovery} onChange={v => setItemForm(f => ({ ...f, overpayment_recovery: v }))} step="0.01" />
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <NumField label="Other Deductions" value={itemForm.other_deductions_amount} onChange={v => setItemForm(f => ({ ...f, other_deductions_amount: v }))} step="0.01" />
                </div>
              </div>

              <Separator />

              {/* ── Employer Contributions ── */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-2">Employer Contributions</h4>
                <div className="grid grid-cols-3 gap-2">
                  <NumField label="Employer CPP" value={itemForm.employer_cpp} onChange={v => setItemForm(f => ({ ...f, employer_cpp: v }))} step="0.01" />
                  <NumField label="Employer EI" value={itemForm.employer_ei} onChange={v => setItemForm(f => ({ ...f, employer_ei: v }))} step="0.01" />
                  <NumField label="Pension Match" value={itemForm.employer_pension_match} onChange={v => setItemForm(f => ({ ...f, employer_pension_match: v }))} step="0.01" />
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <NumField label="Health Premium" value={itemForm.employer_health_premium} onChange={v => setItemForm(f => ({ ...f, employer_health_premium: v }))} step="0.01" />
                  <NumField label="Dental Premium" value={itemForm.employer_dental_premium} onChange={v => setItemForm(f => ({ ...f, employer_dental_premium: v }))} step="0.01" />
                  <NumField label="Group Life" value={itemForm.employer_group_life} onChange={v => setItemForm(f => ({ ...f, employer_group_life: v }))} step="0.01" />
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <NumField label="Employer LTD" value={itemForm.employer_ltd} onChange={v => setItemForm(f => ({ ...f, employer_ltd: v }))} step="0.01" />
                  <NumField label="Benefit Contrib." value={itemForm.employer_benefit_contribution} onChange={v => setItemForm(f => ({ ...f, employer_benefit_contribution: v }))} step="0.01" />
                  <NumField label="Retirement Match" value={itemForm.employer_retirement_match} onChange={v => setItemForm(f => ({ ...f, employer_retirement_match: v }))} step="0.01" />
                </div>
              </div>

              <Separator />

              {/* ── Live Summary ── */}
              <Card className="bg-muted/50">
                <CardContent className="p-4 space-y-1.5 text-sm">
                  <div className="flex justify-between"><span>Gross Earnings</span><span className="font-semibold">{fmt(gross)}</span></div>
                  <div className="flex justify-between"><span>Employee Deductions</span><span className="text-destructive font-medium">–{fmt(ded)}</span></div>
                  <Separator className="my-1" />
                  <div className="flex justify-between font-bold text-base"><span>Net Pay</span><span>{fmt(gross - ded)}</span></div>
                  <Separator className="my-1" />
                  <div className="flex justify-between text-muted-foreground"><span>Employer Contributions (info only)</span><span className="text-emerald-600 font-medium">{fmt(empContrib)}</span></div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
          <DialogFooter className="px-6 pb-6 pt-2">
            <Button onClick={handleSaveItem} disabled={createItem.isPending || updateItem.isPending}>
              {editingItemId ? 'Save Changes' : 'Add Employee'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── Reusable number field ── */
function NumField({ label, value, onChange, step = '1' }: { label: string; value: number; onChange: (v: number) => void; step?: string }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input type="number" step={step} className="h-9" value={value || ''} onChange={e => onChange(Number(e.target.value) || 0)} />
    </div>
  );
}
