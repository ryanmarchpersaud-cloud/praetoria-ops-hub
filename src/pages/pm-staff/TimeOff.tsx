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
import { CalendarDays, Plus } from 'lucide-react';
import { format, differenceInCalendarDays } from 'date-fns';
import { toast } from 'sonner';

const TYPES = [
  { value: 'vacation', label: 'Vacation' },
  { value: 'sick', label: 'Sick day' },
  { value: 'personal', label: 'Personal day' },
  { value: 'other', label: 'Other' },
];

function usePMStaffTimeOff() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['pm_staff_time_off', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('employee_time_off_requests')
        .select('id, request_type, start_date, end_date, days_requested, reason, status, admin_notes, created_at')
        .eq('user_id', user.id)
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });
}

export default function PMStaffTimeOffPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data = [], isLoading } = usePMStaffTimeOff();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ request_type: 'vacation', start_date: '', end_date: '', reason: '' });

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const days = form.start_date && form.end_date
        ? Math.max(1, differenceInCalendarDays(new Date(form.end_date), new Date(form.start_date)) + 1)
        : 1;
      const { error } = await supabase.from('employee_time_off_requests').insert({
        user_id: user.id,
        request_type: form.request_type,
        start_date: form.start_date,
        end_date: form.end_date,
        days_requested: days,
        reason: form.reason || null,
        status: 'pending',
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Request submitted');
      setOpen(false);
      setForm({ request_type: 'vacation', start_date: '', end_date: '', reason: '' });
      qc.invalidateQueries({ queryKey: ['pm_staff_time_off'] });
    },
    onError: (e: any) => toast.error(e?.message ?? 'Failed to submit'),
  });

  const statusVariant = (s?: string) =>
    s === 'approved' ? 'default' : s === 'denied' || s === 'declined' ? 'destructive' : 'secondary';

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-emerald-700" />
          <h2 className="text-lg font-semibold">Time Off / Sick Days</h2>
        </div>
        <Button size="sm" onClick={() => setOpen((o) => !o)} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-1" /> New
        </Button>
      </div>

      {open && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Submit request</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>Type</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={form.request_type}
                onChange={(e) => setForm({ ...form, request_type: e.target.value })}
              >
                {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Start date</Label>
                <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>End date</Label>
                <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Reason / notes</Label>
              <Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={2} />
            </div>
            <Button
              className="w-full"
              disabled={!form.start_date || !form.end_date || submit.isPending}
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
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No time-off requests yet.</CardContent></Card>
      ) : (
        data.map((r: any) => (
          <Card key={r.id}>
            <CardContent className="p-3 space-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium capitalize">{r.request_type}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(r.start_date), 'MMM d')} – {format(new Date(r.end_date), 'MMM d, yyyy')} · {r.days_requested} day(s)
                  </p>
                </div>
                <Badge variant={statusVariant(r.status) as any} className="text-[10px] capitalize">{r.status ?? 'pending'}</Badge>
              </div>
              {r.reason && <p className="text-xs text-muted-foreground">{r.reason}</p>}
              {r.admin_notes && <p className="text-xs italic text-muted-foreground">Admin: {r.admin_notes}</p>}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
