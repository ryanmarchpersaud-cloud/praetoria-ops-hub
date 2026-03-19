
-- Worker expense/reimbursement claims table
CREATE TABLE public.worker_expense_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'Fuel',
  description TEXT,
  receipt_url TEXT,
  receipt_file_name TEXT,
  status TEXT NOT NULL DEFAULT 'submitted',
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.worker_expense_claims ENABLE ROW LEVEL SECURITY;

-- Workers can insert their own claims
CREATE POLICY "Workers submit own expense claims"
ON public.worker_expense_claims FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Workers can view their own claims
CREATE POLICY "Workers view own expense claims"
ON public.worker_expense_claims FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Admins full access
CREATE POLICY "Admins manage all expense claims"
ON public.worker_expense_claims FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Managers can view and update
CREATE POLICY "Managers manage expense claims"
ON public.worker_expense_claims FOR ALL TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'manager'::app_role));

-- Create a storage bucket for worker receipts
INSERT INTO storage.buckets (id, name, public)
VALUES ('worker-receipts', 'worker-receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Workers upload own receipts
CREATE POLICY "Workers upload own receipts"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'worker-receipts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Workers view own receipts
CREATE POLICY "Workers view own receipts"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'worker-receipts'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
  )
);

-- Admins manage all receipts
CREATE POLICY "Admins manage worker receipts"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'worker-receipts' AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (bucket_id = 'worker-receipts' AND has_role(auth.uid(), 'admin'::app_role));
