import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useJobs } from '@/hooks/useJobs';
import { useCustomers } from '@/hooks/useCustomers';
import { useProperties } from '@/hooks/useProperties';
import { useEmployees } from '@/hooks/useEmployees';
import { useAllSubcontractors } from '@/hooks/useSubcontractor';
import { useCreateVisit } from '@/hooks/useVisits';
import { SERVICE_CATEGORIES, VISIT_TYPES, VISIT_STATUSES, VISIT_PRIORITIES, RECURRENCE_FREQUENCIES } from '@/lib/constants';
import { Briefcase, User, MapPin, Calendar, Clock, Users, FileText, Settings2, Repeat, AlertTriangle, Save, Plus } from 'lucide-react';

interface CreateVisitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultJobId?: string;
}

export default function CreateVisitDialog({ open, onOpenChange, defaultJobId }: CreateVisitDialogProps) {
  const { toast } = useToast();
  const { data: jobs = [] } = useJobs();
  const { data: customers = [] } = useCustomers();
  const { data: properties = [] } = useProperties();
  const { data: employees = [] } = useEmployees();
  const { data: subcontractors = [] } = useAllSubcontractors();
  const activeSubs = (subcontractors as any[]).filter((s: any) => s.user_id && s.active_flag !== false);
  const createVisit = useCreateVisit();

  // Form state
  const [jobId, setJobId] = useState(defaultJobId || '');
  const [customerId, setCustomerId] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [serviceCategory, setServiceCategory] = useState('');
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('');
  const [visitType, setVisitType] = useState('Routine');
  const [visitStatus, setVisitStatus] = useState('Scheduled');
  const [assignedWorkerId, setAssignedWorkerId] = useState('');
  const [priority, setPriority] = useState('Normal');
  const [crewNotes, setCrewNotes] = useState('');
  const [customerVisibleNotes, setCustomerVisibleNotes] = useState('');
  const [weatherNotes, setWeatherNotes] = useState('');
  const [siteInstructions, setSiteInstructions] = useState('');
  const [accessNotes, setAccessNotes] = useState('');
  const [safetyNotes, setSafetyNotes] = useState('');
  const [requiresPhotoProof, setRequiresPhotoProof] = useState(false);
  const [requiresCompletionNotes, setRequiresCompletionNotes] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState('');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [createAnother, setCreateAnother] = useState(false);

  // Auto-fill from job
  const selectedJob = useMemo(() => (jobs as any[]).find((j: any) => j.id === jobId), [jobs, jobId]);

  useEffect(() => {
    if (selectedJob) {
      if (selectedJob.customer_id) setCustomerId(selectedJob.customer_id);
      if (selectedJob.property_id) setPropertyId(selectedJob.property_id);
      if (selectedJob.service_category) setServiceCategory(selectedJob.service_category);
      if (selectedJob.scope_of_work) setSiteInstructions(selectedJob.scope_of_work);
      if (selectedJob.service_instructions) setCrewNotes(selectedJob.service_instructions || '');
      if (selectedJob.assigned_to) setAssignedWorkerId(selectedJob.assigned_to);
    }
  }, [selectedJob]);

  // Filter properties by selected customer
  const filteredProperties = useMemo(() => {
    if (!customerId) return properties as any[];
    return (properties as any[]).filter((p: any) => p.customer_id === customerId);
  }, [properties, customerId]);

  // Customer display
  const selectedCustomer = useMemo(() => (customers as any[]).find((c: any) => c.id === customerId), [customers, customerId]);

  const resetForm = () => {
    setJobId(''); setCustomerId(''); setPropertyId(''); setServiceCategory('');
    setServiceDate(new Date().toISOString().split('T')[0]);
    setStartTime(''); setEndTime(''); setEstimatedDuration('');
    setVisitType('Routine'); setVisitStatus('Scheduled'); setAssignedWorkerId('');
    setPriority('Normal'); setCrewNotes(''); setCustomerVisibleNotes('');
    setWeatherNotes(''); setSiteInstructions(''); setAccessNotes('');
    setSafetyNotes(''); setRequiresPhotoProof(false); setRequiresCompletionNotes(false);
    setIsRecurring(false); setRecurrenceFrequency(''); setRecurrenceEndDate('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!jobId && (!customerId || !propertyId)) {
      toast({ title: 'Missing info', description: 'Select a Job, or manually select Customer + Property.', variant: 'destructive' });
      return;
    }
    if (!serviceDate) {
      toast({ title: 'Missing date', description: 'Service date is required.', variant: 'destructive' });
      return;
    }
    if (isRecurring && !recurrenceFrequency) {
      toast({ title: 'Missing recurrence', description: 'Select a recurrence frequency.', variant: 'destructive' });
      return;
    }

    try {
      await createVisit.mutateAsync({
        visit_number: '',
        job_id: jobId || null,
        customer_id: customerId || selectedJob?.customer_id || null,
        property_id: propertyId || selectedJob?.property_id || null,
        service_date: serviceDate,
        visit_type: visitType as any,
        visit_status: visitStatus as any,
        crew_notes: crewNotes || null,
        customer_visible_notes: customerVisibleNotes || null,
        weather_notes: weatherNotes || null,
        scheduled_start_time: startTime || null,
        scheduled_end_time: endTime || null,
        estimated_duration_minutes: estimatedDuration ? parseInt(estimatedDuration) : null,
        assigned_worker_id: assignedWorkerId || null,
        service_category: serviceCategory || null,
        priority: priority,
        requires_photo_proof: requiresPhotoProof,
        requires_completion_notes: requiresCompletionNotes,
        access_notes: accessNotes || null,
        safety_notes: safetyNotes || null,
        site_instructions: siteInstructions || null,
        is_recurring: isRecurring,
        recurrence_frequency: isRecurring ? recurrenceFrequency : null,
        recurrence_end_date: isRecurring && recurrenceEndDate ? recurrenceEndDate : null,
      } as any);

      toast({ title: 'Visit created successfully' });

      if (createAnother) {
        resetForm();
      } else {
        onOpenChange(false);
        resetForm();
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const priorityColor = (p: string) => {
    if (p === 'Urgent') return 'destructive';
    if (p === 'High') return 'default';
    return 'secondary';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto mx-3">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-primary" />
            Schedule Visit
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* SECTION 1: Job / Customer / Property */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              <Briefcase className="h-4 w-4" /> Job & Location
            </div>
            <div className="grid gap-3">
              <div>
                <Label className="text-xs">Job <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Select value={jobId} onValueChange={setJobId}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select job or leave blank for standalone..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— No Job (Standalone) —</SelectItem>
                    {(jobs as any[]).map((j: any) => (
                      <SelectItem key={j.id} value={j.id}>
                        {j.job_number} — {j.job_title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Customer {!jobId && '*'}</Label>
                  <Select value={customerId} onValueChange={(v) => { setCustomerId(v); setPropertyId(''); }}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Select customer..." /></SelectTrigger>
                    <SelectContent>
                      {(customers as any[]).map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.first_name} {c.last_name}{c.company_name ? ` (${c.company_name})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedCustomer && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {selectedCustomer.phone && `📞 ${selectedCustomer.phone}`}
                      {selectedCustomer.email && ` · ✉ ${selectedCustomer.email}`}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-xs">Property / Location {!jobId && '*'}</Label>
                  <Select value={propertyId} onValueChange={setPropertyId}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Select property..." /></SelectTrigger>
                    <SelectContent>
                      {filteredProperties.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.property_name}{p.address_line_1 ? ` — ${p.address_line_1}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs">Service Category</Label>
                <Select value={serviceCategory} onValueChange={setServiceCategory}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select category..." /></SelectTrigger>
                  <SelectContent>
                    {SERVICE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* SECTION 2: Date / Time / Assignment */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              <Clock className="h-4 w-4" /> Schedule & Assignment
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Service Date *</Label>
                <Input type="date" value={serviceDate} onChange={e => setServiceDate(e.target.value)} required className="h-9" />
              </div>
              <div>
                <Label className="text-xs">Start Time</Label>
                <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="h-9" />
              </div>
              <div>
                <Label className="text-xs">End Time</Label>
                <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="h-9" />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Est. Duration (min)</Label>
                <Input type="number" min={0} value={estimatedDuration} onChange={e => setEstimatedDuration(e.target.value)} placeholder="60" className="h-9" />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs flex items-center gap-1"><Users className="h-3 w-3" /> Assign Worker</Label>
                <Select value={assignedWorkerId} onValueChange={setAssignedWorkerId}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Unassigned..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Unassigned —</SelectItem>
                    {(employees as any[]).map((e: any) => (
                      <SelectItem key={e.user_id} value={e.user_id}>
                        {e.full_name}{e.job_title ? ` · ${e.job_title}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* SECTION 3: Visit Type / Status / Priority / Recurrence */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              <Settings2 className="h-4 w-4" /> Type, Status & Frequency
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Visit Type</Label>
                <Select value={visitType} onValueChange={setVisitType}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VISIT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={visitStatus} onValueChange={setVisitStatus}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VISIT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VISIT_PRIORITIES.map(p => (
                      <SelectItem key={p} value={p}>
                        <span className="flex items-center gap-1.5">
                          {(p === 'High' || p === 'Urgent') && <AlertTriangle className="h-3 w-3 text-destructive" />}
                          {p}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Recurrence */}
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
              <Repeat className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1">
                <Label className="text-xs font-medium">Recurring Visit</Label>
                <p className="text-[11px] text-muted-foreground">Generate a series of scheduled visits</p>
              </div>
              <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
            </div>
            {isRecurring && (
              <div className="grid grid-cols-2 gap-3 pl-4 border-l-2 border-primary/20">
                <div>
                  <Label className="text-xs">Frequency *</Label>
                  <Select value={recurrenceFrequency} onValueChange={setRecurrenceFrequency}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {RECURRENCE_FREQUENCIES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">End Date</Label>
                  <Input type="date" value={recurrenceEndDate} onChange={e => setRecurrenceEndDate(e.target.value)} className="h-9" />
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* SECTION 4: Notes / Instructions / Ops */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              <FileText className="h-4 w-4" /> Notes & Instructions
            </div>
            <div className="grid gap-3">
              <div>
                <Label className="text-xs">Crew Notes (internal)</Label>
                <Textarea value={crewNotes} onChange={e => setCrewNotes(e.target.value)} rows={2} placeholder="Notes visible to crew only..." className="min-h-[60px]" />
              </div>
              <div>
                <Label className="text-xs">Customer-visible Notes</Label>
                <Textarea value={customerVisibleNotes} onChange={e => setCustomerVisibleNotes(e.target.value)} rows={2} placeholder="Notes the customer can see..." className="min-h-[60px]" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Weather Notes</Label>
                  <Input value={weatherNotes} onChange={e => setWeatherNotes(e.target.value)} placeholder="e.g. Light snow, -5°C" className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">Access Notes</Label>
                  <Input value={accessNotes} onChange={e => setAccessNotes(e.target.value)} placeholder="Gate code, side entrance..." className="h-9" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Site Instructions</Label>
                  <Textarea value={siteInstructions} onChange={e => setSiteInstructions(e.target.value)} rows={2} placeholder="Scope of work details..." className="min-h-[60px]" />
                </div>
                <div>
                  <Label className="text-xs flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Safety / Hazard Notes</Label>
                  <Textarea value={safetyNotes} onChange={e => setSafetyNotes(e.target.value)} rows={2} placeholder="Hazards, caution areas..." className="min-h-[60px]" />
                </div>
              </div>
            </div>

            {/* Operations toggles */}
            <div className="flex flex-wrap gap-4 p-3 rounded-lg border bg-muted/30">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <Switch checked={requiresPhotoProof} onCheckedChange={setRequiresPhotoProof} className="scale-90" />
                Requires Photo Proof
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <Switch checked={requiresCompletionNotes} onCheckedChange={setRequiresCompletionNotes} className="scale-90" />
                Requires Completion Notes
              </label>
            </div>
          </div>

          <Separator />

          {/* Summary + Actions */}
          <div className="space-y-3">
            {/* Quick summary */}
            <div className="flex flex-wrap gap-1.5">
              {serviceDate && <Badge variant="outline" className="text-[11px]">📅 {serviceDate}</Badge>}
              {visitType && <Badge variant="outline" className="text-[11px]">{visitType}</Badge>}
              {priority !== 'Normal' && <Badge variant={priorityColor(priority)} className="text-[11px]">{priority}</Badge>}
              {assignedWorkerId && assignedWorkerId !== 'none' && (
                <Badge variant="outline" className="text-[11px]">
                  👤 {(employees as any[]).find((e: any) => e.user_id === assignedWorkerId)?.full_name || 'Worker'}
                </Badge>
              )}
              {isRecurring && <Badge variant="secondary" className="text-[11px]">🔄 {recurrenceFrequency}</Badge>}
            </div>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-xs cursor-pointer mr-auto">
                <Switch checked={createAnother} onCheckedChange={setCreateAnother} className="scale-90" />
                Save & Create Another
              </label>
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1 h-10">
                Cancel
              </Button>
              <Button type="submit" disabled={createVisit.isPending} className="flex-1 h-10">
                {createVisit.isPending ? 'Creating...' : (
                  <span className="flex items-center gap-1.5">
                    <Save className="h-4 w-4" />
                    {createAnother ? 'Save & New' : 'Schedule Visit'}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
