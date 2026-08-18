import { buildResidentialSnowBody } from '../src/lib/agreementTemplates/residentialSnow';
import { TBD, combinedStatusMeta } from '../src/lib/combinedDocument';

const merge: Record<string, string> = {
  legal_company_name: 'Praetoria Group',
  praetoria_authorized_representative: 'Ryan Steven Persaud',
  customer_name: 'Terry Leach',
  customer_email: 'terry@tlleach.ca',
  customer_phone: '306-501-0600',
  service_address: '15 Emerald Ridge',
  service_city: 'White City',
  service_province: 'SK',
  quotation_number: 'PQ-00112',
  agreement_number: '{{AGREEMENT_NUMBER}}',
  document_version: '1',
  document_status_label: combinedStatusMeta('provisional_estimate').label,
  issued_date: new Date().toISOString().slice(0, 10),
  season_label: '2026–2027',
  season_start_date: '2026-11-01',
  season_end_date: '2027-04-30',
  package_name: 'Residential Seasonal Snow Clearing — White City',
  estimate_range: '$250.00 – $350.00',
  estimate_seasonal_range: TBD,
  monthly_price: TBD,
  billing_periods: TBD,
  seasonal_subtotal: TBD,
  gst_amount: TBD,
  pst_treatment:
    'Snow clearing and ice-control services are subject to 5% GST; no PST applies to the service. Separately sold materials are subject to GST and PST.',
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
  response_target: 'TBD — pending approval of the White City / Balgonie route',
  payment_terms: TBD,
  late_fee: TBD,
  interest_rate: TBD,
  suspension_rule: TBD,
  cancellation_terms: TBD,
  renewal_terms: TBD,
};

const body = buildResidentialSnowBody(merge, { provisional: true });
await Bun.write('/tmp/residential_body.html', body);
await Bun.write('/tmp/residential_merge.json', JSON.stringify(merge));
console.log('bytes', body.length);
