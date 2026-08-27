/**
 * PRAETORIA PROPERTY CARE & LANDSCAPING
 * COMBINED QUOTATION, PRICING SHEET & SERVICE AGREEMENT (standard template)
 *
 * Same structure as the Snow & Ice combined standard:
 *   1. Customer / property quotation page
 *   2. Detailed scope of work
 *   3. Separate Pricing Schedule sheet (own page in the PDF)
 *   4. Service agreement / terms
 *   5. Customer selections (optional line-item acceptance)
 *   6. Fast guided electronic signature
 *   7. Customer portal linkage
 *
 * All prices, quantities and product dimensions are merge data and stay
 * editable per customer. Unapproved values render as TBD.
 */

import { AgreementField, fieldPlaceholder } from '@/lib/agreementFields';
import { TBD, isTbd } from '@/lib/combinedDocument';

export const LANDSCAPING_COMBINED_TITLE =
  'Landscaping Combined Quotation, Pricing Schedule & Service Agreement';

export const LINE_ITEM_1_LABEL = 'Line Item 1 — Lawn Cutting, Property Cleanup & Weed Control';
export const LINE_ITEM_2_LABEL = 'Line Item 2 — Side-Yard / Backyard Paver Walkway Installation';

export const LANDSCAPING_COMBINED_FIELD_SCHEMA: AgreementField[] = [
  {
    key: 'accepted_line_items',
    label: 'Select the Work You Are Accepting',
    type: 'multiselect',
    role: 'customer',
    required: true,
    options: [LINE_ITEM_1_LABEL, LINE_ITEM_2_LABEL],
    helpText:
      'You may accept either line item on its own, or both. Only the line items selected here are approved for scheduling and billing.',
  },
  {
    key: 'paver_size_acknowledgement',
    label: 'Paver / Slab Size Confirmation',
    type: 'checkbox',
    role: 'customer',
    required: true,
    visibleWhen: { key: 'accepted_line_items', startsWith: '' },
    checkboxText:
      'I understand the paving slabs are described as approximately 600 mm × 600 mm (approximately 24" × 24" / 2 ft × 2 ft) and that the final paver/slab product and exact dimensions are confirmed with Praetoria before installation.',
  },
  {
    key: 'site_access',
    label: 'Site Access Arrangement',
    type: 'select',
    role: 'customer',
    required: true,
    options: [
      'Open access — crew may access the work areas without prior notice',
      'Call or text before arrival',
      'Gate / lock code will be provided to Praetoria',
      'Customer will be on site to provide access',
    ],
  },
  {
    key: 'hidden_conditions_disclosure',
    label: 'Known Underground or Concealed Property Features',
    type: 'text',
    role: 'customer',
    required: true,
    placeholder: 'e.g. sprinkler lines along the side of the house — or "None known"',
    helpText:
      'List any known buried utilities, irrigation lines, wiring, septic components, drainage or concealed features in or near the work area. Enter "None known" if there are none.',
  },
  {
    key: 'weed_control_authorization',
    label: 'Weed-Control Product Application',
    type: 'select',
    role: 'customer',
    required: true,
    options: [
      'Authorized — apply weed-control treatment to the approved areas',
      'Not authorized — cutting and cleanup only',
    ],
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
    key: 'payment_method',
    label: 'Selected Payment Method',
    type: 'select',
    role: 'customer',
    required: true,
    options: ['Credit card on file', 'Pre-authorized e-transfer', 'E-transfer on invoice', 'Cheque'],
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
    key: 'pricing_initials',
    label: 'Initials — Accepted Line Items, Pricing and Taxes',
    type: 'initials',
    role: 'customer',
    required: true,
    placeholder: 'e.g. SP',
  },
  {
    key: 'customer_rep_name',
    label: 'Full Legal Name of Signer',
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
      'I confirm that I have reviewed and selected the work I am accepting, the applicable pricing, the scope of work, the exclusions and the Service Agreement, and I authorize Praetoria Property Care & Landscaping to perform the accepted work.',
  },
  { key: 'customer_signature', label: 'Customer Signature', type: 'signature', role: 'customer', required: true },
  {
    key: 'praetoria_signature',
    label: 'Praetoria Authorized Signature',
    type: 'signature',
    role: 'praetoria',
    required: true,
  },
];

/** Selections that must be answered outright — a signature never substitutes. */
export const LANDSCAPING_REQUIRED_SELECTION_KEYS = [
  'accepted_line_items',
  'site_access',
  'hidden_conditions_disclosure',
  'weed_control_authorization',
  'photo_consent',
  'payment_method',
  'site_contact_name',
];

export interface LandscapingMergeData {
  [key: string]: string | number | null | undefined;
}

const V = (v: unknown) => (isTbd(v) ? `<span class="tbd">${TBD}</span>` : String(v));

const sec = (n: number, title: string, body: string) => `
  <section class="agreement-section">
    <h2>${n}. ${title}</h2>
    ${body}
  </section>`;

/** Build the combined landscaping document body. */
export function buildLandscapingCombinedBody(d: LandscapingMergeData): string {
  return `
<div class="agreement-doc">

  <h1>${V(d.document_title)}</h1>
  <p class="doc-subtitle">Praetoria Property Care &amp; Landscaping — ${V(d.legal_company_name)}</p>

  <!-- ══════════ PAGE 1 — QUOTATION ══════════ -->
  ${sec(1, 'Quotation — Prepared For', `
    <table class="agreement-table"><tbody>
      <tr><th>Customer</th><td>${V(d.customer_name)}</td></tr>
      <tr><th>Telephone</th><td>${V(d.customer_phone)}</td></tr>
      <tr><th>Email</th><td>${V(d.customer_email)}</td></tr>
      <tr><th>Service Address</th><td>${V(d.service_address)}, ${V(d.service_city)}, ${V(d.service_province)} ${V(d.service_postal_code)}</td></tr>
      <tr><th>Customer Type</th><td>Residential</td></tr>
      <tr><th>Service Category</th><td>Property Care &amp; Landscaping</td></tr>
      <tr><th>Quotation Title</th><td>${V(d.quotation_title)}</td></tr>
    </tbody></table>`)}

  ${sec(2, 'Quotation Number, Agreement Number, Version and Status', `
    <table class="agreement-table"><tbody>
      <tr><th>Quotation Number</th><td>${V(d.quotation_number)}</td></tr>
      <tr><th>Agreement Number</th><td>${V(d.agreement_number)}</td></tr>
      <tr><th>Version</th><td>${V(d.document_version)}</td></tr>
      <tr><th>Status</th><td>${V(d.document_status_label)}</td></tr>
      <tr><th>Issued</th><td>${V(d.issued_date)}</td></tr>
    </tbody></table>
    <p>This is a single combined document. The quotation, pricing schedule and service agreement share one record, one set of prices and one set of terms. A signed version is never overwritten; a change of price or scope is issued as a new version for review and signature.</p>`)}

  ${sec(3, 'Detailed Scope of Work — Line Item 1: Lawn Cutting, Property Cleanup &amp; Weed Control', `
    <p><strong>Lawn / vegetation cutting.</strong> Cut and trim the grass and overgrown vegetation in the approved areas, including the front of the house, the right side of the house, the side access area and the rear / backyard area.</p>
    <p><strong>Weed cutting.</strong> Cut down and remove overgrown weeds in the approved service areas.</p>
    <p><strong>Weed treatment.</strong> After cutting and cleanup, apply appropriate weed-control treatment to the approved weed areas, primarily the side of the house and the rear / backyard area. Weed-control products are applied only where authorized and in accordance with applicable product-label requirements and Praetoria operating procedures.</p>
    <p><strong>Cleanup.</strong> After cutting and trimming: blow off affected surfaces; collect grass clippings; collect cut weeds; collect loose vegetation and debris generated by our work; and remove the collected cutting debris from the property. The objective is to leave the serviced areas neat and cleaned after the work is completed.</p>
    <p><strong>Line item price: ${V(d.line1_price)}</strong> plus applicable tax.</p>`)}

  ${sec(4, 'Detailed Scope of Work — Line Item 2: Side-Yard / Backyard Paver Walkway Installation', `
    <p><strong>General scope.</strong> Create a compacted paver pathway running from the front / side area of the house toward the rear / backyard. The pathway is intended to provide a cleaner, firmer walking surface along the side of the property leading toward the backyard.</p>
    <p><strong>Work includes</strong> the labour, equipment and materials required for the approved installation:</p>
    <ul>
      <li>Layout of the pathway</li>
      <li>Excavation / preparation as required</li>
      <li>Removal of loose or unsuitable material generated by our work</li>
      <li>Grading</li>
      <li>Creating an appropriate slope away from the house where reasonably required</li>
      <li>Base preparation</li>
      <li>Compaction</li>
      <li>Levelling</li>
      <li>Installation of approximately ${V(d.paver_quantity)} paving slabs / pavers</li>
      <li>Final alignment</li>
      <li>Final cleanup</li>
    </ul>
    <p><strong>Paver size — Admin confirmation required.</strong> The working description is approximately ${V(d.paver_size)}. The exact paver size is not locked into this quotation until the actual product being purchased is confirmed, and remains editable during Admin review.</p>
    <p><strong>Materials.</strong> The quoted price includes Praetoria supplying the required approved materials, including the paving stones / slabs and the normal installation materials required for the quoted scope.</p>
    <p>If site conditions reveal substantial unforeseen excavation, buried obstacles, drainage problems, utility conflicts or other conditions materially outside the visible and quoted scope, the additional work must be approved before it is performed.</p>
    <p><strong>Line item price: ${V(d.line2_price)}</strong> plus applicable tax.</p>`)}

  ${sec(5, 'Site Notes and Undetermined Details', `
    <p>The following are confirmed from site conditions and the final product selection, and are deliberately not stated in this quotation: exact pathway length; exact pathway width; excavation depth; base depth; exact slope percentage; the exact number of pavers beyond the approximate quantity quoted; drainage conditions; and underground utilities.</p>`)}

  <!-- ══════════ SEPARATE PAGE — PRICING SCHEDULE ══════════ -->
  <div class="pricing-sheet-page">
  ${sec(6, 'Pricing Schedule', `
    <table class="agreement-table">
      <thead><tr><th>#</th><th>Service</th><th>Price</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>Lawn Cutting, Cleanup &amp; Weed Control</td><td>${V(d.line1_price)}</td></tr>
        <tr><td>2</td><td>Paver Walkway Installation — Materials &amp; Labour Included</td><td>${V(d.line2_price)}</td></tr>
        <tr><td></td><td><strong>Combined Quoted Work (both line items accepted)</strong></td><td><strong>${V(d.combined_total)} before applicable taxes</strong></td></tr>
      </tbody>
    </table>
    <p>The Customer is not required to accept both services. Each line item may be accepted on its own. Only the line items accepted below are approved for scheduling and billing. Taxes are applied using current Praetoria Operations Hub tax settings.</p>`)}

  ${sec(7, 'Select the Work You Are Accepting', `
    <p>Choose Line Item 1, Line Item 2, or both.</p>
    <div class="agreement-field-block">${fieldPlaceholder('accepted_line_items')}</div>
    <div class="agreement-field-block">${fieldPlaceholder('pricing_initials')}</div>`)}
  </div>

  <!-- ══════════ SERVICE AGREEMENT ══════════ -->
  ${sec(8, 'Parties', `
    <p>This Service Agreement is between ${V(d.legal_company_name)} ("Praetoria") and ${V(d.customer_name)} (the "Customer").</p>`)}

  ${sec(9, 'Service Property', `
    <p>${V(d.service_address)}, ${V(d.service_city)}, ${V(d.service_province)} ${V(d.service_postal_code)}.</p>`)}

  ${sec(10, 'Approved Scope', `
    <p>Only the work specifically accepted in this quotation is included. Work not listed in the accepted line items is not part of this Agreement.</p>`)}

  ${sec(11, 'Pricing', `
    <p>The accepted line-item pricing above applies, together with any additions later approved in writing by the Customer. Applicable taxes are added using current Praetoria Operations Hub tax settings.</p>`)}

  ${sec(12, 'Customer Authorization', `
    <p>The Customer must approve the selected work before it is scheduled. Scheduling begins after the accepted line items and this Agreement are signed.</p>`)}

  ${sec(13, 'Site Access', `
    <p>The Customer must provide reasonable and safe access to the work areas during the service window.</p>
    <div class="agreement-field-block">${fieldPlaceholder('site_access')}</div>
    <p>Primary site contact for service notifications: ${fieldPlaceholder('site_contact_name')}</p>`)}

  ${sec(14, 'Utilities and Hidden Conditions', `
    <p>The Customer must disclose known underground or concealed property features where applicable. Praetoria will not knowingly excavate in conflict with utility or safety requirements, and may pause work where a suspected conflict requires locates or further investigation.</p>
    <p>Disclosed underground / concealed features: ${fieldPlaceholder('hidden_conditions_disclosure')}</p>`)}

  ${sec(15, 'Paver Materials', `
    <p>The final paver / slab product must be confirmed before installation. The working description of approximately ${V(d.paver_size)} is subject to confirmation of the actual product purchased.</p>
    <div class="agreement-field-block">${fieldPlaceholder('paver_size_acknowledgement')}</div>`)}

  ${sec(16, 'Changes to Scope', `
    <p>Additional work outside this quotation requires the Customer's authorization before it is performed or billed.</p>`)}

  ${sec(17, 'Weather', `
    <p>Outdoor work may be delayed or rescheduled because of rain, saturated soil, unsafe conditions or other weather-related conditions.</p>`)}

  ${sec(18, 'Weed-Control Application', `
    <p>Any pesticide or herbicide application follows applicable product-label requirements and company procedures.</p>
    <div class="agreement-field-block">${fieldPlaceholder('weed_control_authorization')}</div>`)}

  ${sec(19, 'Cleanup', `
    <p>Debris generated by the quoted work is removed from the property as stated in the scope of work.</p>`)}

  ${sec(20, 'Customer Inspection', `
    <p>The Customer should inspect the completed work and promptly report any concerns so they can be reviewed and, where confirmed, corrected.</p>`)}

  ${sec(21, 'Payment', `
    <table class="agreement-table"><tbody>
      <tr><th>Payment Method</th><td>${fieldPlaceholder('payment_method')}</td></tr>
      <tr><th>Payment Terms</th><td>${V(d.payment_terms)}</td></tr>
      <tr><th>Taxes</th><td>${V(d.tax_treatment)}</td></tr>
      <tr><th>Late Fee</th><td>${V(d.late_fee)}</td></tr>
      <tr><th>Interest on Overdue Balances</th><td>${V(d.interest_rate)}</td></tr>
    </tbody></table>`)}

  ${sec(22, 'Damage and Existing Conditions', `
    <p>Existing site conditions are documented with photographs where appropriate before work begins. Praetoria is not responsible for pre-existing damage or for unmarked hidden or concealed items.</p>`)}

  ${sec(23, 'Photographs', `
    <p>Operational before and after photographs are taken for service verification and for the Customer's records.</p>
    <div class="agreement-field-block">${fieldPlaceholder('photo_consent')}</div>`)}

  ${sec(24, 'Praetoria Operations Hub Customer Portal', `
    <p>${V(d.customer_name)} receives access to a secure Praetoria Operations Hub customer portal. Authorized users may view the quotation, accepted line items, the signed agreement, invoices and payment status, scheduled and completed visits, work status, service history, before and after photographs and service records, and may download PDFs.</p>`)}

  ${sec(25, 'Cancellation and Rescheduling', `
    <p>${V(d.cancellation_terms)}</p>`)}

  ${sec(26, 'Insurance and WCB', `
    <p>${V(d.insurance_statement)}</p>`)}

  ${sec(27, 'Governing Terms and Law', `
    <p>The current Praetoria master service-agreement language applies where applicable. This Agreement is governed by the laws of the Province of Saskatchewan and the applicable laws of Canada.</p>`)}

  ${sec(28, 'Electronic Communications and Signatures', `
    <p>The Customer consents to receiving notices, quotations, agreements, invoices and receipts electronically. An electronic signature applied through the Praetoria Operations Hub has the same effect as a handwritten signature. Each signed version is retained with its timestamp, version number and audit history.</p>`)}

  ${sec(29, 'Customer Selections, Acknowledgement and Signatures', `
    <p>The selections recorded in this document form part of this Agreement. A signature does not replace a required selection; a blank selection blocks acceptance.</p>
    <div class="agreement-field-block">${fieldPlaceholder('customer_acknowledgement')}</div>
    <div class="signature-block">
      <p><strong>CUSTOMER</strong></p>
      <p>Full legal name: ${fieldPlaceholder('customer_rep_name')}</p>
      <p>Signature: ${fieldPlaceholder('customer_signature')}</p>
    </div>
    <div class="signature-block">
      <p><strong>PRAETORIA — AUTHORIZED REPRESENTATIVE</strong></p>
      <p>${V(d.praetoria_authorized_representative)}</p>
      <p>Signature: ${fieldPlaceholder('praetoria_signature')}</p>
    </div>`)}

</div>`;
}

/** Default values for a new landscaping combined document. Rates stay editable. */
export const LANDSCAPING_COMBINED_DEFAULTS = {
  legal_company_name: 'Praetoria Group',
  praetoria_authorized_representative: 'Ryan Steven Persaud',
  paver_size: '600 mm × 600 mm (approximately 24" × 24" / 2 ft × 2 ft) — subject to Admin product confirmation',
  paver_quantity: '20',
  payment_terms: 'Net 15 days from the invoice date.',
  tax_treatment: 'Applicable taxes are calculated using current Praetoria Operations Hub tax settings.',
  late_fee: '$25.00 per overdue invoice.',
  interest_rate: '2% per month (26.82% per annum) on overdue balances.',
  cancellation_terms:
    'Either party may cancel or reschedule using the current approved Praetoria terms. Work performed to the cancellation date remains payable.',
  insurance_statement:
    'Praetoria maintains commercial general liability insurance and Saskatchewan Workers’ Compensation Board coverage in accordance with current verified company settings. Certificates are available on request.',
};
