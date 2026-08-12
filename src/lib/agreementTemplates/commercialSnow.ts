/**
 * PRAETORIA — COMMERCIAL SNOW REMOVAL & ICE MANAGEMENT SERVICE AGREEMENT
 * Master reusable template.
 *
 * The body is generated from merge data (customer / property / quote records)
 * and contains interactive field placeholders for the guided signing flow.
 */

import { AgreementField, fieldPlaceholder } from '@/lib/agreementFields';

export const COMMERCIAL_SNOW_FIELD_SCHEMA: AgreementField[] = [
  {
    key: 'snowfall_trigger',
    label: 'Snowfall Service Trigger',
    type: 'select',
    role: 'customer',
    required: true,
    options: ['Every snowfall', '3 cm', '5 cm', '7 cm', '10 cm', 'Custom (see Schedule B)'],
    helpText: 'Select the accumulation at which Praetoria automatically dispatches service.',
  },
  {
    key: 'schedule_a_initials',
    label: 'Initials — Schedule A (Site Plan & Snow Storage)',
    type: 'initials',
    role: 'customer',
    required: true,
    placeholder: 'e.g. JC',
    helpText: 'Initial to confirm the approved service areas and on-site snow-storage locations.',
  },
  {
    key: 'customer_rep_name',
    label: 'Authorized Representative Name',
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
    placeholder: 'e.g. General Manager',
  },
  {
    key: 'customer_acknowledgement',
    label: 'Customer Acknowledgement',
    type: 'checkbox',
    role: 'customer',
    required: true,
    checkboxText:
      'I have reviewed and accept the Agreement and its attached schedules, including the service scope, pricing, selected snowfall trigger, exclusions, site-specific instructions and terms and conditions.',
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

export const COMMERCIAL_SNOW_MERGE_KEYS = [
  'agreement_number', 'season_start_date', 'season_end_date',
  'legal_company_name', 'company_address', 'company_email', 'company_phone',
  'customer_legal_name', 'customer_operating_name', 'authorized_representative', 'representative_title',
  'billing_address', 'customer_email', 'customer_phone',
  'property_name', 'service_address', 'site_contact', 'site_phone', 'site_email',
  'service_priority', 'response_target', 'plow_rate', 'loader_rate',
  'payment_terms', 'included_services', 'excluded_services', 'cancellation_terms',
  'snow_storage_locations', 'special_site_instructions',
  'praetoria_authorized_representative', 'praetoria_representative_title',
  'customer_notice_email', 'company_notice_email', 'insurance_summary',
];

export type CommercialSnowMergeData = Partial<Record<(typeof COMMERCIAL_SNOW_MERGE_KEYS)[number], string>>;

const V = (v?: string | null) => (v && String(v).trim() ? String(v) : '—');
const list = (items: string[]) => `<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>`;

export function buildCommercialSnowAgreementHtml(d: CommercialSnowMergeData = {}): string {
  const sec = (n: number, title: string, body: string) =>
    `<section class="agreement-section"><h2>${n}. ${title}</h2>${body}</section>`;

  return `
<div class="agreement-doc">
  <header class="agreement-doc-head">
    <h1>Commercial Snow Removal &amp; Ice Management Service Agreement</h1>
    <table class="agreement-meta">
      <tbody>
        <tr><th>Agreement Number</th><td>${V(d.agreement_number)}</td></tr>
        <tr><th>Service Season</th><td>${V(d.season_start_date)} through ${V(d.season_end_date)}</td></tr>
        <tr><th>Property</th><td>${V(d.property_name)} — ${V(d.service_address)}</td></tr>
      </tbody>
    </table>
  </header>

  ${sec(1, 'Parties', `
    <p>This Commercial Snow Removal &amp; Ice Management Service Agreement (the &ldquo;Agreement&rdquo;) is entered into between:</p>
    <h3>Service Provider</h3>
    <p><strong>${V(d.legal_company_name)}</strong><br/>
    Operating under the Praetoria Snow &amp; Ice / Praetoria brand as applicable.<br/>
    Head Office: ${V(d.company_address)}<br/>
    Email: ${V(d.company_email)}<br/>
    Telephone: ${V(d.company_phone)}</p>
    <p>(&ldquo;Praetoria&rdquo; or the &ldquo;Service Provider&rdquo;)</p>
    <h3>Customer / Contracting Party</h3>
    <p>Legal Company Name: <strong>${V(d.customer_legal_name)}</strong><br/>
    Operating Name, if different: ${V(d.customer_operating_name)}<br/>
    Authorized Representative: ${V(d.authorized_representative)}<br/>
    Title: ${V(d.representative_title)}<br/>
    Billing Address: ${V(d.billing_address)}<br/>
    Email: ${V(d.customer_email)}<br/>
    Telephone: ${V(d.customer_phone)}</p>
    <p>(the &ldquo;Customer&rdquo;)</p>`)}

  ${sec(2, 'Service Property', `
    <p>Property / Site Name: <strong>${V(d.property_name)}</strong><br/>
    Service Address: ${V(d.service_address)}<br/>
    Primary Site Contact: ${V(d.site_contact)}<br/>
    Telephone: ${V(d.site_phone)}<br/>
    Email: ${V(d.site_email)}</p>
    <p>This Agreement applies only to the property or properties expressly listed in this Agreement or its schedules.</p>`)}

  ${sec(3, 'Contract Term', `
    <p>Service begins <strong>${V(d.season_start_date)}</strong> and ends <strong>${V(d.season_end_date)}</strong>.</p>
    <p>This Agreement does not automatically renew. Any renewal must be expressly selected and agreed by the parties for a subsequent season.</p>`)}

  ${sec(4, 'Approved Service Areas', `
    <p>Praetoria will provide snow-removal services in the approved areas identified in this Agreement and the applicable site map. Approved service areas may include:</p>
    ${list(['Parking areas', 'Drive lanes', 'Vehicle entrances', 'Vehicle exits', 'Loading areas', 'Receiving areas', 'Loading-door vehicle-access areas', 'Garbage-access vehicle routes', 'Fire-access routes when specifically included', 'Other vehicle-access areas specifically identified on the service map'])}
    <p>Only approved areas are included. Areas outside the approved scope are not included unless separately authorized.</p>`)}

  ${sec(5, 'Site Walkthrough &amp; Service Map', `
    <p>Before service begins, Praetoria may complete a property walkthrough. The service map may identify areas to clear, areas not to clear, snow-storage areas, loading doors, restricted areas, fire routes, curbs, islands, bollards, drains, hydrants, utility covers, gates, high-risk areas and other special instructions.</p>
    <p>The approved map is attached or digitally linked as <strong>Schedule A — Site Plan &amp; Service Areas</strong> and may be approved electronically by both parties.</p>`)}

  ${sec(6, 'Snowfall Service Trigger', `
    <p>Customer selected trigger:</p>
    <div class="agreement-field-block"><strong>Snowfall Trigger:</strong> ${fieldPlaceholder('snowfall_trigger')}</div>
    <p>When the selected accumulation trigger is reached, Praetoria may automatically dispatch service without requiring the Customer to telephone or request each individual visit. The Praetoria Operations Hub may use available weather information together with field/site observations and operational confirmation to determine when service routes are activated.</p>`)}

  ${sec(7, 'Automatic Dispatch &amp; Seasonal Priority', `
    <p>Active seasonal customers receive priority over one-time or emergency call-out customers, subject to the Customer&rsquo;s selected service level. Once a qualifying event is confirmed, the Customer does not need to call Praetoria to request routine contracted service.</p>
    <p>Praetoria will dispatch according to the selected trigger, route priority, site requirements, storm severity, safe travel conditions, equipment availability and operational conditions.</p>`)}

  ${sec(8, 'Response Target', `
    <p>Customer Service Level: <strong>${V(d.service_priority)}</strong><br/>
    Target Service Window: <strong>${V(d.response_target)}</strong></p>
    <p>The response window is an operational target rather than a guarantee of an exact arrival time. Response time may reasonably change because of continuing or severe snowfall, blizzard conditions, freezing rain, unsafe roads, road closures, municipal snow operations, blocked property access, equipment failure, emergency conditions or other circumstances outside Praetoria&rsquo;s reasonable control.</p>`)}

  ${sec(9, 'Equipment &amp; Unit Rates', `
    <table class="agreement-table">
      <thead><tr><th>Equipment</th><th>Operator</th><th>Unit Rate</th><th>Billing Increment</th></tr></thead>
      <tbody>
        <tr><td>Parking-Lot Snow Clearing — Plow Truck</td><td>Included</td><td>${V(d.plow_rate)} per hour, per equipment unit</td><td>Per hour on site</td></tr>
        <tr><td>Parking-Lot Snow Clearing — Tractor / Bobcat / Skid-Steer / Loader</td><td>Included</td><td>${V(d.loader_rate)} per hour, per equipment unit</td><td>Per hour on site</td></tr>
      </tbody>
    </table>
    <p>Rates are per equipment unit. Listed rates are not combined into a single fixed total.</p>`)}

  ${sec(10, 'Equipment Dispatch', `
    <p>Listing more than one equipment category does not mean every listed piece of equipment will automatically be dispatched. Under normal conditions Praetoria dispatches the equipment it reasonably determines is appropriate for the property and snow conditions, and equipment selection may vary by snowfall.</p>
    <p>An additional equipment unit may be dispatched when reasonably required because of heavy accumulation, severe storm, large snow volume, compacted snow, drifting, operational requirements, required completion timeframe or site-specific conditions. Each equipment unit actually used is billed at the applicable approved rate.</p>`)}

  ${sec(11, 'Continuing &amp; Severe Snow Events', `
    <p>During prolonged or severe snowfall, Praetoria may perform multiple passes when reasonably necessary to maintain access or prevent excessive accumulation. Where additional passes, equipment or services result in additional billable work, billing follows the pricing authorized under this Agreement or an approved additional-service authorization.</p>`)}

  ${sec(12, 'On-Site Snow Storage', `
    <p>Snow will be pushed and stored only in designated or reasonably approved on-site locations, documented in Schedule A.</p>
    <p>Approved snow-storage locations for this property: <strong>${V(d.snow_storage_locations)}</strong></p>
    <p>Praetoria will use reasonable care to avoid deliberately placing snow where it obstructs required entrances, loading doors, fire routes, necessary sightlines, approved traffic routes or neighbouring property. Snow-pile locations may require adjustment as winter accumulation increases.</p>`)}

  ${sec(13, 'Off-Site Snow Hauling', `
    <p>Off-site hauling is not included unless expressly listed in Schedule B or separately authorized. If snow storage becomes unavailable or hauling becomes necessary, Praetoria may submit an additional quotation or change order. The Customer must approve the additional work unless an emergency situation requires immediate action to address an imminent access or safety concern and this Agreement otherwise authorizes such action.</p>`)}

  ${sec(14, 'Excluded Services', `
    <p>Unless expressly included in Schedule B, the following are excluded:</p>
    <p>${V(d.excluded_services)}</p>
    <p>Other services not specifically included in Schedule B are excluded.</p>`)}

  ${sec(15, 'Additional Services &amp; Change Orders', `
    <p>Additional work may be authorized through the Praetoria Operations Hub, including snow hauling, additional snow relocation, emergency service, sanding, de-icing, additional equipment, sidewalk clearing, special loading-area service, return visits and additional labour.</p>
    <p>Customer approval of additional services is recorded and preserved in the job and contract record.</p>`)}

  ${sec(16, 'Customer Responsibilities', `
    <p>The Customer is responsible for providing reasonable access to the service areas, including where applicable: moving vehicles, trailers and bins; unlocking gates; supplying access codes; identifying loading schedules and restricted areas; and identifying underground or concealed hazards, speed bumps, parking blocks, curbs, drains, utility covers, hydrants, electrical cables and private equipment, together with applicable site safety requirements.</p>`)}

  ${sec(17, 'Blocked or Unsafe Service Areas', `
    <p>Praetoria may defer, omit or stop work in an area that is blocked, inaccessible, unsafe, occupied by vehicles or equipment, subject to active loading operations, or otherwise unsafe to service. The Operations Hub records the reason not completed, time, photos and notes.</p>
    <p>If Praetoria is requested to return after the obstruction is removed, the return visit may be separately billable according to the Customer&rsquo;s approved pricing.</p>`)}

  ${sec(18, 'Site Safety', `
    <p>Praetoria personnel follow applicable safety requirements and reasonable customer-specific site instructions. The Customer must communicate unusual site hazards or required PPE/access procedures before service. Praetoria may suspend work when conditions create an unreasonable risk to personnel, equipment or third parties.</p>`)}

  ${sec(19, 'Service Documentation', `
    <p>Praetoria documents service visits through the Operations Hub. Records may include date, dispatch time, arrival time, departure time, worker/operator, equipment used, equipment hours, work completed, materials, notes, service status, before/after photos and weather or event information where available. These records support service verification, quality control, billing, customer inquiries, claims review and contract administration.</p>`)}

  ${sec(20, 'Praetoria Operations Hub Customer Portal', `
    <p>The Customer may receive access to the Praetoria Operations Hub Customer Portal, which may display agreements, quotations, invoices, payment history, service history, scheduled and completed visits, equipment used, time records, service photographs, service notes and account documents. The exact information displayed depends on account permissions and available service records.</p>`)}

  ${sec(21, 'Photographs &amp; Service Records', `
    <p>The Customer authorizes Praetoria to capture photographs or video reasonably necessary for pre-season condition documentation, before/after records, proof of service, property-damage documentation, safety records, billing verification and quality control. Operational photographs do not constitute permission for unrelated marketing use; marketing consent is handled separately where required.</p>`)}

  ${sec(22, 'Snow Service Quality Commitment', `
    <p>Praetoria performs the contracted services with reasonable care and according to the approved scope. If an approved service area was materially missed, the Customer should notify Praetoria as soon as reasonably possible. When Praetoria confirms a service deficiency and conditions permit, Praetoria may return to correct the affected contracted area without an additional labour charge. This does not guarantee continuously bare or dry pavement.</p>`)}

  ${sec(23, 'Changing Winter Conditions', `
    <p>The Customer acknowledges that winter conditions may change after Praetoria leaves the property, including new snowfall, blowing snow, drifting, freezing rain, refreezing, meltwater, roof runoff, municipal windrows, traffic, and snow moved by other contractors, tenants, employees or visitors. A completed service visit does not guarantee that the property will remain continuously free from snow or ice.</p>`)}

  ${sec(24, 'Municipal Plow Windrows', `
    <p>Snow deposited after Praetoria&rsquo;s completed visit by municipal snow-clearing operations is considered a new or additional condition. Removal is either included where expressly provided by the Customer&rsquo;s selected plan in Schedule B, or charged as an additional service / return visit as stated in Schedule B.</p>`)}

  ${sec(25, 'Damage &amp; Pre-Existing Conditions', `
    <p>Praetoria completes pre-season condition photographs where reasonably practical. The Customer must disclose known concealed hazards. Property-damage concerns should be submitted promptly through the Operations Hub or designated business contact and should include location, description, date discovered and photographs where available. Praetoria will review available records and site conditions.</p>`)}

  ${sec(26, 'Insurance &amp; WCB', `
    <p>Praetoria maintains the insurance and Workers&rsquo; Compensation coverage applicable to its operations, as recorded in Praetoria&rsquo;s current compliance records: ${V(d.insurance_summary)}. Certificates may be provided where applicable or reasonably requested.</p>`)}

  ${sec(27, 'Employees, Subcontractors &amp; Equipment', `
    <p>Praetoria may use employees, qualified subcontractors, rental equipment, specialized equipment and partner service providers when reasonably necessary to perform the contracted services. Praetoria remains responsible for administering the agreed service scope subject to the terms of this Agreement. Where this Agreement specifically requires Customer approval for additional billable specialized or rented equipment, that approval will be obtained.</p>`)}

  ${sec(28, 'Invoicing', `
    <p>Invoices identify the applicable property, service date/event, equipment used, hours or applicable unit, additional approved services, taxes and payments or credits. Billing frequency and payment terms are set out in <strong>Schedule B — Pricing &amp; Billing</strong>.</p>`)}

  ${sec(29, 'Payment Terms', `
    <p>Payment Terms: <strong>${V(d.payment_terms)}</strong></p>
    <p>Accepted payment methods may include Interac e-Transfer, credit card, EFT, wire transfer, cheque and Customer Portal payment, in each case according to Praetoria&rsquo;s current billing instructions.</p>`)}

  ${sec(30, 'Past-Due Accounts', `
    <p>If an invoice becomes past due, Praetoria may issue a past-due notice. Subject to the applicable terms and law, Praetoria may place future service on hold, require outstanding balances to be paid before service resumes, require payment arrangements or advance payment before reactivation, terminate service for continuing non-payment, and pursue available collection remedies. All services already properly performed and invoiced remain payable. Any late interest, administrative fee or collection-cost provision applies only where set out in Schedule B.</p>`)}

  ${sec(31, 'Service Suspension for Non-Payment', `
    <p>Where permitted under this Agreement, Praetoria may suspend future service after an account reaches the applicable default stage. Before suspension, the Operations Hub marks the invoice past due, issues customer notice, records notice delivery, notifies Praetoria administration and updates the contract/account status. The Customer Portal will clearly display <strong>SERVICE ON HOLD — ACCOUNT ACTION REQUIRED</strong>. Service restart may require payment of the overdue balance, an approved payment arrangement, and applicable restart or cleanup service where accumulated snow requires additional work.</p>`)}

  ${sec(32, 'Activation Preconditions', `
    <p>Service may be conditional upon completion of applicable requirements such as a signed agreement, required initial payment or deposit, approved quotation, site walkthrough, approved service map, pre-season condition photos and required access information. The Operations Hub displays an activation checklist, and the contract status becomes <strong>ACTIVE</strong> only once the required activation items are complete.</p>`)}

  ${sec(33, 'Cancellation &amp; Termination', `
    <h3>Customer Termination</h3>
    <p>The Customer may terminate according to the notice period stated in Schedule B: <strong>${V(d.cancellation_terms)}</strong></p>
    <h3>Praetoria Termination for Cause</h3>
    <p>Praetoria may suspend or terminate for material reasons including continuing non-payment, material breach, unsafe working conditions, repeated obstruction or interference, abusive or threatening conduct toward workers or contractors, fraudulent payment or chargeback activity, or other material violations of this Agreement.</p>
    <h3>Effect of Termination</h3>
    <p>Amounts properly owing for services already performed remain due. No early termination fee applies unless it is expressly set out in Schedule B.</p>`)}

  ${sec(34, 'Conditions Outside Reasonable Control (Force Majeure)', `
    <p>Neither party is considered in breach solely because performance is delayed or prevented by events outside its reasonable control, such as extreme weather, blizzard conditions, road closures, government order, major utility failure, natural disaster or unsafe operating conditions.</p>`)}

  ${sec(35, 'Limitation of Liability', `
    <p class="legal-review">LEGAL REVIEW REQUIRED BEFORE MASTER TEMPLATE IS LOCKED</p>
    <p>Except for liability that cannot lawfully be excluded or limited, and subject to applicable law, neither party is liable to the other for indirect, incidental, special or consequential losses, including loss of profit, loss of revenue or business interruption, arising out of or relating to the services.</p>
    <p>Praetoria is not responsible for damage arising from hidden or pre-existing property conditions that were not disclosed or reasonably visible, or from site or access conditions caused by the Customer or its tenants, employees, visitors or other contractors. This section is to be read together with Section 36 (Indemnification).</p>`)}

  ${sec(36, 'Indemnification', `
    <p class="legal-review">LEGAL REVIEW REQUIRED BEFORE MASTER TEMPLATE IS LOCKED</p>
    <p>Each party will indemnify and hold harmless the other party and its personnel from third-party claims to the extent such claims arise from that party&rsquo;s own negligent acts or omissions, or from its failure to perform its responsibilities under this Agreement, subject to applicable law and to Section 35.</p>`)}

  ${sec(37, 'Dispute Resolution', `
    <p>The parties will first attempt to resolve any dispute through good-faith business discussion. If unresolved, the party raising the dispute will provide written notice describing the issue, followed by good-faith negotiation and, where the parties agree, mediation. If the dispute remains unresolved, either party may pursue the matter before a court of competent jurisdiction. Nothing in this section limits Praetoria&rsquo;s ability to pursue unpaid invoices through available lawful collection or court processes.</p>`)}

  ${sec(38, 'Governing Law', `
    <p>This Agreement is governed by the laws applicable in the Province of Saskatchewan and the federal laws of Canada applicable therein.</p>`)}

  ${sec(39, 'Notices', `
    <p>Official notices may be sent to the addresses or designated electronic contacts listed in this Agreement and are recorded in the Operations Hub.</p>
    <p>Customer contact: ${V(d.customer_notice_email)}<br/>Praetoria contact: ${V(d.company_notice_email)}</p>`)}

  ${sec(40, 'Confidentiality', `
    <p>Each party will treat non-public business information disclosed by the other party in connection with this Agreement as confidential and will use it only for the purposes of this Agreement, except where disclosure is required by law or to professional advisors bound by confidentiality.</p>`)}

  ${sec(41, 'Assignment', `
    <p>Neither party may assign this Agreement without the other party&rsquo;s consent, not to be unreasonably withheld. Praetoria&rsquo;s use of employees, subcontractors or partner service providers to perform the services is not an assignment of this Agreement.</p>`)}

  ${sec(42, 'Entire Agreement', `
    <p>The executed Agreement together with its incorporated schedules constitutes the agreement between the parties concerning the contracted services and supersedes prior inconsistent discussions or representations concerning the same scope. Approved amendments must be documented in writing or electronically through the Operations Hub, or otherwise signed by the authorized parties.</p>`)}

  ${sec(43, 'Amendments &amp; Change Orders', `
    <p>Amendments are created in the Operations Hub, reference the original agreement number, identify the changed section, show the effective date, preserve the original agreement and require signatures where appropriate. An executed contract is never overwritten.</p>`)}

  ${sec(44, 'Severability', `
    <p>If a provision of this Agreement is found unenforceable, the remaining provisions continue in force to the extent permitted by applicable law.</p>`)}

  ${sec(45, 'Waiver', `
    <p>Failure to enforce a provision on one occasion does not constitute a waiver of future enforcement of that or any other provision.</p>`)}

  ${sec(46, 'Electronic Communications', `
    <p>The Customer consents to receive agreements, quotations, invoices, service updates, notices and account communications electronically by email, through the Praetoria Operations Hub Customer Portal, or by other approved electronic methods.</p>`)}

  ${sec(47, 'Electronic Signatures', `
    <p>The parties agree that this Agreement may be executed electronically and in counterparts. Electronic signatures and electronically executed counterparts are intended by the parties to evidence their agreement to the same extent as an original signature, subject to applicable law. The Operations Hub signing workflow preserves the executed agreement and the associated signing record.</p>`)}

  ${sec(48, 'Customer Acknowledgement', `
    <p>The Customer acknowledges having reviewed the property, scope, pricing, selected trigger, response target, snow-storage locations, important exclusions, payment terms, site map and special instructions, and the Agreement terms.</p>
    <div class="agreement-field-block">${fieldPlaceholder('customer_acknowledgement')}</div>`)}

  ${sec(49, 'Customer Signature', `
    <div class="signature-block">
      <p><strong>CUSTOMER</strong></p>
      <p>Company: ${V(d.customer_legal_name)}</p>
      <p>Authorized Representative: ${fieldPlaceholder('customer_rep_name')}</p>
      <p>Title: ${fieldPlaceholder('customer_rep_title')}</p>
      <p>Signature:</p>
      ${fieldPlaceholder('customer_signature')}
    </div>`)}

  ${sec(50, 'Praetoria Signature', `
    <div class="signature-block">
      <p><strong>SERVICE PROVIDER</strong></p>
      <p>${V(d.legal_company_name)}</p>
      <p>Authorized Representative: ${V(d.praetoria_authorized_representative)}</p>
      <p>Title: ${V(d.praetoria_representative_title)}</p>
      <p>Signature:</p>
      ${fieldPlaceholder('praetoria_signature')}
    </div>`)}

  <section class="agreement-section schedule">
    <h2>Schedule A — Site Plan &amp; Service Areas</h2>
    <p>Property address: ${V(d.service_address)}</p>
    <p>Approved clearing areas, entrances/exits, loading doors, restricted areas, known hazards and special operational instructions are as identified during the property walkthrough and the approved service map linked to this agreement in the Operations Hub.</p>
    <p>Approved snow pile / storage areas: <strong>${V(d.snow_storage_locations)}</strong></p>
    <div class="agreement-field-block"><strong>Customer initials confirming Schedule A:</strong> ${fieldPlaceholder('schedule_a_initials')}</div>
  </section>

  <section class="agreement-section schedule">
    <h2>Schedule B — Pricing, Service Level &amp; Customer Selections</h2>
    <table class="agreement-table">
      <tbody>
        <tr><th>Service Period</th><td>${V(d.season_start_date)} – ${V(d.season_end_date)}</td></tr>
        <tr><th>Snowfall Trigger</th><td>${fieldPlaceholder('snowfall_trigger')}</td></tr>
        <tr><th>Service Priority</th><td>${V(d.service_priority)}</td></tr>
        <tr><th>Response Target</th><td>${V(d.response_target)}</td></tr>
        <tr><th>Plow Truck</th><td>${V(d.plow_rate)} per hour, per equipment unit (operator included)</td></tr>
        <tr><th>Tractor / Bobcat / Skid-Steer / Loader</th><td>${V(d.loader_rate)} per hour, per equipment unit (operator included)</td></tr>
        <tr><th>Billing Terms</th><td>${V(d.payment_terms)}</td></tr>
        <tr><th>Included Services</th><td>${V(d.included_services)}</td></tr>
        <tr><th>Excluded Services</th><td>${V(d.excluded_services)}</td></tr>
        <tr><th>Cancellation Notice</th><td>${V(d.cancellation_terms)}</td></tr>
      </tbody>
    </table>
  </section>

  <section class="agreement-section schedule">
    <h2>Schedule C — Special Site Instructions</h2>
    <p>${V(d.special_site_instructions)}</p>
  </section>
</div>`.trim();
}
