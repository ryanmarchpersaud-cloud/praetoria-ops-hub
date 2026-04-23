import { useParams, useNavigate } from 'react-router-dom';
import { useLead, useUpdateLead } from '@/hooks/useLeads';
import { useQuotes, useCreateQuote } from '@/hooks/useQuotes';
import { supabase } from '@/integrations/supabase/client';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, Save, Phone, Mail, MapPin, ChevronDown, ChevronRight } from 'lucide-react';
import { DirectionsButton } from '@/components/DirectionsButton';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SERVICE_CATEGORIES, LEAD_STATUSES, LEAD_SOURCES, URGENCY_LEVELS, PROVINCES } from '@/lib/constants';
import { formatDistanceToNow } from 'date-fns';

function CollapsibleSection({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer active:bg-muted/30 transition-colors">
            <CardTitle className="text-sm flex items-center justify-between">
              {title}
              {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-3">
            {children}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: lead, isLoading } = useLead(id);
  const { data: quotes = [] } = useQuotes();
  const updateLead = useUpdateLead();
  const createQuote = useCreateQuote();
  const { toast } = useToast();
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    if (lead) setForm(lead);
  }, [lead]);

  const leadQuotes = quotes.filter((q: any) => q.lead_id === id);

  const handleSave = async () => {
    if (!id) return;
    try {
      await updateLead.mutateAsync({
        id,
        first_name: form.first_name,
        last_name: form.last_name,
        company_name: form.company_name,
        email: form.email,
        phone: form.phone,
        service_type: form.service_type,
        address_line_1: form.address_line_1,
        city: form.city,
        province: form.province,
        postal_code: form.postal_code,
        lead_source: form.lead_source,
        urgency: form.urgency,
        status: form.status,
        description: form.description,
        internal_notes: form.internal_notes,
        preferred_contact_method: form.preferred_contact_method,
        estimated_value_range: form.estimated_value_range,
      });
      toast({ title: 'Lead updated' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleCreateQuote = async () => {
    if (!id || !lead) return;
    try {
      // Quotes require a customer_id (uuid NOT NULL). If this lead isn't yet
      // tied to a customer, auto-create one from the lead's contact info so
      // the quotation flow works in one tap from the lead detail page.
      let customerId = (lead as any).customer_id as string | null;

      if (!customerId) {
        const firstName = (lead.first_name || '').trim() || 'New';
        const lastName = (lead.last_name || '').trim() || 'Customer';

        const { data: newCustomer, error: customerErr } = await supabase
          .from('customers')
          .insert({
            first_name: firstName,
            last_name: lastName,
            company_name: lead.company_name || null,
            email: lead.email || null,
            phone: lead.phone || null,
            address_line_1: lead.address_line_1 || null,
            city: lead.city || null,
            province: lead.province || null,
            postal_code: lead.postal_code || null,
            customer_status: 'Active',
            referral_source: lead.lead_source || null,
          })
          .select('id')
          .single();

        if (customerErr) throw customerErr;
        customerId = newCustomer.id;

        // Link the new customer back to the lead so future actions reuse it.
        try {
          await updateLead.mutateAsync({ id, customer_id: customerId } as any);
        } catch {
          // Non-fatal: quote creation can still proceed even if back-link fails.
        }
      }

      const q = await createQuote.mutateAsync({
        lead_id: id,
        quote_number: '',
        service_category: (lead?.service_type as any) || 'Other',
        customer_id: customerId,
      });
      navigate(`/quotes/${q.id}`);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  if (isLoading) return <div className="p-8 text-muted-foreground text-sm">Loading...</div>;
  if (!lead) return <div className="p-8 text-muted-foreground text-sm">Lead not found</div>;

  const set = (key: string, value: any) => setForm((p: any) => ({ ...p, [key]: value }));

  return (
    <div className="space-y-4 animate-fade-in max-w-4xl">
      {/* ── Header ── */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9" onClick={() => navigate('/leads')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg md:text-xl font-bold truncate">{form.first_name} {form.last_name}</h1>
            <StatusBadge status={form.status || 'New'} />
          </div>
          <p className="text-xs text-muted-foreground truncate">{form.company_name || 'No company'} · {form.service_type}</p>
        </div>
      </div>

      {/* ── Quick Info Summary — always visible, scannable ── */}
      <Card>
        <CardContent className="py-3">
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
            {form.phone && (
              <a href={`tel:${form.phone}`} className="flex items-center gap-1.5 text-primary active:opacity-70 min-h-[44px] items-center">
                <Phone className="h-3.5 w-3.5" />
                <span>{form.phone}</span>
              </a>
            )}
            {form.email && (
              <a href={`mailto:${form.email}`} className="flex items-center gap-1.5 text-primary active:opacity-70 min-h-[44px] items-center">
                <Mail className="h-3.5 w-3.5" />
                <span className="truncate max-w-[180px]">{form.email}</span>
              </a>
            )}
            {form.city && (
              <a
                href={`https://maps.google.com/maps?daddr=${encodeURIComponent([form.address_line_1, form.city, form.province, form.postal_code].filter(Boolean).join(', '))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-primary active:opacity-70 min-h-[44px] items-center"
                onClick={e => e.stopPropagation()}
              >
                <MapPin className="h-3.5 w-3.5" />
                <span>{form.city}{form.province ? `, ${form.province}` : ''}</span>
              </a>
            )}
          </div>
          <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
            <span>Source: {form.lead_source || '—'}</span>
            <span className="text-border">·</span>
            <span>Urgency: <span className={['High', 'Urgent'].includes(form.urgency) ? 'text-warning font-medium' : ''}>{form.urgency || 'Normal'}</span></span>
            <span className="text-border">·</span>
            <span>{form.estimated_value_range || 'No estimate'}</span>
          </div>
        </CardContent>
      </Card>

      {/* ── Action Bar ── */}
      <div className="flex gap-2">
        <Button onClick={handleSave} className="flex-1 h-11" disabled={updateLead.isPending}>
          <Save className="h-4 w-4 mr-2" /> Save
        </Button>
        <Button variant="outline" onClick={handleCreateQuote} className="h-11">
          <Plus className="h-4 w-4 mr-1" /> Quote
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          {/* ── Status & Service (always open) ── */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Status</Label>
                  <select value={form.status || ''} onChange={e => set('status', e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-10">
                    {LEAD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Service</Label>
                  <select value={form.service_type || ''} onChange={e => set('service_type', e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-10">
                    {SERVICE_CATEGORIES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Source</Label>
                  <select value={form.lead_source || ''} onChange={e => set('lead_source', e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-10">
                    <option value="">—</option>
                    {LEAD_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Urgency</Label>
                  <select value={form.urgency || ''} onChange={e => set('urgency', e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-10">
                    {URGENCY_LEVELS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Description (always open) ── */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Description</CardTitle></CardHeader>
            <CardContent className="pt-0">
              <Textarea value={form.description || ''} onChange={e => set('description', e.target.value)} rows={3} placeholder="What does the client need?" />
            </CardContent>
          </Card>

          {/* ── Contact Info (collapsible) ── */}
          <CollapsibleSection title="Contact Details">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">First Name</Label><Input value={form.first_name || ''} onChange={e => set('first_name', e.target.value)} className="h-10" /></div>
              <div><Label className="text-xs">Last Name</Label><Input value={form.last_name || ''} onChange={e => set('last_name', e.target.value)} className="h-10" /></div>
            </div>
            <div><Label className="text-xs">Company</Label><Input value={form.company_name || ''} onChange={e => set('company_name', e.target.value)} className="h-10" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Email</Label><Input type="email" inputMode="email" value={form.email || ''} onChange={e => set('email', e.target.value)} className="h-10" /></div>
              <div><Label className="text-xs">Phone</Label><Input type="tel" inputMode="tel" value={form.phone || ''} onChange={e => set('phone', e.target.value)} className="h-10" /></div>
            </div>
          </CollapsibleSection>

          {/* ── Address (collapsible) ── */}
          <CollapsibleSection title="Address">
            <div><Label className="text-xs">Street</Label><Input value={form.address_line_1 || ''} onChange={e => set('address_line_1', e.target.value)} className="h-10" /></div>
            <div className="grid grid-cols-5 gap-2">
              <div className="col-span-2"><Label className="text-xs">City</Label><Input value={form.city || ''} onChange={e => set('city', e.target.value)} className="h-10" /></div>
              <div className="col-span-1">
                <Label className="text-xs">Prov.</Label>
                <select value={form.province || ''} onChange={e => set('province', e.target.value)} className="w-full rounded-md border border-input bg-background px-2 py-2 text-sm h-10">
                  <option value="">—</option>
                  {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="col-span-2"><Label className="text-xs">Postal</Label><Input value={form.postal_code || ''} onChange={e => set('postal_code', e.target.value)} className="h-10" /></div>
            </div>
          </CollapsibleSection>

          {/* ── Internal Notes (collapsible) ── */}
          <CollapsibleSection title="Internal Notes & Value">
            <div><Label className="text-xs">Estimated Value</Label><Input value={form.estimated_value_range || ''} onChange={e => set('estimated_value_range', e.target.value)} className="h-10" placeholder="e.g. $1,000 - $5,000" /></div>
            <div><Label className="text-xs">Internal Notes</Label><Textarea value={form.internal_notes || ''} onChange={e => set('internal_notes', e.target.value)} rows={3} /></div>
          </CollapsibleSection>
        </div>

        {/* ── Right Column ── */}
        <div className="space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                Quotes
                <Button size="sm" variant="outline" onClick={handleCreateQuote} className="h-8">
                  <Plus className="h-3 w-3 mr-1" /> New
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {leadQuotes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No quotes yet</p>
              ) : (
                <div className="space-y-2">
                  {leadQuotes.map((q: any) => (
                    <Link key={q.id} to={`/quotes/${q.id}`} className="flex items-center justify-between p-2 rounded active:bg-muted/50">
                      <div>
                        <p className="text-sm font-medium mono">{q.quote_number}</p>
                        <p className="text-xs text-muted-foreground">${Number(q.total).toLocaleString()}</p>
                      </div>
                      <StatusBadge status={q.approval_status} showIcon={false} />
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 text-xs text-muted-foreground space-y-1">
              <p>Created {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}</p>
              <p>Updated {formatDistanceToNow(new Date(lead.updated_at), { addSuffix: true })}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
