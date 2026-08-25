import { useEffect, useState } from 'react';
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
  COMMERCIAL_SNOW_COMBINED_FIELD_SCHEMA,
  COMMERCIAL_SNOW_COMBINED_TITLE,
  buildCommercialSnowCombinedBody,
} from '@/lib/agreementTemplates/commercialSnowCombined';
import { COMMERCIAL_SNOW_COMBINED_TYPE } from '@/lib/agreementBody';
import { combinedStatusMeta } from '@/lib/combinedDocument';

/**
 * Standard Praetoria Snow & Ice commercial quotation workflow:
 * quotation page → separate pricing sheet → service agreement → customer
 * selections → fast guided e-signature → customer portal linkage.
 */
export const COMMERCIAL_SNOW_DEFAULTS = {
  // Option 1 — automatic per-visit
  option1_rate: '$150.00',
  option1_minimum_hours: '2 hours',
  option1_minimum_charge: '$300.00',
  // Option 2 — flexible month-to-month on-call
  option2_hourly_rate: '$225.00',
  option2_minimum_hours: '3 hours',
  option2_minimum_charge: '$675.00',
  // Option 3 — full season automatic
  option3_monthly_rate: '$1,200.00',
  option3_months: '6',
  option3_season_total: '$7,200.00',
  default_trigger: '2 cm accumulation or greater',
  // Heavy snow — never invented; Admin must approve before the rates are shown
  heavy_snow_threshold: '10 cm',
  heavy_snow_tier1: 'TBD',
  heavy_snow_tier2: 'TBD',
  heavy_snow_tier3: 'TBD',
  pst_treatment:
    'Snow clearing and ice-control services are subject to 5% GST; no PST applies to the service. Separately sold materials are subject to GST and PST.',
  payment_terms: 'Net 15 days from the invoice date.',
  late_fee: '$25.00 per overdue invoice.',
  interest_rate: '2% per month (26.82% per annum) on overdue balances.',
  suspension_rule: 'Service may be suspended when an account is more than 30 days past due, until the account is brought current.',
  cancellation_terms: 'Either party may cancel with 30 days written notice. Service performed to the cancellation date remains payable.',
  insurance_statement:
    'Praetoria maintains commercial general liability insurance and Saskatchewan Workers’ Compensation Board coverage in accordance with current verified company settings. Certificates are available on request.',
  praetoria_authorized_representative: 'Ryan Steven Persaud',
  legal_company_name: 'Praetoria Group',
};


export function CreateCommercialSnowCombinedDialog({
  open, onOpenChange, userId,
}: { open: boolean; onOpenChange: (o: boolean) => void; userId?: string }) {
  const navigate = useNavigate();
  const createAgreement = useCreateAgreement();

  const [customerId, setCustomerId] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [quoteId, setQuoteId] = useState('');
  const [quotationTitle, setQuotationTitle] = useState('Commercial Seasonal Snow Removal 2026–2027');
  const [seasonLabel, setSeasonLabel] = useState('2026–2027');
  const [seasonStart, setSeasonStart] = useState('2026-11-01');
  const [seasonEnd, setSeasonEnd] = useState('2027-04-30');
  const [option1Rate, setOption1Rate] = useState(COMMERCIAL_SNOW_DEFAULTS.option1_rate);
  const [option1Min, setOption1Min] = useState(COMMERCIAL_SNOW_DEFAULTS.option1_minimum_charge);
  const [option2Rate, setOption2Rate] = useState(COMMERCIAL_SNOW_DEFAULTS.option2_hourly_rate);
  const [option2Min, setOption2Min] = useState(COMMERCIAL_SNOW_DEFAULTS.option2_minimum_charge);
  const [option3Rate, setOption3Rate] = useState(COMMERCIAL_SNOW_DEFAULTS.option3_monthly_rate);
  const [option3Months, setOption3Months] = useState(COMMERCIAL_SNOW_DEFAULTS.option3_months);
  const [option3Total, setOption3Total] = useState(COMMERCIAL_SNOW_DEFAULTS.option3_season_total);
  const [heavyTier1, setHeavyTier1] = useState(COMMERCIAL_SNOW_DEFAULTS.heavy_snow_tier1);
  const [heavyTier2, setHeavyTier2] = useState(COMMERCIAL_SNOW_DEFAULTS.heavy_snow_tier2);
  const [heavyTier3, setHeavyTier3] = useState(COMMERCIAL_SNOW_DEFAULTS.heavy_snow_tier3);
  const [trigger, setTrigger] = useState(COMMERCIAL_SNOW_DEFAULTS.default_trigger);

  const [mode, setMode] = useState<'draft_internal_review' | 'final_quotation'>('draft_internal_review');
  const [saving, setSaving] = useState(false);

  const { data: customers = [] } = useQuery({
    queryKey: ['commercial_combined_customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, first_name, last_name, company_name, email, phone')
        .order('company_name');
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['commercial_combined_properties', customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('id, property_name, address_line_1, city, province, postal_code')
        .eq('customer_id', customerId);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: quotes = [] } = useQuery({
    queryKey: ['commercial_combined_quotes', customerId],
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

  const handleCreate = async () => {
    if (!customerId || !propertyId) { toast.error('Select the customer and the service property'); return; }
    setSaving(true);
    try {
      const { data: numberData, error: numErr } = await supabase.rpc('generate_agreement_number' as never);
      if (numErr) throw numErr;
      const agreementNumber = String(numberData || '');

      const c: any = customer;
      const p: any = property;
      const customerName = c?.company_name || `${c?.first_name || ''} ${c?.last_name || ''}`.trim();

      const merge: Record<string, string> = {
        ...COMMERCIAL_SNOW_DEFAULTS,
        document_title: COMMERCIAL_SNOW_COMBINED_TITLE,
        quotation_title: quotationTitle,
        customer_name: customerName,
        contact_name: `${c?.first_name || ''} ${c?.last_name || ''}`.trim() || customerName,
        customer_email: c?.email || '',
        customer_phone: c?.phone || '',
        service_address: p?.address_line_1 || '',
        service_city: p?.city || '',
        service_province: p?.province || 'SK',
        service_postal_code: p?.postal_code || '',
        quotation_number: quote?.quote_number || '',
        agreement_number: agreementNumber,
        document_version: '1',
        document_status_label: combinedStatusMeta(mode).label,
        issued_date: new Date().toISOString().slice(0, 10),
        season_label: seasonLabel,
        season_start_date: seasonStart,
        season_end_date: seasonEnd,
        option1_rate: option1Rate,
        option1_minimum_charge: option1Min,
        option2_hourly_rate: option2Rate,
        option2_minimum_charge: option2Min,
        option3_monthly_rate: option3Rate,
        option3_months: option3Months,
        option3_season_total: option3Total,
        heavy_snow_tier1: heavyTier1,
        heavy_snow_tier2: heavyTier2,
        heavy_snow_tier3: heavyTier3,
        default_trigger: trigger,

      };

      const created = await createAgreement.mutateAsync({
        title: `${COMMERCIAL_SNOW_COMBINED_TITLE} — ${customerName}`,
        category: 'snow',
        document_type: COMMERCIAL_SNOW_COMBINED_TYPE,
        body_html: buildCommercialSnowCombinedBody(merge),
        field_schema: COMMERCIAL_SNOW_COMBINED_FIELD_SCHEMA,
        field_values: {},
        merge_data: merge,
        recipient_type: 'customer',
        recipient_name: `${c?.first_name || ''} ${c?.last_name || ''}`.trim() || customerName,
        recipient_email: c?.email || null,
        customer_id: customerId,
        property_id: propertyId,
        quote_id: quoteId || null,
        agreement_number: agreementNumber,
        quotation_number: quote?.quote_number || null,
        is_combined_document: true,
        doc_status: mode,
        has_unresolved_values: false,
        activation_checklist: {},
        status: 'draft',
        version: 1,
        season_start: seasonStart,
        season_end: seasonEnd,
        created_by: userId ?? null,
      } as any);

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
          <DialogTitle>New Commercial Snow Combined Document</DialogTitle>
          <DialogDescription>
            Standard Snow &amp; Ice structure: quotation page, separate pricing sheet, service agreement,
            customer selections and fast guided e-signature — in one record.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[62vh] px-6">
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

            <div><Label>Quotation Title</Label><Input value={quotationTitle} onChange={(e) => setQuotationTitle(e.target.value)} /></div>

            <div className="grid grid-cols-3 gap-3">
              <div><Label>Season</Label><Input value={seasonLabel} onChange={(e) => setSeasonLabel(e.target.value)} /></div>
              <div><Label>Start Date</Label><Input type="date" value={seasonStart} onChange={(e) => setSeasonStart(e.target.value)} /></div>
              <div><Label>End Date</Label><Input type="date" value={seasonEnd} onChange={(e) => setSeasonEnd(e.target.value)} /></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><Label>Option 1 — Hourly Rate (per equipment unit)</Label><Input value={option1Rate} onChange={(e) => setOption1Rate(e.target.value)} /></div>
              <div><Label>Option 1 — Minimum Visit Charge</Label><Input value={option1Min} onChange={(e) => setOption1Min(e.target.value)} /></div>
              <div><Label>Option 2 — Hourly Rate (on-call)</Label><Input value={option2Rate} onChange={(e) => setOption2Rate(e.target.value)} /></div>
              <div><Label>Option 2 — Minimum Visit Charge</Label><Input value={option2Min} onChange={(e) => setOption2Min(e.target.value)} /></div>
              <div><Label>Option 3 — Monthly Rate</Label><Input value={option3Rate} onChange={(e) => setOption3Rate(e.target.value)} /></div>
              <div><Label>Option 3 — Number of Months</Label><Input value={option3Months} onChange={(e) => setOption3Months(e.target.value)} /></div>
              <div><Label>Option 3 — Seasonal Contract Value</Label><Input value={option3Total} onChange={(e) => setOption3Total(e.target.value)} /></div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div><Label>Heavy Snow Tier 1 (10.1–15 cm)</Label><Input value={heavyTier1} onChange={(e) => setHeavyTier1(e.target.value)} placeholder="TBD — Admin to set" /></div>
              <div><Label>Heavy Snow Tier 2 (15.1–20 cm)</Label><Input value={heavyTier2} onChange={(e) => setHeavyTier2(e.target.value)} placeholder="TBD — Admin to set" /></div>
              <div><Label>Severe Snow Tier (over 20 cm)</Label><Input value={heavyTier3} onChange={(e) => setHeavyTier3(e.target.value)} placeholder="TBD — Admin to set" /></div>
            </div>


            <div><Label>Default Snowfall Trigger</Label><Input value={trigger} onChange={(e) => setTrigger(e.target.value)} /></div>

            <div>
              <Label>Document Stage</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft_internal_review">Draft — Internal Review</SelectItem>
                  <SelectItem value="final_quotation">Final Quotation — Awaiting Customer Acceptance</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
