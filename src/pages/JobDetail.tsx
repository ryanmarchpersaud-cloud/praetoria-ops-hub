import { useParams, useNavigate } from 'react-router-dom';
import { useJob, useJobVisits, useUpdateJob } from '@/hooks/useJobs';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, ClipboardCheck, MapPin } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { JOB_STATUSES, JOB_PRIORITIES, SERVICE_CATEGORIES } from '@/lib/constants';

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: job, isLoading } = useJob(id);
  const { data: visits = [] } = useJobVisits(id);
  const updateJob = useUpdateJob();
  const { toast } = useToast();
  const [form, setForm] = useState<any>({});

  useEffect(() => { if (job) setForm(job); }, [job]);

  if (isLoading) return <div className="p-8 text-muted-foreground text-sm">Loading...</div>;
  if (!job) return <div className="p-8 text-muted-foreground text-sm">Job not found</div>;

  const set = (key: string, value: any) => setForm((p: any) => ({ ...p, [key]: value }));
  const customer = (job as any).customers;
  const property = (job as any).properties;

  const handleSave = async () => {
    if (!id) return;
    try {
      await updateJob.mutateAsync({
        id, job_title: form.job_title, service_category: form.service_category,
        scope_of_work: form.scope_of_work, priority: form.priority,
        scheduled_date: form.scheduled_date || null, status: form.status,
        internal_notes: form.internal_notes,
      });
      toast({ title: 'Job saved' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9" onClick={() => navigate('/jobs')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg md:text-xl font-bold truncate">{form.job_title}</h1>
            <StatusBadge status={form.status || 'Draft'} />
          </div>
          <p className="text-xs text-muted-foreground mono">{job.job_number}</p>
        </div>
      </div>

      <Button onClick={handleSave} className="w-full h-11" disabled={updateJob.isPending}>
        <Save className="h-4 w-4 mr-2" /> Save Job
      </Button>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div><Label className="text-xs">Job Title</Label><Input value={form.job_title || ''} onChange={e => set('job_title', e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Service Category</Label>
                  <select value={form.service_category || ''} onChange={e => set('service_category', e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-10">
                    {SERVICE_CATEGORIES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Priority</Label>
                  <select value={form.priority || ''} onChange={e => set('priority', e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-10">
                    {JOB_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Status</Label>
                  <select value={form.status || ''} onChange={e => set('status', e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-10">
                    {JOB_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div><Label className="text-xs">Scheduled Date</Label><Input type="date" value={form.scheduled_date || ''} onChange={e => set('scheduled_date', e.target.value)} /></div>
              </div>
              <div><Label className="text-xs">Scope of Work</Label><Textarea value={form.scope_of_work || ''} onChange={e => set('scope_of_work', e.target.value)} rows={4} /></div>
              <div><Label className="text-xs">Internal Notes</Label><Textarea value={form.internal_notes || ''} onChange={e => set('internal_notes', e.target.value)} rows={2} /></div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          {/* Customer & Property */}
          {customer && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">Customer</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p className="font-medium">{customer.first_name} {customer.last_name}</p>
                {customer.company_name && <p className="text-muted-foreground text-xs">{customer.company_name}</p>}
              </CardContent>
            </Card>
          )}

          {property && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" /> Property
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <Link to={`/properties/${property.id}`} className="font-medium text-primary hover:underline">{property.property_name}</Link>
                {property.address_line_1 && <p className="text-xs text-muted-foreground">{property.address_line_1}, {property.city}</p>}
              </CardContent>
            </Card>
          )}

          {/* Visits */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <ClipboardCheck className="h-3.5 w-3.5" /> Visits ({visits.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {visits.length === 0 ? <p className="text-xs text-muted-foreground">No visits yet</p> : visits.map((v: any) => (
                <Link key={v.id} to={`/visits/${v.id}`} className="block p-2 rounded border hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium">{v.visit_number}</p>
                      <p className="text-[10px] text-muted-foreground">{v.service_date} · {v.visit_type}</p>
                    </div>
                    <StatusBadge status={v.visit_status} showIcon={false} />
                  </div>
                </Link>
              ))}
              <Link to={`/visits?job=${id}`} className="text-xs text-primary hover:underline block mt-2">View all visits →</Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
