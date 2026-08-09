DO $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.invoices (customer_id, job_id, property_id, quote_id, invoice_number, invoice_heading, issue_date, due_date, tax_rate, gst_rate, pst_rate, subtotal, tax, gst_amount, pst_amount, total, balance_due, status, billing_mode, customer_memo)
  VALUES ('b651affb-cd48-4c5b-b8a8-9da60525e5a4','11406af8-79fe-4447-b94d-c369f0fd676d','580199a0-aafe-45e1-9a0a-8eb89d37e0b1','9f9c0fb3-e564-4630-82a2-9a2724f4ed9f','','Highway 6 Farm Site — Barn #7 Tree Cutting and Clearing','2026-08-09','2026-08-09',0.05,0.05,0,7338.54,366.93,366.93,0,7705.47,7705.47,'Draft','manual',
  'This invoice covers 22 actual approved crew hours completed at the Highway 6 farm site from August 5 through August 7, 2026. Work included tree cutting, clearing, piling, and general cleanup around Barn #7. All time is billed at the approved crew rate of $333.57 per hour. Payment terms: Due upon receipt.')
  RETURNING id INTO v_id;

  INSERT INTO public.invoice_line_items (invoice_id, item_name, description, service_date, service_time, quantity, unit_price, line_total, sort_order) VALUES
  (v_id,'August 5, 2026 — Barn #7 Tree Cutting and Clearing','Tree cutting and clearing around Barn #7 at the Highway 6 farm site, including cutting down trees around the barn, clearing, piling, and general cleanup of the work area. Time on site: 9:00 AM to 5:00 PM.','2026-08-05','09:00',8,333.57,2668.56,0),
  (v_id,'August 6, 2026 — Continued Barn #7 Tree Cutting and Clearing','Continued tree cutting and clearing around Barn #7 at the Highway 6 farm site, including cutting down trees around the barn, clearing, piling, and general cleanup of the work area. Time on site: 10:10 AM to 5:02 PM.','2026-08-06','10:10',7,333.57,2334.99,1),
  (v_id,'August 7, 2026 — Continued Barn #7 Tree Cutting and Clearing','Continued tree cutting and clearing around Barn #7 at the Highway 6 farm site, including cutting down trees around the barn, clearing, piling, and general cleanup of the work area. Time on site: 9:00 AM to 4:00 PM.','2026-08-07','09:00',7,333.57,2334.99,2);
END $$;