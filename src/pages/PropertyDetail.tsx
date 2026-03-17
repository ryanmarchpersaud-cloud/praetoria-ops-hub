import { useParams, useNavigate } from 'react-router-dom';
import { useProperty, usePropertyJobs, usePropertyVisits, useUpdateProperty } from '@/hooks/useProperties';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, MapPin, Briefcase, ClipboardCheck } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PROPERTY_STATUSES, PROPERTY_TYPES, PROVINCES } from '@/lib/constants';

export default function PropertyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: property, isLoading } = useProperty(id);
  const { data: jobs = [] } = usePropertyJobs(id);
  const { data: visits = [] } = usePropertyVisits(id);
  const updateProperty = useUpdateProperty();
  const { toast } = useToast();
  const [form, setForm] = useState<any>({});

  useEffect(() => { if (property) setForm(property); }, [property]);

  if (isLoading) return <div className="p-8 text-muted-foreground text-sm">Loading...</div>;
  if (!property) return <div className="p-8 text-muted-foreground text-sm">Property not found</div>;

  const set = (key: string, value: any) => setForm((p: any) => ({ ...p, [key]: value }));
  const customer = (property as any).customers;

  const handleSave = async () => {
    if (!id) return;
    try {
      await updateProperty.mutateAsync({
        id, property_name: form.property_name, address_line_1: form.address_line_1,
        city: form.city, province: form.province, postal_code: form.postal_code,
        property_type: form.property_type, access_notes: form.access_notes,
        gate_code: form.gate_code, seasonal_notes: form.seasonal_notes, status: form.status,
      });
      toast({ title: 'Property saved' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9" onClick={() => navigate('/properties')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg md:text-xl font-bold truncate">{form.property_name}</h1>
            <StatusBadge status={form.status || 'Active'} />
          </div>
          {customer && <p className="text-xs text-muted-foreground">{customer.first_name} {customer.last_name}{customer.company_name ? ` — ${customer.company_name}` : ''}</p>}
        </div>
      </div>

      <Button onClick={handleSave} className="w-full h-11" disabled={updateProperty.isPending}>
        <Save className="h-4 w-4 mr-2" /> Save Property
      </Button>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Property Name</Label><Input value={form.property_name || ''} onChange={e => set('property_name', e.target.value)} /></div>
                <div>
                  <Label className="text-xs">Type</Label>
                  <select value={form.property_type || ''} onChange={e => set('property_type', e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-10">
                    {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div><Label className="text-xs">Address</Label><Input value={form.address_line_1 || ''} onChange={e => set('address_line_1', e.target.value)} /></div>
              <div className="grid grid-cols-5 gap-2">
                <div className="col-span-2"><Label className="text-xs">City</Label><Input value={form.city || ''} onChange={e => set('city', e.target.value)} /></div>
                <div>
                  <Label className="text-xs">Prov.</Label>
                  <select value={form.province || ''} onChange={e => set('province', e.target.value)} className="w-full rounded-md border border-input bg-background px-2 py-2 text-sm h-10">
                    <option value="">—</option>
                    {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="col-span-2"><Label className="text-xs">Postal</Label><Input value={form.postal_code || ''} onChange={e => set('postal_code', e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Status</Label>
                  <select value={form.status || ''} onChange={e => set('status', e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-10">
                    {PROPERTY_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div><Label className="text-xs">Gate Code</Label><Input value={form.gate_code || ''} onChange={e => set('gate_code', e.target.value)} /></div>
              </div>
              <div><Label className="text-xs">Access Notes</Label><Textarea value={form.access_notes || ''} onChange={e => set('access_notes', e.target.value)} rows={2} /></div>
              <div><Label className="text-xs">Seasonal Notes</Label><Textarea value={form.seasonal_notes || ''} onChange={e => set('seasonal_notes', e.target.value)} rows={2} /></div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          {/* Jobs for this property */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5" /> Jobs ({jobs.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {jobs.length === 0 ? <p className="text-xs text-muted-foreground">No jobs yet</p> : jobs.map((j: any) => (
                <Link key={j.id} to={`/jobs/${j.id}`} className="block p-2 rounded border hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{j.job_title}</p>
                      <p className="text-[10px] text-muted-foreground">{j.job_number}</p>
                    </div>
                    <StatusBadge status={j.status} showIcon={false} />
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>

          {/* Visits */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <ClipboardCheck className="h-3.5 w-3.5" /> Recent Visits ({visits.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {visits.length === 0 ? <p className="text-xs text-muted-foreground">No visits yet</p> : visits.slice(0, 5).map((v: any) => (
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
