import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useFinanceAccounts, useCreateFinanceAccount, useUpdateFinanceAccount } from '@/hooks/useFinanceAccounts';
import { Plus, Landmark, CreditCard, Wallet, PiggyBank, Building2 } from 'lucide-react';

const fmt = (n: number) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(n);

const ACCOUNT_TYPES = [
  { value: 'bank_operating', label: 'Operating Bank Account', icon: Landmark },
  { value: 'bank_savings', label: 'Savings / Reserve', icon: PiggyBank },
  { value: 'credit_card', label: 'Credit Card', icon: CreditCard },
  { value: 'petty_cash', label: 'Petty Cash', icon: Wallet },
  { value: 'line_of_credit', label: 'Line of Credit', icon: Building2 },
  { value: 'loan', label: 'Loan / Financing', icon: Building2 },
  { value: 'stripe_clearing', label: 'Stripe Clearing', icon: CreditCard },
  { value: 'other', label: 'Other', icon: Wallet },
];

const typeLabel = (t: string) => ACCOUNT_TYPES.find(a => a.value === t)?.label || t;

export default function FinanceAccounts() {
  const [showCreate, setShowCreate] = useState(false);
  const [editAccount, setEditAccount] = useState<any>(null);
  const [form, setForm] = useState<any>({});

  const { data: accounts, isLoading } = useFinanceAccounts();
  const createAccount = useCreateFinanceAccount();
  const updateAccount = useUpdateFinanceAccount();

  const active = (accounts ?? []).filter((a: any) => a.is_active);
  const inactive = (accounts ?? []).filter((a: any) => !a.is_active);
  const totalBalance = active.reduce((s: number, a: any) => s + Number(a.current_balance_manual || 0), 0);

  const openCreate = () => { setForm({ account_type: 'bank_operating', is_active: true }); setEditAccount(null); setShowCreate(true); };
  const openEdit = (a: any) => { setForm({ ...a }); setEditAccount(a); setShowCreate(true); };

  const handleSave = () => {
    if (editAccount) {
      updateAccount.mutate({ id: editAccount.id, ...form }, { onSuccess: () => { setShowCreate(false); setForm({}); } });
    } else {
      createAccount.mutate(form, { onSuccess: () => { setShowCreate(false); setForm({}); } });
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Financial Accounts</h1>
          <p className="text-sm text-muted-foreground">Manage bank accounts, cards, and payment sources</p>
        </div>
        <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> New Account</Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Active Accounts</p><p className="text-lg font-bold text-primary">{active.length}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Total Balance</p><p className="text-lg font-bold text-accent">{fmt(totalBalance)}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Inactive</p><p className="text-lg font-bold text-muted-foreground">{inactive.length}</p></CardContent></Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : (accounts ?? []).length === 0 ? (
            <div className="p-12 text-center">
              <Landmark className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No accounts set up yet</p>
              <Button size="sm" className="mt-3" onClick={openCreate}>Add First Account</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Institution</TableHead>
                    <TableHead>Account #</TableHead>
                    <TableHead className="text-right">Opening Balance</TableHead>
                    <TableHead className="text-right">Current Balance</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(accounts ?? []).map((a: any) => (
                    <TableRow key={a.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openEdit(a)}>
                      <TableCell className="font-medium">{a.account_name}</TableCell>
                      <TableCell className="text-sm">{typeLabel(a.account_type)}</TableCell>
                      <TableCell className="text-sm">{a.institution_name || '—'}</TableCell>
                      <TableCell className="text-sm font-mono">{a.masked_account_number || '—'}</TableCell>
                      <TableCell className="text-right text-sm">{fmt(Number(a.opening_balance))}</TableCell>
                      <TableCell className="text-right font-semibold">{fmt(Number(a.current_balance_manual))}</TableCell>
                      <TableCell>
                        <Badge variant={a.is_active ? 'default' : 'secondary'}>{a.is_active ? 'Active' : 'Inactive'}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editAccount ? 'Edit Account' : 'New Account'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Account Name</Label><Input value={form.account_name || ''} onChange={e => setForm({ ...form, account_name: e.target.value })} placeholder="e.g. RBC Business Chequing" /></div>
            <div>
              <Label>Account Type</Label>
              <Select value={form.account_type || 'bank_operating'} onValueChange={v => setForm({ ...form, account_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ACCOUNT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Institution Name</Label><Input value={form.institution_name || ''} onChange={e => setForm({ ...form, institution_name: e.target.value })} /></div>
            <div><Label>Masked Account # (last 4)</Label><Input value={form.masked_account_number || ''} onChange={e => setForm({ ...form, masked_account_number: e.target.value })} placeholder="••••1234" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Opening Balance</Label><Input type="number" step="0.01" value={form.opening_balance ?? ''} onChange={e => setForm({ ...form, opening_balance: e.target.value })} /></div>
              <div><Label>Current Balance</Label><Input type="number" step="0.01" value={form.current_balance_manual ?? ''} onChange={e => setForm({ ...form, current_balance_manual: e.target.value })} /></div>
            </div>
            <div><Label>Notes</Label><Textarea rows={2} value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active ?? true} onCheckedChange={v => setForm({ ...form, is_active: v })} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.account_name}>{editAccount ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
