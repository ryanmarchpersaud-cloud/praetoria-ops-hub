
CREATE TABLE public.app_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL DEFAULT 'android',
  current_version TEXT NOT NULL DEFAULT '1.0.0',
  minimum_version TEXT NOT NULL DEFAULT '1.0.0',
  store_url TEXT DEFAULT 'https://play.google.com/store/apps/details?id=ca.praetoriagroup.app',
  release_notes TEXT,
  force_update BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(platform)
);

ALTER TABLE public.app_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read app versions"
  ON public.app_versions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins manage app versions"
  ON public.app_versions FOR ALL TO authenticated
  USING (public.is_admin_or_owner(auth.uid()))
  WITH CHECK (public.is_admin_or_owner(auth.uid()));

CREATE TRIGGER trg_app_versions_updated_at
  BEFORE UPDATE ON public.app_versions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

INSERT INTO public.app_versions (platform, current_version, minimum_version, store_url)
VALUES ('android', '1.0.0', '1.0.0', 'https://play.google.com/store/apps/details?id=ca.praetoriagroup.app');
