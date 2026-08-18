/**
 * PRAETORIA — RESIDENTIAL SNOW REMOVAL
 * COMBINED QUOTATION & SERVICE AGREEMENT (master template)
 *
 * One document record serves as both the quotation and the service agreement so
 * price and terms can never diverge between the two portal views.
 *
 * Values Ryan has not approved render as "TBD" and block final publication.
 */

import { AgreementField, fieldPlaceholder } from '@/lib/agreementFields';
import { TBD, isTbd } from '@/lib/combinedDocument';

export const RESIDENTIAL_SNOW_FIELD_SCHEMA: AgreementField[] = [
  {
    key: 'snowfall_trigger',
    label: 'Snowfall Trigger',
    type: 'select',
    role: 'customer',
    required: true,
    options: [
      'Every measurable snowfall',
      '1 cm',
      '5 cm',
      '7 cm',
      '10 cm',
      'Other written amount (state below)',
    ],
    helpText: 'Service is dispatched once accumulation reaches the amount you select.',
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
    key: 'visit_plan',
    label: 'Service Visit Plan',
    type: 'select',
    role: 'customer',
    required: true,
    options: [
      'Three visits per week — up to 12 visits per 28-day service cycle',
      'Four visits per week — up to 16 visits per 28-day service cycle',
    ],
    helpText: 'No plan is pre-selected. You must choose one.',
  },
  {
    key: 'area_driveway',
    label: 'Driveway',
    type: 'select',
    role: 'customer',
    required: true,
    options: ['Included in service', 'Not included'],
  },
  {
    key: 'area_walkways',
    label: 'Walkways',
    type: 'select',
    role: 'customer',
    required: true,
    options: ['Included in service', 'Not included'],
  },
  {
    key: 'area_steps',
    label: 'Steps / Entrance',
    type: 'select',
    role: 'customer',
    required: true,
    options: ['Included in service', 'Not included'],
  },
  {
    key: 'area_sidewalk',
    label: 'City Sidewalk Fronting the Property',
    type: 'select',
    role: 'customer',
    required: true,
    options: ['Included in service', 'Not included'],
  },
  {
    key: 'snow_storage_location',
    label: 'Approved On-Site Snow-Storage Location',
    type: 'text',
    role: 'customer',
    required: true,
    placeholder: 'e.g. North-west corner of front lawn',
  },
  {
    key: 'deicing_authorization',
    label: 'De-Icing / Ice Control',
    type: 'select',
    role: 'customer',
    required: true,
    options: ['Authorized (billed as applied)', 'Declined'],
  },
  {
    key: 'hauling_authorization',
    label: 'Off-Site Snow Hauling Requires Written Authorization',
    type: 'select',
    role: 'customer',
    required: true,
    options: ['Yes — obtain my authorization before hauling', 'No — hauling is not authorized'],
  },
  {
    key: 'windrow_returns',
    label: 'City Plow Windrow Return Visits',
    type: 'select',
    role: 'customer',
    required: true,
    options: ['Included within my selected visit allowance', 'Billed as an additional visit'],
  },
  {
    key: 'photo_consent',
    label: 'Photo-Documentation Consent',
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
    key: 'pricing_initials',
    label: 'Initials — Pricing, Taxes & Additional Charges',
    type: 'initials',
    role: 'customer',
    required: true,
    placeholder: 'e.g. TL',
  },
  {
    key: 'out_of_town_initials',
    label: 'Initials — Out-of-Town Travel & Response Target',
    type: 'initials',
    role: 'customer',
    required: true,
    placeholder: 'e.g. TL',
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
      'I have reviewed this Combined Quotation & Service Agreement, including the exact price and taxes, billing frequency, service period, snowfall trigger, included service areas, visit limit, response target, additional charges, activation requirements and cancellation terms, and I agree to be bound by it.',
  },
  {
    key: 'customer_signature',
    label: 'Customer Signature',
    type: 'signature',
    role: 'customer',
    required: true,
  },
  {
    key: 'praetoria_signature',
    label: 'Praetoria Authorized Signature',
    type: 'signature',
    role: 'praetoria',
    required: true,
  },
];

/** Selections that must be answered outright — a signature can never substitute. */
export const REQUIRED_SELECTION_KEYS = [
  'snowfall_trigger',
  'visit_plan',
  'area_driveway',
  'area_walkways',
  'area_steps',
  'area_sidewalk',
  'snow_storage_location',
  'deicing_authorization',
  'hauling_authorization',
  'windrow_returns',
  'photo_consent',
  'payment_method',
];

export interface ResidentialSnowMergeData {
  [key: string]: string | number | null | undefined;
}

const V = (v: unknown) => (isTbd(v) ? `<span class="tbd">${TBD}</span>` : String(v));

const sec = (n: number, title: string, body: string) => `
  <section class="agreement-section">
    <h2>${n}. ${title}</h2>
    ${body}
  </section>`;

/**
 * Build the document body. `provisional` renders estimate ranges instead of a
 * final selling price and marks unresolved amounts as TBD.
 */
export function buildResidentialSnowBody(
  d: ResidentialSnowMergeData,
  opts: { provisional?: boolean } = {},
): string {
  const provisional = Boolean(opts.provisional);

  const priceRow = provisional
    ? `<tr><th>Monthly / 28-Day Service Price</th><td><em>Estimated range: ${V(d.estimate_range)} per month before applicable tax — estimate only, not a final price.</em></td></tr>`
    : `<tr><th>Monthly / 28-Day Service Price</th><td>${V(d.monthly_price)}</td></tr>`;

  return `
<div class="agreement-doc">
  ${provisional ? `<p class="provisional-banner"><strong>PROVISIONAL ESTIMATE ONLY — NOT A CONFIRMED PRICE OR SERVICE COMMITMENT</strong></p>` : ''}

  <h1>Residential Snow Removal Combined Quotation &amp; Service Agreement</h1>
  <p class="doc-subtitle">${V(d.legal_company_name)} — Season ${V(d.season_label)}</p>

  ${sec(1, 'Customer and Property Information', `
    <table class="agreement-table"><tbody>
      <tr><th>Customer</th><td>${V(d.customer_name)}</td></tr>
      <tr><th>Email</th><td>${V(d.customer_email)}</td></tr>
      <tr><th>Telephone</th><td>${V(d.customer_phone)}</td></tr>
      <tr><th>Service Property</th><td>${V(d.service_address)}</td></tr>
      <tr><th>Municipality</th><td>${V(d.service_city)}, ${V(d.service_province)}</td></tr>
    </tbody></table>`)}

  ${sec(2, 'Quotation Number and Agreement Number', `
    <table class="agreement-table"><tbody>
      <tr><th>Quotation Number</th><td>${V(d.quotation_number)}</td></tr>
      <tr><th>Agreement Number</th><td>${V(d.agreement_number)}</td></tr>
    </tbody></table>
    <p>This is a single combined document. The quotation and the service agreement share one document record and one set of prices and terms.</p>`)}

  ${sec(3, 'Document Version and Status', `
    <table class="agreement-table"><tbody>
      <tr><th>Version</th><td>${V(d.document_version)}</td></tr>
      <tr><th>Status</th><td>${V(d.document_status_label)}</td></tr>
      <tr><th>Issued</th><td>${V(d.issued_date)}</td></tr>
    </tbody></table>
    <p>A signed version is never overwritten. If the price, route or scope changes, Praetoria issues a new version that the Customer must review and sign. A signature on a provisional estimate is never treated as acceptance of a later price.</p>`)}

  ${sec(4, 'Service Season and Exact Start/End Dates', `
    <table class="agreement-table"><tbody>
      <tr><th>Season</th><td>${V(d.season_label)}</td></tr>
      <tr><th>Start Date</th><td>${V(d.season_start_date)}</td></tr>
      <tr><th>End Date</th><td>${V(d.season_end_date)}</td></tr>
    </tbody></table>
    <p>The season runs from the start date through the end date shown above (December is a full month; April ends on April 30).</p>`)}

  ${sec(5, 'Selected Residential Package', `
    <p>Package: <strong>${V(d.package_name)}</strong></p>
    <p>Selected visit plan: ${fieldPlaceholder('visit_plan')}</p>`)}

  ${sec(6, 'Approved Service Areas', `
    <p>Only the areas marked "Included in service" below are cleared. Areas marked "Not included" are the Customer's responsibility.</p>
    <table class="agreement-table"><tbody>
      <tr><th>Driveway</th><td>${fieldPlaceholder('area_driveway')}</td></tr>
      <tr><th>Walkways</th><td>${fieldPlaceholder('area_walkways')}</td></tr>
      <tr><th>Steps / Entrance</th><td>${fieldPlaceholder('area_steps')}</td></tr>
      <tr><th>City sidewalk fronting the property</th><td>${fieldPlaceholder('area_sidewalk')}</td></tr>
    </tbody></table>`)}

  ${sec(7, 'Snowfall Trigger', `
    <p>Service is dispatched once accumulation reaches the trigger the Customer selects:</p>
    <div class="agreement-field-block">${fieldPlaceholder('snowfall_trigger')}</div>
    <p>Other written amount (if selected above): ${fieldPlaceholder('snowfall_trigger_other')}</p>`)}

  ${sec(8, 'Visit Frequency and Included-Visit Limit', `
    <p>Three visits per week provides up to <strong>12 visits per 28-day service cycle</strong>. Four visits per week provides up to <strong>16 visits per 28-day service cycle</strong>.</p>
    <p>Visits beyond the included limit are additional visits, billed at the additional visit rate in section 10. There is no unlimited-visit entitlement.</p>`)}

  ${sec(9, 'Response Target', `
    <p>Response target: <strong>${V(d.response_target)}</strong></p>
    <p>The response target begins when the selected snowfall trigger is reached and snowfall has ended, and is subject to continuing snowfall, highway conditions, road closures, crew availability and safe travel. For out-of-town properties the response target remains TBD until the route is approved (see section 12).</p>`)}

  ${sec(10, 'Pricing and Taxes', `
    <table class="agreement-table"><tbody>
      ${priceRow}
      <tr><th>Number of Billing Periods</th><td>${V(d.billing_periods)}</td></tr>
      <tr><th>Seasonal Subtotal</th><td>${provisional ? `<em>Estimate — ${V(d.estimate_seasonal_range)}</em>` : V(d.seasonal_subtotal)}</td></tr>
      <tr><th>GST (5%)</th><td>${V(d.gst_amount)}</td></tr>
      <tr><th>PST Treatment</th><td>${V(d.pst_treatment)}</td></tr>
      <tr><th>Total Customer Price</th><td><strong>${provisional ? `<span class="tbd">${TBD} — pending final pricing approval</span>` : V(d.total_price)}</strong></td></tr>
      <tr><th>Billing Frequency</th><td>${V(d.billing_frequency)}</td></tr>
    </tbody></table>
    <div class="agreement-field-block"><strong>Customer initials confirming pricing and taxes:</strong> ${fieldPlaceholder('pricing_initials')}</div>`)}

  ${sec(11, 'Additional Labour, Visits and Workers', `
    <table class="agreement-table"><tbody>
      <tr><th>Additional Visit Rate</th><td>${V(d.additional_visit_rate)}</td></tr>
      <tr><th>Additional Labour Rate</th><td>${V(d.worker_hour_rate)} per worker-hour (minimum $50.00 per worker-hour)</td></tr>
      <tr><th>Minimum Charge</th><td>One hour minimum per worker dispatched</td></tr>
    </tbody></table>
    <p>Every additional worker is billed separately. Additional time and additional visits are shown to the Customer before acceptance and appear as separate line items on the invoice.</p>`)}

  ${sec(12, 'Out-of-Town Travel and Mobilization', `
    <p>The property is located outside Regina (${V(d.service_city)}). Travel and mobilization are <strong>not</strong> included in the per-worker-hour rate and are billed separately.</p>
    <table class="agreement-table"><tbody>
      <tr><th>Travel / Mobilization Charge</th><td>${V(d.travel_mobilization)}</td></tr>
      <tr><th>Out-of-Town Response Target</th><td>${V(d.response_target)}</td></tr>
    </tbody></table>
    <p>Regina response times do not apply to out-of-town properties. Service availability depends on Praetoria establishing and approving an out-of-town route that includes this property.</p>
    <div class="agreement-field-block"><strong>Customer initials confirming out-of-town travel and response terms:</strong> ${fieldPlaceholder('out_of_town_initials')}</div>`)}

  ${sec(13, 'De-Icer and Ice-Control Authorization', `
    <p>De-icing is an optional add-on service. It is not included in the package price and is billed as applied when authorized.</p>
    <table class="agreement-table"><tbody>
      <tr><th>De-Icer Application Charge</th><td>${V(d.deicer_application_charge)}</td></tr>
      <tr><th>De-Icer Material Charge</th><td>${V(d.deicer_material_charge)}</td></tr>
    </tbody></table>
    <div class="agreement-field-block">${fieldPlaceholder('deicing_authorization')}</div>`)}

  ${sec(14, 'Heavy-Snow and Continuous-Storm Terms', `
    <p>During a continuous storm, Praetoria clears when it is operationally safe and effective to do so, and may return once snowfall ends. Accumulations above ${V(d.heavy_snow_threshold)} in a single event, drifting and compacted snow require additional equipment or labour time.</p>
    <table class="agreement-table"><tbody>
      <tr><th>Heavy-Snow Charge</th><td>${V(d.heavy_snow_charge)}</td></tr>
      <tr><th>Emergency Call-Out Charge</th><td>${V(d.emergency_callout_charge)}</td></tr>
    </tbody></table>`)}

  ${sec(15, 'City Plow Berms and Windrows', `
    <p>Municipal plows deposit berms and windrows across driveway approaches after Praetoria has serviced the property. Removal of a windrow left after a completed service visit is handled as follows:</p>
    <div class="agreement-field-block">${fieldPlaceholder('windrow_returns')}</div>`)}

  ${sec(16, 'Snow Placement and Off-Site Hauling', `
    <p>Snow is placed only in the approved on-site storage location recorded below. When on-site storage is full, off-site hauling and disposal may be required and is billed separately at ${V(d.hauling_charge)}.</p>
    <p>Approved on-site snow-storage location: ${fieldPlaceholder('snow_storage_location')}</p>
    <div class="agreement-field-block">${fieldPlaceholder('hauling_authorization')}</div>`)}

  ${sec(17, 'Customer Access and Obstruction Responsibilities', `
    <p>The Customer must keep the service areas clear of vehicles, trailers, garbage bins, hoses, decorations, planters and other obstructions. Praetoria services only the accessible portions of an obstructed area and is not required to return at no charge. Fragile or hidden items must be marked before the season begins.</p>`)}

  ${sec(18, 'Service Documentation and Photographs', `
    <p>Visits are logged in the Praetoria Operations Hub with arrival and completion times, crew, equipment and service notes, and are visible in the Customer Portal.</p>
    <div class="agreement-field-block">${fieldPlaceholder('photo_consent')}</div>`)}

  ${sec(19, 'Payment and Non-Payment Suspension', `
    <table class="agreement-table"><tbody>
      <tr><th>Payment Method</th><td>${fieldPlaceholder('payment_method')}</td></tr>
      <tr><th>Payment Terms</th><td>${V(d.payment_terms)}</td></tr>
      <tr><th>Late Fee</th><td>${V(d.late_fee)}</td></tr>
      <tr><th>Interest on Overdue Balances</th><td>${V(d.interest_rate)}</td></tr>
      <tr><th>Suspension Rule</th><td>${V(d.suspension_rule)}</td></tr>
    </tbody></table>
    <p>Only the single value shown for each item above applies. Service may be suspended in accordance with the suspension rule until the account is brought current; suspended visits are not credited.</p>`)}

  ${sec(20, 'Cancellation and Renewal', `
    <p>Cancellation terms: ${V(d.cancellation_terms)}</p>
    <p>Renewal: ${V(d.renewal_terms)}</p>`)}

  ${sec(21, 'Quality Guarantee', `
    <p>If a serviced area is missed or incompletely cleared, the Customer must report it within 24 hours of the visit. Praetoria will return and correct the work at no additional charge where the deficiency is confirmed.</p>`)}

  ${sec(22, 'Liability and Damage Reporting', `
    <p>Damage to the property alleged to have been caused during a service visit must be reported within 48 hours, with photographs, so it can be inspected. Praetoria is not responsible for pre-existing damage, unmarked hidden items, seasonal turf edge damage, or conditions caused by weather, freeze-thaw cycles or municipal operations. Praetoria maintains commercial liability insurance and workers' compensation coverage; current certificates are available on request.</p>`)}

  ${sec(23, 'Electronic Communications and Signatures', `
    <p>The Customer consents to receiving notices, quotations, agreements, invoices and receipts electronically, and agrees that an electronic signature applied through the Praetoria Operations Hub has the same effect as a handwritten signature. Each signed version is retained with its timestamp, version number and audit history.</p>`)}

  ${sec(24, 'Activation Requirements', `
    <p>Service becomes an Active Service Agreement only once <strong>all</strong> of the following are complete:</p>
    <ol class="req-list">
      <li>Final combined quotation and agreement signed</li>
      <li>Final pricing approved by Ryan</li>
      <li>Required initial payment completed</li>
      <li>Property inspection completed</li>
      <li>Existing-condition photographs completed</li>
      <li>Snow-storage location recorded</li>
      <li>Snowfall trigger selected</li>
      <li>Service map / service areas approved</li>
      <li>Customer added to an established and approved route</li>
    </ol>
    <p>Until every requirement is complete the document displays <strong>ACTIVATION PENDING — SERVICE NOT YET SCHEDULED</strong>, and no dispatch, recurring billing or service commitment exists.</p>`)}

  ${sec(25, 'Customer Selections, Initials and Final Signatures', `
    <p>The selections recorded in sections 5 through 19 form part of this Agreement. Initials and signatures do not replace a required selection; a blank selection blocks acceptance.</p>
    <div class="agreement-field-block">${fieldPlaceholder('customer_acknowledgement')}</div>
    <div class="signature-block">
      <p><strong>CUSTOMER</strong></p>
      <p>Name: ${fieldPlaceholder('customer_rep_name')}</p>
      <p>Signature:</p>
      ${fieldPlaceholder('customer_signature')}
    </div>
    <div class="signature-block">
      <p><strong>SERVICE PROVIDER</strong></p>
      <p>${V(d.legal_company_name)}</p>
      <p>Authorized Representative: ${V(d.praetoria_authorized_representative)}</p>
      <p>Signature:</p>
      ${fieldPlaceholder('praetoria_signature')}
    </div>`)}
</div>`.trim();
}
