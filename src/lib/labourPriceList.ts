// Praetoria Group — Labour-Only Price List v1.0 (May 6, 2026, Regina, SK)
// Structured for in-app search, filtering, and future quote integration.

export type PriceRow = {
  category: string;
  service: string;
  unit: string;
  basic: string;
  standard: string;
  complex: string;
  notes: string;
};

export const PRICE_LIST_VERSION = '1.0';
export const PRICE_LIST_DATE = 'May 6, 2026';
export const PRICE_LIST_PDF = '/docs/Praetoria_Group_Labour_Only_Price_List_v1.pdf';

export const PRICE_LIST_DISCLAIMER = `Pricing rules / assumptions:
• All prices are labour only. Customer supplies visible finish materials unless a written quote says otherwise.
• Taxes are not included. Permits, disposal fees, dump fees, parking, long-distance travel, special tools, rentals, and subcontracted licensed trades are extra.
• Basic = open access, clean/ready area, minimal cuts, no hidden damage. Standard = normal lived-in home, average prep/cuts, normal access. Complex = tight access, many cuts, stairs, damaged/uneven surfaces, small jobs, urgent schedule, or premium finish expectation.
• Use a written change order when site conditions change after work starts.
• Regulated plumbing/electrical/gas/structural work should be performed by properly licensed trades and/or under valid permits where required.
• For small jobs, the minimum charge should override the per-unit price.`;

export const QUOTE_DISCLAIMER = `Pricing is labour only. Materials, taxes (GST/PST), permits, disposal fees, dump fees, parking, long-distance travel, special tools, rentals, and subcontracted licensed trades (plumbing, electrical, gas, structural) are extra unless explicitly listed. Basic / Standard / Complex tiers reflect site difficulty: Basic = open access and clean/ready area; Standard = normal lived-in conditions; Complex = tight access, many cuts, stairs, damage, urgency, or premium finish. Site condition changes after work starts require a written change order. Small-job minimum charges override per-unit pricing. — Praetoria Group / Praetoria Operation Group Inc.`;

export const PRICE_ROWS: PriceRow[] = [
  // General labour, minimums, mobilization
  { category: 'General Labour & Minimums', service: 'Small job minimum', unit: 'each visit', basic: '$150', standard: '$225', complex: '$325', notes: 'Use when the job is too small for per-unit pricing.' },
  { category: 'General Labour & Minimums', service: 'General labour / handyman tech', unit: 'per person/hr', basic: '$65', standard: '$85', complex: '$110', notes: 'For general repair, prep, assembly, cleanup, and non-licensed tasks.' },
  { category: 'General Labour & Minimums', service: 'Skilled renovation tech / carpenter', unit: 'per person/hr', basic: '$75', standard: '$95', complex: '$125', notes: 'Finish carpentry, doors, trim, framing layout, and problem solving.' },
  { category: 'General Labour & Minimums', service: 'Two-person crew', unit: 'crew/hr', basic: '$130', standard: '$170', complex: '$220', notes: 'Use when lifting, speed, safety, or supervision requires two workers.' },
  { category: 'General Labour & Minimums', service: 'Half-day two-person crew package', unit: '4 hrs', basic: '$500', standard: '$650', complex: '$850', notes: 'Good for small multi-task repair lists.' },
  { category: 'General Labour & Minimums', service: 'Full-day two-person crew package', unit: '8 hrs', basic: '$950', standard: '$1,300', complex: '$1,700', notes: 'Good for full-day punch list / renovation prep.' },
  { category: 'General Labour & Minimums', service: 'Mobilization, setup, and final tidy', unit: 'per project', basic: '$75', standard: '$125', complex: '$200', notes: 'Add for jobs requiring tool setup, staging, and cleanup.' },
  { category: 'General Labour & Minimums', service: 'Dust protection / basic masking', unit: 'per room', basic: '$75', standard: '$150', complex: '$300', notes: 'Poly, tape, zipper walls, floor protection — materials extra.' },
  { category: 'General Labour & Minimums', service: 'Heavy item move/lift on-site', unit: 'each item', basic: '$45', standard: '$75', complex: '$125', notes: 'Two-person item inside property; does not include disposal.' },
  { category: 'General Labour & Minimums', service: 'Dump run / hauling labour only', unit: 'per load', basic: '$95', standard: '$150', complex: '$250', notes: 'Disposal, landfill fees, and trailer fee extra.' },
  { category: 'General Labour & Minimums', service: 'Travel outside Regina', unit: 'per km', basic: '$0.90', standard: '$1.10', complex: '$1.35', notes: 'Use both ways unless included in a fixed quote.' },
  { category: 'General Labour & Minimums', service: 'Rush / after-hours premium', unit: 'add-on', basic: '+25%', standard: '+50%', complex: '+100%', notes: 'Evenings, weekends, holidays, same-day emergency requests.' },

  // Flooring
  { category: 'Flooring', service: 'Click-lock vinyl plank / SPC / LVP install', unit: 'sq. ft.', basic: '$2.00', standard: '$2.75', complex: '$3.50', notes: 'Customer supplies flooring. Includes normal layout and cuts.' },
  { category: 'Flooring', service: 'Glue-down vinyl plank install', unit: 'sq. ft.', basic: '$2.75', standard: '$3.25', complex: '$4.25', notes: 'Subfloor must be clean/flat. Adhesive and prep extra unless listed.' },
  { category: 'Flooring', service: 'Glue-down vinyl tile install', unit: 'sq. ft.', basic: '$3.00', standard: '$3.75', complex: '$4.75', notes: 'More layout/cuts than plank may push price up.' },
  { category: 'Flooring', service: 'Laminate click flooring install', unit: 'sq. ft.', basic: '$2.25', standard: '$2.75', complex: '$3.50', notes: 'Floating floor, standard rooms.' },
  { category: 'Flooring', service: 'Engineered click flooring install', unit: 'sq. ft.', basic: '$2.75', standard: '$3.50', complex: '$5.00', notes: 'Higher care/material handling.' },
  { category: 'Flooring', service: 'Sheet vinyl install', unit: 'sq. ft.', basic: '$3.00', standard: '$4.00', complex: '$5.50', notes: 'Seams, pattern, and glue increase difficulty.' },
  { category: 'Flooring', service: 'Underlayment install', unit: 'sq. ft.', basic: '$0.50', standard: '$0.75', complex: '$1.25', notes: 'Customer supplies underlayment; taping seams extra if heavy.' },
  { category: 'Flooring', service: 'Quarter round / shoe mould install', unit: 'linear ft.', basic: '$1.50', standard: '$2.50', complex: '$4.00', notes: 'Materials, caulk, paint extra.' },
  { category: 'Flooring', service: 'Transition strip install', unit: 'each', basic: '$25', standard: '$45', complex: '$75', notes: 'Customer supplies transition; cutting/fitting included.' },
  { category: 'Flooring', service: 'Stair nosing install', unit: 'each', basic: '$45', standard: '$75', complex: '$125', notes: 'Customer supplies nosing/adhesive/fasteners.' },
  { category: 'Flooring', service: 'Vinyl stair tread/riser install', unit: 'per step', basic: '$65', standard: '$95', complex: '$150', notes: 'Stairs are slow; charge per step.' },
  { category: 'Flooring', service: 'Carpet removal', unit: 'sq. ft.', basic: '$0.75', standard: '$1.25', complex: '$2.00', notes: 'Disposal extra. Staples/tack strips can increase price.' },
  { category: 'Flooring', service: 'Existing vinyl/laminate removal', unit: 'sq. ft.', basic: '$1.00', standard: '$1.75', complex: '$3.00', notes: 'Glue-down removal often complex.' },
  { category: 'Flooring', service: 'Tile flooring removal', unit: 'sq. ft.', basic: '$3.50', standard: '$5.00', complex: '$8.00', notes: 'Dust control, disposal, subfloor repair extra.' },
  { category: 'Flooring', service: 'Subfloor screw-down / squeak repair', unit: 'sq. ft.', basic: '$0.75', standard: '$1.50', complex: '$2.50', notes: 'Materials extra.' },
  { category: 'Flooring', service: 'Floor patch / feather finish labour', unit: 'sq. ft.', basic: '$1.50', standard: '$2.50', complex: '$4.00', notes: 'Patch product/materials extra.' },
  { category: 'Flooring', service: 'Self-leveling labour', unit: 'sq. ft.', basic: '$2.00', standard: '$3.50', complex: '$5.00', notes: 'Leveler material, primer, damming, and prep extra.' },
  { category: 'Flooring', service: 'Floor-prep minimum charge', unit: 'each job', basic: '$150', standard: '$250', complex: '$400', notes: 'Use when prep is required before install.' },

  // Baseboards / trim
  { category: 'Baseboards, Trim & Finish Carpentry', service: 'Baseboard removal', unit: 'linear ft.', basic: '$0.75', standard: '$1.25', complex: '$2.00', notes: 'Disposal and wall repair extra.' },
  { category: 'Baseboards, Trim & Finish Carpentry', service: 'Baseboard installation', unit: 'linear ft.', basic: '$3.00', standard: '$4.50', complex: '$7.00', notes: 'Cut, fit, nail. Caulk/paint separate unless included.' },
  { category: 'Baseboards, Trim & Finish Carpentry', service: 'Baseboard caulking', unit: 'linear ft.', basic: '$0.75', standard: '$1.25', complex: '$2.00', notes: 'Caulk material extra unless minor.' },
  { category: 'Baseboards, Trim & Finish Carpentry', service: 'Nail-hole fill on trim', unit: 'linear ft.', basic: '$0.75', standard: '$1.25', complex: '$2.00', notes: 'Sanding/painting separate.' },
  { category: 'Baseboards, Trim & Finish Carpentry', service: 'Paint baseboards', unit: 'linear ft.', basic: '$1.50', standard: '$2.50', complex: '$4.00', notes: 'Paint/materials extra.' },
  { category: 'Baseboards, Trim & Finish Carpentry', service: 'Door/window casing installation', unit: 'linear ft.', basic: '$3.50', standard: '$5.00', complex: '$8.00', notes: 'Includes standard mitres. Paint/caulk extra.' },
  { category: 'Baseboards, Trim & Finish Carpentry', service: 'Door casing set', unit: 'per side', basic: '$65', standard: '$95', complex: '$150', notes: 'Useful for one-off door trim.' },
  { category: 'Baseboards, Trim & Finish Carpentry', service: 'Crown moulding installation', unit: 'linear ft.', basic: '$7.00', standard: '$12.00', complex: '$20.00', notes: 'Complex angles and ceilings increase price.' },
  { category: 'Baseboards, Trim & Finish Carpentry', service: 'Quarter round install', unit: 'linear ft.', basic: '$1.50', standard: '$2.50', complex: '$4.00', notes: 'Often added after flooring.' },
  { category: 'Baseboards, Trim & Finish Carpentry', service: 'Closet shelf/rod install', unit: 'each closet', basic: '$75', standard: '$125', complex: '$225', notes: 'Customer supplies shelf/rod/brackets.' },
  { category: 'Baseboards, Trim & Finish Carpentry', service: 'Small trim repair', unit: 'each area', basic: '$45', standard: '$75', complex: '$125', notes: 'Patch/replace small piece; materials extra.' },
  { category: 'Baseboards, Trim & Finish Carpentry', service: 'Custom blocking/backing for shelves/railings', unit: 'each', basic: '$15', standard: '$30', complex: '$50', notes: 'Before drywall or after opening wall.' },

  // Framing, insulation, vapour, drywall
  { category: 'Framing, Insulation, Vapour & Drywall', service: 'Non-load-bearing interior wall framing', unit: 'linear ft.', basic: '$18', standard: '$25', complex: '$40', notes: 'Wood/steel studs and fasteners extra. Permits may apply.' },
  { category: 'Framing, Insulation, Vapour & Drywall', service: 'Bulkhead / soffit framing', unit: 'linear ft.', basic: '$30', standard: '$50', complex: '$85', notes: 'For ducts, beams, pipes, or ceiling drops.' },
  { category: 'Framing, Insulation, Vapour & Drywall', service: 'Backing/blocking install', unit: 'each', basic: '$15', standard: '$30', complex: '$50', notes: 'For cabinets, grab bars, TV mounts, handrails.' },
  { category: 'Framing, Insulation, Vapour & Drywall', service: 'Batt insulation install', unit: 'sq. ft.', basic: '$0.75', standard: '$1.10', complex: '$1.75', notes: 'Material extra. Use wall/ceiling surface area.' },
  { category: 'Framing, Insulation, Vapour & Drywall', service: 'Poly vapour barrier install', unit: 'sq. ft.', basic: '$0.60', standard: '$0.90', complex: '$1.50', notes: 'Material extra; warm-side code-compliant install.' },
  { category: 'Framing, Insulation, Vapour & Drywall', service: 'Acoustical sealant / poly detail', unit: 'linear ft.', basic: '$0.75', standard: '$1.25', complex: '$2.00', notes: 'Around penetrations, plates, openings.' },
  { category: 'Framing, Insulation, Vapour & Drywall', service: 'Drywall hanging — walls', unit: 'sq. ft. board area', basic: '$0.75', standard: '$1.10', complex: '$1.75', notes: 'Sheets/materials extra.' },
  { category: 'Framing, Insulation, Vapour & Drywall', service: 'Drywall hanging — ceilings', unit: 'sq. ft. board area', basic: '$1.25', standard: '$1.75', complex: '$2.75', notes: 'Ceilings are slower and may require lift/helper.' },
  { category: 'Framing, Insulation, Vapour & Drywall', service: 'Drywall taping/mudding/sanding', unit: 'sq. ft. board area', basic: '$1.25', standard: '$2.00', complex: '$3.00', notes: 'Level 4 standard finish.' },
  { category: 'Framing, Insulation, Vapour & Drywall', service: 'Drywall hang + finish combined', unit: 'sq. ft. board area', basic: '$2.00', standard: '$3.00', complex: '$4.50', notes: 'Use when pricing full drywall labour only.' },
  { category: 'Framing, Insulation, Vapour & Drywall', service: 'Corner bead install/finish', unit: 'linear ft.', basic: '$2.00', standard: '$3.50', complex: '$6.00', notes: 'Metal/vinyl bead materials extra.' },
  { category: 'Framing, Insulation, Vapour & Drywall', service: 'Small drywall patch', unit: 'each', basic: '$95', standard: '$150', complex: '$300', notes: 'Approx. under 2 sq. ft.; texture/paint extra.' },
  { category: 'Framing, Insulation, Vapour & Drywall', service: 'Medium drywall patch', unit: 'each', basic: '$175', standard: '$300', complex: '$500', notes: 'Approx. 2–8 sq. ft.; texture/paint extra.' },
  { category: 'Framing, Insulation, Vapour & Drywall', service: 'Texture repair / skim patch', unit: 'sq. ft.', basic: '$1.75', standard: '$3.00', complex: '$5.50', notes: 'Matching existing texture is not guaranteed.' },
  { category: 'Framing, Insulation, Vapour & Drywall', service: 'Level 5 skim coat', unit: 'sq. ft.', basic: '$3.00', standard: '$5.00', complex: '$8.00', notes: 'Premium walls / critical lighting.' },
  { category: 'Framing, Insulation, Vapour & Drywall', service: 'Final drywall sanding/touch-up', unit: 'sq. ft.', basic: '$0.50', standard: '$1.00', complex: '$1.75', notes: 'Use after other trades or prior to paint.' },
  { category: 'Framing, Insulation, Vapour & Drywall', service: 'Resilient channel / soundproofing labour', unit: 'sq. ft.', basic: '$1.00', standard: '$1.75', complex: '$3.00', notes: 'Materials extra.' },

  // Interior painting
  { category: 'Interior Painting & Finishing', service: 'Prime new drywall', unit: 'sq. ft. wall area', basic: '$0.75', standard: '$1.25', complex: '$2.00', notes: 'Primer/materials extra.' },
  { category: 'Interior Painting & Finishing', service: 'Paint walls — 2 coats', unit: 'sq. ft. wall area', basic: '$1.50', standard: '$2.50', complex: '$4.00', notes: 'Paint/materials extra. Prep level changes price.' },
  { category: 'Interior Painting & Finishing', service: 'Paint ceiling', unit: 'sq. ft. ceiling area', basic: '$1.50', standard: '$2.25', complex: '$3.75', notes: 'Texture/repairs extra.' },
  { category: 'Interior Painting & Finishing', service: 'Paint door slab', unit: 'each side set', basic: '$55', standard: '$85', complex: '$140', notes: 'Per door, both sides basic.' },
  { category: 'Interior Painting & Finishing', service: 'Paint trim/baseboard', unit: 'linear ft.', basic: '$1.50', standard: '$2.50', complex: '$4.00', notes: 'Includes brushwork labour only.' },
  { category: 'Interior Painting & Finishing', service: 'Patch/sand before painting', unit: 'per room', basic: '$125', standard: '$250', complex: '$500', notes: 'Depends on nail holes, damage, sanding, stains.' },
  { category: 'Interior Painting & Finishing', service: 'Accent wall', unit: 'each', basic: '$150', standard: '$250', complex: '$450', notes: 'Labour only, simple wall.' },
  { category: 'Interior Painting & Finishing', service: 'Deep/dark colour change add-on', unit: 'sq. ft.', basic: '$0.50', standard: '$1.00', complex: '$2.00', notes: 'Extra coats and cut lines.' },
  { category: 'Interior Painting & Finishing', service: 'Paint stair railing', unit: 'linear ft.', basic: '$10', standard: '$18', complex: '$30', notes: 'Prep/sanding can increase price.' },
  { category: 'Interior Painting & Finishing', service: 'Cabinet painting labour', unit: 'per door/drawer', basic: '$75', standard: '$125', complex: '$200', notes: 'Specialty prep/finish; materials extra.' },

  // Doors, locks, hardware
  { category: 'Doors, Locks & Hardware', service: 'Interior pre-hung door install', unit: 'each', basic: '$175', standard: '$275', complex: '$450', notes: 'Customer supplies door. Casing/paint separate unless included.' },
  { category: 'Doors, Locks & Hardware', service: 'Interior slab door fit and hang', unit: 'each', basic: '$150', standard: '$250', complex: '$400', notes: 'Cut/plane/mortise hardware as needed.' },
  { category: 'Doors, Locks & Hardware', service: 'Bi-fold closet door install', unit: 'each opening', basic: '$150', standard: '$225', complex: '$350', notes: 'Customer supplies track/hardware.' },
  { category: 'Doors, Locks & Hardware', service: 'Pocket door adjustment/repair', unit: 'each', basic: '$125', standard: '$225', complex: '$400', notes: 'Does not include opening wall unless listed.' },
  { category: 'Doors, Locks & Hardware', service: 'Exterior door install — non-structural swap', unit: 'each', basic: '$450', standard: '$750', complex: '$1,200', notes: 'Weatherproofing/rot repair/materials extra.' },
  { category: 'Doors, Locks & Hardware', service: 'Storm door install', unit: 'each', basic: '$225', standard: '$350', complex: '$600', notes: 'Customer supplies door and hardware.' },
  { category: 'Doors, Locks & Hardware', service: 'Bedroom/pass/privacy knob replace', unit: 'each', basic: '$45', standard: '$75', complex: '$125', notes: 'Customer supplies lockset.' },
  { category: 'Doors, Locks & Hardware', service: 'Deadbolt replace/install', unit: 'each', basic: '$75', standard: '$125', complex: '$225', notes: 'Drilling new bore is complex.' },
  { category: 'Doors, Locks & Hardware', service: 'Smart lock install', unit: 'each', basic: '$100', standard: '$175', complex: '$300', notes: 'Programming/setup can be added.' },
  { category: 'Doors, Locks & Hardware', service: 'Hinge/strike adjustment', unit: 'each door', basic: '$35', standard: '$75', complex: '$125', notes: 'For rubbing, latching, minor alignment.' },
  { category: 'Doors, Locks & Hardware', service: 'Door stop install', unit: 'each', basic: '$20', standard: '$35', complex: '$60', notes: 'Good add-on item.' },
  { category: 'Doors, Locks & Hardware', service: 'Weatherstripping door', unit: 'each', basic: '$65', standard: '$110', complex: '$180', notes: 'Materials extra.' },

  // Plumbing fixtures / bathroom
  { category: 'Plumbing Fixtures & Bathroom Installs', service: 'Toilet replacement/swap', unit: 'each', basic: '$225', standard: '$350', complex: '$600', notes: 'Licensed plumber/permit may be required; flange issues extra.' },
  { category: 'Plumbing Fixtures & Bathroom Installs', service: 'Toilet flange repair labour', unit: 'each', basic: '$125', standard: '$250', complex: '$500', notes: 'Parts, flooring repair, and plumbing permit extra.' },
  { category: 'Plumbing Fixtures & Bathroom Installs', service: 'Showerhead replacement', unit: 'each', basic: '$45', standard: '$75', complex: '$125', notes: 'No wall plumbing changes.' },
  { category: 'Plumbing Fixtures & Bathroom Installs', service: 'Tub spout replacement', unit: 'each', basic: '$75', standard: '$125', complex: '$225', notes: 'If pipe/thread issue appears, quote separately.' },
  { category: 'Plumbing Fixtures & Bathroom Installs', service: 'Bathroom faucet replacement', unit: 'each', basic: '$125', standard: '$225', complex: '$400', notes: 'Customer supplies faucet; supply lines/material extra.' },
  { category: 'Plumbing Fixtures & Bathroom Installs', service: 'Kitchen faucet replacement', unit: 'each', basic: '$150', standard: '$250', complex: '$450', notes: 'Tight sink access increases price.' },
  { category: 'Plumbing Fixtures & Bathroom Installs', service: 'Vanity installation', unit: 'each', basic: '$250', standard: '$450', complex: '$800', notes: 'Plumbing connection and wall repair extra if complex.' },
  { category: 'Plumbing Fixtures & Bathroom Installs', service: 'Sink drain / P-trap replacement', unit: 'each', basic: '$95', standard: '$175', complex: '$350', notes: 'Parts/materials extra.' },
  { category: 'Plumbing Fixtures & Bathroom Installs', service: 'Garbage disposal install', unit: 'each', basic: '$175', standard: '$300', complex: '$500', notes: 'Electrical/plumbing conditions may require licensed trade.' },
  { category: 'Plumbing Fixtures & Bathroom Installs', service: 'Tub/shower silicone recaulk', unit: 'each wet area', basic: '$125', standard: '$225', complex: '$400', notes: 'Removal of old silicone included at standard level.' },
  { category: 'Plumbing Fixtures & Bathroom Installs', service: 'Shower door installation', unit: 'each', basic: '$275', standard: '$450', complex: '$800', notes: 'Glass handling risk; charge higher for heavy/custom units.' },
  { category: 'Plumbing Fixtures & Bathroom Installs', service: 'Grab bar install', unit: 'each', basic: '$65', standard: '$125', complex: '$250', notes: 'Must hit blocking/stud or use rated anchors.' },
  { category: 'Plumbing Fixtures & Bathroom Installs', service: 'Towel bar / TP holder / robe hook', unit: 'each', basic: '$35', standard: '$60', complex: '$100', notes: 'Small add-on task; minimum charge applies.' },

  // Appliances
  { category: 'Appliances', service: 'Dishwasher replacement — ready opening', unit: 'each', basic: '$185', standard: '$300', complex: '$500', notes: 'Water/drain/electrical already in place; test cycle included.' },
  { category: 'Appliances', service: 'Dishwasher first-time fit-up', unit: 'each', basic: '$350', standard: '$600', complex: '$1,000', notes: 'Cabinet/plumbing/electrical work extra; licensed trades may be needed.' },
  { category: 'Appliances', service: 'Over-range microwave install', unit: 'each', basic: '$175', standard: '$300', complex: '$500', notes: 'Customer supplies bracket/template; venting may be extra.' },
  { category: 'Appliances', service: 'Range hood replacement', unit: 'each', basic: '$150', standard: '$275', complex: '$475', notes: 'Duct changes/electrical extra.' },
  { category: 'Appliances', service: 'Fridge waterline connection', unit: 'each', basic: '$125', standard: '$225', complex: '$400', notes: 'Licensed plumbing may be required.' },
  { category: 'Appliances', service: 'Washer/dryer hookup — ready connections', unit: 'set', basic: '$95', standard: '$175', complex: '$300', notes: 'Level, connect, test. Parts extra.' },
  { category: 'Appliances', service: 'Stacked laundry install', unit: 'set', basic: '$250', standard: '$450', complex: '$750', notes: 'Two-person lift usually required.' },
  { category: 'Appliances', service: 'Old appliance removal from room', unit: 'each', basic: '$50', standard: '$100', complex: '$200', notes: 'Disposal/recycling fee extra.' },
  { category: 'Appliances', service: 'Cabinet opening adjustment for appliance', unit: 'each', basic: '$150', standard: '$300', complex: '$600', notes: 'Carpentry only; refinishing extra.' },
  { category: 'Appliances', service: 'Appliance level/test/service call', unit: 'each', basic: '$75', standard: '$125', complex: '$200', notes: 'Minimum charge may apply.' },

  // Electrical / low-voltage
  { category: 'Electrical Fixtures & Low-Voltage', service: 'Light fixture replacement', unit: 'each', basic: '$125', standard: '$200', complex: '$350', notes: 'Licensed electrician/permit may be required.' },
  { category: 'Electrical Fixtures & Low-Voltage', service: 'Ceiling fan replacement/install', unit: 'each', basic: '$175', standard: '$300', complex: '$500', notes: 'Fan-rated box required; electrical scope extra.' },
  { category: 'Electrical Fixtures & Low-Voltage', service: 'Bathroom fan replacement', unit: 'each', basic: '$200', standard: '$350', complex: '$650', notes: 'Venting/electrical conditions can change price.' },
  { category: 'Electrical Fixtures & Low-Voltage', service: 'Switch/receptacle replacement', unit: 'each', basic: '$75', standard: '$125', complex: '$225', notes: 'Licensed electrician/permit may be required.' },
  { category: 'Electrical Fixtures & Low-Voltage', service: 'New receptacle/fished wire', unit: 'each', basic: '$250', standard: '$450', complex: '$800', notes: 'Electrical permit/licensed trade item.' },
  { category: 'Electrical Fixtures & Low-Voltage', service: 'Smoke/CO alarm replacement', unit: 'each', basic: '$65', standard: '$110', complex: '$175', notes: 'Hardwired units may need electrician.' },
  { category: 'Electrical Fixtures & Low-Voltage', service: 'Doorbell camera install', unit: 'each', basic: '$100', standard: '$175', complex: '$300', notes: 'Wi-Fi/app setup can be added.' },
  { category: 'Electrical Fixtures & Low-Voltage', service: 'Thermostat replacement', unit: 'each', basic: '$100', standard: '$175', complex: '$300', notes: 'Compatibility check required.' },
  { category: 'Electrical Fixtures & Low-Voltage', service: 'TV wall mount', unit: 'each', basic: '$125', standard: '$225', complex: '$400', notes: 'Customer supplies mount; wire concealment extra.' },
  { category: 'Electrical Fixtures & Low-Voltage', service: 'Low-voltage cable chase / wire concealment', unit: 'each', basic: '$125', standard: '$250', complex: '$500', notes: 'Wall type and fishing difficulty determine price.' },

  // Tile / wet areas
  { category: 'Tile, Backsplash, Grout & Wet Areas', service: 'Kitchen backsplash tile install', unit: 'sq. ft.', basic: '$12', standard: '$18', complex: '$30', notes: 'Tile, setting materials, trim, grout extra.' },
  { category: 'Tile, Backsplash, Grout & Wet Areas', service: 'Floor tile install', unit: 'sq. ft.', basic: '$12', standard: '$18', complex: '$32', notes: 'Prep/uncoupling membrane extra.' },
  { category: 'Tile, Backsplash, Grout & Wet Areas', service: 'Wall tile install', unit: 'sq. ft.', basic: '$15', standard: '$25', complex: '$45', notes: 'Layout, cuts, and wall flatness affect price.' },
  { category: 'Tile, Backsplash, Grout & Wet Areas', service: 'Shower tile install', unit: 'sq. ft.', basic: '$25', standard: '$40', complex: '$65', notes: 'Waterproofing, niche, slope, and prep extra.' },
  { category: 'Tile, Backsplash, Grout & Wet Areas', service: 'Waterproofing membrane labour', unit: 'sq. ft.', basic: '$2.50', standard: '$4.00', complex: '$7.00', notes: 'Materials extra. Critical for showers.' },
  { category: 'Tile, Backsplash, Grout & Wet Areas', service: 'Tile removal', unit: 'sq. ft.', basic: '$4', standard: '$7', complex: '$12', notes: 'Disposal, dust control, substrate repair extra.' },
  { category: 'Tile, Backsplash, Grout & Wet Areas', service: 'Grout refresh / regrout', unit: 'sq. ft.', basic: '$4', standard: '$8', complex: '$15', notes: 'Depends on grout condition and tile size.' },
  { category: 'Tile, Backsplash, Grout & Wet Areas', service: 'Tile repair', unit: 'each area', basic: '$125', standard: '$250', complex: '$600', notes: 'Customer supplies matching tile if available.' },
  { category: 'Tile, Backsplash, Grout & Wet Areas', service: 'Shower niche labour', unit: 'each', basic: '$150', standard: '$300', complex: '$600', notes: 'Framing/waterproofing/materials extra.' },
  { category: 'Tile, Backsplash, Grout & Wet Areas', service: 'Threshold/sill install', unit: 'each', basic: '$75', standard: '$150', complex: '$300', notes: 'Stone/metal/wood supplied by customer.' },

  // Cabinets / countertops
  { category: 'Kitchen Cabinets, Shelving & Countertops', service: 'Flat-pack cabinet assembly', unit: 'each cabinet', basic: '$75', standard: '$125', complex: '$225', notes: 'Customer supplies cabinet kit.' },
  { category: 'Kitchen Cabinets, Shelving & Countertops', service: 'Wall/base cabinet installation', unit: 'each cabinet', basic: '$125', standard: '$225', complex: '$400', notes: 'Layout, levelling, fastening. Fillers/panels extra.' },
  { category: 'Kitchen Cabinets, Shelving & Countertops', service: 'Cabinet hardware pull/knob install', unit: 'each', basic: '$8', standard: '$15', complex: '$30', notes: 'Template/layout included at standard level.' },
  { category: 'Kitchen Cabinets, Shelving & Countertops', service: 'Laminate countertop install', unit: 'linear ft.', basic: '$35', standard: '$60', complex: '$100', notes: 'Counter supplied by customer; scribing/cutouts extra.' },
  { category: 'Kitchen Cabinets, Shelving & Countertops', service: 'Sink cutout labour', unit: 'each', basic: '$100', standard: '$175', complex: '$300', notes: 'Cut only; plumbing separate.' },
  { category: 'Kitchen Cabinets, Shelving & Countertops', service: 'Toe kick install', unit: 'linear ft.', basic: '$5', standard: '$8', complex: '$15', notes: 'Materials extra.' },
  { category: 'Kitchen Cabinets, Shelving & Countertops', service: 'Filler/panel install', unit: 'each', basic: '$40', standard: '$75', complex: '$150', notes: 'Cut/fit/scribe.' },
  { category: 'Kitchen Cabinets, Shelving & Countertops', service: 'Cabinet door/drawer adjustment', unit: 'each', basic: '$45', standard: '$75', complex: '$150', notes: 'Good small maintenance add-on.' },
  { category: 'Kitchen Cabinets, Shelving & Countertops', service: 'Floating shelf install', unit: 'each', basic: '$60', standard: '$100', complex: '$200', notes: 'Blocking/anchors/wall type affect price.' },
  { category: 'Kitchen Cabinets, Shelving & Countertops', service: 'Pantry/utility shelving', unit: 'linear ft.', basic: '$10', standard: '$18', complex: '$35', notes: 'Customer supplies materials.' },

  // Bathroom accessories
  { category: 'Bathroom Accessories & Finish Items', service: 'Mirror installation', unit: 'each', basic: '$75', standard: '$125', complex: '$250', notes: 'Heavy/oversized mirrors require two-person rate.' },
  { category: 'Bathroom Accessories & Finish Items', service: 'Medicine cabinet surface mount', unit: 'each', basic: '$100', standard: '$175', complex: '$350', notes: 'Recessed installation requires separate quote.' },
  { category: 'Bathroom Accessories & Finish Items', service: 'Shower curtain rod install', unit: 'each', basic: '$45', standard: '$75', complex: '$150', notes: 'Tile drilling is complex.' },
  { category: 'Bathroom Accessories & Finish Items', service: 'Bathroom accessory package', unit: 'per bathroom', basic: '$150', standard: '$275', complex: '$500', notes: 'TP holder, towel bar/ring, robe hook, mirror small.' },
  { category: 'Bathroom Accessories & Finish Items', service: 'Vanity light replacement', unit: 'each', basic: '$125', standard: '$225', complex: '$400', notes: 'Licensed electrician/permit may be required.' },
  { category: 'Bathroom Accessories & Finish Items', service: 'Wet-area silicone package', unit: 'per bathroom', basic: '$125', standard: '$225', complex: '$400', notes: 'Tub/shower/sink edges, removal of failed caulk extra if heavy.' },
  { category: 'Bathroom Accessories & Finish Items', service: 'Drywall repair behind tub/vanity', unit: 'each area', basic: '$250', standard: '$500', complex: '$1,000', notes: 'Hidden moisture/mold requires separate handling.' },

  // Wall-mounted / blinds / organizers
  { category: 'Wall-Mounted Items, Blinds, Rails & Organizers', service: 'Blind installation', unit: 'each window', basic: '$35', standard: '$65', complex: '$125', notes: 'Customer supplies blinds/hardware.' },
  { category: 'Wall-Mounted Items, Blinds, Rails & Organizers', service: 'Curtain rod install', unit: 'each window', basic: '$45', standard: '$75', complex: '$150', notes: 'Heavy rods/wide spans require more.' },
  { category: 'Wall-Mounted Items, Blinds, Rails & Organizers', service: 'Closet organizer installation', unit: 'each closet', basic: '$125', standard: '$250', complex: '$600', notes: 'Customer supplies kit.' },
  { category: 'Wall-Mounted Items, Blinds, Rails & Organizers', service: 'Picture/art install', unit: 'each item', basic: '$25', standard: '$50', complex: '$125', notes: 'Minimum charge applies.' },
  { category: 'Wall-Mounted Items, Blinds, Rails & Organizers', service: 'Wall-mounted cabinet', unit: 'each', basic: '$100', standard: '$175', complex: '$350', notes: 'Blocking/wall type and weight affect price.' },
  { category: 'Wall-Mounted Items, Blinds, Rails & Organizers', service: 'Handrail installation', unit: 'linear ft.', basic: '$15', standard: '$25', complex: '$50', notes: 'Customer supplies rail/brackets.' },
  { category: 'Wall-Mounted Items, Blinds, Rails & Organizers', service: 'Stair handrail package', unit: 'each run', basic: '$150', standard: '$300', complex: '$600', notes: 'Layout, brackets, fastening.' },

  // Exterior
  { category: 'Exterior, Deck, Fence, Siding & Drainage', service: 'Deck board replacement', unit: 'linear ft.', basic: '$8', standard: '$15', complex: '$30', notes: 'Materials extra. Fastener removal can raise price.' },
  { category: 'Exterior, Deck, Fence, Siding & Drainage', service: 'Deck railing repair/install', unit: 'linear ft.', basic: '$25', standard: '$45', complex: '$85', notes: 'Materials extra; code requirements may apply.' },
  { category: 'Exterior, Deck, Fence, Siding & Drainage', service: 'Step repair/rebuild labour', unit: 'each step/area', basic: '$150', standard: '$300', complex: '$600', notes: 'Materials/permits extra if structural.' },
  { category: 'Exterior, Deck, Fence, Siding & Drainage', service: 'Fence board/picket replacement', unit: 'each board', basic: '$15', standard: '$30', complex: '$60', notes: 'Materials extra.' },
  { category: 'Exterior, Deck, Fence, Siding & Drainage', service: 'Fence panel installation', unit: 'each panel', basic: '$125', standard: '$250', complex: '$500', notes: 'Posts/concrete/footings extra.' },
  { category: 'Exterior, Deck, Fence, Siding & Drainage', service: 'Gate repair/adjustment', unit: 'each', basic: '$125', standard: '$250', complex: '$500', notes: 'Hardware/materials extra.' },
  { category: 'Exterior, Deck, Fence, Siding & Drainage', service: 'Exterior caulking', unit: 'linear ft.', basic: '$4', standard: '$7', complex: '$12', notes: 'Material extra; access/height can increase price.' },
  { category: 'Exterior, Deck, Fence, Siding & Drainage', service: 'Siding panel repair', unit: 'each area', basic: '$150', standard: '$300', complex: '$700', notes: 'Matching material supplied by customer.' },
  { category: 'Exterior, Deck, Fence, Siding & Drainage', service: 'Soffit/fascia repair', unit: 'linear ft.', basic: '$15', standard: '$30', complex: '$60', notes: 'Height/access affects price.' },
  { category: 'Exterior, Deck, Fence, Siding & Drainage', service: 'Eavestrough/downspout simple install', unit: 'linear ft.', basic: '$8', standard: '$15', complex: '$30', notes: 'Materials extra; custom colours/height extra.' },
  { category: 'Exterior, Deck, Fence, Siding & Drainage', service: 'Pressure wash deck/patio', unit: 'sq. ft.', basic: '$0.25', standard: '$0.40', complex: '$0.70', notes: 'Water access required.' },
  { category: 'Exterior, Deck, Fence, Siding & Drainage', service: 'Deck/fence staining labour', unit: 'sq. ft.', basic: '$1.50', standard: '$2.50', complex: '$4.50', notes: 'Prep and stain/materials extra.' },

  // Demo / cleanup
  { category: 'Demolition, Prep & Cleanup', service: 'Light demolition labour', unit: 'per person/hr', basic: '$65', standard: '$85', complex: '$110', notes: 'Non-hazardous only.' },
  { category: 'Demolition, Prep & Cleanup', service: 'Drywall demolition', unit: 'sq. ft.', basic: '$1', standard: '$2', complex: '$4', notes: 'Disposal/dust control extra.' },
  { category: 'Demolition, Prep & Cleanup', service: 'Flooring demolition', unit: 'sq. ft.', basic: '$1', standard: '$2', complex: '$5', notes: 'Tile/glue-down at high end.' },
  { category: 'Demolition, Prep & Cleanup', service: 'Kitchen cabinet removal', unit: 'each cabinet', basic: '$50', standard: '$100', complex: '$200', notes: 'Disposal extra.' },
  { category: 'Demolition, Prep & Cleanup', service: 'Bathroom vanity removal', unit: 'each', basic: '$75', standard: '$150', complex: '$300', notes: 'Plumbing disconnect/permit may be required.' },
  { category: 'Demolition, Prep & Cleanup', service: 'Toilet removal', unit: 'each', basic: '$75', standard: '$125', complex: '$200', notes: 'Disposal and new install separate.' },
  { category: 'Demolition, Prep & Cleanup', service: 'Load debris to trailer', unit: 'crew/hr', basic: '$130', standard: '$170', complex: '$220', notes: 'Landfill/disposal extra.' },
  { category: 'Demolition, Prep & Cleanup', service: 'Jobsite protection', unit: 'per room', basic: '$75', standard: '$150', complex: '$300', notes: 'Ram board/poly/tape materials extra.' },
  { category: 'Demolition, Prep & Cleanup', service: 'Final construction clean', unit: 'sq. ft.', basic: '$0.25', standard: '$0.45', complex: '$0.80', notes: 'Post-reno dust wipe/vacuum; deep cleaning extra.' },
  { category: 'Demolition, Prep & Cleanup', service: 'Hazardous material/asbestos/mold handling', unit: 'specialist', basic: 'Do not quote', standard: 'Do not quote', complex: 'Do not quote', notes: 'Use certified specialist and written scope.' },

  // Property maintenance add-ons
  { category: 'Property Maintenance Add-Ons', service: 'Interior caulking — general', unit: 'linear ft.', basic: '$2', standard: '$4', complex: '$8', notes: 'Baseboards, trim, gaps; material extra.' },
  { category: 'Property Maintenance Add-Ons', service: 'Window weatherstripping', unit: 'each window', basic: '$30', standard: '$65', complex: '$125', notes: 'Materials extra.' },
  { category: 'Property Maintenance Add-Ons', service: 'Drywall anchor/hole repair', unit: 'each small area', basic: '$20', standard: '$40', complex: '$75', notes: 'Minimum charge applies.' },
  { category: 'Property Maintenance Add-Ons', service: 'Furniture assembly', unit: 'per person/hr', basic: '$65', standard: '$85', complex: '$110', notes: 'Customer supplies item.' },
  { category: 'Property Maintenance Add-Ons', service: 'Mailbox install/replace', unit: 'each', basic: '$75', standard: '$125', complex: '$250', notes: 'Materials/concrete extra.' },
  { category: 'Property Maintenance Add-Ons', service: 'Downspout extension install', unit: 'each', basic: '$25', standard: '$50', complex: '$100', notes: 'Extension material extra.' },
  { category: 'Property Maintenance Add-Ons', service: 'Minor concrete crack seal', unit: 'linear ft.', basic: '$5', standard: '$10', complex: '$20', notes: 'Sealant/material extra; not structural repair.' },
  { category: 'Property Maintenance Add-Ons', service: 'Air leak sealing / insulation touch-up', unit: 'per person/hr', basic: '$65', standard: '$85', complex: '$110', notes: 'Materials extra.' },
  { category: 'Property Maintenance Add-Ons', service: 'Gutter cleaning — single storey', unit: 'linear ft.', basic: '$1.50', standard: '$2.50', complex: '$4.00', notes: 'Height/access/debris condition affects price.' },
];

export const PRICE_CATEGORIES = Array.from(new Set(PRICE_ROWS.map(r => r.category)));
