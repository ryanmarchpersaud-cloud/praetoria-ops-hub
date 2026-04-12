import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Briefcase, CheckCircle, Calendar, FileText, Loader2, ArrowRight, Sparkles, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useProperties } from '@/hooks/useProperties';
import { useEmployees } from '@/hooks/useEmployees';
import { useCreateVisit } from '@/hooks/useVisits';
import { SERVICE_CATEGORIES, SERVICE_FREQUENCIES } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { format, eachWeekOfInterval, eachMonthOfInterval, parseISO } from 'date-fns';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: any;
  lead: any;
  lineItems: any[];
}

type Step = 'details' | 'schedule' | 'items' | 'review';

export function ConvertQuoteToJobDialog({ open, onOpenChange, quote, lead, lineItems }: Props) {
  const { toast } = useToast();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data: allProperties = [] } = useProperties();
  const { data: employees = [] } = useEmployees();
  const createVisit = useCreateVisit();

  const [step, setStep] = useState<Step>('details');
  const [saving, setSaving] = useState(false);
  const [createdJob, setCreatedJob] = useState<any>(null);
  const [visitCount, setVisitCount] = useState(0);

  // Form
  const customerId = quote?.customer_id || lead?.customer_id || null;
  const [propertyId, setPropertyId] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [serviceCategory, setServiceCategory] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState('one-time');
  const [scheduledDate, setScheduledDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [contractStart, setContractStart] = useState('');
  const [contractEnd, setContractEnd] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [generateVisits, setGenerateVisits] = useState(true);
  const [copyLineItems, setCopyLineItems] = useState(true);
  const [scopeOfWork, setScopeOfWork] = useState('');
  const [serviceInstructions, setServiceInstructions] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

  const customerProperties = useMemo(() =>
    customerId ? (allProperties as any[]).filter((p: any) => p.customer_id === customerId) : [],
    [allProperties, customerId]
  );

  // Compute planned visit dates for recurring
  const plannedDates = useMemo(() => {
    if (!isRecurring || !contractStart || !contractEnd) return [];
    const start = parseISO(contractStart);
    const end = parseISO(contractEnd);
    if (start >= end) return [];
    const freq = frequency;
    if (freq === 'on-snowfall') return []; // manual
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
    return dates;
  }, [isRecurring, contractStart, contractEnd, frequency]);

  // Init
  useEffect(() => {
    if (open && quote) {
      setStep('details');
      setCreatedJob(null);
      setVisitCount(0);
      const customerName = lead ? `${lead.first_name} ${lead.last_name}` : 'Customer';
      setJobTitle(`${quote.service_category || 'Service'} — ${customerName}`);
      setServiceCategory(quote.service_category || '');
      setScopeOfWork(quote.scope_of_work || '');
      setServiceInstructions('');
      setPropertyId('');
      setAssignedTo('');
      setIsRecurring(false);
      setFrequency('one-time');
      setScheduledDate(format(new Date(), 'yyyy-MM-dd'));
      setContractStart('');
      setContractEnd('');
      setGenerateVisits(true);
      setCopyLineItems(true);
      setSelectedItems(new Set(lineItems.map((_, i) => i)));
    }
  }, [open, quote, lead, lineItems]);

  // Auto-select property if only one
  useEffect(() => {
    if (customerProperties.length === 1) setPropertyId(customerProperties[0].id);
  }, [customerProperties]);

  const toggleItem = (idx: number) => {
    setSelectedItems(prev => {
      const n = new Set(prev);
      n.has(idx) ? n.delete(idx) : n.add(idx);
      return n;
    });
  };

  const handleConvert = async () => {
    setSaving(true);
    try {
      // 1. Create job
      const jobData: any = {
        job_number: '',
        job_title: jobTitle,
        customer_id: customerId,
        property_id: propertyId || null,
        service_category: serviceCategory as any,
        status: 'Scheduled' as any,
        scope_of_work: scopeOfWork || null,
        service_instructions: serviceInstructions || null,
        internal_notes: quote.agent_summary ? `Quote notes: ${quote.agent_summary}` : null,
        quote_id: quote.id,
        request_id: quote.request_id || null,
        assigned_to: (assignedTo && assignedTo !== 'unassigned') ? assignedTo : null,
        scheduled_date: !isRecurring ? scheduledDate : null,
        service_frequency: isRecurring ? frequency : 'one-time',
        contract_start_date: isRecurring ? contractStart : null,
        contract_end_date: isRecurring ? contractEnd : null,
        billing_type: 'on_completion',
        billing_status: 'not_billable',
      };

      const { data: job, error: jobErr } = await supabase.from('jobs').insert(jobData).select().single();
      if (jobErr) throw jobErr;

      // 2. Copy line items if selected
      if (copyLineItems && lineItems.length > 0) {
        const items = lineItems
          .filter((_, i) => selectedItems.has(i))
          .map((li: any, idx: number) => ({
            job_id: job.id,
            item_name: li.item_name,
            description: li.description || null,
            quantity: Number(li.quantity),
            unit_price: Number(li.unit_price),
            line_total: Number(li.line_total),
            sort_order: idx,
          }));
        if (items.length > 0) {
          await supabase.from('job_line_items').insert(items as any);
        }
      }

      // 3. Update quote with converted status
      await supabase.from('quotes').update({
        converted_job_id: job.id,
        converted_at: new Date().toISOString(),
        converted_by: 'admin',
      } as any).eq('id', quote.id);

      // 4. Generate visits
      let generatedCount = 0;
      if (generateVisits) {
        if (!isRecurring) {
          // One-time: single visit
          await createVisit.mutateAsync({
            visit_number: '',
            job_id: job.id,
            customer_id: customerId,
            property_id: propertyId || null,
            service_date: scheduledDate,
            visit_type: 'Routine' as any,
            visit_status: 'Scheduled' as any,
            crew_notes: serviceInstructions || scopeOfWork || null,
            quote_id: quote.id,
            request_id: quote.request_id || null,
          } as any);
          generatedCount = 1;
        } else if (plannedDates.length > 0) {
          // Recurring: generate planned visits for full contract period
          // Check for existing visits in range first
          const { data: existingVisits } = await supabase
            .from('visits')
            .select('id, service_date')
            .eq('job_id', job.id)
            .gte('service_date', contractStart)
            .lte('service_date', contractEnd);

          const existingDates = new Set((existingVisits || []).map((v: any) => v.service_date));

          for (const date of plannedDates) {
            const dateStr = format(date, 'yyyy-MM-dd');
            if (existingDates.has(dateStr)) continue; // skip dupes
            await createVisit.mutateAsync({
              visit_number: '',
              job_id: job.id,
              customer_id: customerId,
              property_id: propertyId || null,
              service_date: dateStr,
              visit_type: 'Routine' as any,
              visit_status: 'Planned' as any,
              crew_notes: serviceInstructions || scopeOfWork || null,
              quote_id: quote.id,
              request_id: quote.request_id || null,
            } as any);
            generatedCount++;
          }
        }
      }

      qc.invalidateQueries({ queryKey: ['jobs'] });
      qc.invalidateQueries({ queryKey: ['quotes'] });
      qc.invalidateQueries({ queryKey: ['quote', quote.id] });
      qc.invalidateQueries({ queryKey: ['visits'] });
      qc.invalidateQueries({ queryKey: ['job_visits'] });

      setCreatedJob(job);
      setVisitCount(generatedCount);
      setStep('review');
    } catch (err: any) {
      toast({ title: 'Conversion failed', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const steps: Step[] = ['details', 'schedule', 'items', 'review'];
  const stepIdx = steps.indexOf(step);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            {createdJob ? 'Conversion Complete' : 'Convert Quote to Job'}
          </DialogTitle>
          <DialogDescription>
            {createdJob
              ? `Job ${createdJob.job_number} has been created from ${quote?.quote_number}`
              : `Converting ${quote?.quote_number} into an active job`}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        {!createdJob && (
          <div className="flex gap-1 mb-2">
            {['Details', 'Schedule', 'Items', 'Review'].map((label, i) => (
              <div key={label} className={`flex-1 h-1.5 rounded-full ${i <= stepIdx ? 'bg-primary' : 'bg-muted'}`} />
            ))}
          </div>
        )}

        {/* ── STEP: Details ── */}
        {step === 'details' && (
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Job Title</Label>
              <Input value={jobTitle} onChange={e => setJobTitle(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Service Category</Label>
                <Select value={serviceCategory} onValueChange={setServiceCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SERVICE_CATEGORIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Property</Label>
                <Select value={propertyId} onValueChange={setPropertyId}>
                  <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                  <SelectContent>
                    {customerProperties.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.property_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Assign Worker</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">— Unassigned —</SelectItem>
                  {(employees as any[]).map((e: any) => (
                    <SelectItem key={e.user_id} value={e.user_id}>{e.full_name || e.user_id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Scope of Work</Label>
              <Textarea value={scopeOfWork} onChange={e => setScopeOfWork(e.target.value)} rows={3} />
            </div>
            <div>
              <Label className="text-xs">Service Instructions</Label>
              <Textarea value={serviceInstructions} onChange={e => setServiceInstructions(e.target.value)} rows={2} placeholder="Instructions visible to field crew..." />
            </div>
          </div>
        )}

        {/* ── STEP: Schedule ── */}
        {step === 'schedule' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Checkbox id="recurring" checked={isRecurring} onCheckedChange={(v) => setIsRecurring(!!v)} />
              <Label htmlFor="recurring">This is a recurring / seasonal job</Label>
            </div>

            {!isRecurring ? (
              <div>
                <Label className="text-xs">Scheduled Date</Label>
                <Input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} />
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Frequency</Label>
                  <Select value={frequency} onValueChange={setFrequency}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SERVICE_FREQUENCIES.filter(f => f !== 'one-time').map(f => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Contract Start</Label>
                    <Input type="date" value={contractStart} onChange={e => setContractStart(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Contract End</Label>
                    <Input type="date" value={contractEnd} onChange={e => setContractEnd(e.target.value)} />
                  </div>
                </div>
                {frequency === 'on-snowfall' && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Snowfall-triggered visits cannot be auto-generated. Create them manually when snow events occur.
                    </AlertDescription>
                  </Alert>
                )}
                {plannedDates.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {plannedDates.length} planned visits will be generated ({frequency})
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center gap-3">
              <Checkbox
                id="gen-visits"
                checked={generateVisits}
                onCheckedChange={(v) => setGenerateVisits(!!v)}
                disabled={isRecurring && frequency === 'on-snowfall'}
              />
              <Label htmlFor="gen-visits">
                {isRecurring
                  ? `Generate ${plannedDates.length} planned visits now`
                  : 'Create first visit now'}
              </Label>
            </div>
          </div>
        )}

        {/* ── STEP: Items ── */}
        {step === 'items' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Checkbox id="copy-items" checked={copyLineItems} onCheckedChange={(v) => setCopyLineItems(!!v)} />
              <Label htmlFor="copy-items">Copy quote line items to job scope / pricing</Label>
            </div>
            {copyLineItems && lineItems.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {lineItems.map((li: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded border bg-muted/30">
                    <Checkbox checked={selectedItems.has(i)} onCheckedChange={() => toggleItem(i)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{li.item_name}</p>
                      {li.description && <p className="text-xs text-muted-foreground truncate">{li.description}</p>}
                    </div>
                    <p className="text-sm font-mono shrink-0">
                      {li.quantity} × ${Number(li.unit_price).toFixed(2)} = ${Number(li.line_total).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            )}
            {lineItems.length === 0 && (
              <p className="text-sm text-muted-foreground">No line items on this quote.</p>
            )}
          </div>
        )}

        {/* ── STEP: Review (pre-confirm) ── */}
        {step === 'review' && !createdJob && (
          <div className="space-y-3">
            <Card><CardContent className="p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Job Title</span><span className="font-medium">{jobTitle}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Category</span><span>{serviceCategory}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Type</span><Badge variant="outline">{isRecurring ? `Recurring (${frequency})` : 'One-time'}</Badge></div>
              {!isRecurring && <div className="flex justify-between"><span className="text-muted-foreground">Scheduled</span><span>{scheduledDate}</span></div>}
              {isRecurring && <div className="flex justify-between"><span className="text-muted-foreground">Contract</span><span>{contractStart} → {contractEnd}</span></div>}
              <div className="flex justify-between"><span className="text-muted-foreground">Line Items</span><span>{copyLineItems ? `${selectedItems.size} items` : 'None'}</span></div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Visits</span>
                <span>{generateVisits ? (isRecurring ? `${plannedDates.length} planned` : '1 scheduled') : 'Manual later'}</span>
              </div>
            </CardContent></Card>
          </div>
        )}

        {/* ── Success ── */}
        {step === 'review' && createdJob && (
          <div className="text-center py-6 space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/10">
              <CheckCircle className="h-8 w-8 text-accent" />
            </div>
            <div>
              <p className="text-lg font-bold">{createdJob.job_number}</p>
              <p className="text-sm text-muted-foreground">{jobTitle}</p>
              {visitCount > 0 && (
                <Badge variant="outline" className="mt-2">{visitCount} visit{visitCount > 1 ? 's' : ''} generated</Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              <Button onClick={() => { onOpenChange(false); nav(`/jobs/${createdJob.id}`); }} className="gap-1.5">
                <Briefcase className="h-4 w-4" /> View Job
              </Button>
              <Button variant="outline" onClick={() => { onOpenChange(false); nav('/schedule'); }}>
                <Calendar className="h-4 w-4 mr-1" /> Schedule
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          </div>
        )}

        {/* Footer nav */}
        {!createdJob && (
          <DialogFooter className="flex justify-between sm:justify-between">
            {stepIdx > 0 ? (
              <Button variant="ghost" onClick={() => setStep(steps[stepIdx - 1])}>Back</Button>
            ) : <div />}
            {step !== 'review' ? (
              <Button onClick={() => setStep(steps[stepIdx + 1])}>
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleConvert} disabled={saving} className="gap-1.5">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Convert to Job
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
