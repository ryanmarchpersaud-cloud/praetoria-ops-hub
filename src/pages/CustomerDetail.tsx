import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useCustomer, useUpdateCustomer } from '@/hooks/useCustomers';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/StatusBadge';
import { PropertyUsageBadge } from '@/components/PropertyUsageBadge';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, MapPin, Mail, Phone, Building2, UserPlus, Check, FileText, Briefcase, Receipt, ClipboardCheck, MessageSquarePlus, Plus, Send, Loader2, FileSignature, CreditCard, Contact, Landmark, ShieldCheck, Eye, Copy, Trash2, AlertTriangle, FileCheck2 } from 'lucide-react';
import { ProofOfServiceDialog } from '@/components/visits/ProofOfServiceDialog';
import { useAuthorization } from '@/hooks/useAuthorization';
import { Switch } from '@/components/ui/switch';
import { callEdgeFunction } from '@/lib/edgeFunctionClient';
import { CustomerWarningsEditor } from '@/components/CustomerWarningsEditor';
import { CustomerWorkOverview } from '@/components/customer/CustomerWorkOverview';
import { CustomerServiceHistory } from '@/components/customer/CustomerServiceHistory';
import { CustomerCommunicationsCard } from '@/components/customer/CustomerCommunicationsCard';
import { CustomerDocumentsCard } from '@/components/customer/CustomerDocumentsCard';
import { CustomerBillingLedger } from '@/components/customer/CustomerBillingLedger';
import { CustomerContactsCard } from '@/components/customer/CustomerContactsCard';
import { CustomerJobCostTrackingSection } from '@/components/customer/CustomerJobCostTrackingSection';
import { useBillingProfile } from '@/hooks/useInvoices';
import { SelectJobsToInvoiceDialog } from '@/components/customer/SelectJobsToInvoiceDialog';
import { supabase } from '@/integrations/supabase/client';
import { PROVINCES, CUSTOMER_TYPES, ACCOUNT_TYPES, BILLING_METHODS, COMMUNICATION_METHODS, LEAD_SOURCES, CUSTOMER_STATUSES } from '@/lib/constants';
import { formatDistanceToNow } from 'date-fns';

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: customer, isLoading } = useCustomer(id);
  const updateCustomer = useUpdateCustomer();
  const { toast } = useToast();

  const [form, setForm] = useState<any>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  // Password is always "praetoria" — handled server-side
  const [inviting, setInviting] = useState(false);
  const [invoiceSelectOpen, setInvoiceSelectOpen] = useState(false);
  const [proofOpen, setProofOpen] = useState(false);
  const [resending, setResending] = useState(false);
  const [impersonating, setImpersonating] = useState(false);
  const [impersonateLink, setImpersonateLink] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const { isAdmin, roles } = useAuthorization();
  const canHardDelete = isAdmin || roles.includes('owner' as any);
  const handleImpersonate = async () => {
    if (!id) return;
    setImpersonating(true);
    setImpersonateLink(null);
    try {
      const { data, error } = await supabase.functions.invoke('admin-impersonate-customer', {
        body: { customer_id: id, redirect_to: `${window.location.origin}/portal` },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const link = (data as any)?.action_link;
      if (!link) throw new Error('No link returned');
      setImpersonateLink(link);
      // Open in a NEW incognito-like window so it doesn't replace your admin session
      window.open(link, '_blank', 'noopener,noreferrer');
      toast({ title: 'Portal view opened', description: 'A new tab opened logged in as this customer. She is not notified.' });
    } catch (e: any) {
      toast({ title: 'Could not open portal view', description: e?.message || 'Failed', variant: 'destructive' });
    } finally {
      setImpersonating(false);
    }
  };

  // Billing fields are column-restricted; fetch via ops-only RPC and merge into form
  const { data: billingDetails, isSuccess: billingLoaded, isError: billingErrored } = useQuery({
    queryKey: ['customer-billing-details', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase.rpc('get_customer_billing_details', { _customer_id: id });
      if (error) throw error;
      return data as Record<string, any> | null;
    },
    enabled: !!id,
  });

  // Seed form only once BOTH the customer row and the billing-details RPC have resolved,
  // so we never save NULLs over restricted billing/notes columns during a race.
  useEffect(() => {
    if (form) return;
    if (!customer) return;
    if (!billingLoaded && !billingErrored) return;
    setForm({ ...customer, ...(billingDetails || {}) });
    setInviteEmail(customer.email || '');
  }, [customer, billingDetails, billingLoaded, billingErrored, form]);


  const { data: properties = [] } = useQuery({
    queryKey: ['customer_properties', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase.from('properties').select('id, property_name, city, status, usage_type').eq('customer_id', id).order('property_name');
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: quotes = [] } = useQuery({
    queryKey: ['customer_quotes', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase.from('quotes').select('id, quote_number, approval_status, total, created_at').eq('customer_id', id).order('created_at', { ascending: false }).limit(5);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!id,
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['customer_jobs', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase.from('jobs').select('id, job_number, job_title, status, created_at').eq('customer_id', id).order('created_at', { ascending: false }).limit(5);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!id,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['customer_invoices', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase.from('invoices').select('id, invoice_number, status, total, balance_due, created_at').eq('customer_id', id).order('created_at', { ascending: false }).limit(5);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!id,
  });

  const { data: requests = [] } = useQuery({
    queryKey: ['customer_requests', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase.from('service_requests').select('id, subject, status, created_at').eq('customer_id', id).order('created_at', { ascending: false }).limit(5);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!id,
  });

  const { data: agreements = [] } = useQuery({
    queryKey: ['customer_agreements', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase.from('agreements').select('id, title, status, created_at, signing_token').eq('customer_id', id).order('created_at', { ascending: false }).limit(10);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!id,
  });

  const { data: lastLogin } = useQuery({
    queryKey: ['customer_last_login', customer?.user_id],
    queryFn: async () => {
      if (!customer?.user_id) return null;
      const { data } = await supabase
        .from('audit_log')
        .select('created_at')
        .eq('actor_user_id', customer.user_id)
        .eq('action', 'auth.login')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data?.created_at ?? null;
    },
    enabled: !!customer?.user_id,
  });

  if (isLoading) return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
  if (!customer) return <div className="p-8 text-muted-foreground text-sm">Customer not found</div>;

  const set = (key: string, value: any) => setForm((p: any) => ({ ...p, [key]: value }));

  const handleSave = async () => {
    if (!id || !form) return;
    try {
      await updateCustomer.mutateAsync({
        id,
        first_name: form.first_name, last_name: form.last_name,
        customer_type: form.customer_type || 'Residential',
        account_type: form.account_type || 'Individual',
        customer_status: form.customer_status || 'Active',
        pause_reason: (form.customer_status === 'Paused' || form.customer_status === 'Lost') ? (form.pause_reason || null) : null,
        company_name: form.company_name || null,
        company_legal_name: form.company_legal_name || null,
        operating_name: form.operating_name || null,
        primary_contact_title: form.primary_contact_title || null,
        email: form.email || null, phone: form.phone || null,
        secondary_email: form.secondary_email || null,
        secondary_phone: form.secondary_phone || null,
        billing_contact_name: form.billing_contact_name || null,
        billing_contact_title: form.billing_contact_title || null,
        billing_contact_email: form.billing_contact_email || null,
        billing_contact_phone: form.billing_contact_phone || null,
        billing_contact_fax: form.billing_contact_fax || null,
        accounts_payable_email: form.accounts_payable_email || null,
        website: form.website || null,
        fax: form.fax || null,
        preferred_billing_method: form.preferred_billing_method || null,
        requires_po_number: form.requires_po_number || false,
        site_contact_name: form.site_contact_name || null,
        site_contact_phone: form.site_contact_phone || null,
        site_contact_email: form.site_contact_email || null,
        project_notes: form.project_notes || null,
        address_line_1: form.address_line_1 || null,
        city: form.city || null, province: form.province || null,
        postal_code: form.postal_code || null,
        billing_address_same_as_service: form.billing_address_same_as_service ?? true,
        billing_address_line_1: form.billing_address_line_1 || null,
        billing_city: form.billing_city || null,
        billing_province: form.billing_province || null,
        billing_postal_code: form.billing_postal_code || null,
        portal_access_enabled: form.portal_access_enabled || false,
        preferred_communication_method: form.preferred_communication_method || null,
        referral_source: form.referral_source || null,
        notes: form.notes || null,
        is_protected: !!form.is_protected,
      });
      // Sync the protected_customers guard table so the DB trigger blocks automation writes.
      try {
        if (form.is_protected) {
          await supabase.from('protected_customers').upsert(
            { customer_id: id, reason: 'Real client — only Ryan may act on this account' },
            { onConflict: 'customer_id' },
          );
        } else {
          await supabase.from('protected_customers').delete().eq('customer_id', id);
        }
      } catch (e) {
        console.warn('protected_customers sync failed', e);
      }
      toast({ title: 'Customer saved' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail) {
      toast({ title: 'Error', description: 'Email is required', variant: 'destructive' });
      return;
    }
    setInviting(true);
    try {
      const { data, error } = await supabase.functions.invoke('invite-customer', {
        body: { customer_id: id, email: inviteEmail, password: 'praetoria' },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      // Now send the welcome email
      try {
        await callEdgeFunction('send-portal-invite', {
          portal_type: 'customer',
          customer_id: id,
        });
      } catch { /* email send is best-effort */ }
      toast({ title: 'Portal account created & invite sent', description: data.message });
      setInviteOpen(false);
      window.location.reload();
    } catch (err: any) {
      toast({ title: 'Invitation failed', description: err.message, variant: 'destructive' });
    } finally {
      setInviting(false);
    }
  };

  const handleResendInvite = async () => {
    setResending(true);
    try {
      const result = await callEdgeFunction('send-portal-invite', {
        portal_type: 'customer',
        customer_id: id,
      });
      if (result?.error) throw new Error(result.error);
      toast({ title: result.message || 'Invite re-sent!' });
    } catch (err: any) {
      toast({ title: err.message || 'Failed to resend invite', variant: 'destructive' });
    } finally {
      setResending(false);
    }
  };

  const hasPortalAccess = !!customer.user_id;

  const customerDisplayName = (
    [customer.first_name, customer.last_name].filter(Boolean).join(' ').trim() ||
    customer.company_name ||
    'this customer'
  );

  const handleDeleteCustomer = async () => {
    if (!id) return;
    if (deleteConfirmText.trim().toLowerCase() !== customerDisplayName.trim().toLowerCase()) {
      toast({ title: 'Name does not match', description: `Type "${customerDisplayName}" exactly to confirm.`, variant: 'destructive' });
      return;
    }
    setDeleting(true);
    try {
      const { data, error } = await supabase.rpc('admin_delete_customer', { _customer_id: id });
      if (error) throw error;
      const counts = (data as any)?.deleted ?? {};
      toast({
        title: 'Customer deleted',
        description: `${customerDisplayName} and all linked records were removed (` +
          `${counts.jobs || 0} jobs, ${counts.invoices || 0} invoices, ${counts.quotes || 0} quotes, ` +
          `${counts.visits || 0} visits, ${counts.properties || 0} properties).`,
      });
      setDeleteOpen(false);
      navigate('/customers');
    } catch (err: any) {
      const msg = err?.message || 'Unknown error';
      toast({
        title: msg.includes('PROTECTED_CUSTOMER') ? 'Cannot delete protected customer' :
               msg.includes('Only admins') ? 'Permission denied' : "Couldn't delete customer",
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };


  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9" onClick={() => navigate('/customers')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg md:text-xl font-bold flex items-center gap-2 flex-wrap">
            {form?.is_protected && (
              <ShieldCheck className="h-5 w-5 text-primary shrink-0" aria-label="Protected real customer" />
            )}
            <span>{customer.first_name} {customer.last_name}</span>
          </h1>
          <div className="flex items-center gap-2 flex-wrap">
            {customer.company_name && <span className="text-xs text-muted-foreground">{customer.company_name}</span>}
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{customer.customer_type}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{customer.account_type}</span>
            {(() => {
              const s = (form?.customer_status || customer.customer_status || 'Active') as string;
              const cls = s === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : s === 'Lost' ? 'bg-rose-50 text-rose-700 border-rose-200'
                : 'bg-amber-50 text-amber-700 border-amber-200';
              return <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${cls}`}>{s}</span>;
            })()}
            {form?.is_protected && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold inline-flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> Protected
              </span>
            )}
          </div>
        </div>
      </div>

      {form?.is_protected && (
        <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-primary flex items-start gap-2">
          <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <strong>Protected real customer.</strong> Automation and AI assistants will not modify this record or send anything to this customer. Only admins should make changes.
          </div>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <Button onClick={handleSave} className="flex-1 h-11" disabled={updateCustomer.isPending}>
          <Save className="h-4 w-4 mr-2" /> Save
        </Button>
        <Button variant="outline" className="h-11 gap-2" onClick={() => setInvoiceSelectOpen(true)}>
          <Receipt className="h-4 w-4" /> Invoice from Jobs
        </Button>
        <Button variant="success" className="h-11 gap-2 font-bold shadow-sm" onClick={() => setProofOpen(true)}>
          <FileCheck2 className="h-4 w-4" /> Proof of Service
        </Button>
        {!hasPortalAccess ? (
          <Button variant="outline" className="h-11 gap-2" onClick={() => setInviteOpen(true)}>
            <UserPlus className="h-4 w-4" /> Invite to Portal
          </Button>
        ) : (
          <>
            <div className="flex flex-col items-start px-3 h-11 justify-center rounded-md border bg-muted/50 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-accent" /> Portal active</span>
              <span className="text-[10px]">
                {lastLogin ? `Last login ${formatDistanceToNow(new Date(lastLogin), { addSuffix: true })}` : 'Never logged in'}
              </span>
            </div>
            <Button variant="outline" className="h-11 gap-2" onClick={handleResendInvite} disabled={resending}>
              {resending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Resend Invite
            </Button>
            <Button variant="outline" className="h-11 gap-2" onClick={handleImpersonate} disabled={impersonating} title="Open this customer's portal in a new tab — silent, no notification sent.">
              {impersonating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
              View as Customer
            </Button>
          </>
        )}
        {canHardDelete && (
          <Button
            variant="outline"
            className="h-11 gap-2 ml-auto text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
            onClick={() => { setDeleteConfirmText(''); setDeleteOpen(true); }}
            disabled={!!form?.is_protected}
            title={form?.is_protected ? 'Protected customers cannot be deleted. Remove protection first.' : 'Permanently delete this customer and all related records'}
          >
            <Trash2 className="h-4 w-4" /> Delete Customer
          </Button>
        )}
      </div>
      {impersonateLink && (
        <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-primary flex items-center justify-between gap-2">
          <span className="truncate">A new tab opened with the customer's portal view. The customer was <strong>not</strong> notified.</span>
          <Button size="sm" variant="ghost" className="h-7 gap-1" onClick={() => { navigator.clipboard.writeText(impersonateLink); toast({ title: 'Link copied' }); }}>
            <Copy className="h-3 w-3" /> Copy link
          </Button>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          {/* Account & Customer Type */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Account Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Customer Type</Label>
                  <select value={form?.customer_type || 'Residential'} onChange={e => set('customer_type', e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-10">
                    {CUSTOMER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Account Type</Label>
                  <select value={form?.account_type || 'Individual'} onChange={e => set('account_type', e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-10">
                    {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <Label className="text-xs">Customer Status</Label>
                <select
                  value={form?.customer_status || 'Active'}
                  onChange={e => set('customer_status', e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-10"
                >
                  {CUSTOMER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <p className="text-[11px] text-muted-foreground mt-1">
                  <strong>Active</strong> = current customer. <strong>Paused</strong> = service temporarily on hold. <strong>Lost</strong> = no longer a customer.
                </p>
              </div>
              {(form?.customer_status === 'Paused' || form?.customer_status === 'Lost') && (
                <div>
                  <Label className="text-xs">
                    {form?.customer_status === 'Paused' ? 'Pausing reason & notes' : 'Reason lost & notes'}
                  </Label>
                  <Textarea
                    value={form?.pause_reason || ''}
                    onChange={e => set('pause_reason', e.target.value)}
                    placeholder={form?.customer_status === 'Paused'
                      ? 'e.g. Customer travelling until June, equipment repair pending, seasonal hold...'
                      : 'e.g. Price too high, switched providers, property sold...'}
                    rows={3}
                    className="text-sm"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Recorded for internal reference. Not visible to the customer.
                  </p>
                </div>
              )}
              <div className="flex items-start gap-2 rounded-md border border-primary/20 bg-primary/5 p-3 mt-1">
                <Switch checked={!!form?.is_protected} onCheckedChange={(v) => set('is_protected', v)} id="cd_is_protected" />
                <div className="flex-1">
                  <Label htmlFor="cd_is_protected" className="cursor-pointer text-xs flex items-center gap-1.5 font-semibold">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Protected real customer
                  </Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">When on, automation and AI assistants will not modify this customer or send them anything.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Company Info (Company accounts) */}
          {form?.account_type === 'Company' && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1.5"><Building2 className="h-4 w-4" /> Company Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div><Label className="text-xs">Company Name</Label><Input value={form?.company_name || ''} onChange={e => set('company_name', e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Legal Name</Label><Input value={form?.company_legal_name || ''} onChange={e => set('company_legal_name', e.target.value)} /></div>
                  <div><Label className="text-xs">Operating / DBA Name</Label><Input value={form?.operating_name || ''} onChange={e => set('operating_name', e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Website</Label><Input type="url" placeholder="https://" value={form?.website || ''} onChange={e => set('website', e.target.value)} /></div>
                  <div><Label className="text-xs">Fax</Label><Input value={form?.fax || ''} onChange={e => set('fax', e.target.value)} /></div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Contact info */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1.5"><Contact className="h-4 w-4" /> {form?.account_type === 'Company' ? 'Primary Contact' : 'Contact Information'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">First Name *</Label><Input value={form?.first_name || ''} onChange={e => set('first_name', e.target.value)} /></div>
                <div><Label className="text-xs">Last Name *</Label><Input value={form?.last_name || ''} onChange={e => set('last_name', e.target.value)} /></div>
              </div>
              {form?.account_type === 'Company' && (
                <div><Label className="text-xs">Title / Role</Label><Input value={form?.primary_contact_title || ''} onChange={e => set('primary_contact_title', e.target.value)} /></div>
              )}
              {form?.account_type !== 'Company' && (
                <div><Label className="text-xs">Company</Label><Input value={form?.company_name || ''} onChange={e => set('company_name', e.target.value)} /></div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs flex items-center gap-1"><Mail className="h-3 w-3" /> Email</Label>
                  <Input type="email" value={form?.email || ''} onChange={e => set('email', e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs flex items-center gap-1"><Phone className="h-3 w-3" /> Phone</Label>
                  <Input value={form?.phone || ''} onChange={e => set('phone', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Secondary Email</Label><Input type="email" value={form?.secondary_email || ''} onChange={e => set('secondary_email', e.target.value)} /></div>
                <div><Label className="text-xs flex items-center gap-1"><Phone className="h-3 w-3" /> Secondary Phone</Label><Input value={form?.secondary_phone || ''} onChange={e => set('secondary_phone', e.target.value)} /></div>
              </div>
            </CardContent>
          </Card>

          {/* Billing Contact (Company accounts) */}
          {form?.account_type === 'Company' && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1.5"><Landmark className="h-4 w-4" /> Billing Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Billing Contact Name</Label><Input value={form?.billing_contact_name || ''} onChange={e => set('billing_contact_name', e.target.value)} /></div>
                  <div><Label className="text-xs">Billing Contact Title / Role</Label><Input value={form?.billing_contact_title || ''} onChange={e => set('billing_contact_title', e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Billing Contact Phone</Label><Input value={form?.billing_contact_phone || ''} onChange={e => set('billing_contact_phone', e.target.value)} /></div>
                  <div><Label className="text-xs">Billing Contact Fax</Label><Input value={form?.billing_contact_fax || ''} onChange={e => set('billing_contact_fax', e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Billing Contact Email</Label><Input type="email" value={form?.billing_contact_email || ''} onChange={e => set('billing_contact_email', e.target.value)} /></div>
                  <div><Label className="text-xs">Accounts Payable Email</Label><Input type="email" value={form?.accounts_payable_email || ''} onChange={e => set('accounts_payable_email', e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Preferred Billing Method</Label>
                    <select value={form?.preferred_billing_method || ''} onChange={e => set('preferred_billing_method', e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-10">
                      <option value="">—</option>
                      {BILLING_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="flex items-end gap-2 pb-1">
                    <input type="checkbox" checked={form?.requires_po_number || false} onChange={e => set('requires_po_number', e.target.checked)} id="edit_requires_po" className="rounded" />
                    <Label htmlFor="edit_requires_po" className="text-xs cursor-pointer">Requires PO / Job Number</Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Site / Project Contact (Company accounts) */}
          {form?.account_type === 'Company' && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1.5"><ClipboardCheck className="h-4 w-4" /> Site / Project Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div><Label className="text-xs">Site Contact Name</Label><Input value={form?.site_contact_name || ''} onChange={e => set('site_contact_name', e.target.value)} /></div>
                  <div><Label className="text-xs">Site Contact Phone</Label><Input value={form?.site_contact_phone || ''} onChange={e => set('site_contact_phone', e.target.value)} /></div>
                  <div><Label className="text-xs">Site Contact Email</Label><Input type="email" value={form?.site_contact_email || ''} onChange={e => set('site_contact_email', e.target.value)} /></div>
                </div>
                <div><Label className="text-xs">Project / Contractor Notes</Label><Textarea value={form?.project_notes || ''} onChange={e => set('project_notes', e.target.value)} rows={2} /></div>
              </CardContent>
            </Card>
          )}

          {/* Address */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1.5"><MapPin className="h-4 w-4" /> Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div><Label className="text-xs">Street Address</Label><Input value={form?.address_line_1 || ''} onChange={e => set('address_line_1', e.target.value)} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label className="text-xs">City</Label><Input value={form?.city || ''} onChange={e => set('city', e.target.value)} /></div>
                <div>
                  <Label className="text-xs">Province</Label>
                  <select value={form?.province || ''} onChange={e => set('province', e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-10">
                    <option value="">—</option>
                    {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div><Label className="text-xs">Postal Code</Label><Input value={form?.postal_code || ''} onChange={e => set('postal_code', e.target.value)} /></div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardContent className="pt-4">
              <Label className="text-xs">Notes</Label>
              <Textarea value={form?.notes || ''} onChange={e => set('notes', e.target.value)} rows={3} />
            </CardContent>
          </Card>

          {/* Additional Contacts (spouse, partner, etc.) */}
          {id && <CustomerContactsCard customerId={id} />}

          {/* Customer Warnings */}
          {id && <CustomerWarningsEditor customerId={id} />}

          {/* Work Overview */}
          {id && <CustomerWorkOverview customerId={id} />}

          {/* Service History — every past & future visit, photos, notes */}
          {id && <CustomerServiceHistory customerId={id} />}

          {/* Billing Ledger */}
          {id && <CustomerBillingLedger customerId={id} />}
        </div>

        {/* Sidebar: Related Records */}
        <div className="space-y-3">
          {/* Payment Method Status */}
          {id && <PaymentMethodCard customerId={id} onCompleteSetup={() => setInviteOpen(true)} />}
          {/* Properties */}
          <RelatedRecordCard
            title="Properties"
            icon={Building2}
            count={(properties as any[]).length}
            accent="slate"
            emptyText="No properties linked"
            createLink={`/properties?new=1&customer_id=${id}`}
            createLabel="Add"
            items={(properties as any[]).map((p: any) => ({
              id: p.id,
              link: `/properties/${p.id}`,
              primary: (
                <span className="inline-flex items-center gap-1.5">
                  <PropertyUsageBadge usage={p.usage_type} compact />
                  <span>{p.property_name}</span>
                </span>
              ),
              secondary: p.city,
              badge: <StatusBadge status={p.status || 'Active'} showIcon={false} />,
            }))}
          />

          {/* Requests */}
          <RelatedRecordCard
            title="Requests"
            icon={MessageSquarePlus}
            count={requests.length}
            accent="purple"
            emptyText="No requests"
            createLink={`/requests?new=1&customer_id=${id}`}
            createLabel="New"
            items={requests.map((r: any) => ({
              id: r.id,
              link: `/requests/${r.id}`,
              primary: r.subject,
              secondary: formatDistanceToNow(new Date(r.created_at), { addSuffix: true }),
              badge: <StatusBadge status={r.status} showIcon={false} />,
            }))}
          />

          {/* Quotes */}
          <RelatedRecordCard
            title="Quotes"
            icon={FileText}
            count={quotes.length}
            accent="blue"
            emptyText="No quotes"
            createLink={`/quotes?new=1&customer_id=${id}`}
            createLabel="New"
            items={quotes.map((q: any) => ({
              id: q.id,
              link: `/quotes/${q.id}`,
              primary: q.quote_number,
              secondary: `$${Number(q.total || 0).toLocaleString()}`,
              badge: <StatusBadge status={q.approval_status} showIcon={false} />,
              mono: true,
            }))}
          />

          {/* Jobs */}
          <RelatedRecordCard
            title="Jobs"
            icon={Briefcase}
            count={jobs.length}
            accent="green"
            emptyText="No jobs"
            createLink={`/jobs/new?customer_id=${id}`}
            createLabel="New"
            items={jobs.map((j: any) => ({
              id: j.id,
              link: `/jobs/${j.id}`,
              primary: j.job_title,
              secondary: j.job_number,
              badge: <StatusBadge status={j.status} showIcon={false} />,
            }))}
          />

          {/* Invoices */}
          <RelatedRecordCard
            title="Invoices"
            icon={Receipt}
            count={invoices.length}
            accent="amber"
            emptyText="No invoices"
            createLink={`/invoices/new?customer_id=${id}`}
            createLabel="New"
            items={invoices.map((i: any) => ({
              id: i.id,
              link: `/invoices/${i.id}`,
              primary: i.invoice_number,
              secondary: `$${Number(i.total || 0).toLocaleString()} · Bal: $${Number(i.balance_due || 0).toLocaleString()}`,
              badge: <StatusBadge status={i.status} showIcon={false} />,
              mono: true,
            }))}
          />

          {/* Job Cost & Profit Tracking */}
          {id && <CustomerJobCostTrackingSection customerId={id} />}


          {/* Agreements */}
          <RelatedRecordCard
            title="Agreements"
            icon={FileSignature}
            count={agreements.length}
            accent="rose"
            emptyText="No agreements"
            createLink="/agreements"
            createLabel="New"
            items={agreements.map((a: any) => ({
              id: a.id,
              link: `/agreements/${a.id}`,
              primary: a.title,
              secondary: a.created_at ? formatDistanceToNow(new Date(a.created_at), { addSuffix: true }) : '',
              badge: <StatusBadge status={a.status} showIcon={false} />,
            }))}
          />
          {id && <CustomerDocumentsCard customerId={id} />}
          {id && <CustomerCommunicationsCard customerId={id} />}
        </div>
      </div>

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-sm mx-3">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <UserPlus className="h-4 w-4" /> Invite to Customer Portal
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Create a portal login for <strong>{customer.first_name} {customer.last_name}</strong>. 
              They'll be able to view their properties, visits, photos, quotes, and submit service requests.
            </p>
            <div>
              <Label className="text-xs">Portal Login Email *</Label>
              <Input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="customer@example.com" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Temporary password: <strong>praetoria</strong> — they will be asked to change it after first login.</p>
            </div>
            <Button className="w-full h-11" disabled={inviting || !inviteEmail} onClick={handleInvite}>
              {inviting ? 'Creating account...' : 'Create Portal Account'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Select Jobs to Invoice Dialog */}
      {id && (
        <SelectJobsToInvoiceDialog
          open={invoiceSelectOpen}
          onOpenChange={setInvoiceSelectOpen}
          customerId={id}
          customerName={`${customer.first_name} ${customer.last_name}`}
        />
      )}

      {id && (
        <ProofOfServiceDialog
          open={proofOpen}
          onOpenChange={setProofOpen}
          mode="customer"
          customerId={id}
          defaultEmail={(customer as any)?.email || (customer as any)?.billing_contact_email || null}
        />
      )}

      {/* ─── Delete Customer Confirmation ─────────────────── */}
      <Dialog open={deleteOpen} onOpenChange={(o) => { if (!deleting) setDeleteOpen(o); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Delete Customer Permanently
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p>
              You are about to <strong>permanently delete {customerDisplayName}</strong> and
              every record linked to them. This cannot be undone.
            </p>
            {(jobs.length > 0 || invoices.length > 0 || quotes.length > 0 || properties.length > 0 || requests.length > 0 || agreements.length > 0) ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 space-y-1.5">
                <p className="text-xs font-semibold text-destructive uppercase tracking-wide">
                  Linked records that will also be deleted:
                </p>
                <ul className="text-xs space-y-0.5 ml-1">
                  {properties.length > 0 && <li>• {properties.length} {properties.length === 1 ? 'property' : 'properties'}</li>}
                  {requests.length > 0 && <li>• {requests.length}+ service request{requests.length === 1 ? '' : 's'}</li>}
                  {quotes.length > 0 && <li>• {quotes.length}+ quote{quotes.length === 1 ? '' : 's'} (and line items)</li>}
                  {jobs.length > 0 && <li>• {jobs.length}+ job{jobs.length === 1 ? '' : 's'} (and visits, photos, snow logs)</li>}
                  {invoices.length > 0 && <li>• {invoices.length}+ invoice{invoices.length === 1 ? '' : 's'} (and line items, payments, refunds)</li>}
                  {agreements.length > 0 && <li>• {agreements.length} agreement{agreements.length === 1 ? '' : 's'}</li>}
                </ul>
                <p className="text-[11px] text-muted-foreground pt-1">
                  Note: lists above show recent items only — the backend will remove <strong>all</strong> matching records.
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No linked records found — this customer is safe to remove.</p>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="delete-confirm" className="text-xs">
                Type <span className="font-mono font-semibold text-foreground">{customerDisplayName}</span> to confirm:
              </Label>
              <Input
                id="delete-confirm"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={customerDisplayName}
                autoComplete="off"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1 gap-2"
              onClick={handleDeleteCustomer}
              disabled={deleting || deleteConfirmText.trim().toLowerCase() !== customerDisplayName.trim().toLowerCase()}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete Forever
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Payment Method Status Card (Admin View) ──────── */
function PaymentMethodCard({ customerId }: { customerId: string }) {
  const { data: bp, refetch } = useBillingProfile(customerId);
  const [manualOpen, setManualOpen] = useState(false);
  const [cardBrand, setCardBrand] = useState('visa');
  const [cardLast4, setCardLast4] = useState('');
  const [cardExpMonth, setCardExpMonth] = useState('');
  const [cardExpYear, setCardExpYear] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSaveCard = async () => {
    if (!cardLast4 || cardLast4.length !== 4) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('customer_billing_profiles').upsert(
        {
          customer_id: customerId,
          card_brand: cardBrand,
          card_last4: cardLast4,
          card_exp_month: cardExpMonth ? parseInt(cardExpMonth) : null,
          card_exp_year: cardExpYear ? parseInt(cardExpYear) : null,
          payment_method_present: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'customer_id' }
      );
      if (error) throw error;
      refetch();
      setManualOpen(false);
    } catch (err: any) {
      console.error('Failed to save card:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveCard = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('customer_billing_profiles').upsert(
        {
          customer_id: customerId,
          card_brand: null,
          card_last4: null,
          card_exp_month: null,
          card_exp_year: null,
          payment_method_present: false,
          default_payment_method_id: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'customer_id' }
      );
      if (error) throw error;
      refetch();
    } catch (err: any) {
      console.error('Failed to remove card:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5" /> Payment Method
            </CardTitle>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] gap-1" onClick={() => {
              if (bp?.payment_method_present) {
                setCardBrand(bp.card_brand || 'visa');
                setCardLast4(bp.card_last4 || '');
                setCardExpMonth((bp as any).card_exp_month?.toString() || '');
                setCardExpYear((bp as any).card_exp_year?.toString() || '');
              } else {
                setCardBrand('visa');
                setCardLast4('');
                setCardExpMonth('');
                setCardExpYear('');
              }
              setManualOpen(true);
            }}>
              <Plus className="h-3 w-3" /> {bp?.payment_method_present ? 'Update' : 'Add Card'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {bp?.payment_method_present ? (
            isChargeable(bp) ? (
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-medium">
                  <CheckCircle2 className="h-3 w-3" /> Chargeable · Stripe
                </div>
                <p className="text-sm font-medium capitalize">{bp.card_brand} •••• {bp.card_last4}</p>
                {(bp as any).card_exp_month && (bp as any).card_exp_year && (
                  <p className="text-[10px] text-muted-foreground">
                    Expires {String((bp as any).card_exp_month).padStart(2, '0')}/{(bp as any).card_exp_year}
                  </p>
                )}
                <p className="text-[10px] text-accent">✓ Default payment method</p>
                <p className="text-[10px] text-muted-foreground">
                  {bp.autopay_enabled ? '✅ Auto-pay enabled' : 'Manual payments'}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Preference: {bp.payment_preference?.replace('_', ' ')}
                </p>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-destructive mt-1" onClick={handleRemoveCard} disabled={saving}>
                  Remove Card
                </Button>
              </div>
            ) : (
              <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-2">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-medium">
                  <AlertTriangle className="h-3 w-3" /> Reference only — not chargeable
                </div>
                <p className="text-sm font-medium capitalize">{bp.card_brand} •••• {bp.card_last4}</p>
                <p className="text-[10px] text-amber-900">
                  This card was entered for records only. To charge it, complete payment setup with the customer.
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <Button size="sm" variant="default" className="h-7 px-2 text-[10px]" onClick={() => setInviteOpen(true)}>
                    Complete payment setup
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-destructive" onClick={handleRemoveCard} disabled={saving}>
                    Remove
                  </Button>
                </div>
              </div>
            )
          ) : (
            <p className="text-xs text-muted-foreground">No card on file</p>
          )}
        </CardContent>

      </Card>

      {/* Manual Card Entry Dialog */}
      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4" /> {bp?.payment_method_present ? 'Update' : 'Add'} Card on File
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Card Brand</Label>
              <select value={cardBrand} onChange={e => setCardBrand(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-9">
                <option value="visa">Visa</option>
                <option value="mastercard">Mastercard</option>
                <option value="amex">American Express</option>
                <option value="discover">Discover</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Last 4 Digits *</Label>
              <Input maxLength={4} value={cardLast4} onChange={e => setCardLast4(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="1234" className="h-9 font-mono" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Exp Month</Label>
                <Input type="number" min="1" max="12" value={cardExpMonth} onChange={e => setCardExpMonth(e.target.value)} placeholder="MM" className="h-9" />
              </div>
              <div>
                <Label className="text-xs">Exp Year</Label>
                <Input type="number" min="2024" max="2040" value={cardExpYear} onChange={e => setCardExpYear(e.target.value)} placeholder="YYYY" className="h-9" />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">Only safe metadata is stored — no full card numbers.</p>
            <Button className="w-full h-9" onClick={handleSaveCard} disabled={saving || cardLast4.length !== 4}>
              {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
              Save Card Info
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ─── Reusable sidebar card ──────────────────────────── */
interface RelatedItem {
  id: string;
  link: string;
  primary: React.ReactNode;
  secondary?: string;
  badge?: React.ReactNode;
  mono?: boolean;
}

type AccentColor = 'slate' | 'purple' | 'blue' | 'green' | 'amber' | 'rose';

const ACCENT_STYLES: Record<AccentColor, { badge: string; icon: string; ring: string }> = {
  slate:  { badge: 'bg-slate-100 text-slate-700 ring-slate-200',   icon: 'text-slate-600',  ring: 'ring-slate-200' },
  purple: { badge: 'bg-purple-100 text-purple-700 ring-purple-200', icon: 'text-purple-600', ring: 'ring-purple-200' },
  blue:   { badge: 'bg-blue-100 text-blue-700 ring-blue-200',       icon: 'text-blue-600',   ring: 'ring-blue-200' },
  green:  { badge: 'bg-green-100 text-green-700 ring-green-200',    icon: 'text-green-600',  ring: 'ring-green-200' },
  amber:  { badge: 'bg-amber-100 text-amber-800 ring-amber-200',    icon: 'text-amber-600',  ring: 'ring-amber-200' },
  rose:   { badge: 'bg-rose-100 text-rose-700 ring-rose-200',       icon: 'text-rose-600',   ring: 'ring-rose-200' },
};

function RelatedRecordCard({
  title, icon: Icon, count, emptyText, items, createLink, createLabel, accent = 'slate',
}: {
  title: string;
  icon: React.ElementType;
  count: number;
  emptyText: string;
  items: RelatedItem[];
  createLink?: string;
  createLabel?: string;
  accent?: AccentColor;
}) {
  const styles = ACCENT_STYLES[accent];
  const hasItems = count > 0;
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2 min-w-0">
            <Icon className={`h-4 w-4 shrink-0 ${hasItems ? styles.icon : 'text-muted-foreground'}`} />
            <span className="truncate">{title}</span>
            <span
              className={`inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full text-sm font-bold tabular-nums ring-1 ${
                hasItems ? styles.badge : 'bg-muted text-muted-foreground ring-border'
              }`}
              aria-label={`${count} ${title}`}
            >
              {count}
            </span>
          </CardTitle>
          {createLink && (
            <Link to={createLink}>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] gap-1">
                <Plus className="h-3 w-3" /> {createLabel || 'New'}
              </Button>
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">{emptyText}</p>
        ) : (
          <div className="space-y-1.5">
            {items.map(item => (
              <Link key={item.id} to={item.link} className="flex items-center justify-between p-1.5 rounded hover:bg-muted/50 transition-colors group">
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-medium truncate ${item.mono ? 'font-mono' : ''}`}>{item.primary}</p>
                  {item.secondary && <p className="text-[10px] text-muted-foreground">{item.secondary}</p>}
                </div>
                {item.badge}
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
