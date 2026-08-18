import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { useCreateAgreement } from '@/hooks/useAgreements';
import {
  RESIDENTIAL_SNOW_FIELD_SCHEMA,
  buildResidentialSnowBody,
} from '@/lib/agreementTemplates/residentialSnow';
import { TBD, combinedStatusMeta } from '@/lib/combinedDocument';

const COMBINED_TITLE = 'Residential Snow Removal Combined Quotation & Service Agreement';
const OUT_OF_TOWN = ['white city', 'balgonie', 'pilot butte', 'emerald park', 'lumsden', 'pense'];

export function CreateResidentialCombinedDialog({
  open, onOpenChange, userId,
}: { open: boolean; onOpenChange: (o: boolean) => void; userId?: string }) {
  const navigate = useNavigate();
  const createAgreement = useCreateAgreement();

  const [customerId, setCustomerId] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [quoteId, setQuoteId] = useState('');
  const [seasonLabel, setSeasonLabel] = useState('2026–2027');
  const [seasonStart, setSeasonStart] = useState('2026-11-01');
  const [seasonEnd, setSeasonEnd] = useState('2027-04-30');
  const [packageName, setPackageName] = useState('Residential Seasonal Snow Clearing');
  const [mode, setMode] = useState<'provisional_estimate' | 'draft_internal_review'>('provisional_estimate');
  const [estimateRange, setEstimateRange] = useState('$250.00 – $350.00');
  const [saving, setSaving] = useState(false);

  const { data: customers = [] } = useQuery({
    queryKey: ['combined_doc_customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, first_name, last_name, company_name, email, phone')
        .order('last_name');
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['combined_doc_properties', customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('id, property_name, address_line_1, city, province')
        .eq('customer_id', customerId);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: quotes = [] } = useQuery({
    queryKey: ['combined_doc_quotes', customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotes')
        .select('id, quote_number')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => { setPropertyId(''); setQuoteId(''); }, [customerId]);

  const customer = customers.find((c: any) => c.id === customerId);
  const property = properties.find((p: any) => p.id === propertyId);
  const quote = quotes.find((q: any) => q.id === quoteId);

  const isOutOfTown = useMemo(
    () => OUT_OF_TOWN.includes(String(property?.city || '').trim().toLowerCase()),
    [property?.city],
  );

  const handleCreate = async () => {
    if (!customerId || !propertyId) { toast.error('Select the customer and the service property'); return; }
    setSaving(true);
    try {
      const { data: numberData, error: numErr } = await supabase.rpc('generate_agreement_number' as never);
      if (numErr) throw numErr;
      const agreementNumber = String(numberData || '');

      const customerName = (customer as any)?.company_name
        || `${(customer as any)?.first_name || ''} ${(customer as any)?.last_name || ''}`.trim();

      const merge: Record<string, string> = {
        legal_company_name: 'Praetoria Group',
        praetoria_authorized_representative: 'Ryan Steven Persaud',
        customer_name: customerName,
        customer_email: (customer as any)?.email || TBD,
        customer_phone: (customer as any)?.phone || TBD,
        service_address: (property as any)?.address_line_1 || TBD,
        service_city: (property as any)?.city || TBD,
        service_province: (property as any)?.province || 'SK',
        quotation_number: quote?.quote_number || TBD,
        agreement_number: agreementNumber,
        document_version: '1',
        document_status_label: combinedStatusMeta(mode).label,
        issued_date: new Date().toISOString().slice(0, 10),
        season_label: seasonLabel,
        season_start_date: seasonStart,
        season_end_date: seasonEnd,
        package_name: packageName,
        estimate_range: estimateRange,
        estimate_seasonal_range: TBD,
        monthly_price: TBD,
        billing_periods: TBD,
        seasonal_subtotal: TBD,
        gst_amount: TBD,
        pst_treatment: 'Snow clearing and ice-control services are subject to 5% GST; no PST applies to the service. Separately sold materials are subject to GST and PST.',
        total_price: TBD,
        billing_frequency: TBD,
        additional_visit_rate: TBD,
        worker_hour_rate: '$50.00',
        travel_mobilization: TBD,
        heavy_snow_threshold: TBD,
        heavy_snow_charge: TBD,
        deicer_application_charge: TBD,
        deicer_material_charge: TBD,
        emergency_callout_charge: TBD,
        hauling_charge: TBD,
        response_target: isOutOfTown ? `${TBD} — pending approval of the out-of-town route` : TBD,
        payment_terms: TBD,
        late_fee: TBD,
        interest_rate: TBD,
        suspension_rule: TBD,
        cancellation_terms: TBD,
        renewal_terms: TBD,
      };

      const body = buildResidentialSnowBody(merge, { provisional: mode === 'provisional_estimate' });

      const created = await createAgreement.mutateAsync({
        title: COMBINED_TITLE,
        category: 'customer',
        document_type: 'residential_snow_combined',
        body_html: body,
        field_schema: RESIDENTIAL_SNOW_FIELD_SCHEMA,
        field_values: {},
        merge_data: merge,
        recipient_type: 'customer',
        recipient_name: customerName,
        recipient_email: (customer as any)?.email || null,
        customer_id: customerId,
        property_id: propertyId,
        quote_id: quoteId || null,
        agreement_number: agreementNumber,
        quotation_number: quote?.quote_number || null,
        is_combined_document: true,
        doc_status: mode,
        has_unresolved_values: true,
        activation_checklist: {},
        status: 'draft',
        version: 1,
        season_start: seasonStart,
        season_end: seasonEnd,
        created_by: userId ?? null,
      });

      onOpenChange(false);
      navigate(`/agreements/${(created as any).id}`);
    } catch (e: any) {
      toast.error(e.message || 'Failed to create document');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 max-h-[90vh]">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>New Residential Snow Combined Document</DialogTitle>
          <DialogDescription>
            One record serves as both the quotation and the service agreement. Prices left as TBD block final publication.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] px-6">
          <div className="space-y-4 pb-4">
            <div>
              <Label>Customer</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  {customers.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.company_name || `${c.first_name} ${c.last_name}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Service Property</Label>
              <Select value={propertyId} onValueChange={setPropertyId} disabled={!customerId}>
                <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                <SelectContent>
                  {properties.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.address_line_1}, {p.city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isOutOfTown && (
                <p className="text-xs text-amber-700 mt-1">
                  Out-of-town property — travel/mobilization is billed separately and the response target stays TBD until the route is approved.
                </p>
              )}
            </div>

            <div>
              <Label>Linked Quotation (optional)</Label>
              <Select value={quoteId} onValueChange={setQuoteId} disabled={!customerId}>
                <SelectTrigger><SelectValue placeholder="Select quotation" /></SelectTrigger>
                <SelectContent>
                  {quotes.map((q: any) => <SelectItem key={q.id} value={q.id}>{q.quote_number}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div><Label>Season</Label><Input value={seasonLabel} onChange={(e) => setSeasonLabel(e.target.value)} /></div>
              <div><Label>Start Date</Label><Input type="date" value={seasonStart} onChange={(e) => setSeasonStart(e.target.value)} /></div>
              <div><Label>End Date</Label><Input type="date" value={seasonEnd} onChange={(e) => setSeasonEnd(e.target.value)} /></div>
            </div>

            <div><Label>Residential Package</Label><Input value={packageName} onChange={(e) => setPackageName(e.target.value)} /></div>

            <div>
              <Label>Document Stage</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft_internal_review">Draft — Internal Review</SelectItem>
                  <SelectItem value="provisional_estimate">Provisional Estimate — Customer Acknowledgement Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {mode === 'provisional_estimate' && (
              <div>
                <Label>Provisional Monthly Estimate Range</Label>
                <Input value={estimateRange} onChange={(e) => setEstimateRange(e.target.value)} />
                <p className="text-xs text-muted-foreground mt-1">
                  Shown as an estimate only. It is never converted automatically into a final price.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
        <DialogFooter className="px-6 pb-6 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={saving}>Create Document</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
