
UPDATE public.quote_line_items
SET quantity = 3,
    description = 'Once-monthly commercial mowing/tractor service for the Head Office / Office Property. Mowing/cutting accessible grass areas, perimeter mowing, ditch/edge areas where accessible and safe, general grounds cutting, equipment operation, basic service cleanup. Two-person crew with commercial mower/tractor equipment. Minimum 3 hours × $200/hr per visit. Additional hours beyond the 3-hour minimum are billed at $200/hr in 15-minute increments.'
WHERE id = '97f28234-6661-4f87-a1cf-fd22c737ee5f';

UPDATE public.quote_line_items
SET quantity = 3,
    description = 'Once-monthly commercial mowing/tractor service for Site A — Hwy 11 (SW-27-18-20-W2). Mowing/cutting accessible grass areas, perimeter mowing, ditch/edge areas where accessible and safe, general grounds cutting, equipment operation, basic service cleanup. Two-person crew with commercial mower/tractor equipment. Minimum 3 hours × $200/hr per visit. Additional hours beyond the 3-hour minimum are billed at $200/hr in 15-minute increments.'
WHERE id = '35d4bedf-9449-494d-a002-65d31ab53328';

UPDATE public.quote_line_items
SET quantity = 3,
    description = 'Once-monthly commercial mowing/tractor service for Site B — Hwy 6 (NE-18-19-19-W2). Mowing/cutting accessible grass areas, perimeter mowing, ditch/edge areas where accessible and safe, general grounds cutting, equipment operation, basic service cleanup. Two-person crew with commercial mower/tractor equipment. Minimum 3 hours × $200/hr per visit. Additional hours beyond the 3-hour minimum are billed at $200/hr in 15-minute increments.'
WHERE id = '42c6f866-ac32-47da-8ba5-ce4479edd6f2';

UPDATE public.quotes
SET internal_notes = COALESCE(internal_notes, '') || E'\n\n[' || to_char(now(), 'YYYY-MM-DD') || '] Mowing line items reduced to a 3-hour minimum per visit per site (was 18h / 8h / 14h) at $200/hr. Additional hours billed at $200/hr in 15-min increments. Pending Ryan review.'
WHERE quote_number = 'PQ-00032';
