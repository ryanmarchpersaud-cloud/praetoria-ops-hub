import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { useCustomers } from '@/hooks/useCustomers';
import { useProperties } from '@/hooks/useProperties';
import { useEmployees } from '@/hooks/useEmployees';
import { useCreateJob } from '@/hooks/useJobs';
import { useCreateVisit } from '@/hooks/useVisits';
import { supabase } from '@/integrations/supabase/client';
import {
  SERVICE_CATEGORIES, JOB_STATUSES, JOB_PRIORITIES,
  SERVICE_FREQUENCIES,
} from '@/lib/constants';
import {
  Briefcase, User, MapPin, Calendar, Clock, Users, FileText,
  Settings2, DollarSign, Plus, Trash2, ChevronDown, Copy,
  GripVertical, ArrowLeft, Save, Send, MessageSquare, X, Search, AlertTriangle,
} from 'lucide-react';

interface LineItem {
  id: string;
  catalog_item_id: string | null;
  item_name: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

const BILLING_TYPES = [
  { value: 'on_completion', label: 'Invoice on completion' },
  { value: 'milestone', label: 'Invoice by milestone' },
  { value: 'manual', label: 'Invoice manually later' },
  { value: 'deposit', label: 'Deposit / retainer required' },
] as const;

const REPEAT_OPTIONS = [
  { value: 'one-time', label: 'Does not repeat' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'on-snowfall', label: 'On Snowfall' },
  { value: 'custom-seasonal', label: 'Custom / Seasonal' },
] as const;

export default function JobNew() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: customers = [] } = useCustomers();
  const { data: allProperties = [] } = useProperties();
  const { data: employees = [] } = useEmployees();
  const createJob = useCreateJob();
  const createVisit = useCreateVisit();

  // Catalog items
  const [catalogItems, setCatalogItems] = useState<any[]>([]);
  useEffect(() => {
    supabase.from('products_services').select('*').eq('status', 'active').order('name').then(({ data }) => {
      if (data) setCatalogItems(data);
    });
  }, []);

  // === Form State ===
  const [jobTitle, setJobTitle] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [serviceCategory, setServiceCategory] = useState('Snow & Ice');
  const [priority, setPriority] = useState('Normal');
  const [status, setStatus] = useState('Draft');
  const [assignedTo, setAssignedTo] = useState('');
  const [scopeOfWork, setScopeOfWork] = useState('');
  const [serviceInstructions, setServiceInstructions] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  // Schedule
  const [isOneOff, setIsOneOff] = useState(true);
  const [scheduledDate, setScheduledDate] = useState('');
  const [contractStartDate, setContractStartDate] = useState('');
  const [contractEndDate, setContractEndDate] = useState('');
  const [serviceFrequency, setServiceFrequency] = useState('one-time');
  const [seasonName, setSeasonName] = useState('');
  const [minimumVisits, setMinimumVisits] = useState('');
  const [additionalVisitRate, setAdditionalVisitRate] = useState('');

  // Billing
  const [billingType, setBillingType] = useState('on_completion');
  const [invoiceReminder, setInvoiceReminder] = useState(true);
  const [billingNotes, setBillingNotes] = useState('');
  const [customerBillingNotes, setCustomerBillingNotes] = useState('');

  // Line Items
  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  // Search states
  const [customerSearch, setCustomerSearch] = useState('');
  const [catalogSearch, setCatalogSearch] = useState('');

  // Computed
  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers as any[];
    const s = customerSearch.toLowerCase();
    return (customers as any[]).filter((c: any) =>
      `${c.first_name} ${c.last_name} ${c.company_name || ''} ${c.email || ''}`.toLowerCase().includes(s)
    );
  }, [customers, customerSearch]);

  const filteredProperties = useMemo(() => {
    if (!customerId) return allProperties as any[];
    return (allProperties as any[]).filter((p: any) => p.customer_id === customerId);
  }, [allProperties, customerId]);

  const selectedCustomer = useMemo(() =>
    (customers as any[]).find((c: any) => c.id === customerId), [customers, customerId]);

  const selectedProperty = useMemo(() =>
    (allProperties as any[]).find((p: any) => p.id === propertyId), [allProperties, propertyId]);

  const filteredCatalog = useMemo(() => {
    if (!catalogSearch) return catalogItems;
    const s = catalogSearch.toLowerCase();
    return catalogItems.filter(i => `${i.name} ${i.description || ''} ${i.service_category}`.toLowerCase().includes(s));
  }, [catalogItems, catalogSearch]);

  const subtotal = useMemo(() => lineItems.reduce((s, li) => s + li.line_total, 0), [lineItems]);

  // Auto-fill from property
  useEffect(() => {
    if (selectedProperty) {
      if (selectedProperty.access_notes) {
        // Could auto-populate instructions
      }
    }
  }, [selectedProperty]);

  // Job type toggle
  useEffect(() => {
    if (isOneOff) {
      setServiceFrequency('one-time');
      setContractStartDate('');
      setContractEndDate('');
      setSeasonName('');
    }
  }, [isOneOff]);

  // Line item helpers
  const addLineItem = useCallback((catalogItem?: any) => {
    const newItem: LineItem = {
      id: crypto.randomUUID(),
      catalog_item_id: catalogItem?.id || null,
      item_name: catalogItem?.name || '',
      description: catalogItem?.description || '',
      quantity: 1,
      unit_price: catalogItem?.unit_price || 0,
      line_total: catalogItem?.unit_price || 0,
    };
    setLineItems(prev => [...prev, newItem]);
  }, []);

  const updateLineItem = useCallback((id: string, field: keyof LineItem, value: any) => {
    setLineItems(prev => prev.map(li => {
      if (li.id !== id) return li;
      const updated = { ...li, [field]: value };
      if (field === 'quantity' || field === 'unit_price') {
        updated.line_total = Math.round((updated.quantity * updated.unit_price) * 100) / 100;
      }
      return updated;
    }));
  }, []);

  const removeLineItem = useCallback((id: string) => {
    setLineItems(prev => prev.filter(li => li.id !== id));
  }, []);

  const duplicateLineItem = useCallback((id: string) => {
    setLineItems(prev => {
      const source = prev.find(li => li.id === id);
      if (!source) return prev;
      return [...prev, { ...source, id: crypto.randomUUID() }];
    });
  }, []);

  // Validation
  const validate = (): string | null => {
    if (!jobTitle.trim()) return 'Job title is required.';
    if (!customerId) return 'Client is required.';
    if (!serviceCategory) return 'Service category is required.';
    if (!isOneOff && serviceFrequency === 'one-time') return 'Select a recurrence frequency for recurring jobs.';
    return null;
  };

  // Save logic
  const handleSave = async (action: 'save' | 'save_visit' | 'save_open' | 'save_another' | 'draft') => {
    const error = validate();
    if (error) {
      toast({ title: 'Validation Error', description: error, variant: 'destructive' });
      return;
    }

    try {
      const jobData: any = {
        job_number: '',
        job_title: jobTitle,
        customer_id: customerId,
        property_id: propertyId || null,
        service_category: serviceCategory,
        priority: priority,
        status: action === 'draft' ? 'Draft' : status,
        assigned_to: assignedTo || null,
        scope_of_work: scopeOfWork || null,
        service_instructions: serviceInstructions || null,
        internal_notes: internalNotes || null,
        scheduled_date: scheduledDate || null,
        contract_start_date: contractStartDate || null,
        contract_end_date: contractEndDate || null,
        service_frequency: serviceFrequency === 'one-time' ? null : serviceFrequency,
        season_name: seasonName || null,
        minimum_included_visits: minimumVisits ? parseInt(minimumVisits) : null,
        additional_visit_rate: additionalVisitRate ? parseFloat(additionalVisitRate) : null,
        billing_type: billingType,
        invoice_reminder: invoiceReminder,
        billing_notes: billingNotes || null,
        customer_billing_notes: customerBillingNotes || null,
        estimated_total: subtotal,
      };

      const { data: job, error: jobError } = await supabase.from('jobs').insert(jobData).select().single();
      if (jobError) throw jobError;

      // Save line items
      if (lineItems.length > 0 && job) {
        const items = lineItems.map((li, idx) => ({
          job_id: job.id,
          catalog_item_id: li.catalog_item_id,
          item_name: li.item_name,
          description: li.description || null,
          quantity: li.quantity,
          unit_price: li.unit_price,
          line_total: li.line_total,
          sort_order: idx,
        }));
        const { error: liError } = await supabase.from('job_line_items').insert(items as any);
        if (liError) console.error('Line items error:', liError);
      }

      // Invalidate queries
      createJob.reset();

      toast({ title: 'Job created', description: `${(job as any).job_number} — ${jobTitle}` });

      if (action === 'save_visit' && job) {
        // Create initial visit
        await createVisit.mutateAsync({
          visit_number: '',
          job_id: job.id,
          customer_id: customerId,
          property_id: propertyId || null,
          service_date: scheduledDate || new Date().toISOString().split('T')[0],
          visit_type: 'Routine' as any,
          visit_status: 'Scheduled' as any,
          crew_notes: serviceInstructions || null,
          site_instructions: scopeOfWork || null,
          assigned_worker_id: assignedTo || null,
          service_category: serviceCategory || null,
          priority: priority,
        } as any);
        toast({ title: 'Visit scheduled' });
        navigate(`/jobs/${job.id}`);
      } else if (action === 'save_open' && job) {
        navigate(`/jobs/${job.id}`);
      } else if (action === 'save_another') {
        // Reset form
        setJobTitle(''); setCustomerId(''); setPropertyId('');
        setScopeOfWork(''); setServiceInstructions(''); setInternalNotes('');
        setScheduledDate(''); setLineItems([]);
      } else {
        navigate('/jobs');
      }
    } catch (err: any) {
      toast({ title: 'Error creating job', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-28">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/jobs')} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl md:text-2xl font-bold">New Job</h1>
          <p className="text-xs text-muted-foreground">Create and schedule a new job</p>
        </div>
      </div>

      {/* ====== SECTION 1: BASIC JOB INFO ====== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <Briefcase className="h-4 w-4" /> Basic Job Info
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label className="text-xs">Job Title *</Label>
              <Input value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="e.g. Seasonal Snow Removal — 123 Main St" className="h-10" />
            </div>

            {/* Client selector with search */}
            <div>
              <Label className="text-xs flex items-center gap-1"><User className="h-3 w-3" /> Client *</Label>
              <Select value={customerId} onValueChange={v => { setCustomerId(v); setPropertyId(''); }}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Search & select client..." /></SelectTrigger>
                <SelectContent>
                  <div className="p-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        value={customerSearch}
                        onChange={e => setCustomerSearch(e.target.value)}
                        placeholder="Search clients..."
                        className="h-8 pl-8 text-xs"
                        onClick={e => e.stopPropagation()}
                      />
                    </div>
                  </div>
                  {filteredCustomers.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center gap-2">
                        <span>{c.first_name} {c.last_name}</span>
                        {c.company_name && <span className="text-muted-foreground text-xs">({c.company_name})</span>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedCustomer && (
                <div className="mt-1 text-[11px] text-muted-foreground space-x-2">
                  {selectedCustomer.phone && <span>📞 {selectedCustomer.phone}</span>}
                  {selectedCustomer.email && <span>✉ {selectedCustomer.email}</span>}
                </div>
              )}
            </div>

            {/* Property selector */}
            <div>
              <Label className="text-xs flex items-center gap-1"><MapPin className="h-3 w-3" /> Property / Location</Label>
              <Select value={propertyId} onValueChange={setPropertyId} disabled={!customerId}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder={customerId ? 'Select property...' : 'Select client first'} />
                </SelectTrigger>
                <SelectContent>
                  {filteredProperties.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.property_name}{p.address_line_1 ? ` — ${p.address_line_1}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedProperty && (
                <div className="mt-1 space-y-0.5">
                  {selectedProperty.access_notes && (
                    <p className="text-[11px] text-muted-foreground">🔑 {selectedProperty.access_notes}</p>
                  )}
                  {selectedProperty.caution_notes && (
                    <p className="text-[11px] text-amber-600 flex items-center gap-0.5">
                      <AlertTriangle className="h-2.5 w-2.5" /> {selectedProperty.caution_notes}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div>
              <Label className="text-xs">Service Category *</Label>
              <Select value={serviceCategory} onValueChange={setServiceCategory}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SERVICE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Assign To</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Unassigned" /></SelectTrigger>
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

            <div>
              <Label className="text-xs">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {JOB_PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {JOB_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ====== SECTION 2: JOB TYPE + SCHEDULE ====== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4" /> Job Type & Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Job type toggle */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={isOneOff ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIsOneOff(true)}
              className="flex-1"
            >
              One-off
            </Button>
            <Button
              type="button"
              variant={!isOneOff ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIsOneOff(false)}
              className="flex-1"
            >
              Recurring
            </Button>
          </div>

          {isOneOff ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Scheduled Date</Label>
                <Input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} className="h-10" />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs">Contract Start</Label>
                  <Input type="date" value={contractStartDate} onChange={e => setContractStartDate(e.target.value)} className="h-10" />
                </div>
                <div>
                  <Label className="text-xs">Contract End</Label>
                  <Input type="date" value={contractEndDate} onChange={e => setContractEndDate(e.target.value)} className="h-10" />
                </div>
                <div>
                  <Label className="text-xs">Season</Label>
                  <Input value={seasonName} onChange={e => setSeasonName(e.target.value)} placeholder="e.g. Winter 2026" className="h-10" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs">Repeats</Label>
                  <Select value={serviceFrequency} onValueChange={setServiceFrequency}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {REPEAT_OPTIONS.filter(r => r.value !== 'one-time').map(r => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Min. Included Visits</Label>
                  <Input type="number" min={0} value={minimumVisits} onChange={e => setMinimumVisits(e.target.value)} placeholder="e.g. 20" className="h-10" />
                </div>
                <div>
                  <Label className="text-xs">Additional Visit Rate ($)</Label>
                  <Input type="number" min={0} step="0.01" value={additionalVisitRate} onChange={e => setAdditionalVisitRate(e.target.value)} placeholder="0.00" className="h-10" />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ====== SECTION 3: INSTRUCTIONS ====== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <FileText className="h-4 w-4" /> Instructions & Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs">Scope of Work</Label>
            <Textarea value={scopeOfWork} onChange={e => setScopeOfWork(e.target.value)} rows={3} placeholder="Describe the scope of work for this job..." className="min-h-[80px]" />
          </div>
          <div>
            <Label className="text-xs">Visit Instructions (for crew)</Label>
            <Textarea value={serviceInstructions} onChange={e => setServiceInstructions(e.target.value)} rows={2} placeholder="Instructions that will appear on each visit for the crew..." className="min-h-[60px]" />
          </div>
          <div>
            <Label className="text-xs">Internal Notes (admin only)</Label>
            <Textarea value={internalNotes} onChange={e => setInternalNotes(e.target.value)} rows={2} placeholder="Notes visible only to admin/office staff..." className="min-h-[60px]" />
          </div>
        </CardContent>
      </Card>

      {/* ====== SECTION 4: BILLING ====== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <DollarSign className="h-4 w-4" /> Billing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Invoice Behavior</Label>
              <Select value={billingType} onValueChange={setBillingType}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BILLING_TYPES.map(b => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 h-10 mt-auto">
              <Switch checked={invoiceReminder} onCheckedChange={setInvoiceReminder} className="scale-90" />
              <Label className="text-xs cursor-pointer">Remind me to invoice when job closes</Label>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Internal Billing Notes</Label>
              <Textarea value={billingNotes} onChange={e => setBillingNotes(e.target.value)} rows={2} placeholder="e.g. Net 30, requires PO..." className="min-h-[60px]" />
            </div>
            <div>
              <Label className="text-xs">Customer-facing Billing Notes</Label>
              <Textarea value={customerBillingNotes} onChange={e => setCustomerBillingNotes(e.target.value)} rows={2} placeholder="Notes visible on invoices..." className="min-h-[60px]" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ====== SECTION 5: PRODUCTS / SERVICES / LINE ITEMS ====== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <Settings2 className="h-4 w-4" /> Products & Services
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add from catalog */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={catalogSearch}
                onChange={e => setCatalogSearch(e.target.value)}
                placeholder="Search catalog to add line item..."
                className="h-9 pl-8 text-sm"
              />
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => addLineItem()} className="h-9 shrink-0">
              <Plus className="h-4 w-4 mr-1" /> Manual
            </Button>
          </div>

          {/* Catalog search results */}
          {catalogSearch && (
            <div className="border rounded-lg max-h-40 overflow-y-auto divide-y bg-card">
              {filteredCatalog.length === 0 ? (
                <p className="text-xs text-muted-foreground p-3">No catalog items found</p>
              ) : (
                filteredCatalog.slice(0, 10).map(item => (
                  <button
                    key={item.id}
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors flex items-center justify-between"
                    onClick={() => { addLineItem(item); setCatalogSearch(''); }}
                  >
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-[11px] text-muted-foreground">{item.service_category} · {item.price_type}</p>
                    </div>
                    <span className="text-sm font-medium">${item.unit_price?.toFixed(2) || '0.00'}</span>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Line items table */}
          {lineItems.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="hidden sm:grid grid-cols-[1fr_1fr_80px_100px_100px_40px] gap-2 px-3 py-2 bg-muted/50 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                <span>Item</span>
                <span>Description</span>
                <span>Qty</span>
                <span>Unit Price</span>
                <span>Total</span>
                <span></span>
              </div>
              <div className="divide-y">
                {lineItems.map(li => (
                  <div key={li.id} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_80px_100px_100px_40px] gap-2 px-3 py-2 items-center">
                    <Input
                      value={li.item_name}
                      onChange={e => updateLineItem(li.id, 'item_name', e.target.value)}
                      placeholder="Item name"
                      className="h-8 text-sm"
                    />
                    <Input
                      value={li.description}
                      onChange={e => updateLineItem(li.id, 'description', e.target.value)}
                      placeholder="Description"
                      className="h-8 text-sm"
                    />
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={li.quantity}
                      onChange={e => updateLineItem(li.id, 'quantity', parseFloat(e.target.value) || 0)}
                      className="h-8 text-sm"
                    />
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={li.unit_price}
                      onChange={e => updateLineItem(li.id, 'unit_price', parseFloat(e.target.value) || 0)}
                      className="h-8 text-sm"
                    />
                    <div className="text-sm font-medium px-1">${li.line_total.toFixed(2)}</div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Settings2 className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => duplicateLineItem(li.id)}>
                          <Copy className="h-3.5 w-3.5 mr-2" /> Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => removeLineItem(li.id)}>
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
              <div className="flex justify-end px-3 py-2 bg-muted/30 border-t">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Subtotal</p>
                  <p className="text-lg font-bold">${subtotal.toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}

          {lineItems.length === 0 && (
            <div className="text-center py-6 text-sm text-muted-foreground border rounded-lg border-dashed">
              No line items yet. Search the catalog above or add a manual item.
            </div>
          )}
        </CardContent>
      </Card>

      {/* ====== STICKY SAVE BAR ====== */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 px-4 py-3">
          <Button variant="ghost" onClick={() => navigate('/jobs')}>
            <X className="h-4 w-4 mr-1" /> Cancel
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => handleSave('draft')} className="hidden sm:flex">
              Save as Draft
            </Button>

            <div className="flex">
              <Button onClick={() => handleSave('save_open')} className="rounded-r-none">
                <Save className="h-4 w-4 mr-1.5" /> Save Job
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="rounded-l-none border-l border-primary-foreground/20 px-2">
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => handleSave('save_open')}>
                    <Briefcase className="h-4 w-4 mr-2" /> Save & Open Job
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSave('save_visit')}>
                    <Calendar className="h-4 w-4 mr-2" /> Save & Create Visit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSave('save_another')}>
                    <Plus className="h-4 w-4 mr-2" /> Save & Create Another
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSave('draft')}>
                    <FileText className="h-4 w-4 mr-2" /> Save as Draft
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
