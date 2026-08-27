/**
 * PRAETORIA GROUP — BASEMENT DEMOLITION & INTERIOR STRIP-OUT (PHASE 1)
 * COMBINED QUOTATION, PRICING SUMMARY & SERVICE AGREEMENT (standard template)
 *
 *   1. Customer / property quotation page
 *   2. Phase 1 scope of work + hold point + Phase 2 exclusions
 *   3. Pricing summary (own page in the PDF)
 *   4. Service agreement / terms
 *   5. Customer selections & acknowledgements
 *   6. Fast guided electronic signature
 *   7. Customer portal linkage
 *
 * All prices and quantities are merge data and stay editable per customer.
 * Unapproved values render as TBD.
 */

import { AgreementField, fieldPlaceholder } from '@/lib/agreementFields';
import { TBD, isTbd } from '@/lib/combinedDocument';

export const DEMOLITION_PHASE1_COMBINED_TITLE =
  'Basement Demolition & Interior Strip-Out — Phase 1 — Quotation, Pricing Summary & Service Agreement';

export const DEMOLITION_PHASE1_FIELD_SCHEMA: AgreementField[] = [
  {
    key: 'phase1_scope_acknowledgement',
    label: 'Phase 1 Scope Acknowledgement',
    type: 'checkbox',
    role: 'customer',
    required: true,
    checkboxText:
      'I confirm the approved scope is the Phase 1 interior basement demolition and strip-out of approved contents and damaged finish materials only, and that Phase 1 pauses at the inspection hold point once the wall and floor assemblies are exposed.',
  },
  {
    key: 'phase2_exclusion_acknowledgement',
    label: 'Phase 2 Exclusion Acknowledgement',
    type: 'checkbox',
    role: 'customer',
    required: true,
    checkboxText:
      'I understand that this quotation covers Phase 1 basement demolition and strip-out only. Framing, insulation, electrical, plumbing, structural repairs, reconstruction, certified mold / asbestos / hazardous-material remediation, additional bins, additional labour and other concealed work are not included unless separately quoted and authorized. I understand that Phase 1 will pause at the appropriate inspection point so the exposed basement conditions can be reviewed before Phase 2 is authorized.',
  },
  {
    key: 'bin_allowance_acknowledgement',
    label: 'Bin Allowance Acknowledgement',
    type: 'checkbox',
    role: 'customer',
    required: true,
    checkboxText:
      'I understand the disposal-bin amount is an allowance. If actual supplier charges exceed the allowance because of delivery, pickup, disposal / tipping fees, weight, overage, extra rental days, bin exchanges or additional bins, the documented difference is added to the final invoice or approved as additional work.',
  },
  {
    key: 'hazard_condition_acknowledgement',
    label: 'Hazard / Hidden-Condition Acknowledgement',
    type: 'checkbox',
    role: 'customer',
    required: true,
    checkboxText:
      'I understand that if suspected asbestos, hazardous materials, significant biological contamination or other regulated material is encountered, Praetoria may stop work in the affected area until the condition is appropriately assessed and an additional scope is approved, and that this quotation is not a certified mold, asbestos, hazardous-material or environmental remediation contract.',
  },
  {
    key: 'contents_authorization',
    label: 'Authorization to Remove and Dispose of Basement Contents',
    type: 'select',
    role: 'customer',
    required: true,
    options: [
      'Authorized — all contents in the approved demolition areas may be removed and discarded',
      'Authorized with exceptions — items I have clearly tagged or set aside must remain',
    ],
  },
  {
    key: 'approved_demolition_areas',
    label: 'Approved Demolition Areas',
    type: 'text',
    role: 'customer',
    required: true,
    placeholder: 'e.g. entire basement level, excluding utility room',
    helpText: 'List the basement areas Praetoria is approved to strip out under Phase 1.',
  },
  {
    key: 'site_access',
    label: 'Site Access Arrangement',
    type: 'select',
    role: 'customer',
    required: true,
    options: [
      'Open access — crew may access the approved areas without prior notice',
      'Call or text before arrival',
      'Lock / door code will be provided to Praetoria',
      'Customer will be on site to provide access',
    ],
  },
  {
    key: 'photo_consent',
    label: 'Before / During / After Photo-Documentation Consent',
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
    label: 'Initials — Phase 1 Pricing, Labour Allowance and Bin Allowance',
    type: 'initials',
    role: 'customer',
    required: true,
    placeholder: 'e.g. TS',
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
    label: 'Customer Acceptance',
    type: 'checkbox',
    role: 'customer',
    required: true,
    checkboxText:
      'I have reviewed the quotation, the Phase 1 scope of work, the exclusions, the pricing and the Service Agreement, and I authorize Praetoria Group to perform the approved Phase 1 basement demolition and strip-out work.',
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
export const DEMOLITION_PHASE1_REQUIRED_SELECTION_KEYS = [
  'phase1_scope_acknowledgement',
  'phase2_exclusion_acknowledgement',
  'bin_allowance_acknowledgement',
  'hazard_condition_acknowledgement',
  'contents_authorization',
  'approved_demolition_areas',
  'site_access',
  'photo_consent',
  'payment_method',
  'site_contact_name',
];

export interface DemolitionPhase1MergeData {
  [key: string]: string | number | null | undefined;
}

const V = (v: unknown) => (isTbd(v) ? `<span class="tbd">${TBD}</span>` : String(v));

const sec = (n: number, title: string, body: string) => `
  <section class="agreement-section">
    <h2>${n}. ${title}</h2>
    ${body}
  </section>`;

/** Build the combined Phase 1 demolition document body. */
export function buildDemolitionPhase1Body(d: DemolitionPhase1MergeData): string {
  return `
<div class="agreement-doc">

  <h1>${V(d.document_title)}</h1>
  <p class="doc-subtitle">Praetoria Group — Demolition / Property Renovation</p>

  <!-- ══════════ PAGE 1 — QUOTATION ══════════ -->
  ${sec(1, 'Quotation — Prepared For', `
    <table class="agreement-table"><tbody>
      <tr><th>Customer</th><td>${V(d.customer_name)}</td></tr>
      <tr><th>Telephone</th><td>${V(d.customer_phone)}</td></tr>
      <tr><th>Email</th><td>${V(d.customer_email)}</td></tr>
      <tr><th>Service Property</th><td>${V(d.service_address)}, ${V(d.service_city)}, ${V(d.service_province)} ${V(d.service_postal_code)}</td></tr>
      <tr><th>Customer Type</th><td>Residential</td></tr>
      <tr><th>Service Category</th><td>Demolition / Property Renovation</td></tr>
      <tr><th>Quotation Title</th><td>${V(d.quotation_title)}</td></tr>
    </tbody></table>
    <p class="highlight-block"><strong>QUOTED PHASE 1 TOTAL: ${V(d.phase1_subtotal)} BEFORE APPLICABLE TAX.</strong> This quotation covers Phase 1 basement demolition and interior strip-out only. Phase 2 work is not included and is not priced in this document.</p>`)}

  ${sec(2, 'Quotation Number, Agreement Number, Version and Status', `
    <table class="agreement-table"><tbody>
      <tr><th>Quotation Number</th><td>${V(d.quotation_number)}</td></tr>
      <tr><th>Agreement Number</th><td>${V(d.agreement_number)}</td></tr>
      <tr><th>Version</th><td>${V(d.document_version)}</td></tr>
      <tr><th>Status</th><td>${V(d.document_status_label)}</td></tr>
      <tr><th>Issued</th><td>${V(d.issued_date)}</td></tr>
    </tbody></table>
    <p>This is a single combined document. The quotation, pricing summary and service agreement share one record, one set of prices and one set of terms. A signed version is never overwritten; a change of price or scope is issued as a new version for review and signature.</p>`)}

  ${sec(3, 'Phase 1 Only — What This Quotation Covers', `
    <p>This quotation covers the <strong>initial basement demolition and strip-out</strong>. It does not include reconstruction, or the removal or replacement of concealed framing and insulation, unless separately approved later.</p>
    <p>After Phase 1 is completed and the wall cavities are exposed, the homeowner is given an opportunity to inspect the basement. Praetoria then determines what additional concealed damage is visible. If framing, insulation, plumbing, electrical or other concealed components require further work, that becomes a <strong>Phase 2 separate quotation / change order</strong>.</p>`)}

  ${sec(4, 'Phase 1 Scope of Work — Approved Basement Contents', `
    <p>Praetoria will provide an interior basement demolition and strip-out of the approved damaged materials.</p>
    <p>Remove and dispose of approved damaged or unwanted basement contents, including where applicable:</p>
    <ul>
      <li>Furniture</li>
      <li>Loose household contents</li>
      <li>Damaged items</li>
      <li>Pictures</li>
      <li>Shelving</li>
      <li>Cabinets</li>
      <li>Other authorized contents</li>
    </ul>
    <div class="agreement-field-block">${fieldPlaceholder('approved_demolition_areas')}</div>
    <div class="agreement-field-block">${fieldPlaceholder('contents_authorization')}</div>`)}

  ${sec(5, 'Phase 1 Scope of Work — Damaged Finish Materials', `
    <p>Remove approved damaged materials including:</p>
    <ul>
      <li>Drywall</li>
      <li>Wall finishes</li>
      <li>Baseboards</li>
      <li>Trim</li>
      <li>Interior doors</li>
      <li>Cabinets</li>
      <li>Carpet</li>
      <li>Carpet underlay</li>
      <li>Damaged flooring materials where included</li>
      <li>Other visibly damaged non-structural finishes</li>
      <li>Mold / mildew-affected finish materials that can lawfully and safely be handled within the approved demolition scope</li>
    </ul>
    <p>All demolition waste generated under the approved Phase 1 scope is loaded into the rented disposal bins.</p>`)}

  ${sec(6, 'Framing and Insulation Are Not Removed Without Authorization', `
    <p class="highlight-block"><strong>The objective of Phase 1 is to expose the wall and floor assemblies so the underlying condition can be properly inspected.</strong></p>
    <p>The crew does not automatically remove:</p>
    <ul>
      <li>Wall framing</li>
      <li>Structural framing</li>
      <li>Insulation</li>
      <li>Electrical wiring</li>
      <li>Plumbing</li>
      <li>Structural components</li>
    </ul>
    <p>unless required for immediate safe access and specifically approved. Once the drywall and finishes are removed, work pauses at the appropriate inspection point.</p>`)}

  ${sec(7, 'Owner Inspection — Phase 1 Hold Point', `
    <p>After the wall finishes and damaged surface materials are removed, Praetoria will:</p>
    <ul>
      <li>Photograph the exposed areas</li>
      <li>Record visible damage</li>
      <li>Allow the homeowner to review the exposed condition</li>
      <li>Identify damaged insulation and framing</li>
      <li>Identify any electrical or plumbing involvement</li>
      <li>Prepare a separate Phase 2 scope and quotation where required</li>
    </ul>
    <p><strong>Praetoria does not proceed into Phase 2 automatically.</strong></p>
    <div class="agreement-field-block">${fieldPlaceholder('phase1_scope_acknowledgement')}</div>`)}

  ${sec(8, 'Phase 2 — Not Included', `
    <p>Potential Phase 2 work may include:</p>
    <ul>
      <li>Removal of damaged insulation</li>
      <li>Replacement / removal of damaged framing</li>
      <li>Structural repairs</li>
      <li>Electrical disconnection / reconnection</li>
      <li>Plumbing work</li>
      <li>Additional demolition</li>
      <li>Additional bins</li>
      <li>Additional labour</li>
      <li>Additional PPE / containment</li>
      <li>Additional drying equipment</li>
      <li>Reconstruction</li>
    </ul>
    <p>These items are not included in the Phase 1 price. Electrician and plumber work is quoted separately when the walls are opened and the actual conditions can be seen.</p>
    <div class="agreement-field-block">${fieldPlaceholder('phase2_exclusion_acknowledgement')}</div>`)}

  ${sec(9, 'Phase 1 Labour', `
    <p>Phase 1 uses a full ${V(d.crew_size)}-person crew.</p>
    <table class="agreement-table"><tbody>
      <tr><th>Crew</th><td>${V(d.crew_size)} workers</td></tr>
      <tr><th>Hourly Rate</th><td>${V(d.labour_rate)} per worker per hour</td></tr>
      <tr><th>Hours per Day</th><td>Up to ${V(d.hours_per_day)} hours</td></tr>
      <tr><th>Days</th><td>Up to ${V(d.days)} days</td></tr>
      <tr><th>Total Crew Labour-Hours</th><td>${V(d.total_crew_hours)} crew labour-hours</td></tr>
      <tr><th>Demolition Labour — Four-Person Crew</th><td><strong>${V(d.labour_total)}</strong></td></tr>
    </tbody></table>
    <p>If the approved scope materially exceeds this allowance because of previously concealed or additional conditions, the additional work requires authorization.</p>`)}

  ${sec(10, 'Disposal Bins', `
    <p><strong>Construction/Demolition Bin Allowance: ${V(d.bin_count)} bins × ${V(d.bin_rate)} = ${V(d.bin_total)}</strong></p>
    <p>The ${V(d.bin_total)} amount is currently a bin-rental allowance. If actual supplier charges exceed the allowance because of delivery, pickup, disposal / tipping fees, weight, overage, extra rental days, bin exchanges or additional bins, the difference is documented and added to the final invoice, or approved as additional work, according to the final supplier terms.</p>
    <p>The ${V(d.bin_rate)} per bin figure is an internal allowance and is not represented as a confirmed third-party supplier price.</p>
    <div class="agreement-field-block">${fieldPlaceholder('bin_allowance_acknowledgement')}</div>`)}

  ${sec(11, 'PPE, Air Filtration & Drying Equipment', `
    <p><strong>PPE, Air Filtration &amp; Drying Equipment: ${V(d.ppe_equipment_total)}</strong></p>
    <p>This allowance covers approved demolition safety / containment consumables and the rental or use of air-filtration and drying equipment. The current plan includes approximately:</p>
    <ul>
      <li>${V(d.air_unit_count)} air-filtration / air-scrubbing units and/or air movers as appropriate</li>
      <li>PPE required for the approved demolition work</li>
      <li>Normal consumables associated with the approved Phase 1 demolition</li>
    </ul>
    <p>The equipment is intended to assist with airborne dust / particulate control, air circulation, drying following removal of wet carpet and finish materials, and improving working conditions during the approved demolition. <strong>This equipment does not constitute certified mold remediation.</strong></p>`)}

  <!-- ══════════ SEPARATE PAGE — PRICING SUMMARY ══════════ -->
  <div class="pricing-sheet-page">
  ${sec(12, 'Phase 1 Price Summary', `
    <table class="agreement-table">
      <thead><tr><th>Item</th><th>Price</th></tr></thead>
      <tbody>
        <tr><td>Four-Person Demolition Crew — ${V(d.days)} Days</td><td>${V(d.labour_total)}</td></tr>
        <tr><td>Two Construction/Demolition Bin Allowance</td><td>${V(d.bin_total)}</td></tr>
        <tr><td>PPE + Air Filtration / Drying Equipment</td><td>${V(d.ppe_equipment_total)}</td></tr>
        <tr><td><strong>PHASE 1 SUBTOTAL</strong></td><td><strong>${V(d.phase1_subtotal)}</strong></td></tr>
      </tbody>
    </table>
    <p>Applicable taxes are extra, according to current Praetoria billing settings.</p>
    <p class="highlight-block"><strong>QUOTED PHASE 1 TOTAL: ${V(d.phase1_subtotal)} BEFORE APPLICABLE TAX.</strong> No Phase 2 work is included in this subtotal.</p>
    <table class="agreement-table"><tbody>
      <tr><th>Labour</th><td>${V(d.crew_size)} workers × ${V(d.labour_rate)}/hour × ${V(d.hours_per_day)} hours/day × ${V(d.days)} days = ${V(d.labour_total)}</td></tr>
      <tr><th>Disposal Bins</th><td>${V(d.bin_count)} × ${V(d.bin_rate)} allowance = ${V(d.bin_total)}</td></tr>
      <tr><th>PPE / Air Filtration / Drying</th><td>${V(d.ppe_equipment_total)}</td></tr>
      <tr><th>Supplier Overages</th><td>Additional — documented actual overages added to the final invoice</td></tr>
      <tr><th>Framing, Insulation, Electrical, Plumbing, Reconstruction</th><td><strong>NOT INCLUDED — PHASE 2</strong></td></tr>
    </tbody></table>
    <div class="agreement-field-block">${fieldPlaceholder('pricing_initials')}</div>`)}
  </div>

  ${sec(13, 'Safety / Contamination Limitation', `
    <p>The basement has been reported / observed as wet, damaged and containing mold / mildew conditions. This quotation covers the agreed demolition / strip-out scope only. It is not automatically a certified mold remediation contract, asbestos abatement contract, hazardous-material abatement contract or environmental remediation contract.</p>
    <p>If suspected asbestos, hazardous materials, significant biological contamination or other regulated material is encountered, Praetoria may stop work in the affected area until the condition is appropriately assessed and an additional scope is approved. Crews are never required to proceed through an unsafe condition simply because demolition was quoted.</p>
    <div class="agreement-field-block">${fieldPlaceholder('hazard_condition_acknowledgement')}</div>`)}

  ${sec(14, 'Pre-Work Documentation', `
    <p>Before demolition begins, the crew documents the basement condition, visible water damage, visible mold / mildew, flooring condition, walls, doors, cabinets, contents, existing damage, and areas that are not part of the approved demolition. Before photographs are recorded in the Praetoria Operations Hub.</p>`)}

  ${sec(15, 'Demolition Cleanup', `
    <p>At completion of Phase 1, the crew loads approved debris into the disposal bins, removes loose demolition debris from the approved work areas, sweeps / rough-cleans the stripped areas, operates approved air-filtration / drying equipment as scheduled, photographs the exposed wall and floor assemblies, and documents areas requiring Phase 2 assessment.</p>
    <p><strong>This is a demolition rough-clean, not final post-renovation cleaning.</strong></p>`)}

  <!-- ══════════ SERVICE AGREEMENT ══════════ -->
  ${sec(16, 'Parties', `
    <p>This Basement Demolition Phase 1 Service Agreement is between ${V(d.legal_company_name)} ("Praetoria") and ${V(d.customer_name)} (the "Customer").</p>`)}

  ${sec(17, 'Service Property', `
    <p>${V(d.service_address)}, ${V(d.service_city)}, ${V(d.service_province)} ${V(d.service_postal_code)}.</p>`)}

  ${sec(18, 'Phase 1 Scope', `
    <p>Interior basement demolition and strip-out only, as described in this document.</p>`)}

  ${sec(19, 'Price', `
    <p>${V(d.phase1_subtotal)} before applicable taxes.</p>`)}

  ${sec(20, 'Labour Allowance', `
    <p>${V(d.crew_size)} workers, up to ${V(d.days)} days, up to ${V(d.hours_per_day)} hours per day (${V(d.total_crew_hours)} crew labour-hours).</p>`)}

  ${sec(21, 'Bin Allowance', `
    <p>${V(d.bin_count)} bins at the current ${V(d.bin_rate)} per bin allowance (${V(d.bin_total)}).</p>`)}

  ${sec(22, 'Supplier / Disposal Overages', `
    <p>Actual third-party supplier and disposal overages may be additional and are documented before being added to the final invoice or approved as additional work.</p>`)}

  ${sec(23, 'PPE / Air Equipment', `
    <p>${V(d.ppe_equipment_total)} allowance for approved PPE, containment consumables and air-filtration / drying equipment.</p>`)}

  ${sec(24, 'Owner Inspection Hold Point', `
    <p>An owner inspection of the exposed basement condition is required before any Phase 2 work is authorized.</p>`)}

  ${sec(25, 'Framing and Insulation', `
    <p>Not included in Phase 1 unless separately authorized.</p>`)}

  ${sec(26, 'Electrical', `
    <p>Not included beyond work specifically authorized. Electrician work is quoted separately.</p>`)}

  ${sec(27, 'Plumbing', `
    <p>Not included beyond work specifically authorized. Plumber work is quoted separately.</p>`)}

  ${sec(28, 'Hidden Conditions', `
    <p>Additional concealed damage discovered during Phase 1 requires separate authorization and pricing.</p>`)}

  ${sec(29, 'Hazardous / Regulated Materials', `
    <p>Hazardous, asbestos-containing, biological or otherwise regulated material is outside ordinary demolition scope and may require work stoppage and assessment.</p>`)}

  ${sec(30, 'Mold / Environmental Disclaimer', `
    <p>Phase 1 demolition is not represented as certified mold, asbestos, hazardous-material or environmental remediation.</p>`)}

  ${sec(31, 'Disposal', `
    <p>Approved demolition waste is placed in the designated disposal bins and removed to an appropriate facility.</p>`)}

  ${sec(32, 'Site Access', `
    <p>The Customer provides reasonable and safe access to the approved work areas during the service window.</p>
    <div class="agreement-field-block">${fieldPlaceholder('site_access')}</div>
    <p>Primary site contact for service notifications: ${fieldPlaceholder('site_contact_name')}</p>`)}

  ${sec(33, 'Utilities', `
    <p>Utilities affecting the demolition must be made safe where required before the affected work proceeds.</p>`)}

  ${sec(34, 'Photographs', `
    <p>Before, during and after photographs are permitted for project documentation and the Customer's records.</p>
    <div class="agreement-field-block">${fieldPlaceholder('photo_consent')}</div>`)}

  ${sec(35, 'Praetoria Operations Hub Customer Portal', `
    <p>${V(d.customer_name)} uses the existing secure Praetoria Operations Hub customer portal. Authorized users may view this quotation, the signed agreement, invoices and payment status, scheduled and completed work, before and after photographs, project records and service history, and may download PDFs. This Phase 1 demolition record is kept separate from the Customer's junk-removal quotation.</p>`)}

  ${sec(36, 'Changes / Change Orders', `
    <p>Additional work, including all Phase 2 work, requires written or electronic approval through a change order or a separate quotation before it is performed.</p>`)}

  ${sec(37, 'Payment', `
    <table class="agreement-table"><tbody>
      <tr><th>Payment Method</th><td>${fieldPlaceholder('payment_method')}</td></tr>
      <tr><th>Payment Terms</th><td>${V(d.payment_terms)}</td></tr>
      <tr><th>Taxes</th><td>${V(d.tax_treatment)}</td></tr>
      <tr><th>Late Fee</th><td>${V(d.late_fee)}</td></tr>
      <tr><th>Interest on Overdue Balances</th><td>${V(d.interest_rate)}</td></tr>
    </tbody></table>`)}

  ${sec(38, 'Cancellation and Rescheduling', `
    <p>${V(d.cancellation_terms)}</p>`)}

  ${sec(39, 'Damage Reporting', `
    <p>${V(d.damage_reporting)}</p>`)}

  ${sec(40, 'Insurance and WCB', `
    <p>${V(d.insurance_statement)}</p>`)}

  ${sec(41, 'Governing Terms and Law', `
    <p>The current Praetoria master service-agreement language applies where applicable. This Agreement is governed by the laws of the Province of Saskatchewan and the applicable laws of Canada.</p>`)}

  ${sec(42, 'Electronic Communications and Signatures', `
    <p>The Customer consents to receiving notices, quotations, agreements, invoices and receipts electronically. An electronic signature applied through the Praetoria Operations Hub has the same effect as a handwritten signature. Each signed version is retained with its timestamp, version number and audit history.</p>`)}

  ${sec(43, 'Customer Acceptance and Signatures', `
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

/** Default values for a new Phase 1 demolition combined document. Rates stay editable. */
export const DEMOLITION_PHASE1_DEFAULTS = {
  legal_company_name: 'Praetoria Group',
  praetoria_authorized_representative: 'Ryan Steven Persaud',
  crew_size: '4',
  labour_rate: '$30.00',
  hours_per_day: '10',
  days: '3',
  total_crew_hours: '120',
  labour_total: '$3,600.00',
  bin_count: '2',
  bin_rate: '$150.00',
  bin_total: '$300.00',
  ppe_equipment_total: '$480.00',
  air_unit_count: 'two (2)',
  phase1_subtotal: '$4,380.00',
  payment_terms: 'Net 15 days from the invoice date.',
  tax_treatment: 'Applicable taxes are calculated using current Praetoria Operations Hub tax settings.',
  late_fee: '$25.00 per overdue invoice.',
  interest_rate: '2% per month (26.82% per annum) on overdue balances.',
  damage_reporting:
    'Suspected property damage must be reported to Praetoria in accordance with the current approved company damage-reporting process so it can be documented, inspected and resolved.',
  cancellation_terms:
    'Cancellation and rescheduling follow the current approved Praetoria terms. Work performed to the cancellation date remains payable.',
  insurance_statement:
    'Praetoria maintains commercial general liability insurance and Saskatchewan Workers’ Compensation Board coverage in accordance with current verified company settings. Certificates are available on request.',
};
