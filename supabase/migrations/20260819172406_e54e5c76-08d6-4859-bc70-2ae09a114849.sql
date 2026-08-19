DO $$
DECLARE v_cust uuid; v_prop uuid; v_quote uuid;
BEGIN
  SELECT id INTO v_cust FROM public.customers
   WHERE company_name ILIKE '%Victoria Square%' OR email = 'bob@vicsquare.ca' LIMIT 1;

  IF v_cust IS NULL THEN
    INSERT INTO public.customers (first_name, last_name, company_name, email, phone,
      address_line_1, city, province, postal_code, customer_type, account_type,
      customer_status, portal_access_enabled)
    VALUES ('Bob','Skinner','Victoria Square Shopping Centre','bob@vicsquare.ca','(306) 502-5755',
      '2223 Victoria Avenue East','Regina','SK','S4N 6E4','Commercial','Company','Active', true)
    RETURNING id INTO v_cust;
  END IF;

  SELECT id INTO v_prop FROM public.properties
   WHERE customer_id = v_cust AND address_line_1 ILIKE '2223 Victoria Avenue East' LIMIT 1;
  IF v_prop IS NULL THEN
    INSERT INTO public.properties (customer_id, property_name, address_line_1, city, province, postal_code, property_type, status)
    VALUES (v_cust,'Victoria Square Shopping Centre','2223 Victoria Avenue East','Regina','SK','S4N 6E4','Commercial','Active')
    RETURNING id INTO v_prop;
  END IF;

  INSERT INTO public.quotes (quote_number, customer_id, property_id, service_category, quote_date,
    approval_status, unit_rate_quote, gst_rate, pst_rate, scope_of_work, project_notes, customer_notes, terms_conditions)
  VALUES ('', v_cust, v_prop, 'Snow & Ice', CURRENT_DATE, 'Needs review', true, 0.0500, 0.0000,
$scope$SERVICE TITLE: 2026–2027 Commercial Snow Removal & Ice Control — Victoria Square Shopping Centre

SERVICE LOCATION
Victoria Square Shopping Centre
2223 Victoria Avenue East
Regina, Saskatchewan  S4N 6E4
(One commercial property location.)

UNIT-RATE QUOTATION — NO FIXED CONTRACT TOTAL
This is a unit-rate quotation. The rates listed on the Unit-Rate Pricing Schedule are individual rates and are not added together to form a fixed quotation total. Final invoicing is based only on actual authorized services performed and the actual equipment, equipment hours, labour hours, loads hauled, disposal loads, ice-control applications and materials used. Applicable taxes (5% GST; snow services are not subject to Saskatchewan PST) are applied on the actual invoice.

SCOPE OF WORK (subject to customer authorization and the final approved service map)
- Commercial parking-lot snow clearing.
- Main vehicle drive lanes.
- Vehicle entrances and exits.
- Approved loading and service-access routes.
- Approved garbage-access routes.
- On-site snow pushing and piling in customer-approved snow-storage areas.
- Pedestrian-area snow clearing when authorized.
- Sidewalk and entrance clearing when authorized.
- Ice control for pedestrian areas when authorized.
- Ice control for parking and vehicle areas when authorized.
- Off-site snow hauling when separately requested or authorized.
- Salt, sand and de-icing materials when authorized.

Service boundaries, pedestrian areas, snow-storage locations and any site-specific counts or measurements will be confirmed through a site walkthrough and the approved service map. No site measurements or area counts are assumed in this quotation.$scope$,
$pn$SERVICE PRICING DETAILS
1. Parking Lot / Commercial Vehicle-Area Snow Removal — $150.00 per hour, per equipment unit, operator included. May include an appropriately equipped plow truck, tractor, Bobcat, skid-steer or loader. Each equipment unit actually used is billed separately.
2. Pedestrian / Sidewalk / Entrance Snow Clearing — $85.00 per hour, billed separately from parking-lot clearing. Final pedestrian service areas must be identified on the approved service map.
3. Off-Site Snow Hauling — $450.00 per truck or trailer load, performed only when requested or authorized. Off-site hauling is separate from snow clearing.
4. Dump / Disposal Fee — $95.00 per load.
5. Pedestrian Ice Control — $150.00 per application; materials billed separately.
6. Parking / Vehicle-Area Ice Control — $375.00 per application; materials billed separately.
7. Salt / De-Icer — $54.99 per 20 kg bag; actual quantity used is recorded and invoiced.
8. Sand / Salt Mixture — $333.00 per tonne; actual quantity used is recorded and invoiced.
9. Additional Equipment — $150.00 per hour, per equipment unit, operator included.
10. Additional Labour — $60.00 per hour, per person.
11. Emergency Call-Out — $85.00 per call. Any additional snow-removal labour or equipment is billed according to the applicable authorized unit rates.

SNOWFALL TRIGGER (customer selection)
[ ] Every measurable snowfall   [ ] 5 cm   [ ] 7 cm   [ ] 10 cm   [ ] Other: ______________

SERVICE TYPE (customer selection)
[ ] Seasonal contract   [ ] On-demand / call-out   [ ] Other: ______________

RESPONSE PRIORITY & TIMING
Seasonal contract customers receive dispatch priority, with service targeted as soon as reasonably practicable after the selected snowfall trigger is reached, subject to weather, road safety, site access and equipment availability. On-demand and emergency call-out customers are scheduled after seasonal contract sites and are subject to the emergency call-out fee.

SITE ACCESS & OBSTRUCTIONS
The customer is responsible for reasonable site access. Parked vehicles, delivery trucks, trailers, shopping carts, locked gates, bins, equipment, curbs, parking blocks, drains, utility covers and other hidden or unmarked hazards may prevent complete clearing. Areas blocked at the time of service may require a separately billable return visit.

SNOW STORAGE
Customer-approved on-site snow-storage locations must be identified through the site walkthrough or the approved service map. Snow remains on site unless off-site hauling is authorized.

SNOW HAULING AUTHORIZATION
Off-site snow hauling and disposal require customer authorization unless otherwise expressly agreed in writing.

ICE-CONTROL AUTHORIZATION
[ ] Pedestrian-area ice control authorized   [ ] Parking / vehicle-area ice control authorized

DEFINITION OF APPLICATION
One application means one complete treatment of the approved service area during one service visit. Additional treatments required due to refreezing, freezing rain, drifting, continuing snowfall or changing conditions are separately billable applications when authorized.

SERVICE DOCUMENTATION
Praetoria Snow & Ice may record service dates, arrival time, departure time, equipment used, equipment hours, labour, materials used, applications completed, before photos, after photos and service notes. These records may be used to support service verification and invoicing.$pn$,
$cn$PRAETORIA OPERATIONS HUB CUSTOMER PORTAL
Victoria Square Shopping Centre will have access to a secure customer portal through the Praetoria Operations Hub. Authorized users may view quotations, invoices, payment records, service status, scheduled visits, completed visits, service history, equipment and service records, available before-and-after service photos and account documents. Access your portal at praetoriagroup.ca/portal, or through the Praetoria Group app on Android and iOS.

SERVICE QUALITY GUARANTEE
If an approved contracted area is genuinely missed, please report the concern promptly. When a service deficiency is confirmed and conditions permit, Praetoria Snow & Ice will return to correct the affected approved area without an additional labour charge. Because of ongoing snowfall, blowing snow, freezing rain and changing winter conditions, continuously bare or dry pavement is not guaranteed.

PAYMENT OPTIONS
Interac e-Transfer, credit card, EFT / wire transfer, cheque, or payment through the Customer Portal. Current payment details are provided on the invoice and in the portal.

CUSTOMER ACCEPTANCE & SIGNATURE
By signing below the customer acknowledges and accepts the selected service type, the selected snowfall trigger, the approved service areas, the approved snow-storage areas, the ice-control authorization, the off-site hauling authorization, the unit rates shown on the Unit-Rate Pricing Schedule, and the terms and conditions of this quotation.

[________________________________________________________________] Customer Signature & Date

[________________________________________________________________] Printed Name & Title$cn$,
$tc$UNIT-RATE PRICING — NO FIXED CONTRACT TOTAL. The rates shown are individual unit rates and are not added together to form a fixed quotation total. Final invoicing is based only on actual authorized services performed and the actual equipment, labour, loads, applications and materials used. Rates are valid for the 2026–2027 winter season and are subject to the approved service map and site walkthrough.$tc$)
  RETURNING id INTO v_quote;

  INSERT INTO public.quote_line_items (quote_id, item_name, description, quantity, unit_price, sort_order) VALUES
   (v_quote,'Parking Lot / Commercial Vehicle-Area Snow Removal','Per hour, per equipment unit — operator included. Plow truck, tractor, Bobcat, skid-steer or loader. Each equipment unit actually used is billed separately.',1,150.00,0),
   (v_quote,'Sidewalk / Entrance / Pedestrian-Area Snow Removal','Per hour. Billed separately from parking-lot clearing. Areas confirmed on the approved service map.',1,85.00,1),
   (v_quote,'Off-Site Snow Hauling','Per truck or trailer load. Performed only when requested or authorized.',1,450.00,2),
   (v_quote,'Dump / Disposal Fee','Per load.',1,95.00,3),
   (v_quote,'Ice Control — Pedestrian Areas','Per application — materials extra.',1,150.00,4),
   (v_quote,'Ice Control — Parking / Vehicle Areas','Per application — materials extra.',1,375.00,5),
   (v_quote,'Salt / De-Icer','Per 20 kg bag. Actual quantity used is recorded and invoiced.',1,54.99,6),
   (v_quote,'Sand / Salt Mixture','Per tonne. Actual quantity used is recorded and invoiced.',1,333.00,7),
   (v_quote,'Additional Equipment','Per hour, per equipment unit — operator included.',1,150.00,8),
   (v_quote,'Additional Labour','Per hour, per person.',1,60.00,9),
   (v_quote,'Emergency Call-Out Fee','Per call.',1,85.00,10);
END $$;