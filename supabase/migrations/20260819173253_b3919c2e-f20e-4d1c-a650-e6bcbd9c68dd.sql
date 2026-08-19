
UPDATE public.quote_line_items
SET description = 'Per hour. Minimum 3 hours per dispatch. Billed separately from parking-lot clearing. Areas confirmed on the approved service map.'
WHERE quote_id = '84b483bd-b3c7-4742-bd5f-6760fb9398e2' AND sort_order = 1;

UPDATE public.quote_line_items
SET description = 'Per 20 kg bag. Minimum 3 hours per dispatch. Actual quantity used is recorded and invoiced.'
WHERE quote_id = '84b483bd-b3c7-4742-bd5f-6760fb9398e2' AND sort_order = 6;

UPDATE public.quotes
SET project_notes = replace(
      replace(project_notes,
        '2. Pedestrian / Sidewalk / Entrance Snow Clearing — $85.00 per hour, billed separately from parking-lot clearing.',
        '2. Pedestrian / Sidewalk / Entrance Snow Clearing — $85.00 per hour, minimum 3 hours per dispatch, billed separately from parking-lot clearing.'),
      '7. Salt / De-Icer — $54.99 per 20 kg bag; actual quantity used is recorded and invoiced.',
      '7. Salt / De-Icer — $54.99 per 20 kg bag, minimum 3 hours per dispatch; actual quantity used is recorded and invoiced.')
WHERE id = '84b483bd-b3c7-4742-bd5f-6760fb9398e2';
