/**
 * PRAETORIA SNOW & ICE — RESIDENTIAL SEASONAL SNOW REMOVAL
 * COMBINED QUOTATION, PRICING SUMMARY & SERVICE AGREEMENT (master template)
 *
 * Structure: short quotation front page → pricing & seasonal-service summary →
 * service agreement → customer selections → fast guided e-signature.
 *
 * Any value Admin has not approved renders as TBD and blocks final publication.
 */

import { AgreementField, fieldPlaceholder } from '@/lib/agreementFields';
import { TBD, isTbd } from '@/lib/combinedDocument';

export const RESIDENTIAL_SNOW_SEASONAL_TITLE =
  'Residential Seasonal Snow Removal — Combined Quotation & Service Agreement';

export const RESIDENTIAL_SEASONAL_FIELD_SCHEMA: AgreementField[] = [
  {
    key: 'seasonal_plan_ack',
    label: 'Seasonal Plan Acknowledgement',
    type: 'checkbox',
    role: 'customer',
    required: true,
    checkboxText:
      'I accept the seasonal plan at $300.00 per month plus applicable tax for six months (November 1, 2026 – April 30, 2027), a seasonal contract value of $1,800.00 before applicable tax.',
  },
  {
    key: 'trigger_ack',
    label: 'Snowfall Trigger Acknowledgement',
    type: 'checkbox',
    role: 'customer',
    required: true,
    checkboxText:
      'I understand service is dispatched automatically once CUMULATIVE snowfall reaches 3 cm, that I do not need to call after each snowfall, and that snowfall below the cumulative 3 cm trigger does not automatically result in a service visit.',
  },
  {
    key: 'heavy_snow_ack',
    label: 'Heavy Snow Surcharge Acknowledgement',
    type: 'checkbox',
    role: 'customer',
    required: true,
    checkboxText:
      'I understand the standard plan applies to qualifying snowfall of 3 cm through 10 cm, and that snowfall over 10 cm is charged an additional $125.00 for every additional 3 cm increment beyond 10 cm.',
  },
  {
    key: 'exclusions_ack',
    label: 'Exclusions Acknowledgement',
    type: 'checkbox',
    role: 'customer',
    required: true,
    checkboxText:
      'I understand that municipal snowplow windrows and berms (starting at $125.00), de-icing, salting, sanding, ice-control applications, snow hauling and visits beyond the included limits are NOT included in the regular monthly rate.',
  },
  {
    key: 'approved_areas',
    label: 'Approved Snow-Clearing Areas',
    type: 'multiselect',
    role: 'customer',
    required: true,
    options: ['Driveway', 'Walkways', 'Front entrance', 'Rear entrance', 'Steps', 'Other approved area (describe below)'],
    helpText: 'Only the areas selected here and confirmed by Praetoria are cleared under this Agreement.',
  },
  {
    key: 'approved_areas_other',
    label: 'Other Approved Area (description)',
    type: 'text',
    role: 'customer',
    required: false,
    placeholder: 'Only if you selected "Other approved area" above',
  },
  {
    key: 'snow_storage_location',
    label: 'Approved On-Site Snow-Placement Location',
    type: 'text',
    role: 'customer',
    required: true,
    placeholder: 'e.g. North side of the driveway, on the lawn',
  },
  {
    key: 'deicing_request',
    label: 'De-Icing / Salting / Sanding (not included)',
    type: 'select',
    role: 'customer',
    required: true,
    options: [
      'Not required — snow clearing only',
      'Please quote separately — I understand it is not included and must be authorized',
    ],
  },
  {
    key: 'windrow_service',
    label: 'Municipal Plow Windrow / Berm Removal (not included)',
    type: 'select',
    role: 'customer',
    required: true,
    options: [
      'Contact me for authorization each time before windrow removal is performed',
      'Pre-authorize windrow removal when required (billed separately, starting at $125.00)',
      'Do not perform windrow removal',
    ],
  },
  {
    key: 'photo_consent',
    label: 'Before / After Photo Documentation',
    type: 'select',
    role: 'customer',
    required: true,
    options: ['Consent given', 'Consent declined'],
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
    key: 'customer_rep_name',
    label: 'Customer Full Legal Name',
    type: 'text',
    role: 'customer',
    required: true,
    placeholder: 'Full legal name',
  },
  {
    key: 'customer_acknowledgement',
    label: 'Customer Acknowledgement',
    type: 'checkbox',
    role: 'customer',
    required: true,
    checkboxText:
      'I understand that the seasonal rate is $300 per month for six months, that automatic snow-clearing service begins once cumulative snowfall reaches 3 cm, that the standard plan applies up to 10 cm of snowfall, and that snowfall over 10 cm is subject to an additional $125 charge for every additional 3 cm. I also understand that municipal snowplow windrows, de-icing, salting, sanding, and services beyond the included limits are not included in the regular monthly rate.',
  },
  { key: 'customer_signature', label: 'Customer Signature', type: 'signature', role: 'customer', required: true },
  { key: 'praetoria_signature', label: 'Praetoria Authorized Signature', type: 'signature', role: 'praetoria', required: true },
];

/** Selections that must be answered outright — a signature can never substitute. */
export const RESIDENTIAL_SEASONAL_REQUIRED_SELECTION_KEYS = [
  'seasonal_plan_ack',
  'trigger_ack',
  'heavy_snow_ack',
  'exclusions_ack',
  'approved_areas',
  'snow_storage_location',
  'deicing_request',
  'windrow_service',
  'photo_consent',
  'payment_method',
];

export interface ResidentialSeasonalMergeData {
  [key: string]: string | number | null | undefined;
}

export const RESIDENTIAL_SEASONAL_DEFAULTS = {
  legal_company_name: 'Praetoria Group',
  praetoria_authorized_representative: 'Ryan Steven Persaud',
  season_label: '2026–2027',
  season_start_date: 'November 1, 2026',
  season_end_date: 'April 30, 2027',
  season_months: '6',
  monthly_price: '$300.00',
  seasonal_subtotal: '$1,800.00',
  cumulative_trigger: '3 cm cumulative',
  standard_range: '3 cm through 10 cm',
  visits_per_week: '3',
  visits_per_month: '12',
  heavy_snow_threshold: '10 cm',
  heavy_snow_increment: '3 cm',
  heavy_snow_increment_charge: '$125.00',
  windrow_starting_charge: '$125.00',
  deicing_charge: 'Starting at $65.00 per application',
  /** Never invented — Admin must approve before it is shown as a price. */
  additional_visit_charge: 'Starting at $125.00 per additional visit',
  pst_treatment:
    'Snow clearing services are subject to 5% GST; no PST applies to the service. Separately sold materials are subject to GST and PST.',
  payment_terms: 'Billed monthly in accordance with current Praetoria billing settings.',
  suspension_rule:
    'Service may be suspended on past-due accounts in accordance with the current approved Praetoria payment and service-suspension terms, until the account is brought current.',
  cancellation_terms:
    'Cancellation and termination follow the current approved Praetoria residential contract terms. Service performed to the cancellation date remains payable.',
  damage_reporting:
    'Suspected property damage must be reported to Praetoria in accordance with the current approved company damage-reporting process so it can be documented, inspected and resolved.',
};

const V = (v: unknown) => (isTbd(v) ? `<span class="tbd">${TBD}</span>` : String(v));

const sec = (n: number, title: string, body: string) => `
  <section class="agreement-section">
    <h2>${n}. ${title}</h2>
    ${body}
  </section>`;

export function buildResidentialSeasonalSnowBody(d: ResidentialSeasonalMergeData): string {
  return `
<div class="agreement-doc">

  <h1>${V(d.quotation_title)}</h1>
  <p class="doc-subtitle">Praetoria Snow &amp; Ice — ${V(d.legal_company_name)} · Season ${V(d.season_label)}</p>

  <!-- ══════════ PAGE 1 — QUOTATION ══════════ -->
  ${sec(1, 'Quotation — Prepared For', `
    <table class="agreement-table"><tbody>
      <tr><th>Customer</th><td>${V(d.customer_name)}</td></tr>
      <tr><th>Telephone</th><td>${V(d.customer_phone)}</td></tr>
      <tr><th>Email</th><td>${V(d.customer_email)}</td></tr>
      <tr><th>Service Property</th><td>${V(d.service_address)}, ${V(d.service_city)}, ${V(d.service_province)} ${V(d.service_postal_code)}</td></tr>
      <tr><th>Customer Type</th><td>Residential</td></tr>
      <tr><th>Service Category</th><td>Snow &amp; Ice</td></tr>
      <tr><th>Quotation Number</th><td>${V(d.quotation_number)}</td></tr>
      <tr><th>Agreement Number</th><td>${V(d.agreement_number)}</td></tr>
      <tr><th>Version / Status</th><td>${V(d.document_version)} · ${V(d.document_status_label)}</td></tr>
      <tr><th>Issued</th><td>${V(d.issued_date)}</td></tr>
    </tbody></table>
    <p>This is a single combined document. The quotation, the pricing summary and the service agreement share one record, one set of prices and one set of terms. A signed version is never overwritten; a change of price or scope is issued as a new version for review and signature.</p>`)}

  ${sec(2, 'Seasonal Plan Summary', `
    <table class="agreement-table"><tbody>
      <tr><th>Seasonal Snow Removal</th><td>${V(d.season_start_date)} – ${V(d.season_end_date)} (${V(d.season_months)} months)</td></tr>
      <tr><th>Monthly Rate</th><td><strong>${V(d.monthly_price)} per month</strong> plus applicable tax</td></tr>
      <tr><th>Seasonal Value</th><td><strong>${V(d.seasonal_subtotal)}</strong> before applicable tax</td></tr>
      <tr><th>Automatic Trigger</th><td><strong>${V(d.cumulative_trigger)} snowfall</strong> — no need to call</td></tr>
      <tr><th>Included Standard Snowfall</th><td>Up to and including ${V(d.heavy_snow_threshold)}</td></tr>
      <tr><th>Service Limit</th><td>Up to ${V(d.visits_per_week)} qualifying visits per week · maximum ${V(d.visits_per_month)} qualifying visits per month</td></tr>
      <tr><th>Heavy Snow</th><td>Over ${V(d.heavy_snow_threshold)}: +${V(d.heavy_snow_increment_charge)} for every additional ${V(d.heavy_snow_increment)}</td></tr>
      <tr><th>Municipal Plow Windrows</th><td>Not included — starting at ${V(d.windrow_starting_charge)}</td></tr>
      <tr><th>De-Icing / Salt / Sand</th><td>Not included — ${V(d.deicing_charge)}</td></tr>
    </tbody></table>`)}

  ${sec(3, 'Automatic Service — Cumulative 3 cm Trigger', `
    <p>The Customer does <strong>not</strong> need to call Praetoria after every snowfall. Praetoria Snow &amp; Ice monitors snowfall accumulation and automatically dispatches service once cumulative snowfall reaches <strong>3 centimetres</strong>.</p>
    <p><strong>The 3 cm trigger is cumulative.</strong> Snowfall accumulates between service visits until the trigger is reached:</p>
    <table class="agreement-table">
      <thead><tr><th>Example</th><th>Accumulation</th><th>Result</th></tr></thead>
      <tbody>
        <tr><td>Example 1</td><td>1 cm Monday + 2 cm Tuesday = 3 cm</td><td>Trigger reached — Praetoria may dispatch Tuesday</td></tr>
        <tr><td>Example 2</td><td>1 cm Monday + 1 cm Tuesday + 1 cm Wednesday = 3 cm</td><td>Trigger reached — Praetoria may dispatch Wednesday</td></tr>
        <tr><td>Example 3</td><td>3 cm in one snowfall</td><td>Trigger reached — Praetoria may dispatch</td></tr>
      </tbody>
    </table>
    <p>Snowfall below the cumulative 3 cm trigger does not automatically result in a service visit.</p>`)}

  ${sec(4, 'Included Service Frequency', `
    <p>The seasonal plan includes a maximum of <strong>up to ${V(d.visits_per_week)} qualifying service visits per week</strong> and <strong>up to ${V(d.visits_per_month)} qualifying service visits per calendar month</strong>. These are maximum included limits, not a guaranteed schedule. Visits occur only when the cumulative 3 cm trigger is reached; if fewer qualifying snow events occur, fewer visits are required.</p>`)}

  <!-- ══════════ PAGE 2 — PRICING & SEASONAL SERVICE SUMMARY ══════════ -->
  <section class="agreement-section sheet-break pricing-sheet">
    <h1>PRICING &amp; SEASONAL SERVICE SUMMARY</h1>
    <p class="doc-subtitle">${V(d.customer_name)} — ${V(d.service_address)}, ${V(d.service_city)}, ${V(d.service_province)}</p>

    <h3>Seasonal Plan</h3>
    <table class="agreement-table"><tbody>
      <tr><th>Service Period</th><td>${V(d.season_start_date)} through ${V(d.season_end_date)} (${V(d.season_months)} months)</td></tr>
      <tr><th>Monthly Rate</th><td>${V(d.monthly_price)} per month plus applicable tax</td></tr>
      <tr><th>Seasonal Contract Value</th><td><strong>${V(d.seasonal_subtotal)} before applicable tax</strong></td></tr>
      <tr><th>GST (5%)</th><td>${V(d.gst_amount)}</td></tr>
      <tr><th>Seasonal Total Including Tax</th><td><strong>${V(d.total_price)}</strong></td></tr>
      <tr><th>Tax Treatment</th><td>${V(d.pst_treatment)}</td></tr>
      <tr><th>Dispatch</th><td>Automatic at ${V(d.cumulative_trigger)} snowfall</td></tr>
      <tr><th>Standard Snowfall Range</th><td>${V(d.standard_range)}</td></tr>
      <tr><th>Included Visits</th><td>Up to ${V(d.visits_per_week)} per week · maximum ${V(d.visits_per_month)} per calendar month</td></tr>
      <tr><th>Scope</th><td>Snow clearing only</td></tr>
    </tbody></table>

    <h3>Heavy Snow Surcharge — Snowfall Over 10 cm</h3>
    <p>The regular monthly plan is <strong>not unlimited</strong>. Normal seasonal pricing applies only to qualifying snowfall up to and including ${V(d.heavy_snow_threshold)}. Beyond that, every additional ${V(d.heavy_snow_increment)} of snowfall adds ${V(d.heavy_snow_increment_charge)} to the clearing charge, calculated in 3 cm increments:</p>
    <table class="agreement-table">
      <thead><tr><th>Snowfall Event</th><th>Additional Charge (total)</th></tr></thead>
      <tbody>
        <tr><td>10 cm or less</td><td>Included under normal seasonal terms</td></tr>
        <tr><td>More than 10 cm through 13 cm</td><td>+$125.00</td></tr>
        <tr><td>More than 13 cm through 16 cm</td><td>+$250.00 total additional</td></tr>
        <tr><td>More than 16 cm through 19 cm</td><td>+$375.00 total additional</td></tr>
        <tr><td>More than 19 cm through 22 cm</td><td>+$500.00 total additional</td></tr>
        <tr><td>Each further 3 cm increment beyond 22 cm</td><td>+$125.00 per additional 3 cm</td></tr>
      </tbody>
    </table>
    <p>For extremely severe snowfall events (for example 25 cm, 30 cm, 40 cm, 50 cm or greater) the same $125-per-3-cm principle applies, and Praetoria additionally retains the right to charge separately where extraordinary conditions require additional equipment, additional labour, multiple clearing passes, snow relocation, snow hauling, extended service time or specialized equipment. The $125-per-3-cm surcharge does not automatically include extraordinary equipment or snow hauling unless specifically stated.</p>

    <h3>Services Not Included in the Monthly Rate</h3>
    <table class="agreement-table"><tbody>
      <tr><th>Municipal Plow Windrow / Berm Removal</th><td>Not included — starting at ${V(d.windrow_starting_charge)}; final price varies with windrow size, snow depth, compaction, ice buildup, equipment and labour required</td></tr>
      <tr><th>De-Icing / Salt / Sand / Ice Melt / Sanding</th><td>Not included — ${V(d.deicing_charge)}, depending on material quantity and area treated; separately authorized</td></tr>
      <tr><th>Off-Site Snow Hauling</th><td>Not included — separately quoted and authorized</td></tr>
      <tr><th>Additional Visits Beyond ${V(d.visits_per_month)} per Month</th><td>${V(d.additional_visit_charge)} — separately authorized and priced under the approved quotation / service agreement</td></tr>
    </tbody></table>
    <p class="pricing-note"><strong>Snow clearing only.</strong> The ${V(d.monthly_price)} monthly rate does not include salt, sand, de-icer, ice melt, sanding or any ice-control application.</p>
  </section>

  <!-- ══════════ SERVICE AGREEMENT ══════════ -->
  <section class="agreement-section sheet-break">
    <h1>RESIDENTIAL SNOW REMOVAL SERVICE AGREEMENT</h1>
    <p class="doc-subtitle">Attached to and forming part of Quotation ${V(d.quotation_number)}</p>
  </section>

  ${sec(1, 'Parties', `
    <p>This Agreement is between <strong>Praetoria Snow &amp; Ice / ${V(d.legal_company_name)}</strong> ("Praetoria") and <strong>${V(d.customer_name)}</strong> (the "Customer").</p>`)}

  ${sec(2, 'Service Property', `
    <p>${V(d.service_address)}, ${V(d.service_city)}, ${V(d.service_province)} ${V(d.service_postal_code)}.</p>`)}

  ${sec(3, 'Contract Period', `
    <p>${V(d.season_start_date)} through ${V(d.season_end_date)} (${V(d.season_months)} months).</p>`)}

  ${sec(4, 'Monthly Price', `
    <p>${V(d.monthly_price)} per month plus applicable tax.</p>`)}

  ${sec(5, 'Seasonal Contract Value', `
    <p>${V(d.seasonal_subtotal)} before applicable tax.</p>`)}

  ${sec(6, 'Snowfall Trigger', `
    <p>Service is triggered at <strong>cumulative snowfall of 3 cm</strong>, accumulated between service visits as described in the quotation examples.</p>`)}

  ${sec(7, 'Automatic Dispatch', `
    <p>The Customer is not required to telephone Praetoria after a qualifying snowfall. Praetoria monitors snowfall accumulation and dispatches automatically once the trigger is reached.</p>`)}

  ${sec(8, 'Standard Event Range', `
    <p>Standard seasonal pricing applies to qualifying snowfall of ${V(d.standard_range)}.</p>`)}

  ${sec(9, 'Service Limits', `
    <p>Maximum ${V(d.visits_per_week)} qualifying visits per week and ${V(d.visits_per_month)} qualifying visits per calendar month. This plan is not unlimited.</p>`)}

  ${sec(10, 'Heavy Snow Event', `
    <p>A Heavy Snow Event is any snowfall exceeding ${V(d.heavy_snow_threshold)}.</p>`)}

  ${sec(11, 'Heavy Snow Surcharge', `
    <p>${V(d.heavy_snow_increment_charge)} for every additional ${V(d.heavy_snow_increment)} of snowfall beyond ${V(d.heavy_snow_threshold)}, calculated in 3 cm increments as shown in the Pricing &amp; Seasonal Service Summary. Extraordinary equipment, additional labour, multiple passes, snow relocation, hauling, extended service time and specialized equipment may be charged separately.</p>
    <div class="agreement-field-block">${fieldPlaceholder('heavy_snow_ack')}</div>`)}

  ${sec(12, 'Municipal Windrow / Berm Removal', `
    <p>Removal of snow piles, windrows and berms created by city snowplows, municipal road clearing, street graders, or snow deposited along the curb or driveway entrance after Praetoria completes its normal service is <strong>not included</strong>. It is a separate service starting at ${V(d.windrow_starting_charge)}, with the final price depending on windrow size, snow depth, compaction, ice buildup, and the equipment and labour required.</p>
    <div class="agreement-field-block">${fieldPlaceholder('windrow_service')}</div>`)}

  ${sec(13, 'De-Icing, Salt and Sand', `
    <p><strong>Snow clearing only.</strong> Salt, sand, de-icer, ice melt, sanding and ice-control applications are not included in the monthly price. When authorized, de-icing is billed separately at ${V(d.deicing_charge)}, depending on material quantity and area treated.</p>
    <div class="agreement-field-block">${fieldPlaceholder('deicing_request')}</div>`)}

  ${sec(14, 'Additional Visits', `
    <p>Visits beyond ${V(d.visits_per_month)} qualifying visits in a calendar month are outside the regular monthly plan and must be separately authorized and priced according to the approved quotation and service agreement. Additional Visit Charge: ${V(d.additional_visit_charge)}.</p>`)}

  ${sec(15, 'Approved Service Areas', `
    <p>Only the areas specifically included in the accepted quotation and service agreement are covered:</p>
    <div class="agreement-field-block">${fieldPlaceholder('approved_areas')}</div>
    <p>Other approved area: ${fieldPlaceholder('approved_areas_other')}</p>`)}

  ${sec(16, 'Site Access and Obstructions', `
    <p>The Customer is responsible for keeping service areas reasonably accessible. Vehicles, garbage bins, trailers and other obstacles may prevent complete clearing, and Praetoria may leave blocked areas uncleared. A requested return visit after an obstruction is removed may be separately billable.</p>`)}

  ${sec(17, 'Snow Placement', `
    <p>Snow is pushed, blown or placed in reasonable on-site locations where practical. Praetoria uses reasonable care not to intentionally block entrances, vehicle access, walkways, neighbouring property or required access areas. Off-site snow hauling is not included.</p>
    <p>Approved on-site snow-placement location: ${fieldPlaceholder('snow_storage_location')}</p>`)}

  ${sec(18, 'Changing Winter Conditions', `
    <p>Bare pavement is not guaranteed. After a service visit, surfaces may experience new snow, drifting, blowing snow, refreezing, freezing rain, meltwater, roof runoff, municipal-plow deposits and other changing winter conditions.</p>`)}

  ${sec(19, 'Service Priority, Timing and Severe Weather', `
    <p>Seasonal customers receive automatic route scheduling once the qualifying trigger is reached. No exact arrival time is guaranteed. Timing may be affected by continuing snowfall, severe weather, unsafe roads, road closures, equipment availability, route conditions, property access, municipal plowing and other conditions outside Praetoria's reasonable control.</p>`)}

  ${sec(20, 'Service Documentation', `
    <p>The Praetoria Operations Hub records the available service information for each visit, including service date, dispatch time, arrival time, departure time, snowfall amount, equipment used, work completed, before and after photographs, service notes, any Heavy Snow surcharge and any municipal windrow service.</p>`)}

  ${sec(21, 'Customer Portal', `
    <p>The Customer may access this quotation, this service agreement, signature status, the seasonal plan, invoices, scheduled and completed visits, snowfall and service history, available before/after photographs and service records through the Praetoria Operations Hub customer portal.</p>`)}

  ${sec(22, 'Photographs', `
    <p>Operational before and after photographs may be taken for service documentation.</p>
    <div class="agreement-field-block">${fieldPlaceholder('photo_consent')}</div>`)}

  ${sec(23, 'Payment Terms', `
    <p>${V(d.payment_terms)}</p>
    <div class="agreement-field-block">${fieldPlaceholder('payment_method')}</div>`)}

  ${sec(24, 'Past-Due Accounts', `
    <p>${V(d.suspension_rule)}</p>`)}

  ${sec(25, 'Cancellation and Termination', `
    <p>${V(d.cancellation_terms)}</p>`)}

  ${sec(26, 'Property Damage Reporting', `
    <p>${V(d.damage_reporting)}</p>`)}

  ${sec(27, 'General Contract Terms', `
    <p>This Agreement, including the Pricing &amp; Seasonal Service Summary and the recorded Customer selections, is the entire agreement between the parties and supersedes prior discussions. If any provision is unenforceable, the remaining provisions continue in force. Amendments are issued as a new document version. Praetoria's current approved master terms apply to any matter not expressly addressed here.</p>`)}

  ${sec(28, 'Electronic Signature', `
    <p>The Customer may sign electronically. An electronic signature applied through the Praetoria Operations Hub has the same effect as a handwritten signature, and each signed version is retained with its timestamp, version number and audit history.</p>`)}

  ${sec(29, 'Customer Selections, Acknowledgement and Signatures', `
    <p>The selections recorded in this document form part of this Agreement. A signature does not replace a required selection; a blank selection blocks acceptance.</p>
    <div class="agreement-field-block">${fieldPlaceholder('seasonal_plan_ack')}</div>
    <div class="agreement-field-block">${fieldPlaceholder('trigger_ack')}</div>
    <div class="agreement-field-block">${fieldPlaceholder('exclusions_ack')}</div>
    <div class="agreement-field-block">${fieldPlaceholder('customer_acknowledgement')}</div>
    <div class="signature-block">
      <p><strong>CUSTOMER</strong></p>
      <p>${V(d.customer_name)}</p>
      <p>Full Legal Name: ${fieldPlaceholder('customer_rep_name')}</p>
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
