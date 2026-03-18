-- Extended team member profile data (linked to auth user)
CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  full_name text NOT NULL,
  display_name text,
  email text NOT NULL,
  phone text,
  team_type text NOT NULL DEFAULT 'Worker',
  status text NOT NULL DEFAULT 'Active',
  is_active boolean NOT NULL DEFAULT true,
  service_categories text[] NOT NULL DEFAULT '{}',
  notes text,
  portal_admin boolean NOT NULL DEFAULT false,
  portal_worker boolean NOT NULL DEFAULT false,
  portal_subcontractor boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Admins have full access
CREATE POLICY "Admins manage all team_members"
  ON public.team_members FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Members can view own record
CREATE POLICY "Members view own team_member record"
  ON public.team_members FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Auto-update updated_at
CREATE TRIGGER update_team_members_updated_at
  BEFORE UPDATE ON public.team_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();