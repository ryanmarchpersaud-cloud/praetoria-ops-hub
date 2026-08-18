DO $$
DECLARE q uuid;
BEGIN
  SELECT id INTO q FROM public.quotes WHERE quote_number='PQ-00110';
  DELETE FROM public.quote_line_items WHERE quote_id=q;
  INSERT INTO public.quote_line_items (quote_id, item_name, description, quantity, unit_price, sort_order) VALUES
   (q,'Parking lot / driveway snow removal','Per hour, per equipment unit (operator included)',1,150.00,0),
   (q,'Sidewalk / entrance snow removal','Per hour',1,85.00,1),
   (q,'Snow hauling','Per truck / load',1,450.00,2),
   (q,'Dump / disposal fee','Per load',1,35.00,3),
   (q,'Ice control — pedestrian areas','Per application; materials extra',1,150.00,4),
   (q,'Ice control — parking areas','Per application; materials extra',1,375.00,5),
   (q,'Salt / de-icer','Per 20 kg bag',1,54.99,6),
   (q,'Sand / salt mixture','Per tonne',1,333.00,7),
   (q,'Additional equipment','Per hour, per equipment unit (operator included)',1,150.00,8),
   (q,'Additional labour','Per hour, per person',1,60.00,9),
   (q,'Emergency call-out fee','Per call',1,85.00,10);
  UPDATE public.quotes
     SET unit_rate_quote = true,
         tax_rate = 0.05,
         subtotal = 0, tax = 0, total = 0
   WHERE id = q;
END $$;