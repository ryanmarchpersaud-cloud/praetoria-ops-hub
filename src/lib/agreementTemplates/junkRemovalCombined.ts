/**
 * PRAETORIA GROUP — JUNK REMOVAL & INTERIOR CLEANOUT
 * COMBINED QUOTATION, PRICING SUMMARY & SERVICE AGREEMENT (standard template)
 *
 *   1. Customer / property quotation page
 *   2. Scope of work + exclusions
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

export const JUNK_REMOVAL_COMBINED_TITLE =
  'Junk Removal & Interior Cleanout — Quotation, Pricing Summary & Service Agreement';

export const JUNK_REMOVAL_COMBINED_FIELD_SCHEMA: AgreementField[] = [
  {
    key: 'scope_acknowledgement',
    label: 'Scope Acknowledgement',
    type: 'checkbox',
    role: 'customer',
    required: true,
    checkboxText:
      'I confirm the approved scope is the removal and haul-away of accessible unwanted items from the upper / main-floor living areas and other specifically approved accessible non-contaminated areas of the residence.',
  },
  {
    key: 'basement_exclusion_acknowledgement',
    label: 'Contaminated Basement Exclusion Acknowledgement',
    type: 'checkbox',
    role: 'customer',
    required: true,
    checkboxText:
      'I understand and accept that the basement is excluded. No basement entry, basement debris removal, demolition, contaminated-material handling, remediation or renovation work is included in this quotation, and that work requires a separate scope and quotation.',
  },
  {
    key: 'landfill_fee_acknowledgement',
    label: 'Landfill / Disposal Charge Acknowledgement',
    type: 'checkbox',
    role: 'customer',
    required: true,
    checkboxText:
      'I understand the quoted amount does not include landfill / disposal charges, and that the actual disposal charges incurred for the loads removed from my property will be added to the final invoice.',
  },
  {
    key: 'disposal_authorization',
    label: 'Authorization to Discard',
    type: 'select',
    role: 'customer',
    required: true,
    options: [
      'Authorized — all items in the approved removal areas / pile may be discarded',
      'Authorized with exceptions — items I have clearly tagged or set aside must remain',
    ],
  },
  {
    key: 'removal_areas',
    label: 'Approved Removal Areas',
    type: 'text',
    role: 'customer',
    required: true,
    placeholder: 'e.g. main floor living room, kitchen, upstairs bedrooms, garage',
    helpText: 'List the accessible areas Praetoria is approved to clear. The basement is excluded.',
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
    label: 'Initials — Quoted Pricing, Trips and Landfill Charges',
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
      'I confirm that I have reviewed the Junk Removal quotation and Service Agreement, that I have authority to dispose of the approved items, that the contaminated basement is excluded, and that actual landfill/disposal charges will be added to the final invoice.',
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
export const JUNK_REMOVAL_REQUIRED_SELECTION_KEYS = [
  'scope_acknowledgement',
  'basement_exclusion_acknowledgement',
  'landfill_fee_acknowledgement',
  'disposal_authorization',
  'removal_areas',
  'site_access',
  'photo_consent',
  'payment_method',
  'site_contact_name',
];

export interface JunkRemovalMergeData {
  [key: string]: string | number | null | undefined;
}

const V = (v: unknown) => (isTbd(v) ? `<span class="tbd">${TBD}</span>` : String(v));

const sec = (n: number, title: string, body: string) => `
  <section class="agreement-section">
    <h2>${n}. ${title}</h2>
    ${body}
  </section>`;

/** Build the combined junk-removal document body. */
export function buildJunkRemovalCombinedBody(d: JunkRemovalMergeData): string {
  return `
<div class="agreement-doc">

  <h1>${V(d.document_title)}</h1>
  <p class="doc-subtitle">Praetoria Group — Junk Removal &amp; Hauling</p>

  <!-- ══════════ PAGE 1 — QUOTATION ══════════ -->
  ${sec(1, 'Quotation — Prepared For', `
    <table class="agreement-table"><tbody>
      <tr><th>Customer</th><td>${V(d.customer_name)}</td></tr>
      <tr><th>Telephone</th><td>${V(d.customer_phone)}</td></tr>
      <tr><th>Email</th><td>${V(d.customer_email)}</td></tr>
      <tr><th>Service Address</th><td>${V(d.service_address)}, ${V(d.service_city)}, ${V(d.service_province)} ${V(d.service_postal_code)}</td></tr>
      <tr><th>Customer Type</th><td>Residential</td></tr>
      <tr><th>Service Category</th><td>Junk Removal &amp; Hauling</td></tr>
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
    <p>This is a single combined document. The quotation, pricing summary and service agreement share one record, one set of prices and one set of terms. A signed version is never overwritten; a change of price or scope is issued as a new version for review and signature.</p>`)}

  ${sec(3, 'Scope of Work — Included Removal', `
    <p>Praetoria Group will provide an interior junk-removal and cleanout service for the <strong>accessible upper / main living areas</strong> of the residence.</p>
    <p>Remove and haul away accessible unwanted items, including:</p>
    <ul>
      <li>Old furniture</li>
      <li>Damaged furniture</li>
      <li>Unwanted appliances</li>
      <li>Household garbage</li>
      <li>Loose debris</li>
      <li>Other unwanted household contents in the approved accessible areas</li>
      <li>Items located in upstairs / main-floor areas that the Customer has authorized for disposal</li>
    </ul>
    <p>All approved removed items are loaded into Praetoria's vehicle / trailer and transported to an appropriate landfill or disposal facility.</p>
    <div class="agreement-field-block">${fieldPlaceholder('removal_areas')}</div>`)}

  ${sec(4, 'Exclusion — Contaminated Basement Is Not Included', `
    <p class="highlight-block"><strong>This quotation applies only to accessible approved areas outside the contaminated basement. No basement entry, basement debris removal, demolition, contaminated-material handling, remediation or renovation work is included.</strong></p>
    <p>The basement has been identified as damaged / contaminated. Praetoria personnel are not to enter the contaminated basement or remove basement contents under this junk-removal quotation. The basement requires a separate quotation and scope of work.</p>
    <div class="agreement-field-block">${fieldPlaceholder('basement_exclusion_acknowledgement')}</div>`)}

  ${sec(5, 'Other Exclusions', `
    <ul>
      <li>Hazardous, biological, chemical, asbestos-containing, contaminated or otherwise regulated material</li>
      <li>Demolition, renovation, remediation or restoration work of any kind</li>
      <li>Repairs to the structure, finishes or building systems</li>
      <li>Cleaning, sanitizing or disinfecting services</li>
      <li>Any area not listed as an approved removal area</li>
    </ul>`)}

  ${sec(6, 'Estimated Disposal Trips', `
    <p>The work is currently estimated to require approximately <strong>${V(d.estimated_trips)} landfill / disposal trips</strong>, based on the presently visible and identified contents.</p>
    <p>If additional loads are required because of materially greater volume than expected, Admin / Customer authorization is obtained before additional billable hauling is performed, where practical.</p>`)}

  <!-- ══════════ SEPARATE PAGE — PRICING SUMMARY ══════════ -->
  <div class="pricing-sheet-page">
  ${sec(7, 'Pricing Summary', `
    <table class="agreement-table">
      <thead><tr><th>#</th><th>Item</th><th>Detail</th><th>Amount</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>Labour</td><td>${V(d.labour_hours)} hours × ${V(d.labour_rate)} per hour</td><td>${V(d.labour_total)}</td></tr>
        <tr><td>2</td><td>Transportation, Hauling &amp; Administration</td><td>Normal transportation / handling and administrative component for the quoted ${V(d.estimated_trips)}-trip cleanout</td><td>${V(d.transport_admin_total)}</td></tr>
        <tr><td></td><td><strong>Base Quotation</strong></td><td></td><td><strong>${V(d.base_total)} before applicable taxes</strong></td></tr>
      </tbody>
    </table>
    <p>The quoted labour allowance covers up to ${V(d.labour_hours)} hours of the approved junk-removal work. If additional labour time becomes necessary because the scope materially exceeds what was represented or accessible, the additional work must be approved before it is billed whenever reasonably practical.</p>
    <p><strong>Landfill / Disposal Charges:</strong> Charged separately based on the actual disposal fees incurred for the loads removed from the property. Where available, disposal receipts or records are retained with the service record. These charges appear on the final invoice in addition to the quoted labour and transportation / administration charges.</p>
    <table class="agreement-table"><tbody>
      <tr><th>Labour</th><td>${V(d.labour_hours)} hours × ${V(d.labour_rate)} = ${V(d.labour_total)}</td></tr>
      <tr><th>Transportation / Hauling / Administration</th><td>${V(d.transport_admin_total)}</td></tr>
      <tr><th>Base Quoted Amount</th><td><strong>${V(d.base_total)} before applicable tax</strong></td></tr>
      <tr><th>Estimated Disposal Trips</th><td>Approximately ${V(d.estimated_trips)} trips</td></tr>
      <tr><th>Landfill / Tipping Fees</th><td>Additional — actual cost added to the final invoice</td></tr>
      <tr><th>Contaminated Basement</th><td><strong>NOT INCLUDED</strong></td></tr>
    </tbody></table>
    <div class="agreement-field-block">${fieldPlaceholder('landfill_fee_acknowledgement')}</div>
    <div class="agreement-field-block">${fieldPlaceholder('pricing_initials')}</div>`)}
  </div>

  <!-- ══════════ SERVICE AGREEMENT ══════════ -->
  <!-- ══════════ JUNK REMOVAL & HAULING SERVICE AGREEMENT ══════════ -->
  <h1>Junk Removal &amp; Hauling Service Agreement</h1>
  <p>This Junk Removal &amp; Hauling Service Agreement ("Agreement") is between <strong>${V(d.legal_company_name)}</strong> ("Praetoria" / the "Service Provider") and <strong>${V(d.customer_name)}</strong> (the "Customer"), for the Service Property at <strong>${V(d.service_address)}, ${V(d.service_city)}, ${V(d.service_province)} ${V(d.service_postal_code)}</strong>. Customer email: ${V(d.customer_email)}.</p>

  ${sec(8, 'Purpose of Agreement', `
    <p>This Agreement governs the junk-removal and interior cleanout services described in the accepted quotation.</p>
    <p>Only the items, areas and services specifically included in the accepted quotation are covered.</p>`)}

  ${sec(9, 'Approved Service Areas', `
    <p>The current quotation applies to approved accessible areas of the residence outside the contaminated basement. The approved scope may include:</p>
    <ul>
      <li>Main-floor household contents</li>
      <li>Upper-floor contents</li>
      <li>Furniture</li>
      <li>Damaged furniture</li>
      <li>Appliances</li>
      <li>Household garbage</li>
      <li>Loose debris</li>
      <li>Other customer-authorized items designated for disposal</li>
    </ul>
    <p>The basement is specifically excluded from this junk-removal Agreement unless later authorized under a separate written quotation or change order.</p>
    <div class="agreement-field-block">${fieldPlaceholder('scope_acknowledgement')}</div>
    <div class="agreement-field-block">${fieldPlaceholder('removal_areas')}</div>`)}

  ${sec(10, 'Customer Authorization to Dispose of Property', `
    <p>The Customer confirms that:</p>
    <ul>
      <li>The Customer owns the items being removed or has lawful authority to authorize their disposal.</li>
      <li>Items identified or placed within the approved removal areas may be treated as authorized for disposal.</li>
      <li>The Customer is responsible for identifying any item that must remain at the property before work begins.</li>
    </ul>
    <p>Praetoria is not responsible for the accidental disposal of an item that the Customer specifically designated, placed or left within an approved disposal pile or removal area, subject to applicable law and the final approved company terms.</p>
    <div class="agreement-field-block">${fieldPlaceholder('disposal_authorization')}</div>`)}

  ${sec(11, 'Items Not to Be Removed Without Specific Authorization', `
    <p>The Customer must clearly identify items that are:</p>
    <ul>
      <li>To remain at the property</li>
      <li>Personal keepsakes</li>
      <li>Important documents</li>
      <li>Financial records</li>
      <li>Jewelry</li>
      <li>Electronics to be retained</li>
      <li>Collectibles</li>
      <li>Medication</li>
      <li>Keys</li>
      <li>Identification</li>
      <li>Other valuable or sensitive property</li>
    </ul>
    <p>Praetoria workers should not be expected to determine the personal or financial value of household contents.</p>`)}

  ${sec(12, 'Hazardous, Regulated or Contaminated Materials', `
    <p>Unless specifically quoted and legally permitted, the service does not include removal or handling of:</p>
    <ul>
      <li>Asbestos-containing material</li>
      <li>Biohazardous waste</li>
      <li>Medical waste</li>
      <li>Chemicals</li>
      <li>Fuels</li>
      <li>Solvents</li>
      <li>Paints or unknown liquids</li>
      <li>Explosives</li>
      <li>Propane cylinders</li>
      <li>Contaminated building materials</li>
      <li>Sewage-contaminated materials</li>
      <li>Mold-remediation waste requiring specialized handling</li>
      <li>Other regulated or hazardous material</li>
    </ul>
    <p>If suspected hazardous or regulated material is discovered, Praetoria may stop work in the affected area until the condition is assessed and an approved handling/disposal plan is established.</p>`)}

  ${sec(13, 'Basement Exclusion', `
    <p>The basement has been identified as damaged and contaminated.</p>
    <p class="highlight-block"><strong>This Junk Removal Agreement does not authorize: basement entry; basement debris removal; basement demolition; mold remediation; wet-building-material removal; drywall demolition; carpet demolition; framing removal; insulation removal; electrical work; plumbing work; renovation or reconstruction.</strong></p>
    <p>Those services must be covered by a separate quotation and service agreement.</p>
    <div class="agreement-field-block">${fieldPlaceholder('basement_exclusion_acknowledgement')}</div>`)}

  ${sec(14, 'Labour Allowance', `
    <p>The accepted quotation includes the labour allowance stated on the quotation.</p>
    <p>Current quoted allowance: <strong>${V(d.labour_hours)} labour hours at ${V(d.labour_rate)}/hour</strong>.</p>
    <p>Quoted labour: <strong>${V(d.labour_total)}</strong>.</p>
    <p>If the actual approved scope materially exceeds the quoted labour allowance, additional labour requires customer authorization whenever reasonably practical.</p>`)}

  ${sec(15, 'Transportation / Hauling / Administration', `
    <p>The accepted quotation includes <strong>${V(d.transport_admin_total)}</strong> for the quoted transportation, hauling and administrative component.</p>
    <p>This amount does not represent landfill tipping charges.</p>`)}

  ${sec(16, 'Estimated Disposal Trips', `
    <p>The current quotation estimates approximately <strong>${V(d.estimated_trips)} landfill/disposal trips</strong>. This is an estimate based on the contents visible or described before work.</p>
    <p>If materially more volume is present and additional trips are necessary, additional charges may apply after customer authorization where reasonably practical.</p>`)}

  ${sec(17, 'Landfill / Disposal Fees', `
    <p>Landfill and tipping charges are not included in the base quoted amount unless expressly stated otherwise.</p>
    <p>Actual landfill/disposal charges incurred for the customer's material will be added to the final invoice.</p>
    <p>Where available, Praetoria may retain scale tickets, disposal receipts, load records and other disposal documentation with the project/service record.</p>
    <div class="agreement-field-block">${fieldPlaceholder('landfill_fee_acknowledgement')}</div>`)}

  ${sec(18, 'Final Invoice', `
    <p>The final invoice may include:</p>
    <ul>
      <li>Quoted labour</li>
      <li>Transportation/hauling/administration</li>
      <li>Actual landfill/tipping charges</li>
      <li>Customer-authorized additional labour</li>
      <li>Customer-authorized additional trips</li>
      <li>Other approved additional services</li>
      <li>Applicable taxes</li>
    </ul>`)}

  ${sec(19, 'Customer Access Responsibilities', `
    <p>The Customer must provide safe and reasonable access to the approved removal areas.</p>
    <p>Praetoria may delay or stop work if: access is blocked; animals are not secured; utilities or structural conditions create an unsafe environment; hazardous materials are present; an area is contaminated beyond the approved scope; or workers cannot safely remove an item.</p>
    <div class="agreement-field-block">${fieldPlaceholder('site_access')}</div>
    <p>Primary site contact for service notifications: ${fieldPlaceholder('site_contact_name')}</p>`)}

  ${sec(20, 'Large / Heavy Items', `
    <p>Praetoria may use appropriate manual handling techniques, dollies, carts, lifting equipment or additional workers for heavy items.</p>
    <p>Items requiring materially different equipment or labour than reasonably anticipated may require additional authorization.</p>`)}

  ${sec(21, 'Property Protection', `
    <p>Praetoria will use reasonable care while moving approved contents from the property.</p>
    <p>The Customer should identify fragile flooring, weak stairs, damaged railings, existing wall damage, tight access areas and other known hazards before removal begins.</p>`)}

  ${sec(22, 'Pre-Existing Conditions', `
    <p>Praetoria may photograph existing conditions before starting work.</p>
    <p>Praetoria is not responsible for pre-existing scratches, cracks, water damage, structural defects, broken finishes, loose railings, damaged floors or other existing property damage, except to the extent responsibility cannot lawfully be excluded. ${V(d.damage_reporting)}</p>`)}

  ${sec(23, 'Service Photographs', `
    <p>The Customer authorizes Praetoria to take photographs reasonably necessary for before-condition documentation, service verification, disposal documentation, damage documentation, quality control, customer portal records and invoice support.</p>
    <p>Operational photographs do not automatically authorize unrelated marketing use.</p>
    <div class="agreement-field-block">${fieldPlaceholder('photo_consent')}</div>`)}

  ${sec(24, 'Customer Portal', `
    <p>The quotation, agreement, invoices, available photographs and project records may be stored in the Customer's Praetoria Operations Hub portal.</p>`)}

  ${sec(25, 'Change of Scope', `
    <p>Work outside the accepted quotation requires additional authorization.</p>
    <p>A change may be recorded through a written change order, electronic approval, Praetoria Operations Hub approval, or other documented customer authorization.</p>`)}

  ${sec(26, 'Cancellation / Rescheduling', `
    <p>${V(d.cancellation_terms)}</p>`)}

  ${sec(27, 'Payment', `
    <p>Use the payment terms shown on the accepted quotation and current Praetoria billing settings. All properly authorized services and disposal charges remain payable.</p>
    <table class="agreement-table"><tbody>
      <tr><th>Payment Method</th><td>${fieldPlaceholder('payment_method')}</td></tr>
      <tr><th>Payment Terms</th><td>${V(d.payment_terms)}</td></tr>
      <tr><th>Taxes</th><td>${V(d.tax_treatment)}</td></tr>
      <tr><th>Late Fee</th><td>${V(d.late_fee)}</td></tr>
      <tr><th>Interest on Overdue Balances</th><td>${V(d.interest_rate)}</td></tr>
    </tbody></table>
    <p>${V(d.insurance_statement)}</p>`)}

  ${sec(28, 'Service Suspension', `
    <p>Praetoria may suspend or stop work when: conditions are unsafe; hazardous materials are discovered; the requested work materially exceeds the approved scope; required access is unavailable; or customer authorization is required for additional work.</p>`)}

  ${sec(29, 'Entire Agreement', `
    <p>The accepted quotation, this Service Agreement and approved written/electronic changes constitute the agreement for this junk-removal project.</p>
    <p>No verbal statement changes the written scope unless documented and approved. This Agreement is governed by the laws of the Province of Saskatchewan and the applicable laws of Canada.</p>`)}

  ${sec(30, 'Electronic Signatures', `
    <p>The Customer and Praetoria may execute this Agreement electronically. Electronic acceptance is intended to evidence agreement to the same extent as a handwritten signature, subject to applicable law. Each signed version is retained with its timestamp, version number and audit history.</p>`)}

  ${sec(29, 'Customer Acceptance and Signatures', `
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

/** Default values for a new junk-removal combined document. Rates stay editable. */
export const JUNK_REMOVAL_COMBINED_DEFAULTS = {
  legal_company_name: 'Praetoria Group',
  praetoria_authorized_representative: 'Ryan Steven Persaud',
  labour_hours: '4',
  labour_rate: '$40.00',
  labour_total: '$160.00',
  transport_admin_total: '$100.00',
  base_total: '$260.00',
  estimated_trips: '2',
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
