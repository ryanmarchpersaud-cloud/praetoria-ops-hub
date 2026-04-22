import { useState } from 'react';
import { useWorkerProfile, useWorkerTimeOff } from '@/hooks/useWorkerProfile';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CalendarDays, Plane, Thermometer, User, Plus, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

const statusColors: Record<string, string> = {
  approved: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-500/10 text-amber-700 border-amber-200',
  denied: 'bg-destructive/10 text-destructive border-destructive/20',
};

const typeIcons: Record<string, React.ElementType> = {
  vacation: Plane,
  sick: Thermometer,
  personal: User,
};

export default function WorkerTimeOffPage() {
  const { data: profile } = useWorkerProfile();
  const { data: requests = [], isLoading } = useWorkerTimeOff();
  const [showRequest, setShowRequest] = useState(false);

  if (isLoading) {
    return (
      <div className="px-4 pt-3 pb-4 space-y-4">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-36 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-3 pb-4 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Time Off</h1>
        <Button size="sm" variant="outline" onClick={() => setShowRequest(true)}>
          <Plus className="h-4 w-4 mr-1" /> Request
        </Button>
      </div>

      {/* Balances */}
      <div className="grid grid-cols-3 gap-2">
        <BalanceCard icon={Plane} label="Vacation" value={profile?.vacation_balance ?? 0} />
        <BalanceCard icon={Thermometer} label="Sick" value={profile?.sick_balance ?? 0} />
        <BalanceCard icon={User} label="Personal" value={profile?.personal_days_balance ?? 0} />
      </div>

      {/* Requests */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4" /> Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No time off requests yet.</p>
          ) : (
            <div className="space-y-2.5">
              {requests.map(r => {
                const Icon = typeIcons[r.request_type] ?? CalendarDays;
                return (
                  <div key={r.id} className="flex items-start justify-between gap-2 py-2 border-b last:border-0">
                    <div className="flex items-start gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium capitalize">{r.request_type} · {r.days_requested}d</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(r.start_date), 'MMM d')} – {format(new Date(r.end_date), 'MMM d, yyyy')}
                        </p>
                        {r.reason && <p className="text-xs text-muted-foreground mt-0.5">{r.reason}</p>}
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${statusColors[r.status] ?? ''}`}>
                      {r.status}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <RequestDialog open={showRequest} onClose={() => setShowRequest(false)} />
    </div>
  );
}

function BalanceCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-3 text-center">
        <Icon className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
        <p className="text-xl font-bold text-foreground">{value}</p>
        <p className="text-[10px] text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function RequestDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [type, setType] = useState('vacation');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [days, setDays] = useState('1');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => { setType('vacation'); setStartDate(''); setEndDate(''); setDays('1'); setReason(''); };

  const handleSubmit = async () => {
    if (!startDate || !endDate || !user) {
      toast({ title: 'Please fill required fields', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('employee_time_off_requests').insert([{
        user_id: user.id,
        request_type: type,
        start_date: startDate,
        end_date: endDate,
        days_requested: Number(days) || 1,
        reason: reason.trim() || null,
      }]);
      if (error) throw error;
      toast({ title: 'Time off requested' });
      qc.invalidateQueries({ queryKey: ['worker_time_off'] });
      reset();
      onClose();
    } catch (e: any) {
      toast({ title: 'Failed to submit', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => { reset(); onClose(); }}>
      <DialogContent className="max-w-sm max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-4 pt-4 pb-2 shrink-0">
          <DialogTitle>Request Time Off</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 px-4 overflow-y-auto flex-1">
          <div>
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="vacation">Vacation</SelectItem>
                <SelectItem value="sick">Sick</SelectItem>
                <SelectItem value="personal">Personal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Days Requested</Label>
            <Input type="number" min="0.5" step="0.5" value={days} onChange={e => setDays(e.target.value)} />
          </div>
          <div>
            <Label>Reason (optional)</Label>
            <Textarea placeholder="Brief reason…" value={reason} onChange={e => setReason(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter className="px-4 py-3 border-t shrink-0 gap-2">
          <Button variant="outline" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>{submitting ? 'Submitting…' : 'Submit'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
