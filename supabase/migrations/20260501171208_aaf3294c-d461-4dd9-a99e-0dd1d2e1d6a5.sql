-- PIN gate for personal accounts vault
CREATE TABLE public.personal_account_pin (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  pin_hash TEXT NOT NULL,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  last_unlocked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.personal_account_pin ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view own pin record"
ON public.personal_account_pin FOR SELECT
USING (auth.uid() = user_id AND public.is_personal_account_owner(auth.uid()));

CREATE POLICY "Owner can insert own pin record"
ON public.personal_account_pin FOR INSERT
WITH CHECK (auth.uid() = user_id AND public.is_personal_account_owner(auth.uid()));

CREATE POLICY "Owner can update own pin record"
ON public.personal_account_pin FOR UPDATE
USING (auth.uid() = user_id AND public.is_personal_account_owner(auth.uid()));

CREATE POLICY "Owner can delete own pin record"
ON public.personal_account_pin FOR DELETE
USING (auth.uid() = user_id AND public.is_personal_account_owner(auth.uid()));

CREATE TRIGGER update_personal_account_pin_updated_at
BEFORE UPDATE ON public.personal_account_pin
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();