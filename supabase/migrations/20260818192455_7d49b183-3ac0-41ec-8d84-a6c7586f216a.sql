ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS is_provisional_estimate boolean NOT NULL DEFAULT false;

UPDATE public.quotes
   SET is_provisional_estimate = true
 WHERE quote_number = 'PQ-00112';