import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Receipt, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

function usePMStaffExpenseClaims() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['pm_staff_expense_claims', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('worker_expense_claims')
        .select('id, expense_date, amount, category, description, receipt_url, status, admin_notes, created_at')
        .eq('user_id', user.id)
        .order('expense_date', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });
}

const CATEGORIES = ['Fuel', 'Mileage', 'Supplies', 'Meals', 'Parking', 'Tools', 'Other'];

export default function PMStaffExpenseClaimsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data = [], isLoading } = usePMStaffExpenseClaims();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ expense_date: new Date().toISOString().slice(0, 10), amount: '', category: 'Supplies', description: '', receipt_url: '' });

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('worker_expense_claims').insert({
        user_id: user.id,
        expense_date: form.expense_date,
        amount: Number(form.amount),
        category: form.category,
        description: form.description || null,
        receipt_url: form.receipt_url || null,
        status: 'submitted',
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Expense claim submitted');
      setOpen(false);
      setForm({ expense_date: new Date().toISOString().slice(0, 10), amount: '', category: 'Supplies', description: '', receipt_url: '' });
      qc.invalidateQueries({ queryKey: ['pm_staff_expense_claims'] });
    },
    onError: (e: any) => toast.error(e?.message ?? 'Failed to submit'),
  });

  const statusVariant = (s?: string) =>
    s === 'approved' || s === 'paid' ? 'default'
      : s === 'declined' ? 'destructive'
      : 'secondary';

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-emerald-700" />
          <h2 className="text-lg font-semibold">Expense Claims</h2>
        </div>
        <Button size="sm" onClick={() => setOpen((o) => !o)} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-1" /> New
        </Button>
      </div>

      {open && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Submit expense claim</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Date</Label>
                <Input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Amount (CAD)</Label>
                <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Category</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div className="space-y-1">
              <Label>Receipt URL (optional)</Label>
              <Input value={form.receipt_url} onChange={(e) => setForm({ ...form, receipt_url: e.target.value })} placeholder="https://…" />
              <p className="text-[11px] text-muted-foreground">Direct file upload coming soon.</p>
            </div>
            <Button
              className="w-full"
              disabled={!form.amount || submit.isPending}
              onClick={() => submit.mutate()}
            >
              {submit.isPending ? 'Submitting…' : 'Submit'}
            </Button>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : data.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No expense claims yet.</CardContent></Card>
      ) : (
        data.map((c: any) => (
          <Card key={c.id}>
            <CardContent className="p-3 space-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{c.category} — ${Number(c.amount).toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(c.expense_date), 'MMM d, yyyy')}</p>
                </div>
                <Badge variant={statusVariant(c.status) as any} className="text-[10px] capitalize">{c.status ?? 'submitted'}</Badge>
              </div>
              {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
              {c.admin_notes && <p className="text-xs italic text-muted-foreground">Admin: {c.admin_notes}</p>}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
