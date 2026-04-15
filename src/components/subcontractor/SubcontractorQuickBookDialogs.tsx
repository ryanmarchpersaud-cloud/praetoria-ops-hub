import { useState } from 'react';
import { MapPin } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useCreateCustomer, useCustomers } from '@/hooks/useCustomers';
import { useCreateProperty } from '@/hooks/useProperties';
import { useCreateLead } from '@/hooks/useLeads';
import { useCreateJob } from '@/hooks/useJobs';
import { useCreateInvoice } from '@/hooks/useInvoices';
import { useCreateQuote } from '@/hooks/useQuotes';
import { SERVICE_CATEGORIES } from '@/lib/constants';
import { useNavigate } from 'react-router-dom';
import { useProperties } from '@/hooks/useProperties';

type QuickBookDialogType = 'customer' | 'property' | 'lead' | 'job' | 'invoice' | 'quote' | null;

interface Props {
  activeDialog: QuickBookDialogType;
  onClose: () => void;
}

export function SubcontractorQuickBookDialogs({ activeDialog, onClose }: Props) {
  return (
    <>
      <QuickCustomerDialog open={activeDialog === 'customer'} onClose={onClose} />
      <QuickPropertyDialog open={activeDialog === 'property'} onClose={onClose} />
      <QuickLeadDialog open={activeDialog === 'lead'} onClose={onClose} />
      <QuickJobDialog open={activeDialog === 'job'} onClose={onClose} />
      <QuickInvoiceDialog open={activeDialog === 'invoice'} onClose={onClose} />
      <QuickQuoteDialog open={activeDialog === 'quote'} onClose={onClose} />
    </>
  );
}

/* ─── Customer ─── */
function QuickCustomerDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const createCustomer = useCreateCustomer();
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', company_name: '' });

  const reset = () => setForm({ first_name: '', last_name: '', email: '', phone: '', company_name: '' });

  const handleSubmit = async () => {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      toast({ title: 'First and last name are required', variant: 'destructive' });
      return;
    }
    try {
      await createCustomer.mutateAsync(form);
      toast({ title: 'Customer created' });
      reset();
      onClose();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => { reset(); onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>New Customer</DialogTitle>
          <DialogDescription>Add a new customer to the system.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div><Label>First Name *</Label><Input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} /></div>
            <div><Label>Last Name *</Label><Input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} /></div>
          </div>
          <div><Label>Company</Label><Input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} /></div>
          <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
          <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createCustomer.isPending}>{createCustomer.isPending ? 'Saving…' : 'Create'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Property ─── */
function QuickPropertyDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const createProperty = useCreateProperty();
  const { data: customers = [] } = useCustomers();
  const [form, setForm] = useState({ property_name: '', address_line_1: '', city: '', province: '', postal_code: '', customer_id: '' });

  const reset = () => setForm({ property_name: '', address_line_1: '', city: '', province: '', postal_code: '', customer_id: '' });

  const handleSubmit = async () => {
    if (!form.property_name.trim()) {
      toast({ title: 'Property name is required', variant: 'destructive' });
      return;
    }
    try {
      await createProperty.mutateAsync({
        ...form,
        customer_id: form.customer_id || null,
      });
      toast({ title: 'Property created' });
      reset();
      onClose();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => { reset(); onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>New Property</DialogTitle>
          <DialogDescription>Add a new service property.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div><Label>Property Name *</Label><Input value={form.property_name} onChange={e => setForm(f => ({ ...f, property_name: e.target.value }))} /></div>
          <div>
            <Label>Customer</Label>
            <Select value={form.customer_id} onValueChange={v => setForm(f => ({ ...f, customer_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
              <SelectContent>
                {customers.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}{c.company_name ? ` (${c.company_name})` : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Address</Label><Input value={form.address_line_1} onChange={e => setForm(f => ({ ...f, address_line_1: e.target.value }))} /></div>
          <div className="grid grid-cols-3 gap-2">
            <div><Label>City</Label><Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} /></div>
            <div><Label>Province</Label><Input value={form.province} onChange={e => setForm(f => ({ ...f, province: e.target.value }))} /></div>
            <div><Label>Postal</Label><Input value={form.postal_code} onChange={e => setForm(f => ({ ...f, postal_code: e.target.value }))} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createProperty.isPending}>{createProperty.isPending ? 'Saving…' : 'Create'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Lead ─── */
function QuickLeadDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const createLead = useCreateLead();
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', company_name: '', service_type: '', notes: '' });

  const reset = () => setForm({ first_name: '', last_name: '', email: '', phone: '', company_name: '', service_type: '', notes: '' });

  const handleSubmit = async () => {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      toast({ title: 'First and last name are required', variant: 'destructive' });
      return;
    }
    try {
      await createLead.mutateAsync({
        ...form,
        service_type: (form.service_type || null) as any,
      });
      toast({ title: 'Lead created' });
      reset();
      onClose();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => { reset(); onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>New Lead</DialogTitle>
          <DialogDescription>Submit a new lead or referral.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div><Label>First Name *</Label><Input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} /></div>
            <div><Label>Last Name *</Label><Input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} /></div>
          </div>
          <div><Label>Company</Label><Input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} /></div>
          <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
          <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
          <div>
            <Label>Service Type</Label>
            <Select value={form.service_type} onValueChange={v => setForm(f => ({ ...f, service_type: v }))}>
              <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
              <SelectContent>
                {SERVICE_CATEGORIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createLead.isPending}>{createLead.isPending ? 'Saving…' : 'Create'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Job ─── */
function QuickJobDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const createJob = useCreateJob();
  const { data: customers = [] } = useCustomers();
  const { data: properties = [] } = useProperties();
  const { user } = useAuth();
  const [form, setForm] = useState({ job_title: '', customer_id: '', property_id: '', service_category: '', notes: '' });

  const reset = () => setForm({ job_title: '', customer_id: '', property_id: '', service_category: '', notes: '' });

  const filteredProperties = form.customer_id
    ? properties?.filter((p: any) => p.customer_id === form.customer_id) || []
    : properties || [];

  // Get selected property address for display
  const selectedProperty = form.property_id ? (properties || []).find((p: any) => p.id === form.property_id) : null;
  const propertyAddress = selectedProperty
    ? [selectedProperty.address_line_1, selectedProperty.city, selectedProperty.province].filter(Boolean).join(', ')
    : null;

  const handleSubmit = async () => {
    if (!form.job_title.trim()) {
      toast({ title: 'Job title is required', variant: 'destructive' });
      return;
    }
    try {
      await createJob.mutateAsync({
        job_title: form.job_title,
        customer_id: form.customer_id || null,
        property_id: form.property_id || null,
        service_category: (form.service_category || 'Snow & Ice') as any,
        notes: form.notes || null,
        assigned_to: user?.id || null,
      });
      toast({ title: 'Job created & assigned to you', description: 'Check your schedule.' });
      reset();
      onClose();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => { reset(); onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>New Job</DialogTitle>
          <DialogDescription>Create a new job assigned to you.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div><Label>Job Title *</Label><Input value={form.job_title} onChange={e => setForm(f => ({ ...f, job_title: e.target.value }))} /></div>
          <div>
            <Label>Service Category</Label>
            <Select value={form.service_category} onValueChange={v => setForm(f => ({ ...f, service_category: v }))}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {SERVICE_CATEGORIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Customer</Label>
            <Select value={form.customer_id} onValueChange={v => setForm(f => ({ ...f, customer_id: v, property_id: '' }))}>
              <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
              <SelectContent>
                {customers.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}{c.company_name ? ` (${c.company_name})` : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Property (for directions)</Label>
            <Select value={form.property_id} onValueChange={v => setForm(f => ({ ...f, property_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
              <SelectContent>
                {filteredProperties.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{p.property_name}{p.address_line_1 ? ` — ${p.address_line_1}` : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {propertyAddress && (
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-primary/10 text-xs">
              <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="text-foreground font-medium truncate">{propertyAddress}</span>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(propertyAddress)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto text-primary font-bold text-[10px] shrink-0"
              >
                Navigate ↗
              </a>
            </div>
          )}
          <div><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createJob.isPending}>{createJob.isPending ? 'Saving…' : 'Create'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Invoice ─── */
function QuickInvoiceDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const createInvoice = useCreateInvoice();
  const { data: customers = [] } = useCustomers();
  const [form, setForm] = useState({ customer_id: '', notes: '' });

  const reset = () => setForm({ customer_id: '', notes: '' });

  const handleSubmit = async () => {
    if (!form.customer_id) {
      toast({ title: 'Please select a customer', variant: 'destructive' });
      return;
    }
    try {
      const data = await createInvoice.mutateAsync({
        customer_id: form.customer_id,
        notes: form.notes || null,
        status: 'Draft' as any,
      });
      toast({ title: 'Invoice created' });
      reset();
      onClose();
      navigate(`/subcontractor/invoices/${data.id}`);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => { reset(); onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>New Invoice</DialogTitle>
          <DialogDescription>Create a new invoice.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Customer *</Label>
            <Select value={form.customer_id} onValueChange={v => setForm(f => ({ ...f, customer_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
              <SelectContent>
                {customers.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}{c.company_name ? ` (${c.company_name})` : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createInvoice.isPending}>{createInvoice.isPending ? 'Saving…' : 'Create'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Quote ─── */
function QuickQuoteDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const createQuote = useCreateQuote();
  const { data: customers = [] } = useCustomers();
  const [form, setForm] = useState({ customer_id: '', service_category: '', scope_of_work: '' });

  const reset = () => setForm({ customer_id: '', service_category: '', scope_of_work: '' });

  const handleSubmit = async () => {
    if (!form.customer_id) {
      toast({ title: 'Please select a customer', variant: 'destructive' });
      return;
    }
    try {
      const data = await createQuote.mutateAsync({
        customer_id: form.customer_id,
        quote_number: '',
        service_category: (form.service_category || 'Snow & Ice') as any,
        scope_of_work: form.scope_of_work || null,
      });
      toast({ title: 'Quote created' });
      reset();
      onClose();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => { reset(); onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>New Quote</DialogTitle>
          <DialogDescription>Create a new quote.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Customer *</Label>
            <Select value={form.customer_id} onValueChange={v => setForm(f => ({ ...f, customer_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
              <SelectContent>
                {customers.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}{c.company_name ? ` (${c.company_name})` : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Service Category</Label>
            <Select value={form.service_category} onValueChange={v => setForm(f => ({ ...f, service_category: v }))}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {SERVICE_CATEGORIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Scope of Work</Label><Textarea rows={2} value={form.scope_of_work} onChange={e => setForm(f => ({ ...f, scope_of_work: e.target.value }))} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createQuote.isPending}>{createQuote.isPending ? 'Saving…' : 'Create'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export type { QuickBookDialogType };
