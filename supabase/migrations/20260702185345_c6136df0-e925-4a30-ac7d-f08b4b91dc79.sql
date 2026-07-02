ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS invoice_heading TEXT;
UPDATE public.invoices SET invoice_heading = 'JUNE LITTER PICK — 921 BROAD STREET' WHERE invoice_number = 'INV-00106';