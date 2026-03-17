import { useParams, useNavigate } from 'react-router-dom';
import { useLead, useUpdateLead } from '@/hooks/useLeads';
import { useQuotes, useCreateQuote } from '@/hooks/useQuotes';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, FileText, Plus, Save } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SERVICE_CATEGORIES, LEAD_STATUSES, LEAD_SOURCES, URGENCY_LEVELS, PROVINCES } from '@/lib/constants';
import { formatDistanceToNow } from 'date-fns';

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
    if (!id) return;
    try {
      const q = await createQuote.mutateAsync({
        lead_id: id,
        quote_number: '',
        service_category: lead?.service_type as any || 'Other',
      });
      navigate(`/quotes/${q.id}`);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading...</div>;
  if (!lead) return <div className="p-8 text-muted-foreground">Lead not found</div>;

  const set = (key: string, value: any) => setForm((p: any) => ({ ...p, [key]: value }));

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/leads')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{form.first_name} {form.last_name}</h1>
          <p className="text-sm text-muted-foreground">{form.company_name || 'No company'}</p>
        </div>
        <StatusBadge status={form.status || 'New'} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Contact Info</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>First Name</Label><Input value={form.first_name || ''} onChange={e => set('first_name', e.target.value)} /></div>
                <div><Label>Last Name</Label><Input value={form.last_name || ''} onChange={e => set('last_name', e.target.value)} /></div>
              </div>
              <div><Label>Company</Label><Input value={form.company_name || ''} onChange={e => set('company_name', e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Email</Label><Input value={form.email || ''} onChange={e => set('email', e.target.value)} /></div>
                <div><Label>Phone</Label><Input value={form.phone || ''} onChange={e => set('phone', e.target.value)} /></div>
              </div>
              <div><Label>Address</Label><Input value={form.address_line_1 || ''} onChange={e => set('address_line_1', e.target.value)} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>City</Label><Input value={form.city || ''} onChange={e => set('city', e.target.value)} /></div>
                <div>
                  <Label>Province</Label>
                  <select value={form.province || ''} onChange={e => set('province', e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">—</option>
                    {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div><Label>Postal Code</Label><Input value={form.postal_code || ''} onChange={e => set('postal_code', e.target.value)} /></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Lead Details</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Service</Label>
                  <select value={form.service_type || ''} onChange={e => set('service_type', e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    {SERVICE_CATEGORIES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Status</Label>
                  <select value={form.status || ''} onChange={e => set('status', e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    {LEAD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Source</Label>
                  <select value={form.lead_source || ''} onChange={e => set('lead_source', e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">—</option>
                    {LEAD_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Urgency</Label>
                  <select value={form.urgency || ''} onChange={e => set('urgency', e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    {URGENCY_LEVELS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div><Label>Estimated Value</Label><Input value={form.estimated_value_range || ''} onChange={e => set('estimated_value_range', e.target.value)} placeholder="e.g. $1,000 - $5,000" /></div>
              <div><Label>Description</Label><Textarea value={form.description || ''} onChange={e => set('description', e.target.value)} /></div>
              <div><Label>Internal Notes</Label><Textarea value={form.internal_notes || ''} onChange={e => set('internal_notes', e.target.value)} /></div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Button onClick={handleSave} className="w-full" disabled={updateLead.isPending}>
            <Save className="h-4 w-4 mr-2" /> Save Changes
          </Button>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                Quotes
                <Button size="sm" variant="outline" onClick={handleCreateQuote}>
                  <Plus className="h-3 w-3 mr-1" /> New Quote
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {leadQuotes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No quotes yet</p>
              ) : (
                <div className="space-y-2">
                  {leadQuotes.map((q: any) => (
                    <Link key={q.id} to={`/quotes/${q.id}`} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                      <div>
                        <p className="text-sm font-medium mono">{q.quote_number}</p>
                        <p className="text-xs text-muted-foreground">${Number(q.total).toLocaleString()}</p>
                      </div>
                      <StatusBadge status={q.approval_status} />
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
