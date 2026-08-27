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
      'I understand that the $4,380 quotation applies only to Phase 1 demolition and interior strip-out. I understand that framing, insulation, electrical, plumbing, reconstruction and hazardous-material remediation are not included unless separately quoted. I authorize Praetoria to stop at the inspection hold point after the approved finishes are removed so the exposed basement condition can be reviewed before Phase 2 is authorized.',
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

  <!-- ══════════ PHASE 1 BASEMENT DEMOLITION & INTERIOR STRIP-OUT SERVICE AGREEMENT ══════════ -->
  <h1 class="agreement-part-title">Phase 1 Basement Demolition &amp; Interior Strip-Out Service Agreement</h1>

  ${sec(16, 'Parties', `
    <p><strong>Service Provider:</strong> ${V(d.legal_company_name)} / applicable Praetoria operating division (the verified legal contracting entity recorded in Company Settings).</p>
    <p><strong>Customer:</strong> ${V(d.customer_name)}</p>
    <p><strong>Service Property:</strong> ${V(d.service_address)}, ${V(d.service_city)}, ${V(d.service_province)} ${V(d.service_postal_code)}</p>
    <p><strong>Email:</strong> ${V(d.customer_email)}</p>`)}

  ${sec(17, 'Agreement Purpose', `
    <p>This Agreement applies only to the approved Phase 1 basement demolition and interior strip-out described in the accepted quotation. Phase 1 is intended to remove approved damaged contents and interior finish materials so concealed conditions can be inspected. <strong>This is not an agreement for complete basement reconstruction.</strong></p>`)}

  ${sec(18, 'Phase 1 Contract Price', `
    <table class="agreement-table"><tbody>
      <tr><th>Demolition Labour</th><td>${V(d.labour_total)}</td></tr>
      <tr><th>Two Bin Allowance</th><td>${V(d.bin_total)}</td></tr>
      <tr><th>PPE / Air Filtration / Drying Equipment</th><td>${V(d.ppe_equipment_total)}</td></tr>
      <tr><th>PHASE 1 SUBTOTAL</th><td><strong>${V(d.phase1_subtotal)} before applicable taxes</strong></td></tr>
    </tbody></table>
    <p>Only the scope specifically stated in the quotation and this Agreement is included.</p>`)}

  ${sec(19, 'Labour Allowance', `
    <p>Phase 1 includes ${V(d.crew_size)} workers at ${V(d.labour_rate)} per hour, for up to ${V(d.hours_per_day)} hours per day, for ${V(d.days)} days — a total labour allowance of ${V(d.total_crew_hours)} crew labour-hours, quoted at ${V(d.labour_total)}.</p>
    <p>Additional labour beyond this allowance is not automatically included.</p>`)}

  ${sec(20, 'Phase 1 Demolition Scope', `
    <p>Subject to site conditions and safe access, Praetoria may remove approved damaged or unwanted basement items including furniture, household contents, pictures, cabinets, shelving, interior doors, baseboards, trim, carpet, carpet underlay, damaged flooring materials included in the quotation, drywall, wall finishes and other approved non-structural interior finish materials.</p>`)}

  ${sec(21, 'Water-Damaged / Mold-Affected Materials', `
    <p>Phase 1 may include removal of wet, damaged or visibly mold / mildew-affected finish materials when they can be safely and lawfully handled within the approved demolition scope. This does not mean Praetoria is certifying that mold has been professionally remediated. The quotation is not a certified mold-remediation contract.</p>`)}

  ${sec(22, 'Materials and Work Not Included in Phase 1', `
    <p>Unless separately approved, Phase 1 does not include structural demolition, structural framing removal, insulation removal, electrical-system modification, plumbing-system modification, furnace / HVAC work, foundation repair, structural repair, reconstruction, drywall replacement, new flooring, new framing, new insulation, painting or finish carpentry.</p>`)}

  ${sec(23, 'Phase 1 Hold Point / Owner Inspection', `
    <p>Once the approved wall finishes and surface materials have been removed, Praetoria will stop at an appropriate inspection point. Before additional concealed-material work proceeds:</p>
    <ol>
      <li>Exposed wall cavities are documented.</li>
      <li>Exposed insulation is reviewed.</li>
      <li>Exposed framing is reviewed.</li>
      <li>Visible plumbing conditions are identified.</li>
      <li>Visible electrical conditions are identified.</li>
      <li>The Customer has an opportunity to inspect the exposed basement condition.</li>
    </ol>
    <p>Praetoria then determines what additional work may be required.</p>`)}

  ${sec(24, 'Phase 2 Is Not Included', `
    <p>If concealed damage is discovered, Praetoria may prepare a <strong>Phase 2 — Additional Demolition / Framing / Insulation / Trades / Reconstruction</strong> quotation or change order. Possible Phase 2 work includes damaged insulation removal, framing removal or replacement, electrical work, plumbing work, additional demolition, additional disposal bins, additional PPE / containment, additional air-filtration / drying equipment and reconstruction.</p>
    <p>The Customer is not automatically charged for Phase 2. Phase 2 requires separate approval.</p>`)}

  ${sec(25, 'Electrical / Plumbing', `
    <p>Praetoria demolition workers are not authorized by this Agreement to perform electrical or plumbing work that legally requires an appropriately qualified or licensed trade. If electrical or plumbing systems interfere with demolition or require modification, work may stop in that area until the required trade work is authorized. Any electrician or plumber costs are separate unless specifically included in a later quotation.</p>`)}

  ${sec(26, 'Concealed Conditions', `
    <p>Opening walls and finishes may reveal conditions that were not visible when the quotation was prepared, including hidden water damage, rot, mold growth, damaged framing, damaged insulation, electrical damage, plumbing damage, pest damage, structural defects or other concealed deterioration. These conditions are outside the fixed Phase 1 scope unless expressly included.</p>`)}

  ${sec(27, 'Suspected Asbestos / Hazardous Materials', `
    <p>If demolition exposes material reasonably suspected to contain asbestos, hazardous chemicals, sewage contamination, significant biological contamination or other regulated hazardous material, Praetoria may immediately stop work in the affected area. Testing, specialized abatement, remediation and hazardous-material disposal are not included unless separately contracted.</p>`)}

  ${sec(28, 'Air Filtration / Drying Equipment', `
    <p>The quotation includes an allowance for PPE and air-filtration / drying equipment, which may include air scrubbers, HEPA filtration units, air movers, drying fans and other appropriate temporary air-moving equipment. The purpose is to assist with dust control, airborne particulate control, air circulation and drying following removal of wet finishes. <strong>Use of this equipment is not a guarantee that the property is mold-free, contaminant-free or fully dried.</strong></p>`)}

  ${sec(29, 'PPE', `
    <p>Workers may use appropriate PPE based on conditions and the approved work, including respiratory protection where appropriate, gloves, protective clothing, eye protection, safety footwear and other demolition safety equipment. Praetoria may stop work if conditions require protection, containment or procedures outside the approved Phase 1 scope.</p>`)}

  ${sec(30, 'Disposal Bins', `
    <p>The quotation includes an allowance for ${V(d.bin_count)} construction / demolition bins, currently ${V(d.bin_total)} total. This is an allowance rather than a guarantee of the final third-party supplier cost unless Admin has confirmed the vendor price.</p>`)}

  ${sec(31, 'Bin / Disposal Overages', `
    <p>Additional charges may apply for actual third-party costs including delivery, pickup, weight overages, tipping / disposal charges, extra rental days, bin swaps, additional bins and restricted-material surcharges. Any additional material costs are documented on the final invoice or approved change order as applicable.</p>`)}

  ${sec(32, 'Demolition Debris', `
    <p>Praetoria places approved Phase 1 demolition debris into the designated disposal bins. Praetoria is not required to remove material excluded from the agreed demolition scope.</p>`)}

  ${sec(33, 'Pre-Work Property Documentation', `
    <p>Before demolition begins, Praetoria may document existing water damage, existing wall damage, flooring, doors, cabinets, basement contents, existing mold / mildew conditions, existing structural damage visible at the time and other pre-existing conditions. Photographs are stored with the project record where practical.</p>`)}

  ${sec(34, 'Utilities / Safe Work Conditions', `
    <p>The Customer must disclose known utility, electrical, plumbing or other hazards. Praetoria may require utilities affecting demolition to be shut off, isolated, disconnected or otherwise made safe before work proceeds in an affected area.</p>`)}

  ${sec(35, 'Work Stoppage for Safety', `
    <p>Praetoria may stop or suspend work where continuing would create an unreasonable risk because of hazardous material, structural instability, electrical hazard, plumbing hazard, severe contamination, unsafe air quality, unsafe access or other conditions outside the approved scope. A safety-related work stoppage is not authorization to perform additional work without customer approval.</p>`)}

  ${sec(36, 'Permits / Third-Party Approvals', `
    <p>Any permit, engineering review, hazardous-material assessment or third-party approval legally required for work outside the accepted Phase 1 scope is not included unless expressly stated in the quotation.</p>`)}

  ${sec(37, 'Damage to Concealed Components', `
    <p>Praetoria uses reasonable care during demolition. However, concealed components may exist behind finishes, including wiring, pipes, cables, fasteners, previous repairs and other hidden components. Praetoria stops and reports unexpected concealed conditions where reasonably possible. Final liability provisions follow Praetoria's legally reviewed master agreement.</p>`)}

  ${sec(38, 'Rough Cleanup', `
    <p>At the completion of Phase 1, Praetoria performs a demolition rough cleanup of the approved areas, which may include loading demolition debris, removing loose debris, sweeping exposed work areas, operating approved drying / filtration equipment and photographing the exposed conditions. <strong>This is not final post-renovation cleaning.</strong></p>`)}

  ${sec(39, 'Service Documentation', `
    <p>The Praetoria Operations Hub may record crew, labour hours, work dates, before photographs, progress photographs, after / hold-point photographs, bin usage, equipment, notes, change-order requirements and customer approvals.</p>`)}

  ${sec(40, 'Site Access', `
    <p>The Customer provides reasonable and safe access to the approved work areas during the service window.</p>
    <div class="agreement-field-block">${fieldPlaceholder('site_access')}</div>
    <p>Primary site contact for service notifications: ${fieldPlaceholder('site_contact_name')}</p>`)}

  ${sec(41, 'Photographs', `
    <p>Before, during and after photographs are permitted for project documentation and the Customer's records.</p>
    <div class="agreement-field-block">${fieldPlaceholder('photo_consent')}</div>`)}

  ${sec(42, 'Customer Portal', `
    <p>${V(d.customer_name)} uses the existing secure Praetoria Operations Hub customer portal and may view the quotation, agreement, project status, photos, change orders, invoices and service / project records. This Phase 1 demolition record is kept separate from the Customer's junk-removal quotation.</p>`)}

  ${sec(43, 'Change Orders', `
    <p>Any material change in scope must be approved before additional work proceeds whenever reasonably practical. A change order may include additional labour, additional bins, additional demolition, framing, insulation, electrician, plumber, additional equipment, additional drying, additional disposal or reconstruction.</p>`)}

  ${sec(44, 'Payment', `
    <table class="agreement-table"><tbody>
      <tr><th>Payment Method</th><td>${fieldPlaceholder('payment_method')}</td></tr>
      <tr><th>Payment Terms</th><td>${V(d.payment_terms)}</td></tr>
      <tr><th>Taxes</th><td>${V(d.tax_treatment)}</td></tr>
      <tr><th>Late Fee</th><td>${V(d.late_fee)}</td></tr>
      <tr><th>Interest on Overdue Balances</th><td>${V(d.interest_rate)}</td></tr>
    </tbody></table>`)}

  ${sec(45, 'Customer Delays / Inspection Delays', `
    <p>If work reaches the Phase 1 hold point and the Customer or a required trade cannot inspect promptly, Praetoria is not required to keep labour, equipment or rented bins / equipment on standby without additional charges. Any resulting rental extensions or remobilization costs may require customer approval.</p>`)}

  ${sec(46, 'Cancellation and Rescheduling', `
    <p>${V(d.cancellation_terms)}</p>`)}

  ${sec(47, 'Damage Reporting', `
    <p>${V(d.damage_reporting)}</p>`)}

  ${sec(48, 'Insurance and WCB', `
    <p>${V(d.insurance_statement)}</p>`)}

  ${sec(49, 'No Guarantee of Complete Remediation', `
    <p>Phase 1 demolition is intended to remove approved damaged finish materials and expose concealed conditions. Praetoria does not warrant through this Agreement that Phase 1 alone will eliminate all mold, eliminate all odor, completely dry the structure, repair the source of water intrusion, correct structural damage or restore the basement for occupancy. Further assessment and work may be necessary.</p>`)}

  ${sec(50, 'Entire Phase 1 Agreement and Governing Law', `
    <p>The accepted Phase 1 quotation, this Agreement and authorized written / electronic change orders constitute the complete agreement for Phase 1. Phase 2 work is not included unless separately accepted. The current Praetoria master service-agreement language applies where applicable. This Agreement is governed by the laws of the Province of Saskatchewan and the applicable laws of Canada.</p>`)}

  ${sec(51, 'Electronic Communications and Signatures', `
    <p>This Agreement may be electronically executed through the Praetoria Operations Hub. An electronic signature applied through the Hub has the same effect as a handwritten signature. The executed document and signing record are retained with the Customer's project file, including timestamp, version number and audit history.</p>`)}

  ${sec(52, 'Customer Acknowledgement, Acceptance and Signatures', `
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
