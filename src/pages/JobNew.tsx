import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { useCustomers, useCreateCustomer } from '@/hooks/useCustomers';
import { useProperties, useCreateProperty } from '@/hooks/useProperties';
import { useEmployees } from '@/hooks/useEmployees';
import { useAllSubcontractors } from '@/hooks/useSubcontractor';
import { useCreateVisit } from '@/hooks/useVisits';
import { supabase } from '@/integrations/supabase/client';
import { handleProtectedCustomerError } from '@/lib/protectedCustomers';
import { SERVICE_CATEGORIES, JOB_STATUSES, JOB_PRIORITIES, PROPERTY_TYPES, PROVINCES } from '@/lib/constants';
import {
  Briefcase, User, MapPin, Calendar, Clock, Users, FileText,
  Settings2, DollarSign, Plus, Trash2, ChevronDown, Copy,
  ArrowLeft, Save, X, Search, AlertTriangle, Package,
  Repeat, Mail, MessageSquare, UserPlus, Phone, Building2, Gift,
} from 'lucide-react';

// ─── Types ───
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
  { value: 'schedule', label: 'Invoice by schedule' },
  { value: 'manual', label: 'Invoice manually later' },
  { value: 'deposit', label: 'Deposit / retainer required' },
  { value: 'progress', label: 'Progress billing' },
] as const;

const REPEAT_OPTIONS = [
  { value: 'does_not_repeat', label: 'Does not repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'seasonal', label: 'Seasonal' },
  { value: 'custom', label: 'Custom' },
] as const;

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export default function JobNew() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: customers = [] } = useCustomers();
  const { data: allProperties = [] } = useProperties();
  const { data: employees = [] } = useEmployees();
  const { data: subcontractors = [] } = useAllSubcontractors();
  const createCustomer = useCreateCustomer();
  const createProperty = useCreateProperty();
  const createVisit = useCreateVisit();

  // Catalog
  const [catalogItems, setCatalogItems] = useState<any[]>([]);
  useEffect(() => {
    supabase.from('products_services').select('*').ilike('status', 'active').order('name').then(({ data }) => {
      if (data) setCatalogItems(data);
    });
  }, []);

  // ═══════════════════════════════════════════
  //  FORM STATE
  // ═══════════════════════════════════════════

  // Section 1: Basic Info
  const [jobTitle, setJobTitle] = useState('');
  const [customerId, setCustomerId] = useState(searchParams.get('customer_id') || '');
  const [propertyId, setPropertyId] = useState('');
  const [serviceCategory, setServiceCategory] = useState('');
  const [priority, setPriority] = useState('Normal');
  const [status, setStatus] = useState('Draft');
  const [salesRepId, setSalesRepId] = useState('');

  // Section 2: Schedule
  const [isOneOff, setIsOneOff] = useState(true);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduleLater, setScheduleLater] = useState(false);
  const [contractStartDate, setContractStartDate] = useState('');
  const [contractEndDate, setContractEndDate] = useState('');
  const [ongoingNoEnd, setOngoingNoEnd] = useState(false);
  const [serviceFrequency, setServiceFrequency] = useState('does_not_repeat');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [seasonName, setSeasonName] = useState('');
  const [minimumVisits, setMinimumVisits] = useState('');
  const [additionalVisitRate, setAdditionalVisitRate] = useState('');

  // Assignment
  const [assignedWorkers, setAssignedWorkers] = useState<string[]>([]);
  const [workerSearch, setWorkerSearch] = useState('');

  // Instructions / Notes
  const [scopeOfWork, setScopeOfWork] = useState('');
  const [serviceInstructions, setServiceInstructions] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  // Complimentary
  const [isComplimentary, setIsComplimentary] = useState(false);
  const [complimentaryValue, setComplimentaryValue] = useState('');
  const [complimentaryReason, setComplimentaryReason] = useState('');

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

  // New client dialog
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClient, setNewClient] = useState({ first_name: '', last_name: '', email: '', phone: '', company_name: '' });

  // New property dialog
  const [showNewProperty, setShowNewProperty] = useState(false);
  const [newProperty, setNewProperty] = useState({
    property_name: '', address_line_1: '', city: '', province: 'SK', postal_code: '',
    property_type: 'Residential' as string, access_notes: '',
  });

  // Saving state
  const [saving, setSaving] = useState(false);
  const [showWorkerDropdown, setShowWorkerDropdown] = useState(false);

  // ═══════════════════════════════════════════
  //  COMPUTED
  // ═══════════════════════════════════════════

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers as any[];
    const s = customerSearch.toLowerCase();
    return (customers as any[]).filter((c: any) =>
      `${c.first_name} ${c.last_name} ${c.company_name || ''} ${c.email || ''}`.toLowerCase().includes(s)
    );
  }, [customers, customerSearch]);

  const filteredProperties = useMemo(() => {
    if (!customerId) return [];
    return (allProperties as any[]).filter((p: any) => p.customer_id === customerId);
  }, [allProperties, customerId]);

  const selectedCustomer = useMemo(() =>
    (customers as any[]).find((c: any) => c.id === customerId), [customers, customerId]);

  const selectedProperty = useMemo(() =>
    (allProperties as any[]).find((p: any) => p.id === propertyId), [allProperties, propertyId]);

  const filteredCatalog = useMemo(() => {
    if (!catalogSearch) return catalogItems;
    const s = catalogSearch.toLowerCase();
    return catalogItems.filter(i => `${i.name} ${i.description || ''} ${i.service_category || ''}`.toLowerCase().includes(s));
  }, [catalogItems, catalogSearch]);

  const activeSubs = useMemo(() =>
    (subcontractors as any[]).filter((s: any) => s.user_id && s.active_flag !== false), [subcontractors]);

  const allAssignableWorkers = useMemo(() => {
    const emps = (employees as any[]).map((e: any) => ({ uid: e.user_id, name: e.full_name || e.user_id, label: e.job_title || '', type: 'worker' as const }));
    const subs = activeSubs.map((s: any) => ({ uid: s.user_id, name: s.contact_name || s.company_name, label: s.company_name ? `Subcontractor · ${s.company_name}` : 'Subcontractor', type: 'sub' as const }));
    return [...emps, ...subs];
  }, [employees, activeSubs]);

  const filteredWorkers = useMemo(() => {
    if (!workerSearch) return allAssignableWorkers;
    const s = workerSearch.toLowerCase();
    return allAssignableWorkers.filter(w => `${w.name} ${w.label}`.toLowerCase().includes(s));
  }, [allAssignableWorkers, workerSearch]);

  const subtotal = useMemo(() => lineItems.reduce((s, li) => s + li.line_total, 0), [lineItems]);

  // ═══════════════════════════════════════════
  //  EFFECTS
  // ═══════════════════════════════════════════

  // Auto-fill property notes into instructions
  useEffect(() => {
    if (selectedProperty?.access_notes && !serviceInstructions) {
      setServiceInstructions(prev => prev || `Access: ${selectedProperty.access_notes}`);
    }
  }, [selectedProperty]);

  // Reset recurring fields on one-off toggle
  useEffect(() => {
    if (isOneOff) {
      setServiceFrequency('does_not_repeat');
      setContractStartDate('');
      setContractEndDate('');
      setSeasonName('');
      setOngoingNoEnd(false);
      setSelectedDays([]);
    }
  }, [isOneOff]);

  // Auto-select first property if client only has one
  useEffect(() => {
    if (customerId && filteredProperties.length === 1) {
      setPropertyId(filteredProperties[0].id);
    } else if (!customerId) {
      setPropertyId('');
    }
  }, [customerId, filteredProperties]);

  // ═══════════════════════════════════════════
  //  LINE ITEM HELPERS
  // ═══════════════════════════════════════════

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
    if (catalogItem?.service_category && !serviceCategory) {
      setServiceCategory(catalogItem.service_category);
    }
    setLineItems(prev => [...prev, newItem]);
  }, [serviceCategory]);

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

  const removeLineItem = useCallback((id: string) => setLineItems(prev => prev.filter(li => li.id !== id)), []);
  const duplicateLineItem = useCallback((id: string) => {
    setLineItems(prev => {
      const src = prev.find(li => li.id === id);
      if (!src) return prev;
      return [...prev, { ...src, id: crypto.randomUUID() }];
    });
  }, []);

  // Worker assignment
  const toggleWorker = useCallback((userId: string) => {
    setAssignedWorkers(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  }, []);

  const toggleDay = useCallback((day: string) => {
    setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  }, []);

  // ═══════════════════════════════════════════
  //  NEW CLIENT
  // ═══════════════════════════════════════════

  const handleCreateClient = async () => {
    if (!newClient.first_name || !newClient.last_name) {
      toast({ title: 'Name required', variant: 'destructive' });
      return;
    }
    try {
      const created = await createCustomer.mutateAsync(newClient as any);
      setCustomerId(created.id);
      setShowNewClient(false);
      setNewClient({ first_name: '', last_name: '', email: '', phone: '', company_name: '' });
      toast({ title: 'Client created' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  // ═══════════════════════════════════════════
  //  VALIDATION
  // ═══════════════════════════════════════════

  const validate = (): string | null => {
    if (!jobTitle.trim()) return 'Job title is required.';
    if (!customerId) return 'Client is required.';
    if (!serviceCategory) return 'Service category is required.';
    if (!isOneOff && serviceFrequency === 'does_not_repeat') return 'Select a recurrence frequency for recurring jobs.';
    return null;
  };

  // ═══════════════════════════════════════════
  //  SAVE
  // ═══════════════════════════════════════════

  const handleSave = async (action: 'save' | 'save_visit' | 'save_open' | 'save_another' | 'draft' | 'save_assign') => {
    const error = validate();
    if (error) {
      toast({ title: 'Validation Error', description: error, variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const primaryAssigned = assignedWorkers[0] || null;
      const jobData: any = {
        job_number: '',
        job_title: jobTitle,
        customer_id: customerId,
        property_id: propertyId || null,
        service_category: serviceCategory,
        priority,
        status: action === 'draft' ? 'Draft' : status,
        assigned_to: primaryAssigned,
        scope_of_work: scopeOfWork || null,
        service_instructions: serviceInstructions || null,
        internal_notes: internalNotes || null,
        is_complimentary: isComplimentary,
        complimentary_value: isComplimentary && complimentaryValue ? parseFloat(complimentaryValue) : null,
        complimentary_reason: isComplimentary ? (complimentaryReason || null) : null,
        ...(isComplimentary ? { billing_status: 'not_billable' } : {}),
        scheduled_date: scheduledDate || null,
        contract_start_date: contractStartDate || null,
        contract_end_date: ongoingNoEnd ? null : (contractEndDate || null),
        service_frequency: serviceFrequency === 'does_not_repeat' ? null : serviceFrequency,
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
        await supabase.from('job_line_items').insert(items as any);
      }

      // Create subcontractor_assignments for any subcontractors in the crew
      if (job) {
        const subUserIds = assignedWorkers.filter(uid => activeSubs.some((s: any) => s.user_id === uid));
        for (const uid of subUserIds) {
          const sub = activeSubs.find((s: any) => s.user_id === uid);
          if (sub) {
            await supabase.from('subcontractor_assignments').insert({
              subcontractor_id: sub.id,
              job_id: job.id,
              property_id: propertyId || null,
              assignment_status: 'assigned',
            } as any);
          }
        }
      }

      // Invalidate caches
      qc.invalidateQueries({ queryKey: ['jobs'] });
      qc.invalidateQueries({ queryKey: ['property_jobs'] });
      qc.invalidateQueries({ queryKey: ['sidebar_counts'] });
      qc.invalidateQueries({ queryKey: ['subcontractor_assignments'] });

      toast({ title: 'Job created', description: `${(job as any).job_number} — ${jobTitle}` });

      if (action === 'save_visit' && job) {
        await createVisit.mutateAsync({
          visit_number: '',
          job_id: job.id,
          customer_id: customerId,
          property_id: propertyId || null,
          service_date: scheduledDate || contractStartDate || new Date().toISOString().split('T')[0],
          visit_type: 'Routine' as any,
          visit_status: 'Scheduled' as any,
          crew_notes: serviceInstructions || null,
          site_instructions: scopeOfWork || null,
          assigned_worker_id: primaryAssigned,
          service_category: serviceCategory || null,
          priority,
        } as any);
        toast({ title: 'Visit scheduled' });
        navigate(`/jobs/${job.id}`);
      } else if (action === 'save_open' || action === 'save_assign') {
        navigate(`/jobs/${job.id}`);
      } else if (action === 'save_another') {
        setJobTitle(''); setCustomerId(''); setPropertyId('');
        setScopeOfWork(''); setServiceInstructions(''); setInternalNotes('');
        setScheduledDate(''); setLineItems([]);
        setAssignedWorkers([]); setServiceCategory('');
        setBillingNotes(''); setCustomerBillingNotes('');
        toast({ title: 'Form reset — create another job' });
      } else {
        navigate('/jobs');
      }
    } catch (err: any) {
      if (handleProtectedCustomerError(err)) {
        setSaving(false);
        return;
      }
      toast({ title: 'Error creating job', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // ═══════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════

  const workerName = (uid: string) => {
    const emp = (employees as any[]).find((e: any) => e.user_id === uid);
    if (emp) return emp.full_name || uid;
    const sub = activeSubs.find((s: any) => s.user_id === uid);
    if (sub) return `${sub.contact_name || sub.company_name} (Sub)`;
    return uid;
  };
  const salesRepName = salesRepId ? workerName(salesRepId) : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-28">
      {/* ──── HEADER ──── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/jobs')} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">New Job</h1>
            <p className="text-xs text-muted-foreground">Create, schedule, and assign a new job</p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs">{status}</Badge>
      </div>

      {/* ══════════════════════════════════════════
          SECTION 1: BASIC JOB INFO
         ══════════════════════════════════════════ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <Briefcase className="h-4 w-4" /> Basic Job Info
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Job Title */}
          <div>
            <Label className="text-xs font-medium">Job Title <span className="text-destructive">*</span></Label>
            <Input value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="e.g. Seasonal Snow Removal — 123 Main St" className="h-10" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Client selector */}
            <div>
              <Label className="text-xs font-medium flex items-center gap-1"><User className="h-3 w-3" /> Client <span className="text-destructive">*</span></Label>
              <Select value={customerId} onValueChange={v => { setCustomerId(v); setPropertyId(''); }}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Search & select client..." /></SelectTrigger>
                <SelectContent>
                  <div className="p-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} placeholder="Search clients..." className="h-8 pl-8 text-xs" onClick={e => e.stopPropagation()} />
                    </div>
                  </div>
                  {filteredCustomers.slice(0, 50).map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{c.first_name} {c.last_name}</span>
                        {c.company_name && <span className="text-muted-foreground text-xs">({c.company_name})</span>}
                      </div>
                    </SelectItem>
                  ))}
                  <div className="border-t p-1">
                    <button type="button" onClick={() => setShowNewClient(true)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-primary/5 rounded-md transition-colors">
                      <UserPlus className="h-4 w-4" /> Create new client
                    </button>
                  </div>
                </SelectContent>
              </Select>
              {selectedCustomer && (
                <div className="mt-1.5 p-2 rounded-md bg-muted/40 border text-xs space-y-0.5">
                  <p className="font-medium">{selectedCustomer.first_name} {selectedCustomer.last_name} {selectedCustomer.company_name && `· ${selectedCustomer.company_name}`}</p>
                  <div className="flex flex-wrap gap-x-3 text-muted-foreground">
                    {selectedCustomer.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{selectedCustomer.phone}</span>}
                    {selectedCustomer.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{selectedCustomer.email}</span>}
                    {selectedCustomer.address_line_1 && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{selectedCustomer.address_line_1}, {selectedCustomer.city}</span>}
                  </div>
                </div>
              )}
            </div>

            {/* Property selector */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs font-medium flex items-center gap-1"><MapPin className="h-3 w-3" /> Property / Location</Label>
                {customerId && (
                  <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs"
                    onClick={() => setShowNewProperty(true)}>
                    <Plus className="h-3 w-3 mr-1" /> Add property
                  </Button>
                )}
              </div>
              <Select value={propertyId} onValueChange={setPropertyId} disabled={!customerId}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder={customerId ? (filteredProperties.length === 0 ? 'No properties yet — click + Add property' : 'Select property...') : 'Select client first'} />
                </SelectTrigger>
                <SelectContent>
                  {filteredProperties.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex items-center gap-2">
                        <span>{p.property_name}</span>
                        {p.address_line_1 && <span className="text-muted-foreground text-xs">— {p.address_line_1}</span>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {customerId && filteredProperties.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  This client has no properties yet. Click <span className="font-semibold">+ Add property</span> above to create one.
                </p>
              )}
              {selectedProperty && (
                <div className="mt-1.5 space-y-1">
                  {selectedProperty.access_notes && (
                    <p className="text-xs text-muted-foreground bg-muted/40 border rounded-md px-2 py-1">🔑 {selectedProperty.access_notes}</p>
                  )}
                  {selectedProperty.caution_notes && (
                    <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-2 py-1 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 shrink-0" /> {selectedProperty.caution_notes}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Service Category */}
            <div>
              <Label className="text-xs font-medium flex items-center gap-1"><Package className="h-3 w-3" /> Service Category <span className="text-destructive">*</span></Label>
              <Select value={serviceCategory} onValueChange={setServiceCategory}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Select category..." /></SelectTrigger>
                <SelectContent>
                  {SERVICE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div>
              <Label className="text-xs font-medium">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {JOB_PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div>
              <Label className="text-xs font-medium">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {JOB_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Salesperson / Account Rep */}
          <div>
            <Label className="text-xs font-medium flex items-center gap-1"><Building2 className="h-3 w-3" /> Salesperson / Account Rep</Label>
            <Select value={salesRepId} onValueChange={setSalesRepId}>
              <SelectTrigger className="h-10"><SelectValue placeholder="Assign account rep..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— None —</SelectItem>
                {(employees as any[]).map((e: any) => (
                  <SelectItem key={e.user_id} value={e.user_id}>
                    {e.full_name}{e.job_title ? ` · ${e.job_title}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════
          SECTION 2: JOB TYPE + SCHEDULE
         ══════════════════════════════════════════ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4" /> Job Type & Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Job type toggle */}
          <div className="flex gap-2">
            <Button type="button" variant={isOneOff ? 'default' : 'outline'} size="sm" onClick={() => setIsOneOff(true)} className="flex-1">
              One-off
            </Button>
            <Button type="button" variant={!isOneOff ? 'default' : 'outline'} size="sm" onClick={() => setIsOneOff(false)} className="flex-1">
              <Repeat className="h-3.5 w-3.5 mr-1.5" /> Recurring
            </Button>
          </div>

          {isOneOff ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Switch checked={scheduleLater} onCheckedChange={setScheduleLater} className="scale-90" />
                <Label className="text-xs cursor-pointer">Schedule later</Label>
              </div>
              {!scheduleLater && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Scheduled Date</Label>
                    <Input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} className="h-10" />
                  </div>
                </div>
              )}
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
                  <Input type="date" value={contractEndDate} onChange={e => setContractEndDate(e.target.value)} className="h-10" disabled={ongoingNoEnd} />
                </div>
                <div className="flex items-end">
                  <div className="flex items-center gap-2 h-10">
                    <Checkbox checked={ongoingNoEnd} onCheckedChange={v => setOngoingNoEnd(!!v)} />
                    <Label className="text-xs cursor-pointer">Ongoing (no end date)</Label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs">Repeats</Label>
                  <Select value={serviceFrequency} onValueChange={setServiceFrequency}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {REPEAT_OPTIONS.filter(r => r.value !== 'does_not_repeat').map(r => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Season</Label>
                  <Input value={seasonName} onChange={e => setSeasonName(e.target.value)} placeholder="e.g. Winter 2026" className="h-10" />
                </div>
                <div>
                  <Label className="text-xs">Min. Included Visits</Label>
                  <Input type="number" min={0} value={minimumVisits} onChange={e => setMinimumVisits(e.target.value)} placeholder="e.g. 20" className="h-10" />
                </div>
              </div>

              {/* Day-of-week selector for weekly/biweekly */}
              {(serviceFrequency === 'weekly' || serviceFrequency === 'biweekly') && (
                <div>
                  <Label className="text-xs mb-1.5 block">Service Days</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {DAYS_OF_WEEK.map(day => (
                      <Button key={day} type="button" size="sm" variant={selectedDays.includes(day) ? 'default' : 'outline'}
                        className="h-8 w-12 text-xs" onClick={() => toggleDay(day)}>
                        {day}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label className="text-xs">Additional Visit Rate ($)</Label>
                <Input type="number" min={0} step="0.01" value={additionalVisitRate} onChange={e => setAdditionalVisitRate(e.target.value)} placeholder="0.00" className="h-10 max-w-xs" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════
          SECTION 3: ASSIGNMENT + INSTRUCTIONS
         ══════════════════════════════════════════ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <Users className="h-4 w-4" /> Assignment & Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Multi-worker assignment */}
          <div>
            <Label className="text-xs font-medium flex items-center gap-1">Assign Workers / Subcontractors</Label>
            {assignedWorkers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1 mb-2">
                {assignedWorkers.map(uid => (
                  <Badge key={uid} variant="secondary" className="text-xs gap-1 pr-1">
                    {workerName(uid)}
                    <button type="button" onClick={() => toggleWorker(uid)} className="ml-0.5 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={workerSearch} onChange={e => { setWorkerSearch(e.target.value); setShowWorkerDropdown(true); }} onFocus={() => setShowWorkerDropdown(true)} placeholder="Search workers & subcontractors..." className="h-9 pl-8 text-sm" />
            </div>
            {showWorkerDropdown && (
              <div className="border rounded-lg mt-1 max-h-48 overflow-y-auto divide-y bg-card shadow-md">
                {filteredWorkers.filter(w => !assignedWorkers.includes(w.uid)).length === 0 ? (
                  <p className="text-xs text-muted-foreground p-3">No available team members</p>
                ) : (
                  filteredWorkers.filter(w => !assignedWorkers.includes(w.uid)).slice(0, 15).map(w => (
                    <button key={w.uid} type="button" className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors flex items-center justify-between text-sm"
                      onClick={() => { toggleWorker(w.uid); setWorkerSearch(''); setShowWorkerDropdown(false); }}>
                      <span className="font-medium">{w.name}</span>
                      <span className="text-xs text-muted-foreground">{w.label}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Instructions */}
          <div>
            <Label className="text-xs font-medium">Scope of Work</Label>
            <Textarea value={scopeOfWork} onChange={e => setScopeOfWork(e.target.value)} rows={3} placeholder="Describe the scope of work..." className="min-h-[80px]" />
          </div>
          <div>
            <Label className="text-xs font-medium">Visit Instructions (for crew)</Label>
            <Textarea value={serviceInstructions} onChange={e => setServiceInstructions(e.target.value)} rows={2} placeholder="Instructions that will appear on each visit for the crew..." className="min-h-[60px]" />
          </div>
          <div>
            <Label className="text-xs font-medium">Internal Notes (admin only)</Label>
            <Textarea value={internalNotes} onChange={e => setInternalNotes(e.target.value)} rows={2} placeholder="Notes visible only to admin/office staff..." className="min-h-[60px]" />
          </div>

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
              <Switch checked={isComplimentary} onCheckedChange={setIsComplimentary} />
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
                    value={complimentaryValue}
                    onChange={e => setComplimentaryValue(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Reason (optional)</Label>
                  <Input
                    placeholder="Goodwill, referral thank-you..."
                    value={complimentaryReason}
                    onChange={e => setComplimentaryReason(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════
          SECTION 4: BILLING
         ══════════════════════════════════════════ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <DollarSign className="h-4 w-4" /> Billing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-medium">Invoice Behavior</Label>
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
              <Label className="text-xs font-medium">Internal Billing Notes</Label>
              <Textarea value={billingNotes} onChange={e => setBillingNotes(e.target.value)} rows={2} placeholder="e.g. Net 30, requires PO..." className="min-h-[60px]" />
            </div>
            <div>
              <Label className="text-xs font-medium">Customer-facing Billing Notes</Label>
              <Textarea value={customerBillingNotes} onChange={e => setCustomerBillingNotes(e.target.value)} rows={2} placeholder="Notes visible on invoices..." className="min-h-[60px]" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════
          SECTION 5: PRODUCTS & SERVICES / LINE ITEMS
         ══════════════════════════════════════════ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <Settings2 className="h-4 w-4" /> Products & Services
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Catalog search + manual add */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={catalogSearch} onChange={e => setCatalogSearch(e.target.value)} placeholder={`Search ${catalogItems.length} catalog items…`} className="h-9 pl-8 text-sm" />
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => addLineItem()} className="h-9 shrink-0">
              <Plus className="h-4 w-4 mr-1" /> Manual
            </Button>
          </div>

          {/* Always show browsable catalog list */}
          <div className="border rounded-lg max-h-64 overflow-y-auto divide-y bg-card">
            {catalogItems.length === 0 ? (
              <p className="text-xs text-muted-foreground p-3">Loading catalog…</p>
            ) : filteredCatalog.length === 0 ? (
              <p className="text-xs text-muted-foreground p-3">No items match "{catalogSearch}"</p>
            ) : (
              <>
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground bg-muted/30 sticky top-0">
                  {catalogSearch ? `${filteredCatalog.length} match${filteredCatalog.length === 1 ? '' : 'es'}` : `Browse all ${catalogItems.length} items`} — click to add
                </div>
                {(catalogSearch ? filteredCatalog : filteredCatalog).slice(0, catalogSearch ? 50 : 100).map(item => (
                  <button key={item.id} type="button" className="w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors flex items-center justify-between"
                    onClick={() => { addLineItem(item); setCatalogSearch(''); }}>
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-[11px] text-muted-foreground">{item.service_category} · {item.price_type}</p>
                    </div>
                    <span className="text-sm font-semibold">${item.unit_price?.toFixed(2) || '0.00'}</span>
                  </button>
                ))}
                {!catalogSearch && filteredCatalog.length > 100 && (
                  <p className="text-[11px] text-muted-foreground p-2 text-center bg-muted/20">
                    Showing first 100 of {filteredCatalog.length}. Search above to narrow down.
                  </p>
                )}
              </>
            )}
          </div>


          {/* Line items table */}
          {lineItems.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <div className="hidden sm:grid grid-cols-[1fr_1fr_80px_100px_100px_40px] gap-2 px-3 py-2 bg-muted/50 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                <span>Item</span><span>Description</span><span>Qty</span><span>Unit Price</span><span>Total</span><span></span>
              </div>
              <div className="divide-y">
                {lineItems.map(li => (
                  <div key={li.id} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_80px_100px_100px_40px] gap-2 px-3 py-2 items-center">
                    <Input value={li.item_name} onChange={e => updateLineItem(li.id, 'item_name', e.target.value)} placeholder="Item name" className="h-8 text-sm" />
                    <Input value={li.description} onChange={e => updateLineItem(li.id, 'description', e.target.value)} placeholder="Description" className="h-8 text-sm" />
                    <Input type="number" min={0} step="0.01" value={li.quantity} onChange={e => updateLineItem(li.id, 'quantity', parseFloat(e.target.value) || 0)} className="h-8 text-sm" />
                    <Input type="number" min={0} step="0.01" value={li.unit_price} onChange={e => updateLineItem(li.id, 'unit_price', parseFloat(e.target.value) || 0)} className="h-8 text-sm" />
                    <div className="text-sm font-semibold px-1">${li.line_total.toFixed(2)}</div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><Settings2 className="h-3.5 w-3.5" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => duplicateLineItem(li.id)}><Copy className="h-3.5 w-3.5 mr-2" /> Duplicate</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => removeLineItem(li.id)}><Trash2 className="h-3.5 w-3.5 mr-2" /> Remove</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
              <div className="flex justify-end px-3 py-3 bg-muted/30 border-t">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Job Subtotal</p>
                  <p className="text-xl font-bold">${subtotal.toFixed(2)}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-sm text-muted-foreground border rounded-lg border-dashed">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No line items yet. Search the catalog above or add a manual item.
            </div>
          )}
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════
          STICKY SAVE BAR
         ══════════════════════════════════════════ */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 px-4 py-3">
          <Button variant="ghost" onClick={() => navigate('/jobs')} disabled={saving}>
            <X className="h-4 w-4 mr-1" /> Cancel
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => handleSave('draft')} className="hidden sm:flex" disabled={saving}>
              Save as Draft
            </Button>

            <div className="flex">
              <Button onClick={() => handleSave('save_open')} className="rounded-r-none" disabled={saving}>
                <Save className="h-4 w-4 mr-1.5" /> Save Job
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="rounded-l-none border-l border-primary-foreground/20 px-2" disabled={saving}>
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
                  <DropdownMenuItem onClick={() => handleSave('save_assign')}>
                    <Users className="h-4 w-4 mr-2" /> Save & Assign Crew
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSave('save_another')}>
                    <Plus className="h-4 w-4 mr-2" /> Save & Create Another
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleSave('draft')}>
                    <FileText className="h-4 w-4 mr-2" /> Save as Draft
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          NEW CLIENT DIALOG
         ══════════════════════════════════════════ */}
      <Dialog open={showNewClient} onOpenChange={setShowNewClient}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" /> New Client</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">First Name *</Label>
                <Input value={newClient.first_name} onChange={e => setNewClient(p => ({ ...p, first_name: e.target.value }))} className="h-9" />
              </div>
              <div>
                <Label className="text-xs">Last Name *</Label>
                <Input value={newClient.last_name} onChange={e => setNewClient(p => ({ ...p, last_name: e.target.value }))} className="h-9" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Company</Label>
              <Input value={newClient.company_name} onChange={e => setNewClient(p => ({ ...p, company_name: e.target.value }))} className="h-9" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Email</Label>
                <Input type="email" value={newClient.email} onChange={e => setNewClient(p => ({ ...p, email: e.target.value }))} className="h-9" />
              </div>
              <div>
                <Label className="text-xs">Phone</Label>
                <Input value={newClient.phone} onChange={e => setNewClient(p => ({ ...p, phone: e.target.value }))} className="h-9" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewClient(false)}>Cancel</Button>
            <Button onClick={handleCreateClient} disabled={createCustomer.isPending}>
              {createCustomer.isPending ? 'Creating...' : 'Create Client'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════
          NEW PROPERTY DIALOG
         ══════════════════════════════════════════ */}
      <Dialog open={showNewProperty} onOpenChange={setShowNewProperty}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" /> Add Property for {selectedCustomer ? `${selectedCustomer.first_name} ${selectedCustomer.last_name}` : 'Client'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Property Name *</Label>
              <Input value={newProperty.property_name} onChange={e => setNewProperty(p => ({ ...p, property_name: e.target.value }))} placeholder="e.g. Main Residence, Office Building" className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Address</Label>
              <Input value={newProperty.address_line_1} onChange={e => setNewProperty(p => ({ ...p, address_line_1: e.target.value }))} placeholder="Street address" className="h-9" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">City</Label>
                <Input value={newProperty.city} onChange={e => setNewProperty(p => ({ ...p, city: e.target.value }))} className="h-9" />
              </div>
              <div>
                <Label className="text-xs">Province</Label>
                <Select value={newProperty.province} onValueChange={v => setNewProperty(p => ({ ...p, province: v }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROVINCES.map(pr => <SelectItem key={pr} value={pr}>{pr}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Postal Code</Label>
                <Input value={newProperty.postal_code} onChange={e => setNewProperty(p => ({ ...p, postal_code: e.target.value }))} className="h-9" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Property Type</Label>
              <Select value={newProperty.property_type} onValueChange={v => setNewProperty(p => ({ ...p, property_type: v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROPERTY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Access / Gate Notes (optional)</Label>
              <Textarea value={newProperty.access_notes} onChange={e => setNewProperty(p => ({ ...p, access_notes: e.target.value }))} rows={2} className="text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewProperty(false)}>Cancel</Button>
            <Button
              disabled={!customerId || !newProperty.property_name || createProperty.isPending}
              onClick={async () => {
                try {
                  const created: any = await createProperty.mutateAsync({
                    customer_id: customerId,
                    property_name: newProperty.property_name,
                    address_line_1: newProperty.address_line_1 || null,
                    city: newProperty.city || null,
                    province: newProperty.province || null,
                    postal_code: newProperty.postal_code || null,
                    property_type: newProperty.property_type as any,
                    access_notes: newProperty.access_notes || null,
                  });
                  toast({ title: 'Property created', description: newProperty.property_name });
                  if (created?.id) setPropertyId(created.id);
                  setShowNewProperty(false);
                  setNewProperty({ property_name: '', address_line_1: '', city: '', province: 'SK', postal_code: '', property_type: 'Residential', access_notes: '' });
                } catch (err: any) {
                  if (handleProtectedCustomerError(err)) return;
                  toast({ title: 'Failed to create property', description: err.message, variant: 'destructive' });
                }
              }}>
              {createProperty.isPending ? 'Creating…' : 'Create Property'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
