/**
 * PRAETORIA SNOW & ICE — COMMERCIAL SNOW REMOVAL
 * COMBINED QUOTATION, PRICING SHEET & SERVICE AGREEMENT (standard template)
 *
 * This is the default structure for Praetoria Snow & Ice commercial quotations:
 *   1. Customer / property quotation page
 *   2. Separate Service Option & Pricing Schedule sheet (own page in the PDF)
 *   3. Service agreement / contract
 *   4. Customer selections
 *   5. Fast guided electronic signature
 *   6. Customer portal linkage
 *
 * One record serves as the quotation and the agreement so pricing and terms can
 * never diverge. Unapproved values render as TBD and block final publication.
 */

import { AgreementField, fieldPlaceholder } from '@/lib/agreementFields';
import { TBD, isTbd } from '@/lib/combinedDocument';

export const COMMERCIAL_SNOW_COMBINED_TITLE =
  'Commercial Snow Removal Combined Quotation, Pricing Schedule & Service Agreement';

export const OPTION_1_LABEL = 'Option 1 — Automatic Hourly / Per-Visit Service';
export const OPTION_2_LABEL = 'Option 2 — Monthly Seasonal Plan';

export const COMMERCIAL_SNOW_COMBINED_FIELD_SCHEMA: AgreementField[] = [
  {
    key: 'service_option',
    label: 'Select Service Option (choose ONE)',
    type: 'select',
    role: 'customer',
    required: true,
    options: [OPTION_1_LABEL, OPTION_2_LABEL],
    helpText:
      'Option 1 and Option 2 are alternatives and are never added together. No option is pre-selected — you must choose one.',
  },
  {
    key: 'snowfall_trigger',
    label: 'Automatic Dispatch Snowfall Trigger',
    type: 'select',
    role: 'customer',
    required: true,
    options: ['2 cm accumulation or greater (recommended)', '1 cm accumulation or greater', '5 cm accumulation or greater', 'Other written amount (state below)'],
    helpText: 'Praetoria monitors snowfall and dispatches automatically once accumulation reaches this amount. You do not need to call.',
  },
  {
    key: 'snowfall_trigger_other',
    label: 'Other Snowfall Trigger (written amount)',
    type: 'text',
    role: 'customer',
    required: false,
    placeholder: 'e.g. 3 cm',
    helpText: 'Only required if you selected "Other written amount" above.',
  },
  {
    key: 'area_front',
    label: 'Front Commercial / Access Area (primary service area)',
    type: 'select',
    role: 'customer',
    required: true,
    options: ['Included in service', 'Not included'],
  },
  {
    key: 'area_entrance',
    label: 'Main Entrance Access',
    type: 'select',
    role: 'customer',
    required: true,
    options: ['Included in service', 'Not included'],
  },
  {
    key: 'area_back',
    label: 'Back / Rear Service Area',
    type: 'select',
    role: 'customer',
    required: true,
    options: [
      'Service when required and authorized by the Customer',
      'Service when required at Praetoria’s operational discretion',
      'Not included',
    ],
    helpText: 'The Customer advised the rear area will rarely require service.',
  },
  {
    key: 'snow_placement',
    label: 'Approved On-Site Snow Placement / Piling Location',
    type: 'text',
    role: 'customer',
    required: true,
    placeholder: 'e.g. North-east corner of the front lot',
  },
  {
    key: 'hauling_authorization',
    label: 'Off-Site Snow Hauling',
    type: 'select',
    role: 'customer',
    required: true,
    options: ['Requires my written authorization before hauling', 'Not authorized'],
  },
  {
    key: 'photo_consent',
    label: 'Before / After Photo-Documentation Consent',
    type: 'select',
    role: 'customer',
    required: true,
    options: ['Consent given', 'Consent declined'],
  },
  {
    key: 'site_contact_name',
    label: 'Primary Site Contact for Service Notifications',
    type: 'text',
    role: 'customer',
    required: true,
    placeholder: 'Name and phone number',
  },
  {
    key: 'payment_method',
    label: 'Selected Payment Method',
    type: 'select',
    role: 'customer',
    required: true,
    options: ['Credit card on file', 'Pre-authorized e-transfer', 'E-transfer on invoice', 'Cheque'],
  },
  {
    key: 'pricing_initials',
    label: 'Initials — Selected Option, Pricing, Minimums & Taxes',
    type: 'initials',
    role: 'customer',
    required: true,
    placeholder: 'e.g. BA',
  },
  {
    key: 'customer_rep_name',
    label: 'Authorized Representative Full Legal Name',
    type: 'text',
    role: 'customer',
    required: true,
    placeholder: 'Full legal name',
  },
  {
    key: 'customer_rep_title',
    label: 'Title / Position',
    type: 'text',
    role: 'customer',
    required: true,
    placeholder: 'e.g. Owner / Manager',
  },
  {
    key: 'customer_acknowledgement',
    label: 'Customer Acknowledgement',
    type: 'checkbox',
    role: 'customer',
    required: true,
    checkboxText:
      'I confirm that I have reviewed the quotation, selected service option, pricing, snowfall trigger, service scope, service agreement, exclusions and terms, and I authorize Praetoria Snow & Ice to provide service according to the selected option.',
  },
  { key: 'customer_signature', label: 'Customer Signature', type: 'signature', role: 'customer', required: true },
  { key: 'praetoria_signature', label: 'Praetoria Authorized Signature', type: 'signature', role: 'praetoria', required: true },
];

/** Selections that must be answered outright — a signature never substitutes. */
export const COMMERCIAL_REQUIRED_SELECTION_KEYS = [
  'service_option',
  'snowfall_trigger',
  'area_front',
  'area_entrance',
  'area_back',
  'snow_placement',
  'hauling_authorization',
  'photo_consent',
  'site_contact_name',
  'payment_method',
];

export interface CommercialSnowMergeData {
  [key: string]: string | number | null | undefined;
}

const V = (v: unknown) => (isTbd(v) ? `<span class="tbd">${TBD}</span>` : String(v));

const sec = (n: number, title: string, body: string) => `
  <section class="agreement-section">
    <h2>${n}. ${title}</h2>
    ${body}
  </section>`;

/** Build the combined commercial snow document body. */
export function buildCommercialSnowCombinedBody(d: CommercialSnowMergeData): string {
  return `
<div class="agreement-doc">

  <h1>${V(d.document_title)}</h1>
  <p class="doc-subtitle">Praetoria Snow &amp; Ice — ${V(d.legal_company_name)} · Season ${V(d.season_label)}</p>

  <!-- ══════════ PAGE 1 — QUOTATION ══════════ -->
  ${sec(1, 'Quotation — Prepared For', `
    <table class="agreement-table"><tbody>
      <tr><th>Business / Customer</th><td>${V(d.customer_name)}</td></tr>
      <tr><th>Primary Contact</th><td>${V(d.contact_name)}</td></tr>
      <tr><th>Direct Phone</th><td>${V(d.customer_phone)}</td></tr>
      <tr><th>Email</th><td>${V(d.customer_email)}</td></tr>
      <tr><th>Service Address</th><td>${V(d.service_address)}, ${V(d.service_city)}, ${V(d.service_province)} ${V(d.service_postal_code)}</td></tr>
      <tr><th>Customer Type</th><td>Commercial</td></tr>
      <tr><th>Service Category</th><td>Snow &amp; Ice</td></tr>
      <tr><th>Quotation Title</th><td>${V(d.quotation_title)}</td></tr>
    </tbody></table>`)}

  ${sec(2, 'Quotation Number, Agreement Number, Version and Status', `
    <table class="agreement-table"><tbody>
      <tr><th>Quotation Number</th><td>${V(d.quotation_number)}</td></tr>
      <tr><th>Agreement Number</th><td>${V(d.agreement_number)}</td></tr>
      <tr><th>Version</th><td>${V(d.document_version)}</td></tr>
      <tr><th>Status</th><td>${V(d.document_status_label)}</td></tr>
      <tr><th>Issued</th><td>${V(d.issued_date)}</td></tr>
      <tr><th>Contract Period</th><td>${V(d.season_start_date)} to ${V(d.season_end_date)}</td></tr>
    </tbody></table>
    <p>This is a single combined document. The quotation, pricing schedule and service agreement share one record, one set of prices and one set of terms. A signed version is never overwritten; a change of price or scope is issued as a new version for review and signature.</p>`)}

  ${sec(3, 'Property and Site Notes', `
    <p>This is a small commercial property. The Customer advised that snow clearing is mainly required at the <strong>front of the property</strong>, and that the <strong>back area will rarely require service</strong>. When required, the approved scope may include both the front and the back.</p>
    <p>No square footage, parking-lot dimensions, sidewalk measurements or snow-storage measurements are stated in this document. Only information confirmed by the Customer is recorded.</p>`)}

  ${sec(4, 'Scope of Work', `
    <ul>
      <li>Front commercial parking / access area — primary service area</li>
      <li>Main entrance access</li>
      <li>Vehicle-access areas within the approved scope</li>
      <li>Snow pushing and piling on site where appropriate</li>
      <li>Back service area when required and authorized</li>
      <li>Service documentation and photographs</li>
    </ul>
    <p>Services not listed above are not included. Any optional or add-on service is quoted separately and performed only when authorized.</p>`)}

  ${sec(5, 'Automatic Service and Dispatch', `
    <p>${V(d.customer_name)} is <strong>not required to call Praetoria after each qualifying snowfall</strong>. Praetoria Snow &amp; Ice monitors snowfall conditions and automatically dispatches qualifying per-visit or seasonal service according to the selected trigger and the selected service option.</p>
    <p>Selected snowfall trigger: ${fieldPlaceholder('snowfall_trigger')}</p>
    <p>Other written amount (only if selected above): ${fieldPlaceholder('snowfall_trigger_other')}</p>`)}

  <!-- ══════════ PAGE 2 — PRICING SHEET ══════════ -->
  <section class="agreement-section sheet-break pricing-sheet">
    <h1>SERVICE OPTION &amp; PRICING SCHEDULE</h1>
    <p class="doc-subtitle">${V(d.customer_name)} — ${V(d.service_address)}, ${V(d.service_city)}, ${V(d.service_province)}</p>

    <h3>${OPTION_1_LABEL}</h3>
    <table class="agreement-table"><tbody>
      <tr><th>Rate</th><td>${V(d.option1_rate)} per hour, per equipment unit</td></tr>
      <tr><th>Operator</th><td>Included</td></tr>
      <tr><th>Minimum</th><td>${V(d.option1_minimum_hours)} per service visit</td></tr>
      <tr><th>Minimum Visit Charge</th><td>${V(d.option1_minimum_charge)} per qualifying visit before applicable tax</td></tr>
      <tr><th>Automatic Trigger</th><td>${V(d.default_trigger)}</td></tr>
      <tr><th>Included Area</th><td>Front and approved rear / back service areas as required</td></tr>
    </tbody></table>

    <h3>${OPTION_2_LABEL}</h3>
    <table class="agreement-table"><tbody>
      <tr><th>Monthly Rate</th><td>${V(d.option2_monthly_rate)} per month plus applicable tax</td></tr>
      <tr><th>Included Visits</th><td>Up to ${V(d.option2_included_visits)} qualifying snow-removal visits per calendar month</td></tr>
      <tr><th>Automatic Trigger</th><td>${V(d.default_trigger)}</td></tr>
      <tr><th>Typical Event Range</th><td>${V(d.option2_event_range)}</td></tr>
      <tr><th>Visits Beyond ${V(d.option2_included_visits)}</th><td>Billed under Option 1 pricing unless otherwise approved</td></tr>
    </tbody></table>

    <p class="pricing-note"><strong>CUSTOMER SELECTS ONE SERVICE OPTION.</strong> These options are alternatives and are <strong>not added together</strong>.</p>
    <table class="agreement-table"><tbody>
      <tr><th>Tax Treatment</th><td>${V(d.pst_treatment)}</td></tr>
    </tbody></table>
  </section>

  <!-- ══════════ PAGE 3+ — SERVICE AGREEMENT ══════════ -->
  <section class="agreement-section sheet-break">
    <h1>COMMERCIAL SNOW &amp; ICE SERVICE AGREEMENT</h1>
  </section>

  ${sec(6, 'Parties', `
    <p>This Agreement is made between <strong>${V(d.legal_company_name)}</strong>, operating as Praetoria Snow &amp; Ice ("Praetoria", the "Service Provider"), and the Customer identified below.</p>`)}

  ${sec(7, 'Customer', `
    <table class="agreement-table"><tbody>
      <tr><th>Customer</th><td>${V(d.customer_name)}</td></tr>
      <tr><th>Authorized Representative</th><td>${V(d.contact_name)}</td></tr>
      <tr><th>Telephone</th><td>${V(d.customer_phone)}</td></tr>
      <tr><th>Email</th><td>${V(d.customer_email)}</td></tr>
    </tbody></table>`)}

  ${sec(8, 'Service Property', `
    <p>${V(d.service_address)}, ${V(d.service_city)}, ${V(d.service_province)} ${V(d.service_postal_code)}</p>
    <p>Service is provided only at this property and only within the approved scope recorded in this Agreement.</p>`)}

  ${sec(9, 'Contract Period', `
    <table class="agreement-table"><tbody>
      <tr><th>Season</th><td>${V(d.season_label)}</td></tr>
      <tr><th>Start Date</th><td>${V(d.season_start_date)}</td></tr>
      <tr><th>End Date</th><td>${V(d.season_end_date)}</td></tr>
    </tbody></table>`)}

  ${sec(10, 'Selected Service Option', `
    <p>The Customer must select exactly one service option. Option 1 and Option 2 are alternatives and are never combined or added together.</p>
    <div class="agreement-field-block">${fieldPlaceholder('service_option')}</div>
    <div class="agreement-field-block"><strong>Customer initials confirming the selected option, pricing, minimums and taxes:</strong> ${fieldPlaceholder('pricing_initials')}</div>`)}

  ${sec(11, 'Snowfall Trigger', `
    <p>Praetoria dispatches service once accumulation reaches the trigger selected by the Customer in section 5. The draft trigger for this property is <strong>${V(d.default_trigger)}</strong> and remains editable during Admin review.</p>`)}

  ${sec(12, 'Automatic Dispatch', `
    <p>The Customer is not required to call Praetoria after each qualifying snowfall. Praetoria monitors qualifying snowfall events and automatically dispatches service in accordance with the selected trigger and service option. The Customer may still request service outside a qualifying event; such service is billed under Option 1 pricing.</p>`)}

  ${sec(13, 'Scope of Work', `
    <p>The approved scope is the scope stated in section 4 together with the service-area selections below. Areas marked "Not included" are the Customer's responsibility.</p>
    <table class="agreement-table"><tbody>
      <tr><th>Front commercial / access area</th><td>${fieldPlaceholder('area_front')}</td></tr>
      <tr><th>Main entrance access</th><td>${fieldPlaceholder('area_entrance')}</td></tr>
      <tr><th>Back / rear service area</th><td>${fieldPlaceholder('area_back')}</td></tr>
    </tbody></table>`)}

  ${sec(14, 'Equipment and Pricing', `
    <p>Under Option 1 the rate is ${V(d.option1_rate)} per hour, per equipment unit, operator included. Each equipment unit actually used is recorded and billed separately. Under Option 2 the monthly rate is ${V(d.option2_monthly_rate)} per month plus applicable tax. Full pricing is set out in the Service Option &amp; Pricing Schedule, which forms part of this Agreement.</p>`)}

  ${sec(15, 'Minimum Service Charge', `
    <p>A minimum of ${V(d.option1_minimum_hours)} applies to every Option 1 service visit, producing a minimum charge of ${V(d.option1_minimum_charge)} per qualifying visit before applicable tax.</p>`)}

  ${sec(16, 'Monthly-Plan Limits', `
    <p>Option 2 includes up to <strong>${V(d.option2_included_visits)} qualifying snow-removal visits per calendar month</strong>. The plan is intended for normal qualifying snow events generally in the ${V(d.option2_event_range)} range. Unused visits do not carry forward to another month and are not refundable.</p>`)}

  ${sec(17, 'Additional Visits', `
    <p>Any visit beyond the ${V(d.option2_included_visits)} included visits in a calendar month is billed separately under Option 1 pricing — ${V(d.option1_rate)} per hour per equipment unit with a ${V(d.option1_minimum_hours)} minimum — unless Praetoria has approved a different rate in writing before the work is performed.</p>`)}

  ${sec(18, 'Severe and Heavy Snowfall', `
    <p>Heavy or severe snowfall that requires additional equipment, additional labour, multiple units or a materially longer service time may result in separate charges according to authorized unit rates. Where practical the Customer is advised before additional resources are committed.</p>`)}

  ${sec(19, 'Snow Placement', `
    <p>Snow is pushed and piled only in the approved on-site location recorded below. When on-site storage is full, off-site hauling and disposal may be required and is billed separately.</p>
    <p>Approved on-site snow placement location: ${fieldPlaceholder('snow_placement')}</p>
    <div class="agreement-field-block">${fieldPlaceholder('hauling_authorization')}</div>`)}

  ${sec(20, 'Site Access', `
    <p>The Customer must provide safe and unobstructed access to the service areas during service windows, including access outside business hours where required for effective clearing.</p>`)}

  ${sec(21, 'Customer Responsibilities', `
    <p>The Customer is responsible for identifying hazards, marking fragile or hidden items before the season begins, maintaining lighting where practical, and keeping a current site contact available.</p>
    <p>Primary site contact for service notifications: ${fieldPlaceholder('site_contact_name')}</p>`)}

  ${sec(22, 'Obstructions', `
    <p>Vehicles, trailers, garbage bins, pallets, planters, signage and similar obstructions prevent complete clearing. Praetoria services only the accessible portions of an obstructed area and is not required to return at no charge.</p>`)}

  ${sec(23, 'Changing Winter Conditions', `
    <p>Blowing snow, drifting, freeze-thaw cycles, compacted snow and municipal plow activity can alter site conditions after a completed visit. Corrective work required by conditions arising after a completed visit is a new visit.</p>`)}

  ${sec(24, 'Service Documentation', `
    <p>Each visit may record the date, dispatch time, arrival time, departure time, equipment used, recorded equipment hours, work performed, before photographs, after photographs and service notes. These records appear in the Praetoria Operations Hub where supported.</p>`)}

  ${sec(25, 'Photographs', `
    <p>Photographs are taken for service verification and dispute resolution.</p>
    <div class="agreement-field-block">${fieldPlaceholder('photo_consent')}</div>`)}

  ${sec(26, 'Praetoria Operations Hub Customer Portal', `
    <p>${V(d.customer_name)} receives access to its secure Praetoria Operations Hub customer portal. Authorized users may view quotations, agreements, invoices, payment history and status, scheduled visits, completed visits, service history, service records and available service photographs, and may download quotation and contract PDFs.</p>`)}

  ${sec(27, 'Quality Guarantee', `
    <p>If an approved service area is missed or incompletely cleared, the Customer must report it within 24 hours of the visit. Praetoria will return and correct confirmed deficiencies at no additional charge.</p>`)}

  ${sec(28, 'Payment Terms', `
    <table class="agreement-table"><tbody>
      <tr><th>Payment Method</th><td>${fieldPlaceholder('payment_method')}</td></tr>
      <tr><th>Payment Terms</th><td>${V(d.payment_terms)}</td></tr>
      <tr><th>Taxes</th><td>${V(d.pst_treatment)}</td></tr>
    </tbody></table>`)}

  ${sec(29, 'Past-Due Accounts', `
    <table class="agreement-table"><tbody>
      <tr><th>Late Fee</th><td>${V(d.late_fee)}</td></tr>
      <tr><th>Interest on Overdue Balances</th><td>${V(d.interest_rate)}</td></tr>
    </tbody></table>`)}

  ${sec(30, 'Service Suspension', `
    <p>${V(d.suspension_rule)} Suspended visits are not credited.</p>`)}

  ${sec(31, 'Cancellation', `
    <p>${V(d.cancellation_terms)}</p>`)}

  ${sec(32, 'Termination', `
    <p>Either party may terminate this Agreement for material breach that remains uncured 10 days after written notice. Amounts for service performed to the date of termination remain payable.</p>`)}

  ${sec(33, 'Damage Reporting', `
    <p>Damage alleged to have been caused during a service visit must be reported within 48 hours with photographs so it can be inspected. Praetoria is not responsible for pre-existing damage, unmarked hidden items, or conditions caused by weather, freeze-thaw cycles or municipal operations.</p>`)}

  ${sec(34, 'Insurance and WCB', `
    <p>${V(d.insurance_statement)}</p>`)}

  ${sec(35, 'Governing Law', `
    <p>This Agreement is governed by the laws of the Province of Saskatchewan and the applicable laws of Canada.</p>`)}

  ${sec(36, 'Notices', `
    <p>Notices may be delivered by email to the addresses recorded in this Agreement or through the Praetoria Operations Hub, and are effective when sent.</p>`)}

  ${sec(37, 'General Provisions', `
    <p>This Agreement, including the Service Option &amp; Pricing Schedule and the recorded Customer selections, is the entire agreement between the parties and supersedes prior discussions. If any provision is unenforceable, the remaining provisions continue in force. Amendments must be issued as a new document version.</p>`)}

  ${sec(38, 'Electronic Communications', `
    <p>The Customer consents to receiving notices, quotations, agreements, invoices and receipts electronically.</p>`)}

  ${sec(39, 'Electronic Signatures', `
    <p>An electronic signature applied through the Praetoria Operations Hub has the same effect as a handwritten signature. Each signed version is retained with its timestamp, version number and audit history.</p>`)}

  ${sec(40, 'Customer Selections, Acknowledgement and Signatures', `
    <p>The selections recorded in this document form part of this Agreement. A signature does not replace a required selection; a blank selection blocks acceptance.</p>
    <div class="agreement-field-block">${fieldPlaceholder('customer_acknowledgement')}</div>
    <div class="signature-block">
      <p><strong>CUSTOMER</strong></p>
      <p>${V(d.customer_name)}</p>
      <p>Authorized Representative: ${fieldPlaceholder('customer_rep_name')}</p>
      <p>Title: ${fieldPlaceholder('customer_rep_title')}</p>
      <p>Signature:</p>
      ${fieldPlaceholder('customer_signature')}
    </div>
    <div class="signature-block">
      <p><strong>SERVICE PROVIDER</strong></p>
      <p>Praetoria Snow &amp; Ice / ${V(d.legal_company_name)}</p>
      <p>Authorized Representative: ${V(d.praetoria_authorized_representative)}</p>
      <p>Signature:</p>
      ${fieldPlaceholder('praetoria_signature')}
    </div>`)}
</div>`.trim();
}
