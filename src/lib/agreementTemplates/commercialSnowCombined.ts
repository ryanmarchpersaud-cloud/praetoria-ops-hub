/**
 * PRAETORIA SNOW & ICE — COMMERCIAL SNOW REMOVAL
 * COMBINED QUOTATION, PRICING SHEET & SERVICE AGREEMENT (standard template)
 *
 * Standard Praetoria Snow & Ice commercial structure:
 *   1. Customer / property quotation page
 *   2. Separate Service Option & Pricing Schedule sheet (own page in the PDF)
 *   3. Service agreement / contract
 *   4. Customer selections (ONE option only)
 *   5. Fast guided electronic signature
 *   6. Customer portal linkage
 *
 * Three service options are supported: automatic per-visit, flexible
 * month-to-month on-call, and full-season automatic. Rates are merge data and
 * remain editable per customer. Unapproved values render as TBD and block
 * final publication.
 */

import { AgreementField, fieldPlaceholder } from '@/lib/agreementFields';
import { TBD, isTbd } from '@/lib/combinedDocument';

export const COMMERCIAL_SNOW_COMBINED_TITLE =
  'Commercial Snow Removal Combined Quotation, Pricing Schedule & Service Agreement';

export const OPTION_1_LABEL = 'OPTION 1 — Automatic Per-Visit Service';
export const OPTION_2_LABEL = 'OPTION 2 — Flexible Month-to-Month On-Call Service';
export const OPTION_3_LABEL = 'OPTION 3 — Full Season Automatic Plan';

export const OPTION_2_MONTH_CHOICES = [
  'November 2026',
  'December 2026',
  'January 2027',
  'February 2027',
  'March 2027',
  'April 2027',
];

export const COMMERCIAL_SNOW_COMBINED_FIELD_SCHEMA: AgreementField[] = [
  {
    key: 'service_option',
    label: 'Select Your Service Plan (choose ONE only)',
    type: 'select',
    role: 'customer',
    required: true,
    options: [OPTION_1_LABEL, OPTION_2_LABEL, OPTION_3_LABEL],
    helpText:
      'The three options are alternatives and are never added together. No option is pre-selected — you must choose exactly one.',
  },
  {
    key: 'option2_months',
    label: 'Option 2 — Select Active Service Month(s)',
    type: 'multiselect',
    role: 'customer',
    required: true,
    options: OPTION_2_MONTH_CHOICES,
    visibleWhen: { key: 'service_option', startsWith: 'OPTION 2' },
    helpText: 'Only required if you selected Option 2. Choose each month you want snow-removal availability.',
  },
  {
    key: 'snowfall_trigger',
    label: 'Snowfall Trigger',
    type: 'select',
    role: 'customer',
    required: true,
    options: [
      '2 cm accumulation or greater (recommended)',
      '1 cm accumulation or greater',
      '5 cm accumulation or greater',
      'Other written amount (state below)',
    ],
    helpText:
      'Under Options 1 and 3 Praetoria monitors snowfall and dispatches automatically once accumulation reaches this amount. Under Option 2 this is the accumulation level at which you would normally request service.',
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
    key: 'heavy_snow_acknowledgement',
    label: 'Heavy Snow Event Acknowledgement',
    type: 'checkbox',
    role: 'customer',
    required: true,
    checkboxText:
      'I understand that the quoted rates apply to standard qualifying snowfall events up to and including 10 cm of accumulation per event, that a snowfall event exceeding 10 cm is a Heavy Snow Event, and that Heavy Snow Events may result in additional charges based on the approved Heavy Snow pricing schedule and the actual services required, including additional equipment which is separately billable.',
  },
  {
    key: 'area_front',
    label: 'Front Service Area (primary service area)',
    type: 'select',
    role: 'customer',
    required: true,
    options: ['Included in service', 'Not included'],
  },
  {
    key: 'area_entrance',
    label: 'Main Business Entrance / Access',
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
    label: 'Initials — Selected Option, Pricing, Minimums, Heavy Snow Terms & Taxes',
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
      'I confirm that I have reviewed and selected my service option, applicable pricing, snowfall trigger, minimum charges, Heavy Snow Event terms, service scope, exclusions, and Service Agreement, and I authorize Praetoria Snow & Ice to provide service according to the selected plan.',
  },
  { key: 'customer_signature', label: 'Customer Signature', type: 'signature', role: 'customer', required: true },
  { key: 'praetoria_signature', label: 'Praetoria Authorized Signature', type: 'signature', role: 'praetoria', required: true },
];

/** Selections that must be answered outright — a signature never substitutes. */
export const COMMERCIAL_REQUIRED_SELECTION_KEYS = [
  'service_option',
  'option2_months',
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
      <tr><th>Contract Period (Option 3)</th><td>${V(d.season_start_date)} to ${V(d.season_end_date)}</td></tr>
    </tbody></table>
    <p>This is a single combined document. The quotation, pricing schedule and service agreement share one record, one set of prices and one set of terms. A signed version is never overwritten; a change of price or scope is issued as a new version for review and signature.</p>`)}

  ${sec(3, 'Property and Site Notes', `
    <p>This is a small commercial property. The Customer advised that snow clearing is mainly required at the <strong>front of the property</strong>, and that the <strong>back area will rarely require service</strong>. When required, the approved service may include both the front and the rear areas.</p>
    <p>No square footage, parking-lot dimensions, sidewalk measurements or snow-storage measurements are stated in this document. Only information confirmed by the Customer is recorded.</p>`)}

  ${sec(4, 'Scope of Work', `
    <ul>
      <li>Front service area — primary service area</li>
      <li>Main business entrance and access</li>
      <li>Approved vehicle-access areas</li>
      <li>Rear / back area when conditions require service and it is within the approved scope</li>
      <li>On-site snow pushing and piling</li>
      <li>Service documentation and photographs</li>
    </ul>
    <p>Services not listed above are not included. Any optional or add-on service is quoted separately and performed only when authorized.</p>`)}

  ${sec(5, 'Three Service Options — Choose ONE', `
    <p>This quotation offers three service options. <strong>The Customer selects one option only.</strong> The options are alternatives and are <strong>never added together</strong> to form a total.</p>
    <h3>${OPTION_1_LABEL}</h3>
    <p><strong>Pay as qualifying snowfall occurs, while Praetoria automatically monitors and dispatches.</strong> ${V(d.option1_rate)} per hour, per equipment unit (operator included), with a ${V(d.option1_minimum_hours)} minimum per service visit — a minimum charge of ${V(d.option1_minimum_charge)} per qualifying service visit plus applicable tax. The Customer does not need to telephone Praetoria for each qualifying event.</p>
    <h3>${OPTION_2_LABEL}</h3>
    <p><strong>Choose the month(s) you need coverage and contact Praetoria when you require service.</strong> ${V(d.option2_hourly_rate)} per hour, per equipment unit (operator included), with a ${V(d.option2_minimum_hours)} minimum per service visit — a minimum charge of ${V(d.option2_minimum_charge)} per service visit plus applicable tax. This option carries a higher hourly rate and higher minimum because it provides month-to-month flexibility without a full-season commitment. Praetoria does <strong>not</strong> automatically dispatch for every snowfall under Option 2; the Customer contacts Praetoria when service is required during an active selected month, and service is then scheduled according to availability and service priority.</p>
    <h3>${OPTION_3_LABEL} — BEST VALUE</h3>
    <p><strong>Full winter peace of mind. Praetoria monitors snowfall and automatically services qualifying events for the entire contracted season.</strong> ${V(d.option3_monthly_rate)} per month plus applicable tax for the season ${V(d.season_start_date)} through ${V(d.season_end_date)} (${V(d.option3_months)} months). Seasonal contract value ${V(d.option3_season_total)} plus applicable tax. The Customer does not need to call Praetoria.</p>
    <p>The ${V(d.option3_monthly_rate)} monthly seasonal rate covers standard qualifying snowfall events, subject to the terms of this Agreement. It does not mean Praetoria accepts unrestricted snow accumulation, unrestricted extraordinary equipment usage, or severe-weather work for the same regular monthly amount.</p>`)}

  ${sec(6, 'Automatic Dispatch and Customer-Requested Service', `
    <p>Under Options 1 and 3, ${V(d.customer_name)} is <strong>not required to call Praetoria after each qualifying snowfall</strong>. Praetoria Snow &amp; Ice monitors snowfall conditions and automatically dispatches service according to the selected trigger and the selected service option.</p>
    <p>Under Option 2 the service is <strong>on-call</strong>: the Customer contacts Praetoria when snow removal is required during a selected active month.</p>
    <p>Selected snowfall trigger: ${fieldPlaceholder('snowfall_trigger')}</p>
    <p>Other written amount (only if selected above): ${fieldPlaceholder('snowfall_trigger_other')}</p>`)}

  <!-- ══════════ PAGE 2 — PRICING SHEET ══════════ -->
  <section class="agreement-section sheet-break pricing-sheet">
    <h1>SERVICE OPTION &amp; PRICING SCHEDULE</h1>
    <p class="doc-subtitle">${V(d.customer_name)} — ${V(d.service_address)}, ${V(d.service_city)}, ${V(d.service_province)}</p>

    <h3>${OPTION_1_LABEL}</h3>
    <table class="agreement-table"><tbody>
      <tr><th>Rate</th><td>${V(d.option1_rate)} per hour, per equipment unit (operator included)</td></tr>
      <tr><th>Minimum</th><td>${V(d.option1_minimum_hours)} per service visit</td></tr>
      <tr><th>Minimum Visit Charge</th><td>${V(d.option1_minimum_charge)} per qualifying service visit, plus applicable tax</td></tr>
      <tr><th>Dispatch</th><td>Automatic — Praetoria monitors snowfall. Customer does not need to call.</td></tr>
      <tr><th>Trigger</th><td>${V(d.default_trigger)}</td></tr>
      <tr><th>Included Area</th><td>Front service area, main access, approved vehicle areas, rear area when required, on-site pushing and piling</td></tr>
    </tbody></table>

    <h3>${OPTION_2_LABEL}</h3>
    <table class="agreement-table"><tbody>
      <tr><th>Rate</th><td>${V(d.option2_hourly_rate)} per hour, per equipment unit (operator included)</td></tr>
      <tr><th>Minimum</th><td>${V(d.option2_minimum_hours)} per service visit</td></tr>
      <tr><th>Minimum Visit Charge</th><td>${V(d.option2_minimum_charge)} per service visit, plus applicable tax</td></tr>
      <tr><th>Dispatch</th><td>On-call — the Customer contacts Praetoria when service is required</td></tr>
      <tr><th>Commitment</th><td>Selected active month(s) only</td></tr>
      <tr><th>Priority</th><td>Lower priority than automatic seasonal customers during widespread snowfall events</td></tr>
    </tbody></table>

    <h3>${OPTION_3_LABEL} — BEST VALUE</h3>
    <table class="agreement-table"><tbody>
      <tr><th>Season</th><td>${V(d.season_start_date)} through ${V(d.season_end_date)} (${V(d.option3_months)}-month winter agreement)</td></tr>
      <tr><th>Monthly Rate</th><td>${V(d.option3_monthly_rate)} per month plus applicable tax</td></tr>
      <tr><th>Seasonal Contract Value</th><td><strong>${V(d.option3_season_total)}</strong> plus applicable tax</td></tr>
      <tr><th>Billing</th><td>${V(d.option3_monthly_rate)}/month × ${V(d.option3_months)} months</td></tr>
      <tr><th>Dispatch</th><td>Automatic — Praetoria monitors snowfall. Customer does not need to call.</td></tr>
      <tr><th>Trigger</th><td>${V(d.default_trigger)}</td></tr>
    </tbody></table>

    <h3>Option Comparison</h3>
    <table class="agreement-table">
      <thead><tr><th>Feature</th><th>Option 1</th><th>Option 2</th><th>Option 3</th></tr></thead>
      <tbody>
        <tr><th>Plan</th><td>Automatic Per-Visit</td><td>Month-to-Month On-Call</td><td>Full Seasonal Automatic</td></tr>
        <tr><th>Automatic Dispatch</th><td>YES</td><td>NO</td><td>YES</td></tr>
        <tr><th>Customer Must Call</th><td>NO</td><td>YES</td><td>NO</td></tr>
        <tr><th>Rate</th><td>${V(d.option1_rate)}/hour</td><td>${V(d.option2_hourly_rate)}/hour</td><td>${V(d.option3_monthly_rate)}/month</td></tr>
        <tr><th>Minimum</th><td>${V(d.option1_minimum_hours)}</td><td>${V(d.option2_minimum_hours)}</td><td>Seasonal monthly fee</td></tr>
        <tr><th>Minimum Visit Charge</th><td>${V(d.option1_minimum_charge)}</td><td>${V(d.option2_minimum_charge)}</td><td>Included under seasonal terms</td></tr>
        <tr><th>Commitment</th><td>Per visit</td><td>Selected month(s)</td><td>${V(d.season_start_date)} – ${V(d.season_end_date)}</td></tr>
        <tr><th>Priority</th><td>Automatic-route priority</td><td>On-call / lower priority</td><td>Seasonal priority</td></tr>
        <tr><th>Heavy Snow &gt; ${V(d.heavy_snow_threshold)}</th><td>Additional charges</td><td>Additional charges</td><td>Additional charges</td></tr>
      </tbody>
    </table>
    <p class="pricing-note"><strong>Option 3 — ${V(d.option3_months)}-Month Seasonal Contract: ${V(d.option3_season_total)} + applicable tax</strong></p>

    <h3>Heavy Snow Event / Severe Snowfall Pricing</h3>
    <table class="agreement-table">
      <thead><tr><th>Accumulation</th><th>Classification</th><th>Rate / Surcharge</th></tr></thead>
      <tbody>
        <tr><td>10.1 – 15 cm</td><td>Heavy Snow Tier 1</td><td>${V(d.heavy_snow_tier1)}</td></tr>
        <tr><td>15.1 – 20 cm</td><td>Heavy Snow Tier 2</td><td>${V(d.heavy_snow_tier2)}</td></tr>
        <tr><td>More than 20 cm</td><td>Severe Snow Tier</td><td>${V(d.heavy_snow_tier3)}</td></tr>
      </tbody>
    </table>
    <p>Heavy Snow pricing may be structured as an additional percentage surcharge, an additional per-visit fee, a higher hourly rate, an additional equipment rate or a custom severe-event price, as approved by Praetoria before the quotation is issued.</p>

    <p class="pricing-note"><strong>CUSTOMER SELECTS ONE SERVICE OPTION.</strong> These options are alternatives and are <strong>not added together</strong>.</p>
    <table class="agreement-table"><tbody>
      <tr><th>Tax Treatment</th><td>${V(d.pst_treatment)}</td></tr>
    </tbody></table>
  </section>

  <!-- ══════════ PAGE 3+ — SERVICE AGREEMENT ══════════ -->
  <section class="agreement-section sheet-break">
    <h1>COMMERCIAL SNOW &amp; ICE SERVICE AGREEMENT</h1>
  </section>

  ${sec(7, 'Parties', `
    <p>This Agreement is made between <strong>${V(d.legal_company_name)}</strong>, operating as Praetoria Snow &amp; Ice ("Praetoria", the "Service Provider"), and the Customer identified below.</p>`)}

  ${sec(8, 'Customer', `
    <table class="agreement-table"><tbody>
      <tr><th>Customer</th><td>${V(d.customer_name)}</td></tr>
      <tr><th>Authorized Representative</th><td>${V(d.contact_name)}</td></tr>
      <tr><th>Telephone</th><td>${V(d.customer_phone)}</td></tr>
      <tr><th>Email</th><td>${V(d.customer_email)}</td></tr>
    </tbody></table>`)}

  ${sec(9, 'Service Property', `
    <p>${V(d.service_address)}, ${V(d.service_city)}, ${V(d.service_province)} ${V(d.service_postal_code)}</p>
    <p>Service is provided only at this property and only within the approved scope recorded in this Agreement.</p>`)}

  ${sec(10, 'Term', `
    <table class="agreement-table"><tbody>
      <tr><th>Season</th><td>${V(d.season_label)}</td></tr>
      <tr><th>Option 3 Contract Start</th><td>${V(d.season_start_date)}</td></tr>
      <tr><th>Option 3 Contract End</th><td>${V(d.season_end_date)}</td></tr>
      <tr><th>Option 1</th><td>Per qualifying service visit</td></tr>
      <tr><th>Option 2</th><td>The active month(s) selected by the Customer</td></tr>
    </tbody></table>`)}

  ${sec(11, 'Selected Service Plan', `
    <p>The Customer must select exactly one service option. The options are alternatives and are never combined or added together.</p>
    <div class="agreement-field-block">${fieldPlaceholder('service_option')}</div>
    <p><strong>Option 2 only — select active service month(s):</strong></p>
    <div class="agreement-field-block">${fieldPlaceholder('option2_months')}</div>
    <div class="agreement-field-block"><strong>Customer initials confirming the selected option, pricing, minimums, Heavy Snow terms and taxes:</strong> ${fieldPlaceholder('pricing_initials')}</div>`)}

  ${sec(12, 'Option 1 — Automatic Per-Visit Service', `
    <p>Automatic dispatch. ${V(d.option1_rate)} per hour, per equipment unit, operator included. Minimum ${V(d.option1_minimum_hours)} per service visit, producing a minimum charge of ${V(d.option1_minimum_charge)} per qualifying service visit plus applicable tax. Each equipment unit actually used is recorded and billed separately.</p>`)}

  ${sec(13, 'Option 2 — Flexible Month-to-Month On-Call Service', `
    <p>Customer-requested, on-call service during the active month(s) selected by the Customer. ${V(d.option2_hourly_rate)} per hour, per equipment unit, operator included. Minimum ${V(d.option2_minimum_hours)} per service visit, producing a minimum charge of ${V(d.option2_minimum_charge)} per service visit plus applicable tax.</p>
    <p>Praetoria does not automatically dispatch for every snowfall under Option 2. Service is scheduled according to availability and service priority after the Customer requests it. Option 2 customers are lower priority than customers enrolled in automatic seasonal service during widespread snowfall events, and no seasonal-plan priority or response window is promised.</p>`)}

  ${sec(14, 'Option 3 — Full Season Automatic Plan', `
    <p>Automatic full-season service from ${V(d.season_start_date)} to ${V(d.season_end_date)}. ${V(d.option3_monthly_rate)} per month plus applicable tax, billed ${V(d.option3_monthly_rate)} per month × ${V(d.option3_months)} months, for a seasonal contract value of ${V(d.option3_season_total)} plus applicable tax.</p>
    <p>The monthly seasonal rate covers standard qualifying snowfall events subject to this Agreement. It does not cover unrestricted snow accumulation, unrestricted extraordinary equipment usage or severe-weather work at the same regular monthly amount. Heavy Snow Events are governed by the Heavy Snow Event section below.</p>`)}

  ${sec(15, 'Snowfall Trigger', `
    <p>Praetoria dispatches automatic service (Options 1 and 3) once accumulation reaches the trigger selected by the Customer. The draft trigger for this property is <strong>${V(d.default_trigger)}</strong> and remains editable during Admin review.</p>`)}

  ${sec(16, 'HEAVY SNOW EVENT / SEVERE SNOWFALL SURCHARGE', `
    <p>The standard rates and seasonal pricing in this document apply to normal qualifying snowfall events <strong>up to and including ${V(d.heavy_snow_threshold)} of accumulation per snowfall event</strong>.</p>
    <p>When snowfall accumulation exceeds <strong>${V(d.heavy_snow_threshold)}</strong>, the event is automatically classified as a <strong>HEAVY SNOW EVENT</strong> or <strong>SEVERE SNOWFALL EVENT</strong>. A Heavy Snow Event is outside standard normal-event pricing because additional work may be required. It is not described as an emergency unless the Customer actually requests emergency service.</p>
    <p>Additional charges may apply for: additional equipment; additional operators; additional labour; multiple clearing passes; extended service time; snow stacking; snow relocation; compacted snow; drifting; large snow volume; and additional clearing required to maintain access.</p>
    <p><strong>Heavy Snow Events.</strong> The regular quoted rates apply to standard qualifying snowfall events up to and including ${V(d.heavy_snow_threshold)}. A snowfall event exceeding ${V(d.heavy_snow_threshold)} is considered a Heavy Snow Event and may require additional equipment, labour, clearing passes, snow relocation, stacking or extended service time. Additional Heavy Snow Event charges will be based on the approved Heavy Snow pricing schedule and the actual services required.</p>
    <table class="agreement-table">
      <thead><tr><th>Accumulation</th><th>Classification</th><th>Rate / Surcharge</th></tr></thead>
      <tbody>
        <tr><td>10.1 – 15 cm</td><td>Heavy Snow Tier 1</td><td>${V(d.heavy_snow_tier1)}</td></tr>
        <tr><td>15.1 – 20 cm</td><td>Heavy Snow Tier 2</td><td>${V(d.heavy_snow_tier2)}</td></tr>
        <tr><td>More than 20 cm</td><td>Severe Snow Tier</td><td>${V(d.heavy_snow_tier3)}</td></tr>
      </tbody>
    </table>
    <p>The Customer acknowledges that normal quoted pricing applies through ${V(d.heavy_snow_threshold)} per event, that snowfall over ${V(d.heavy_snow_threshold)} becomes a Heavy Snow Event, that Heavy Snow Events may result in additional charges depending on the approved Heavy Snow pricing schedule and the actual service requirements, and that additional equipment is separately billable where applicable.</p>
    <div class="agreement-field-block">${fieldPlaceholder('heavy_snow_acknowledgement')}</div>`)}

  ${sec(17, 'Service Priority', `
    <p>For widespread snowfall events the general priority structure is: first, Option 3 full seasonal automatic customers; next, Option 1 automatic per-visit customers; then Option 2 month-to-month / on-call customers. Actual route sequencing still depends on safety, geography, site access, storm conditions and operational requirements, and no exact arrival sequence is promised.</p>`)}

  ${sec(18, 'Scope of Work and Service Areas', `
    <p>The approved scope is the scope stated in section 4 together with the service-area selections below. Areas marked "Not included" are the Customer's responsibility.</p>
    <table class="agreement-table"><tbody>
      <tr><th>Front service area</th><td>${fieldPlaceholder('area_front')}</td></tr>
      <tr><th>Main entrance access</th><td>${fieldPlaceholder('area_entrance')}</td></tr>
      <tr><th>Back / rear service area</th><td>${fieldPlaceholder('area_back')}</td></tr>
    </tbody></table>`)}

  ${sec(19, 'No Guarantee of Bare Pavement', `
    <p>Praetoria does not guarantee that the property will remain continuously bare, completely dry, continuously free from snow or continuously free from ice after a service visit. Winter conditions may change because of new snowfall, refreezing, drifting, blowing snow, freezing rain, traffic, municipal plows, meltwater or other changing winter conditions.</p>`)}

  ${sec(20, 'Snow Placement', `
    <p>Snow is pushed and piled only in the approved on-site location recorded below. When on-site storage is full, off-site hauling and disposal may be required and is billed separately.</p>
    <p>Approved on-site snow placement location: ${fieldPlaceholder('snow_placement')}</p>
    <div class="agreement-field-block">${fieldPlaceholder('hauling_authorization')}</div>`)}

  ${sec(21, 'Site Access', `
    <p>The Customer must provide safe and unobstructed access to the service areas during service windows, including access outside business hours where required for effective clearing.</p>`)}

  ${sec(22, 'Customer Responsibilities', `
    <p>The Customer is responsible for identifying hazards, marking fragile or hidden items before the season begins, maintaining lighting where practical, and keeping a current site contact available.</p>
    <p>Primary site contact for service notifications: ${fieldPlaceholder('site_contact_name')}</p>`)}

  ${sec(23, 'Obstructions', `
    <p>Vehicles, trailers, garbage bins, pallets, planters, signage and similar obstructions prevent complete clearing. Praetoria services only the accessible portions of an obstructed area and is not required to return at no charge.</p>`)}

  ${sec(24, 'Changing Winter Conditions', `
    <p>Blowing snow, drifting, freeze-thaw cycles, compacted snow and municipal plow activity can alter site conditions after a completed visit. Corrective work required by conditions arising after a completed visit is a new visit.</p>`)}

  ${sec(25, 'Service Documentation', `
    <p>Each visit may record the date, dispatch time, arrival time, departure time, equipment used, recorded equipment hours, work performed, before photographs, after photographs and service notes. These records appear in the Praetoria Operations Hub where supported.</p>`)}

  ${sec(26, 'Photographs', `
    <p>Photographs are taken for service verification and dispute resolution.</p>
    <div class="agreement-field-block">${fieldPlaceholder('photo_consent')}</div>`)}

  ${sec(27, 'Praetoria Operations Hub Customer Portal', `
    <p>${V(d.customer_name)} receives access to its secure Praetoria Operations Hub customer portal. Authorized users may view the three service options, the selected option, any selected active months, the snowfall trigger, the quotation, the pricing schedule, the service agreement, contract status, signature status, invoices, payment history and status, scheduled and completed services, service history and available service photographs, and may download quotation and contract PDFs.</p>`)}

  ${sec(28, 'Quality Guarantee', `
    <p>If an approved service area is missed or incompletely cleared, the Customer must report it within 24 hours of the visit. Praetoria will return and correct confirmed deficiencies at no additional charge.</p>`)}

  ${sec(29, 'Payment Terms', `
    <table class="agreement-table"><tbody>
      <tr><th>Payment Method</th><td>${fieldPlaceholder('payment_method')}</td></tr>
      <tr><th>Payment Terms</th><td>${V(d.payment_terms)}</td></tr>
      <tr><th>Taxes</th><td>${V(d.pst_treatment)}</td></tr>
    </tbody></table>`)}

  ${sec(30, 'Past-Due Accounts', `
    <table class="agreement-table"><tbody>
      <tr><th>Late Fee</th><td>${V(d.late_fee)}</td></tr>
      <tr><th>Interest on Overdue Balances</th><td>${V(d.interest_rate)}</td></tr>
    </tbody></table>`)}

  ${sec(31, 'Service Suspension', `
    <p>${V(d.suspension_rule)} Suspended visits are not credited.</p>`)}

  ${sec(32, 'Cancellation', `
    <p>${V(d.cancellation_terms)}</p>`)}

  ${sec(33, 'Termination', `
    <p>Either party may terminate this Agreement for material breach that remains uncured 10 days after written notice. Amounts for service performed to the date of termination remain payable.</p>`)}

  ${sec(34, 'Damage Reporting', `
    <p>Damage alleged to have been caused during a service visit must be reported within 48 hours with photographs so it can be inspected. Praetoria is not responsible for pre-existing damage, unmarked hidden items, or conditions caused by weather, freeze-thaw cycles or municipal operations.</p>`)}

  ${sec(35, 'Insurance and WCB', `
    <p>${V(d.insurance_statement)}</p>`)}

  ${sec(36, 'Governing Law', `
    <p>This Agreement is governed by the laws of the Province of Saskatchewan and the applicable laws of Canada.</p>`)}

  ${sec(37, 'Notices', `
    <p>Notices may be delivered by email to the addresses recorded in this Agreement or through the Praetoria Operations Hub, and are effective when sent.</p>`)}

  ${sec(38, 'General Provisions', `
    <p>This Agreement, including the Service Option &amp; Pricing Schedule and the recorded Customer selections, is the entire agreement between the parties and supersedes prior discussions. If any provision is unenforceable, the remaining provisions continue in force. Amendments must be issued as a new document version.</p>`)}

  ${sec(39, 'Electronic Communications', `
    <p>The Customer consents to receiving notices, quotations, agreements, invoices and receipts electronically.</p>`)}

  ${sec(40, 'Electronic Signatures', `
    <p>An electronic signature applied through the Praetoria Operations Hub has the same effect as a handwritten signature. Each signed version is retained with its timestamp, version number and audit history.</p>`)}

  ${sec(41, 'Customer Selections, Acknowledgement and Signatures', `
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
