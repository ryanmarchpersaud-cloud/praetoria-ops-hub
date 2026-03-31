import { useState } from 'react';
import { useCompensationRecords, useAddCompensationRecord, useReviewSchedules, useUpsertReview } from '@/hooks/useHRModules';
import { HRFileAttachments } from '@/components/hr/HRFileAttachments';
import { useEmployees } from '@/hooks/useEmployees';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, DollarSign, Calendar, TrendingUp, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, differenceInDays, isPast } from 'date-fns';

export default function HRCompensationPage() {
  const { data: records = [], isLoading: loadR } = useCompensationRecords();
  const { data: reviews = [], isLoading: loadV } = useReviewSchedules();
  const { data: employees = [] } = useEmployees();
  const addRecord = useAddCompensationRecord();
  const upsertReview = useUpsertReview();

  const [compOpen, setCompOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [compForm, setCompForm] = useState({ employee_user_id: '', record_type: 'pay_rate', effective_date: new Date().toISOString().split('T')[0], pay_rate: '', pay_type: 'hourly', notes: '' });
  const [revForm, setRevForm] = useState({ employee_user_id: '', review_type: 'annual', scheduled_date: '', notes: '' });

  const getEmpName = (uid: string) => employees.find(e => e.user_id === uid)?.full_name ?? 'Unknown';
  const activeEmps = employees.filter(e => e.employment_status === 'active');

  const handleAddComp = async () => {
    if (!compForm.employee_user_id || !compForm.effective_date) return;
    try {
      await addRecord.mutateAsync({ ...compForm, pay_rate: compForm.pay_rate ? Number(compForm.pay_rate) : undefined });
      toast.success('Record added');
      setCompOpen(false);
    } catch { toast.error('Failed'); }
  };

  const handleAddReview = async () => {
    if (!revForm.employee_user_id || !revForm.scheduled_date) return;
    try {
      await upsertReview.mutateAsync(revForm);
      toast.success('Review scheduled');
      setReviewOpen(false);
    } catch { toast.error('Failed'); }
  };

  const markReviewComplete = async (review: any) => {
    try {
      await upsertReview.mutateAsync({ ...review, status: 'completed', completed_at: new Date().toISOString() });
      toast.success('Marked complete');
    } catch { toast.error('Failed'); }
  };

  const upcomingReviews = reviews.filter((r: any) => r.status === 'scheduled');
  const overdueReviews = upcomingReviews.filter((r: any) => isPast(new Date(r.scheduled_date)));

  if (loadR || loadV) return <div className="space-y-3 p-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-40 w-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Compensation & Reviews</h1>
          <p className="text-sm text-muted-foreground">Pay rates, raise history, and performance review scheduling</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-primary/10 text-primary"><DollarSign className="h-4 w-4" /></div>
          <div><p className="text-xl font-bold text-foreground">{records.length}</p><p className="text-[10px] text-muted-foreground">Pay Records</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-3 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-blue-500/10 text-blue-600"><Calendar className="h-4 w-4" /></div>
          <div><p className="text-xl font-bold text-foreground">{upcomingReviews.length}</p><p className="text-[10px] text-muted-foreground">Upcoming Reviews</p></div>
        </CardContent></Card>
        <Card className={overdueReviews.length > 0 ? 'border-destructive/30' : ''}><CardContent className="p-3 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-destructive/10 text-destructive"><AlertTriangle className="h-4 w-4" /></div>
          <div><p className="text-xl font-bold text-foreground">{overdueReviews.length}</p><p className="text-[10px] text-muted-foreground">Overdue Reviews</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-3 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-emerald-500/10 text-emerald-600"><TrendingUp className="h-4 w-4" /></div>
          <div><p className="text-xl font-bold text-foreground">{reviews.filter((r: any) => r.status === 'completed').length}</p><p className="text-[10px] text-muted-foreground">Completed Reviews</p></div>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="compensation">
        <TabsList>
          <TabsTrigger value="compensation">Compensation History</TabsTrigger>
          <TabsTrigger value="reviews">Review Schedule {overdueReviews.length > 0 && <Badge variant="destructive" className="ml-1 text-[10px] px-1">{overdueReviews.length}</Badge>}</TabsTrigger>
        </TabsList>

        <TabsContent value="compensation" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Dialog open={compOpen} onOpenChange={setCompOpen}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Add Record</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Compensation Record</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Employee</Label>
                    <Select value={compForm.employee_user_id} onValueChange={v => setCompForm({ ...compForm, employee_user_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>{activeEmps.map(e => <SelectItem key={e.user_id} value={e.user_id}>{e.full_name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Type</Label>
                      <Select value={compForm.record_type} onValueChange={v => setCompForm({ ...compForm, record_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pay_rate">Pay Rate</SelectItem>
                          <SelectItem value="raise">Raise</SelectItem>
                          <SelectItem value="bonus">Bonus</SelectItem>
                          <SelectItem value="adjustment">Adjustment</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Pay Type</Label>
                      <Select value={compForm.pay_type} onValueChange={v => setCompForm({ ...compForm, pay_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hourly">Hourly</SelectItem>
                          <SelectItem value="salary">Salary</SelectItem>
                          <SelectItem value="contract">Contract</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Rate / Amount ($)</Label><Input type="number" value={compForm.pay_rate} onChange={e => setCompForm({ ...compForm, pay_rate: e.target.value })} /></div>
                    <div><Label>Effective Date</Label><Input type="date" value={compForm.effective_date} onChange={e => setCompForm({ ...compForm, effective_date: e.target.value })} /></div>
                  </div>
                  <div><Label>Notes</Label><Input value={compForm.notes} onChange={e => setCompForm({ ...compForm, notes: e.target.value })} /></div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setCompOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddComp} disabled={!compForm.employee_user_id}>Save</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {records.length === 0 ? (
            <Card className="border-dashed"><CardContent className="p-8 text-center text-muted-foreground">No compensation records yet</CardContent></Card>
          ) : (
            <Card>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Employee</TableHead><TableHead>Type</TableHead><TableHead>Rate</TableHead><TableHead>Pay Type</TableHead><TableHead>Effective</TableHead><TableHead>Notes</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {records.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell><Link to={`/employees/${r.employee_user_id}`} className="hover:underline font-medium">{getEmpName(r.employee_user_id)}</Link></TableCell>
                      <TableCell><Badge variant="outline" className="capitalize text-xs">{r.record_type?.replace('_', ' ')}</Badge></TableCell>
                      <TableCell className="font-mono">{r.pay_rate ? `$${Number(r.pay_rate).toFixed(2)}` : '—'}</TableCell>
                      <TableCell className="capitalize text-sm">{r.pay_type}</TableCell>
                      <TableCell className="text-sm">{format(new Date(r.effective_date), 'MMM d, yyyy')}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{r.notes || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="reviews" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Schedule Review</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Schedule Review</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Employee</Label>
                    <Select value={revForm.employee_user_id} onValueChange={v => setRevForm({ ...revForm, employee_user_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>{activeEmps.map(e => <SelectItem key={e.user_id} value={e.user_id}>{e.full_name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Review Type</Label>
                      <Select value={revForm.review_type} onValueChange={v => setRevForm({ ...revForm, review_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="annual">Annual</SelectItem>
                          <SelectItem value="probation">Probation End</SelectItem>
                          <SelectItem value="mid_year">Mid-Year</SelectItem>
                          <SelectItem value="performance_improvement">Performance Improvement</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Date</Label><Input type="date" value={revForm.scheduled_date} onChange={e => setRevForm({ ...revForm, scheduled_date: e.target.value })} /></div>
                  </div>
                  <div><Label>Notes</Label><Input value={revForm.notes} onChange={e => setRevForm({ ...revForm, notes: e.target.value })} /></div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setReviewOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddReview} disabled={!revForm.employee_user_id || !revForm.scheduled_date}>Schedule</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {reviews.length === 0 ? (
            <Card className="border-dashed"><CardContent className="p-8 text-center text-muted-foreground">No reviews scheduled</CardContent></Card>
          ) : (
            <Card>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Employee</TableHead><TableHead>Type</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {reviews.map((r: any) => {
                    const overdue = r.status === 'scheduled' && isPast(new Date(r.scheduled_date));
                    return (
                      <TableRow key={r.id} className={overdue ? 'bg-destructive/5' : ''}>
                        <TableCell><Link to={`/employees/${r.employee_user_id}`} className="hover:underline font-medium">{getEmpName(r.employee_user_id)}</Link></TableCell>
                        <TableCell><Badge variant="outline" className="capitalize text-xs">{r.review_type?.replace('_', ' ')}</Badge></TableCell>
                        <TableCell className="text-sm">{format(new Date(r.scheduled_date), 'MMM d, yyyy')}{overdue && <Badge variant="destructive" className="ml-2 text-[10px]">Overdue</Badge>}</TableCell>
                        <TableCell><Badge variant={r.status === 'completed' ? 'default' : 'secondary'} className="capitalize text-xs">{r.status}</Badge></TableCell>
                        <TableCell>{r.status === 'scheduled' && <Button variant="outline" size="sm" onClick={() => markReviewComplete(r)}>Complete</Button>}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
