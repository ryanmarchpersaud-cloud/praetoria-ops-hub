import { useParams, useNavigate } from 'react-router-dom';
import { useActionPermissions } from '@/hooks/useActionPermissions';
import { useVisit, useUpdateVisit } from '@/hooks/useVisits';
import { useEmployees } from '@/hooks/useEmployees';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ArrowLeft, Save, MapPin, Briefcase, Cloud, Snowflake, Receipt, User, UserCheck, LinkIcon, FileText, MoreHorizontal, CheckSquare, XCircle, Archive, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { VISIT_STATUSES, VISIT_TYPES } from '@/lib/constants';
import { VisitPhotoGallery } from '@/components/VisitPhotoGallery';
import { supabase } from '@/integrations/supabase/client';
import { CreateInvoiceFromWorkDialog } from '@/components/CreateInvoiceFromWorkDialog';
import { useQuery } from '@tanstack/react-query';

export default function VisitDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: visit, isLoading } = useVisit(id);
  const { data: employees = [] } = useEmployees();
  const updateVisit = useUpdateVisit();
  const { toast } = useToast();
  const [form, setForm] = useState<any>({});
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const { canManageVisits } = useActionPermissions();

  // Fetch linked invoices for this visit
  const { data: linkedInvoices = [] } = useQuery({
    queryKey: ['visit_linked_invoices', id],
    queryFn: async () => {
      if (!id) return [];
      const { data } = await supabase.from('invoices').select('id, invoice_number, status, total').eq('visit_id', id as any);
      return data || [];
    },
    enabled: !!id,
  });
  useEffect(() => { if (visit) setForm(visit); }, [visit]);

  if (isLoading) return <div className="p-8 text-muted-foreground text-sm">Loading...</div>;
  if (!visit) return <div className="p-8 text-muted-foreground text-sm">Visit not found</div>;

  const set = (key: string, value: any) => setForm((p: any) => ({ ...p, [key]: value }));
  const job = (visit as any).jobs;
  const property = (visit as any).properties;
  const customer = (visit as any).customers;

  const handleSave = async () => {
    if (!id) return;
    try {
      await updateVisit.mutateAsync({
        id, service_date: form.service_date, visit_type: form.visit_type,
        visit_status: form.visit_status, crew_notes: form.crew_notes,
        customer_visible_notes: form.customer_visible_notes, weather_notes: form.weather_notes,
        snow_depth: form.snow_depth, service_summary: form.service_summary,
        arrival_time: form.arrival_time || null, completion_time: form.completion_time || null,
      });
      toast({ title: 'Visit saved' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9" onClick={() => navigate('/visits')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg md:text-xl font-bold mono">{visit.visit_number}</h1>
            <StatusBadge status={form.visit_status || 'Scheduled'} />
            {(form as any).billing_status && (form as any).billing_status !== 'not_billable' && (
              <Badge variant="outline" className="text-[10px]">{(form as any).billing_status}</Badge>
            )}
          </div>
      {job && <p className="text-xs text-muted-foreground">{job.job_title} ({job.job_number})</p>}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {canManageVisits && (
          <Button onClick={handleSave} className="flex-1 h-11" disabled={updateVisit.isPending}>
            <Save className="h-4 w-4 mr-2" /> Save Visit
          </Button>
        )}
        {form.visit_status === 'Completed' && canManageVisits && (
          <Button variant="outline" className="h-11 shrink-0 gap-1.5" onClick={() => setInvoiceOpen(true)}>
            <Receipt className="h-4 w-4" />
            <span className="hidden sm:inline">Create Invoice</span>
          </Button>
        )}
        {canManageVisits && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-11 gap-1.5">
                <MoreHorizontal className="h-4 w-4" />
                <span className="hidden sm:inline">More</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {form.visit_status !== 'Completed' && form.visit_status !== 'Cancelled' && (
                <DropdownMenuItem onClick={async () => {
                  try {
                    await updateVisit.mutateAsync({ id, visit_status: 'Completed' });
                    set('visit_status', 'Completed');
                    toast({ title: 'Visit marked complete' });
                  } catch (err: any) { toast({ title: 'Error', description: err.message, variant: 'destructive' }); }
                }} className="gap-2">
                  <CheckSquare className="h-4 w-4" /> Mark Complete
                </DropdownMenuItem>
              )}
              {form.visit_status !== 'Cancelled' && (
                <DropdownMenuItem onClick={async () => {
                  try {
                    await updateVisit.mutateAsync({ id, visit_status: 'Cancelled' });
                    set('visit_status', 'Cancelled');
                    toast({ title: 'Visit cancelled' });
                  } catch (err: any) { toast({ title: 'Error', description: err.message, variant: 'destructive' }); }
                }} className="gap-2">
                  <XCircle className="h-4 w-4" /> Cancel Visit
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={async () => {
                try {
                  await updateVisit.mutateAsync({ id, visit_status: 'Archived' });
                  set('visit_status', 'Archived');
                  toast({ title: 'Visit archived' });
                } catch (err: any) { toast({ title: 'Error', description: err.message, variant: 'destructive' }); }
              }} className="gap-2">
                <Archive className="h-4 w-4" /> Archive
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={async () => {
                try {
                  await updateVisit.mutateAsync({ id, visit_status: 'Deleted' });
                  toast({ title: 'Visit deleted' });
                  navigate('/visits');
                } catch (err: any) { toast({ title: 'Error', description: err.message, variant: 'destructive' }); }
              }} className="gap-2 text-destructive focus:text-destructive">
                <Trash2 className="h-4 w-4" /> Delete Visit
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Status</Label>
                  <select value={form.visit_status || ''} onChange={e => set('visit_status', e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-10">
                    {VISIT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Visit Type</Label>
                  <select value={form.visit_type || ''} onChange={e => set('visit_type', e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-10">
                    {VISIT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label className="text-xs">Service Date</Label><Input type="date" value={form.service_date || ''} onChange={e => set('service_date', e.target.value)} /></div>
                <div><Label className="text-xs">Arrival</Label><Input type="time" value={form.arrival_time ? form.arrival_time.slice(11, 16) : ''} onChange={e => set('arrival_time', form.service_date + 'T' + e.target.value + ':00Z')} /></div>
                <div><Label className="text-xs">Completion</Label><Input type="time" value={form.completion_time ? form.completion_time.slice(11, 16) : ''} onChange={e => set('completion_time', form.service_date + 'T' + e.target.value + ':00Z')} /></div>
              </div>
              {form.arrival_time && form.completion_time && (() => {
                const mins = Math.max(0, Math.round((new Date(form.completion_time).getTime() - new Date(form.arrival_time).getTime()) / 60000));
                const h = Math.floor(mins / 60); const m = mins % 60;
                const label = h > 0 ? `${h}h ${m}m` : `${m} min`;
                return (
                  <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm flex items-center justify-between">
                    <span className="text-muted-foreground">Time on property (billable)</span>
                    <span className="font-semibold">{label}</span>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Weather & Snow */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1.5"><Cloud className="h-4 w-4" /> Conditions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Weather Notes</Label><Input value={form.weather_notes || ''} onChange={e => set('weather_notes', e.target.value)} placeholder="e.g. Heavy snow, -8C" /></div>
                <div>
                  <Label className="text-xs flex items-center gap-1"><Snowflake className="h-3 w-3" /> Snow Depth</Label>
                  <Input value={form.snow_depth || ''} onChange={e => set('snow_depth', e.target.value)} placeholder="e.g. 15cm" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div><Label className="text-xs">Service Summary</Label><Textarea value={form.service_summary || ''} onChange={e => set('service_summary', e.target.value)} rows={3} placeholder="What was done during this visit..." /></div>
              <div><Label className="text-xs">Crew Notes (internal)</Label><Textarea value={form.crew_notes || ''} onChange={e => set('crew_notes', e.target.value)} rows={2} placeholder="Internal crew notes..." /></div>
              <div><Label className="text-xs">Customer-Visible Notes</Label><Textarea value={form.customer_visible_notes || ''} onChange={e => set('customer_visible_notes', e.target.value)} rows={2} placeholder="Notes visible to customer..." /></div>
            </CardContent>
          </Card>

          {/* Photo proof */}
          <VisitPhotoGallery
            visitId={id!}
            propertyId={(visit as any).property_id}
            customerId={(visit as any).customer_id}
          />
        </div>

        <div className="space-y-3">
          {/* Assigned Worker */}
          {job && (() => {
            const assignedWorker = (employees as any[]).find((e: any) => e.user_id === job.assigned_to);
            return (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <UserCheck className="h-3.5 w-3.5" /> Assigned Worker
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  {assignedWorker ? (
                    <>
                      <p className="font-medium">{assignedWorker.full_name}</p>
                      {assignedWorker.job_title && <p className="text-xs text-muted-foreground">{assignedWorker.job_title}</p>}
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">Unassigned — assign via job</p>
                  )}
                  {job && (
                    <Link to={`/jobs/${job.id}`} className="text-primary text-xs hover:underline inline-block mt-1">Manage assignment →</Link>
                  )}
                </CardContent>
              </Card>
            );
          })()}

          {job && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5" /> Job
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <Link to={`/jobs/${job.id}`} className="font-medium text-primary hover:underline block">{job.job_title}</Link>
                <p className="text-xs text-muted-foreground mono">{job.job_number}</p>
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
                <Link to={`/properties/${property.id}`} className="font-medium text-primary hover:underline block">{property.property_name}</Link>
                {property.address_line_1 && <p className="text-xs text-muted-foreground">{property.address_line_1}, {property.city}</p>}
                {property.gate_code && <p className="text-xs text-muted-foreground">Gate: {property.gate_code}</p>}
                {property.access_notes && <p className="text-xs text-muted-foreground">{property.access_notes}</p>}
              </CardContent>
            </Card>
          )}

          {customer && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" /> Customer
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p className="font-medium">{customer.first_name} {customer.last_name}</p>
                {customer.company_name && <p className="text-xs text-muted-foreground">{customer.company_name}</p>}
                {customer.phone && <p className="text-xs text-muted-foreground">{customer.phone}</p>}
                <Link to={`/customers/${(visit as any).customer_id}`} className="text-primary text-xs hover:underline inline-block mt-1">View Customer →</Link>
              </CardContent>
            </Card>
          )}

          {/* Linked Records */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <LinkIcon className="h-3.5 w-3.5" /> Linked Records
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              {job && (
                <Link to={`/jobs/${job.id}`} className="text-primary text-xs hover:underline flex items-center gap-1">
                  <Briefcase className="h-3 w-3" /> {job.job_number} — {job.job_title} →
                </Link>
              )}
              {(visit as any).quote_id && (
                <Link to={`/quotes/${(visit as any).quote_id}`} className="text-primary text-xs hover:underline flex items-center gap-1">
                  <FileText className="h-3 w-3" /> Source Quote →
                </Link>
              )}
              {linkedInvoices.map((inv: any) => (
                <Link key={inv.id} to={`/invoices/${inv.id}`} className="text-primary text-xs hover:underline flex items-center gap-1">
                  <Receipt className="h-3 w-3" /> {inv.invoice_number} ({inv.status}) →
                </Link>
              ))}
              {!job && !(visit as any).quote_id && linkedInvoices.length === 0 && (
                <p className="text-xs text-muted-foreground">No linked records</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Invoice from Visit Dialog */}
      <CreateInvoiceFromWorkDialog
        open={invoiceOpen}
        onOpenChange={setInvoiceOpen}
        sourceType="visit"
        sourceRecord={visit}
        lineItems={[]}
        customerId={(visit as any).customer_id || ''}
        propertyId={(visit as any).property_id}
        jobId={(visit as any).job_id}
        visitId={id}
        quoteId={(visit as any).quote_id}
      />
    </div>
  );
}
