ALTER TABLE public.company_settings
ADD COLUMN IF NOT EXISTS ga4_measurement_id text,
ADD COLUMN IF NOT EXISTS google_ads_conversion_id text;

GRANT SELECT, UPDATE ON public.company_settings TO authenticated;
GRANT ALL ON public.company_settings TO service_role;