import { useParams, useNavigate } from 'react-router-dom';
import { sendNotification } from '@/hooks/useNotifications';
import { useActionPermissions } from '@/hooks/useActionPermissions';
import { useJob, useJobVisits, useUpdateJob, useDeleteJob } from '@/hooks/useJobs';
import { useCreateVisit } from '@/hooks/useVisits';
import { useEmployees } from '@/hooks/useEmployees';
import { useAllSubcontractors } from '@/hooks/useSubcontractor';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, ClipboardCheck, MapPin, FileText, Plus, Receipt, LinkIcon, UserCheck, Trash2, XCircle, Gift, FileCheck2, Undo2 } from 'lucide-react';
import { ProofOfServiceDialog } from '@/components/visits/ProofOfServiceDialog';
import { ReinstateJobDialog } from '@/components/schedule/ReinstateJobDialog';
import { DirectionsButton } from '@/components/DirectionsButton';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { JOB_STATUSES, JOB_PRIORITIES, SERVICE_CATEGORIES } from '@/lib/constants';
import { RecurringPlanCard } from '@/components/RecurringPlanCard';
import { format, parseISO, eachWeekOfInterval, eachMonthOfInterval } from 'date-fns';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CreateInvoiceFromWorkDialog } from '@/components/CreateInvoiceFromWorkDialog';
import { AddToJobCostTrackerButton } from '@/components/dashboard/AddToJobCostTrackerButton';
import { JobPricingCard } from '@/components/JobPricingCard';

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: job, isLoading } = useJob(id);
  const { data: visits = [] } = useJobVisits(id);
  const { data: employees = [] } = useEmployees();
  const { data: subcontractors = [] } = useAllSubcontractors();
  const updateJob = useUpdateJob();
  const deleteJob = useDeleteJob();
  const createVisit = useCreateVisit();
  const { toast } = useToast();
  const [form, setForm] = useState<any>({});
  const [generating, setGenerating] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [proofOpen, setProofOpen] = useState(false);
  const { canManageJobs, canManageVisits } = useActionPermissions();

  // Fetch linked invoices
  const { data: linkedInvoices = [] } = useQuery({
    queryKey: ['job_linked_invoices', id],
    queryFn: async () => {
      if (!id) return [];
      const { data } = await supabase.from('invoices').select('id, invoice_number, status, total').eq('job_id', id);
      return data || [];
    },
    enabled: !!id,
  });

  // Fetch job line items for invoice creation
  const { data: jobLineItems = [] } = useQuery({
    queryKey: ['job_line_items', id],
    queryFn: async () => {
      if (!id) return [];
      const { data } = await supabase.from('job_line_items').select('*').eq('job_id', id).order('sort_order');
      return data || [];
    },
    enabled: !!id,
  });
  const qc = useQueryClient();

  useEffect(() => { if (job) setForm(job); }, [job]);

  if (isLoading) return <div className="p-8 text-muted-foreground text-sm">Loading...</div>;
  if (!job) return <div className="p-8 text-muted-foreground text-sm">Job not found</div>;

  const set = (key: string, value: any) => setForm((p: any) => ({ ...p, [key]: value }));
  const customer = (job as any).customers;
  const property = (job as any).properties;
  const assignedWorker = employees.find((e: any) => e.user_id === form.assigned_to);
  const assignedSub = (subcontractors as any[]).find((s: any) => s.user_id === form.assigned_to);
  const assignedName = assignedWorker ? (assignedWorker as any).full_name : assignedSub ? (assignedSub as any).contact_name || (assignedSub as any).company_name : null;

  const handleSave = async () => {
    if (!id) return;
    try {
      const previousAssignedTo = job.assigned_to;
      await updateJob.mutateAsync({
        id, job_title: form.job_title, service_category: form.service_category,
        scope_of_work: form.scope_of_work, priority: form.priority,
        scheduled_date: form.scheduled_date || null, status: form.status,
        internal_notes: form.internal_notes,
        assigned_to: form.assigned_to || null,
        service_frequency: form.service_frequency || 'one-time',
        season_name: form.season_name || null,
        contract_start_date: form.contract_start_date || null,
        contract_end_date: form.contract_end_date || null,
        minimum_included_visits: form.minimum_included_visits || null,
        additional_visit_rate: form.additional_visit_rate || null,
        service_instructions: form.service_instructions || null,
      });

      // If assigned to a subcontractor, create/update subcontractor_assignment
      const assignedSubRecord = (subcontractors as any[]).find((s: any) => s.user_id === form.assigned_to);
      if (assignedSubRecord) {
        // Upsert: delete old assignment for this job, insert new
        await supabase.from('subcontractor_assignments').delete().eq('job_id', id as string);
        await supabase.from('subcontractor_assignments').insert({
          subcontractor_id: assignedSubRecord.id,
          job_id: id,
          property_id: form.property_id || null,
          assignment_status: 'assigned',
        } as any);
      }

      // Send worker_assigned notification if worker changed
      if (form.assigned_to && form.assigned_to !== previousAssignedTo) {
        try {
          const worker = employees.find((e: any) => e.user_id === form.assigned_to);
          await sendNotification({
            event: 'worker_assigned',
            recipient_id: form.assigned_to,
            record_type: 'job',
            record_id: id,
            channels: ['email', 'sms'],
            audience: 'worker',
            variables: {
              worker_name: worker?.full_name || '',
              job_number: form.job_number || '',
              job_title: form.job_title || '',
              service_type: form.service_category || '',
              property: property?.property_name || '',
              customer_name: customer ? `${customer.first_name} ${customer.last_name}` : '',
              scheduled_date: form.scheduled_date || '',
            },
          });
        } catch { /* non-critical */ }
      }

      toast({ title: 'Job saved' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleGenerateVisits = async () => {
    if (!id || !form.contract_start_date || !form.contract_end_date) return;
    const freq = form.service_frequency;
    if (freq === 'on-snowfall') {
      toast({ title: 'On-snowfall frequency', description: 'Visits for snowfall-triggered plans should be created manually or via automation when snow events occur.', variant: 'destructive' });
      return;
    }
    const start = parseISO(form.contract_start_date);
    const end = parseISO(form.contract_end_date);
    let dates: Date[] = [];
    if (freq === 'weekly') {
      dates = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
    } else if (freq === 'biweekly') {
      const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
      dates = weeks.filter((_, i) => i % 2 === 0);
    } else if (freq === 'monthly') {
      dates = eachMonthOfInterval({ start, end });
    } else if (freq === 'custom-seasonal') {
      dates = eachMonthOfInterval({ start, end });
    }
    if (dates.length === 0) {
      toast({ title: 'No visits to generate', description: 'Check frequency and date range', variant: 'destructive' });
      return;
    }
    const existingPlanned = visits.filter((v: any) =>
      ['Planned', 'Scheduled'].includes(v.visit_status) &&
      v.service_date >= form.contract_start_date &&
      v.service_date <= form.contract_end_date
    );
    if (existingPlanned.length > 0) {
      toast({ title: 'Planned visits already exist', description: `${existingPlanned.length} planned/scheduled visit(s) already exist in this date range. Delete them first to regenerate.`, variant: 'destructive' });
      return;
    }
    setGenerating(true);
    try {
      for (const date of dates) {
        await createVisit.mutateAsync({
          visit_number: '',
          job_id: id,
          property_id: (job as any).property_id || null,
          customer_id: (job as any).customer_id || null,
          service_date: format(date, 'yyyy-MM-dd'),
          visit_type: 'Routine',
          visit_status: 'Planned',
          crew_notes: form.service_instructions || null,
        });
      }
      qc.invalidateQueries({ queryKey: ['job_visits', id] });
      toast({ title: `${dates.length} planned visits generated` });
    } catch (err: any) {
      toast({ title: 'Error generating visits', description: err.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const handleCreateOneTimeVisit = async () => {
    if (!id) return;
    try {
      await createVisit.mutateAsync({
        visit_number: '',
        job_id: id,
        property_id: (job as any).property_id || null,
        customer_id: (job as any).customer_id || null,
        service_date: form.scheduled_date || format(new Date(), 'yyyy-MM-dd'),
        visit_type: 'Routine',
        visit_status: 'Scheduled',
        crew_notes: form.service_instructions || form.scope_of_work || null,
      });
      qc.invalidateQueries({ queryKey: ['job_visits', id] });
      toast({ title: 'Visit created' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleCreateInvoice = () => setInvoiceOpen(true);

  const isCompleted = form.status === 'Completed';
  const isClosed = form.status === 'Closed';
  const isOneTime = !form.service_frequency || form.service_frequency === 'one-time';
  const billingStatus = (form as any).billing_status || 'not_billable';
  const isComplimentary = !!(form as any).is_complimentary;
  const canCreateInvoice = canManageJobs && !isComplimentary && (!(isCompleted || isClosed) || billingStatus !== 'invoiced');

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
            {isComplimentary ? (
              <Badge className="text-[10px] bg-emerald-600 hover:bg-emerald-600 text-white gap-1">
                <Gift className="h-3 w-3" /> COMPLIMENTARY
                {form.complimentary_value ? ` · $${Number(form.complimentary_value).toLocaleString()}` : ''}
              </Badge>
            ) : billingStatus !== 'not_billable' && (
              <Badge variant="outline" className="text-[10px]">{billingStatus}</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mono">{job.job_number}</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {canManageJobs && (
          <Button onClick={handleSave} className="flex-1 h-11" disabled={updateJob.isPending}>
            <Save className="h-4 w-4 mr-2" /> Save Job
          </Button>
        )}
        {canCreateInvoice && (
          <Button variant="outline" className="h-11 shrink-0 gap-1.5" onClick={handleCreateInvoice}>
            <Receipt className="h-4 w-4" />
            <span className="hidden sm:inline">Create Invoice</span>
          </Button>
        )}
        {id && (
          <AddToJobCostTrackerButton
            jobId={id}
            initialSearch={form?.job_number ?? ''}
            className="h-11 shrink-0 gap-1.5"
          />
        )}
        <Button variant="success" className="h-11 shrink-0 gap-1.5 font-bold shadow-sm" onClick={() => setProofOpen(true)}>
          <FileCheck2 className="h-4 w-4" />
          <span className="hidden sm:inline">Proof of Service</span>
        </Button>
        {canManageJobs && !isClosed && (
          <Button
            variant="outline"
            size="sm"
            className="h-11 shrink-0 gap-1.5"
            disabled={updateJob.isPending}
            onClick={async () => {
              if (!id) return;
              if (!window.confirm('Are you sure you want to close this job?')) return;
              try {
                await updateJob.mutateAsync({ id, status: 'Closed' });
                set('status', 'Closed');
                toast({ title: 'Job closed' });
              } catch (err: any) {
                toast({ title: 'Error', description: err.message, variant: 'destructive' });
              }
            }}
          >
            <XCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Close Job</span>
          </Button>
        )}
        {canManageJobs && (
          <Button
            variant="destructive"
            size="sm"
            className="h-11 shrink-0 gap-1.5"
            disabled={deleteJob.isPending}
            onClick={async () => {
              if (!id) return;
              if (!window.confirm('Are you sure you want to delete this job? This cannot be undone.')) return;
              try {
                await deleteJob.mutateAsync(id);
                toast({ title: 'Job deleted' });
                navigate('/jobs');
              } catch (err: any) {
                toast({ title: 'Cannot delete', description: 'This job has linked visits, invoices, or other records. Try closing it instead.', variant: 'destructive' });
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">Delete</span>
          </Button>
        )}
      </div>

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

              {/* Worker Assignment */}
              <div>
                <Label className="text-xs flex items-center gap-1">
                  <UserCheck className="h-3 w-3" /> Assign Worker / Subcontractor
                </Label>
                <select
                  value={form.assigned_to || ''}
                  onChange={e => set('assigned_to', e.target.value || null)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-10"
                >
                  <option value="">— Unassigned —</option>
                  <optgroup label="Workers">
                    {(employees as any[]).map((emp: any) => (
                      <option key={emp.user_id} value={emp.user_id}>
                        {emp.full_name || emp.user_id}
                      </option>
                    ))}
                  </optgroup>
                  {(subcontractors as any[]).length > 0 && (
                    <optgroup label="Subcontractors">
                      {(subcontractors as any[]).filter((s: any) => s.user_id && s.active_flag !== false).map((s: any) => (
                        <option key={s.user_id} value={s.user_id}>
                          {s.contact_name || s.company_name} {s.company_name ? `(${s.company_name})` : ''}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                {assignedName && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Assigned to: <span className="font-medium text-foreground">{assignedName}</span>
                    {assignedSub && <Badge variant="outline" className="ml-1 text-[9px] py-0 px-1">Subcontractor</Badge>}
                  </p>
                )}
              </div>

              <div><Label className="text-xs">Service Instructions</Label><Textarea value={form.service_instructions || ''} onChange={e => set('service_instructions', e.target.value)} rows={2} placeholder="Instructions visible to worker..." /></div>
              <div><Label className="text-xs">Scope of Work</Label><Textarea value={form.scope_of_work || ''} onChange={e => set('scope_of_work', e.target.value)} rows={4} /></div>
              <div><Label className="text-xs">Internal Notes</Label><Textarea value={form.internal_notes || ''} onChange={e => set('internal_notes', e.target.value)} rows={2} /></div>

              {/* Complimentary Job */}
              <div className="rounded-md border border-emerald-200 bg-emerald-50/40 p-3 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <Label className="text-xs flex items-center gap-1.5 font-semibold text-emerald-900">
                      <Gift className="h-3.5 w-3.5" /> Complimentary Job (Free / Goodwill)
                    </Label>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Mark this job as a free service. No invoice will be generated, but costs and value are still tracked for reporting.
                    </p>
                  </div>
                  <Switch
                    checked={isComplimentary}
                    onCheckedChange={(v) => {
                      set('is_complimentary', v);
                      if (v) set('billing_status', 'not_billable');
                    }}
                  />
                </div>
                {isComplimentary && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div>
                      <Label className="text-xs">Value Waived ($)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="95.00"
                        value={form.complimentary_value ?? ''}
                        onChange={(e) => set('complimentary_value', e.target.value === '' ? null : parseFloat(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Reason (optional)</Label>
                      <Input
                        placeholder="Goodwill, referral thank-you..."
                        value={form.complimentary_reason || ''}
                        onChange={(e) => set('complimentary_reason', e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {id && <JobPricingCard jobId={id} />}

          <RecurringPlanCard
            form={form}
            set={set}
            onGenerateVisits={handleGenerateVisits}
            isGenerating={generating}
          />
        </div>

        <div className="space-y-3">
          {/* Source Quote / Request links */}
          {((job as any).quote_id || (job as any).request_id) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <LinkIcon className="h-3.5 w-3.5" /> Source
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1.5">
                {(job as any).quote_id && (
                  <Link to={`/quotes/${(job as any).quote_id}`} className="text-primary hover:underline text-xs flex items-center gap-1">
                    <FileText className="h-3 w-3" /> View Source Quote →
                  </Link>
                )}
                {(job as any).request_id && (
                  <Link to={`/requests/${(job as any).request_id}`} className="text-primary hover:underline text-xs flex items-center gap-1">
                    <FileText className="h-3 w-3" /> View Original Request →
                  </Link>
                )}
              </CardContent>
            </Card>
          )}

          {/* Assignment card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5" /> Assignment
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              {assignedWorker ? (
                <>
                  <p className="font-medium">{(assignedWorker as any).full_name}</p>
                  {(assignedWorker as any).job_title && <p className="text-xs text-muted-foreground">{(assignedWorker as any).job_title}</p>}
                </>
              ) : (
                <p className="text-xs text-muted-foreground">No worker assigned yet</p>
              )}
            </CardContent>
          </Card>

          {customer && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">Customer</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p className="font-medium">{customer.first_name} {customer.last_name}</p>
                {customer.company_name && <p className="text-muted-foreground text-xs">{customer.company_name}</p>}
                <Link to={`/customers/${(job as any).customer_id}`} className="text-primary text-xs hover:underline inline-block mt-1">View Customer →</Link>
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
                <DirectionsButton
                  address={property.address_line_1}
                  city={property.city}
                  province={property.province}
                  postalCode={property.postal_code}
                  variant="compact"
                  className="mt-1"
                />
              </CardContent>
            </Card>
          )}

          {/* Visits */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ClipboardCheck className="h-3.5 w-3.5" /> Visits ({visits.length})
                </span>
                {isOneTime && visits.length === 0 && !isCompleted && (
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleCreateOneTimeVisit} disabled={createVisit.isPending}>
                    <Plus className="h-3 w-3 mr-1" /> Create Visit
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {visits.length === 0 ? <p className="text-xs text-muted-foreground">No visits yet</p> : visits.slice(0, 8).map((v: any) => (
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
              {visits.length > 8 && (
                <p className="text-[10px] text-muted-foreground text-center">+{visits.length - 8} more</p>
              )}
              <Link to={`/visits?job=${id}`} className="text-xs text-primary hover:underline block mt-2">View all visits →</Link>
            </CardContent>
          </Card>
          {/* Linked Invoices */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Receipt className="h-3.5 w-3.5" /> Invoices ({linkedInvoices.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {linkedInvoices.length === 0 ? (
                <p className="text-xs text-muted-foreground">No invoices yet</p>
              ) : linkedInvoices.map((inv: any) => (
                <Link key={inv.id} to={`/invoices/${inv.id}`} className="block p-2 rounded border hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium">{inv.invoice_number}</p>
                    <StatusBadge status={inv.status} showIcon={false} />
                  </div>
                  <p className="text-[10px] text-muted-foreground">${Number(inv.total || 0).toFixed(2)}</p>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <CreateInvoiceFromWorkDialog
        open={invoiceOpen}
        onOpenChange={setInvoiceOpen}
        sourceType="job"
        sourceRecord={job}
        lineItems={jobLineItems}
        customerId={(job as any).customer_id || ''}
        propertyId={(job as any).property_id}
        jobId={id}
        quoteId={(job as any).quote_id}
        requestId={(job as any).request_id}
        billingMode={(form as any).billing_type || null}
      />

      <ProofOfServiceDialog
        open={proofOpen}
        onOpenChange={setProofOpen}
        mode="job"
        jobId={id || null}
        customerId={(job as any).customer_id || null}
        defaultEmail={(customer as any)?.email || (customer as any)?.billing_contact_email || null}
      />
    </div>
  );
}
