# Residential Snow Removal — Combined Quotation & Service Agreement

Build a single document record that serves as both quotation and service agreement, with strict provisional-vs-final separation, guided customer selections, a pre-signature review screen, and activation gating.

## 1. PQ-00112 (Terry Leach) — provisional handling

- Attach the already-uploaded `Snow.pdf` to PQ-00112 as a signed document, reclassified as
  "Signed Provisional Estimate Acknowledgement — Final Price and Service Availability Pending".
  The stored PDF is never modified or replaced.
- PQ-00112 keeps a persistent banner in admin and portal views:
  "PROVISIONAL ESTIMATE ONLY — NOT A CONFIRMED PRICE OR SERVICE COMMITMENT".
- No status change to Active/Contracted/Ready for Dispatch. No invoicing, billing, dispatch or scheduling is enabled from it.
- The $250–$350 range stays an estimate range; the $0 total is never used as a contract price.
- The 2025 Joel Herback agreement is used only as an internal drafting reference. It is not uploaded to Terry's account or any customer account, and stays out of the customer portal entirely.

## 2. Combined document model

One record, one ID, shown in both Customer Portal → Quotations and Customer Portal → Services → Documents → Agreements, so price and terms can never diverge.

Statuses:
Draft — Internal Review · Provisional Estimate — Customer Acknowledgement Only · Final Quotation — Awaiting Customer Acceptance · Accepted — Activation Requirements Pending · Active Service Agreement · Suspended · Cancelled · Expired

Rules:
- Acknowledging a provisional estimate never activates service.
- Approving a final price creates a new version that must be reviewed and signed again. A provisional signature never carries forward.
- Signed versions are immutable; every version, signature, timestamp and audit entry is retained.

## 3. Residential template sections

All 25 required sections, including: customer/property info, quotation + agreement numbers, version/status, exact season dates, package, approved areas, snowfall trigger, visit frequency and included-visit limit, response target, pricing and taxes, additional labour/visits/workers, out-of-town travel and mobilization, de-icer authorization, heavy-snow and continuous-storm terms, city berms/windrows, snow placement and hauling, access and obstruction duties, documentation and photos, payment and non-payment suspension, cancellation and renewal, quality guarantee, liability and damage reporting, electronic communications and signatures, activation requirements, and customer selections/initials/signatures.

Every fee, response target and policy has exactly one value. Any value Ryan has not approved renders as **TBD** and blocks final publication.

Corrections applied from the 2025 reference: "December" spelling, April 30 (never April 31), no "[X]" placeholders, no stray drafting sentence, no unlimited-vs-12-visit contradiction, de-icer treated one way only, one response target, one late fee, one interest rate, one suspension rule, and no reuse of $175/$875 pricing. Insurance/WCB coverage statements are omitted unless verified values are supplied.

## 4. Customer selections (required, hard-blocking)

Real checkboxes/dropdowns/text — initials or signature can never substitute for an answer:
- Snowfall trigger: every measurable snowfall / 1 cm / 5 cm / 7 cm / 10 cm / other written amount
- 3 or 4 visits per week (nothing pre-selected for PQ-00112)
- Approved driveway, walkway, step and sidewalk areas
- Approved on-site snow-storage location
- De-icing authorized or declined
- Off-site hauling requires authorization: yes/no
- City windrow return visits: included or additional
- Photo-documentation consent
- Payment method

Final acceptance is blocked while any required selection is blank.

## 5. Visit and labour rules

- 3 visits/week: up to 12 visits per 28-day cycle. 4 visits/week: up to 16 per 28-day cycle.
- Additional labour: $50 per worker-hour minimum, one-hour minimum per worker, each worker billed separately.
- Additional time and visits displayed before acceptance.

## 6. Out-of-town properties (White City, Balgonie, etc.)

Separate travel/mobilization field, never folded into the $50 worker-hour rate. Regina response times are not promised; response target stays TBD until Ryan approves the route, and is expressly subject to continuing snowfall, highway conditions, closures, crew availability and safe travel.

## 7. Pricing block

Monthly/28-day price, number of billing periods, seasonal subtotal, GST, PST treatment, total price, additional visit rate, additional worker-hour rate, travel/mobilization, heavy-snow charge, de-icer application and material charges, emergency call-out, hauling/disposal. Provisional documents show ranges labelled as estimates and TBD for unresolved charges; $0 is never displayed as a selling price.

## 8. Review, signing and delivery

Pre-signature review screen shows customer/property, exact final price and tax, billing frequency, service period, snowfall trigger, included areas, visit limit, response target, additional charges, cancellation terms and required authorizations, with options to correct or decline.
After signing: immediate PDF download plus emailed copy, with version, timestamp and audit history preserved.

## 9. Activation gating

Active Service Agreement requires all of: signed final combined document, Ryan-approved final pricing, initial payment, property inspection, existing-condition photos, recorded snow-storage location, selected snowfall trigger, approved service areas, and assignment to an approved route. A checklist tracks each item; until complete the document displays:
"ACTIVATION PENDING — SERVICE NOT YET SCHEDULED".

## 10. Storage

- `Snow.pdf` under PQ-00112 → Signed Documents → Provisional Estimate
- New provisional combined document under Quotations
- Final signed combined document under Quotations and Services → Documents → Agreements
- 2025 Joel Herback agreement in a restricted staff-only reference area
- No wages, markup, profit worksheets or other customers' documents anywhere in the customer portal

## Technical notes

- Extend the existing `agreements` table (already has version, status, field_schema/field_values, quote_id, customer_id, signing_token, audit timestamps) with combined-document status values, an activation-requirements checklist, and a Ryan-approval flag; keep the existing versioning via `superseded_by`/`parent_agreement_id`.
- New template `src/lib/agreementTemplates/residentialSnow.ts` alongside `commercialSnow.ts`, rendered through the existing branded `agreementPrint.ts` letterhead.
- Reuse `AgreementSignPage` / `SignatureModal`, adding the selections form and the pre-signature review step.
- Portal surfacing: `PortalQuotes.tsx` and `PortalAgreementsPage.tsx` both read the same record; RLS keeps staff-reference documents out of the portal.
