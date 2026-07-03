
-- Enums
DO $$ BEGIN CREATE TYPE public.pm_inspection_type AS ENUM (
  'move_in','move_out','routine','maintenance','safety','exterior','interior','seasonal','complaint_followup','other'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.pm_inspection_status AS ENUM (
  'draft','scheduled','in_progress','completed','reviewed','archived','cancelled'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.pm_inspection_condition AS ENUM (
  'excellent','good','fair','poor','damaged','needs_cleaning','not_applicable'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.pm_inspection_visibility AS ENUM (
  'internal_only','tenant_visible','owner_visible','tenant_and_owner_visible'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ pm_inspections ============
CREATE TABLE IF NOT EXISTS public.pm_inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  inspection_type public.pm_inspection_type NOT NULL DEFAULT 'routine',
  status public.pm_inspection_status NOT NULL DEFAULT 'draft',

  property_id uuid,
  unit_id uuid,
  tenant_id uuid,
  owner_id uuid,
  lease_id uuid,
  move_in_id uuid,
  move_out_id uuid,
  maintenance_request_id uuid,
  work_order_id uuid,
  document_id uuid,

  created_by uuid,
  assigned_to uuid,

  scheduled_for timestamptz,
  inspected_at timestamptz,
  completed_at timestamptz,
  reviewed_at timestamptz,

  summary text,
  admin_notes text,
  tenant_visible_notes text,
  owner_visible_notes text,

  tenant_visible boolean NOT NULL DEFAULT false,
  owner_visible boolean NOT NULL DEFAULT false,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pm_inspections_property_idx ON public.pm_inspections(property_id);
CREATE INDEX IF NOT EXISTS pm_inspections_unit_idx ON public.pm_inspections(unit_id);
CREATE INDEX IF NOT EXISTS pm_inspections_tenant_idx ON public.pm_inspections(tenant_id);
CREATE INDEX IF NOT EXISTS pm_inspections_owner_idx ON public.pm_inspections(owner_id);
CREATE INDEX IF NOT EXISTS pm_inspections_lease_idx ON public.pm_inspections(lease_id);
CREATE INDEX IF NOT EXISTS pm_inspections_assigned_idx ON public.pm_inspections(assigned_to);
CREATE INDEX IF NOT EXISTS pm_inspections_status_idx ON public.pm_inspections(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pm_inspections TO authenticated;
GRANT ALL ON public.pm_inspections TO service_role;
ALTER TABLE public.pm_inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ops staff manage pm_inspections"
  ON public.pm_inspections FOR ALL TO authenticated
  USING (public.is_ops_staff(auth.uid()))
  WITH CHECK (public.is_ops_staff(auth.uid()));

CREATE POLICY "Assigned leasing agent reads pm_inspections"
  ON public.pm_inspections FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'leasing_agent'::public.app_role)
    AND assigned_to = auth.uid()
  );

CREATE POLICY "Assigned leasing agent updates pm_inspections"
  ON public.pm_inspections FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(),'leasing_agent'::public.app_role)
    AND assigned_to = auth.uid()
  )
  WITH CHECK (
    public.has_role(auth.uid(),'leasing_agent'::public.app_role)
    AND assigned_to = auth.uid()
  );

CREATE POLICY "Tenants view own pm_inspections"
  ON public.pm_inspections FOR SELECT TO authenticated
  USING (
    tenant_visible = true
    AND status IN ('completed','reviewed')
    AND (
      tenant_id IN (SELECT id FROM public.pm_tenants WHERE user_id = auth.uid())
      OR lease_id IN (
        SELECT l.id FROM public.pm_leases l
        JOIN public.pm_tenants t ON t.id = l.tenant_id
        WHERE t.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Owners view own pm_inspections"
  ON public.pm_inspections FOR SELECT TO authenticated
  USING (
    owner_visible = true
    AND status IN ('completed','reviewed')
    AND (
      owner_id IN (SELECT id FROM public.pm_property_owners WHERE user_id = auth.uid())
      OR property_id IN (
        SELECT op.property_id FROM public.pm_owner_properties op
        JOIN public.pm_property_owners o ON o.id = op.owner_id
        WHERE o.user_id = auth.uid()
      )
      OR property_id IN (
        SELECT p.id FROM public.pm_managed_properties p
        JOIN public.pm_property_owners o ON o.id = p.primary_owner_id
        WHERE o.user_id = auth.uid()
      )
    )
  );

DROP TRIGGER IF EXISTS pm_inspections_set_updated_at ON public.pm_inspections;
CREATE TRIGGER pm_inspections_set_updated_at
  BEFORE UPDATE ON public.pm_inspections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ pm_inspection_items ============
CREATE TABLE IF NOT EXISTS public.pm_inspection_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES public.pm_inspections(id) ON DELETE CASCADE,
  area text NOT NULL,
  item_label text,
  condition public.pm_inspection_condition NOT NULL DEFAULT 'not_applicable',
  notes text,
  issue_found boolean NOT NULL DEFAULT false,
  repair_needed boolean NOT NULL DEFAULT false,
  cleaning_needed boolean NOT NULL DEFAULT false,
  tenant_visible boolean NOT NULL DEFAULT false,
  owner_visible boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  photo_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pm_insp_items_inspection_idx ON public.pm_inspection_items(inspection_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pm_inspection_items TO authenticated;
GRANT ALL ON public.pm_inspection_items TO service_role;
ALTER TABLE public.pm_inspection_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ops staff manage pm_inspection_items"
  ON public.pm_inspection_items FOR ALL TO authenticated
  USING (public.is_ops_staff(auth.uid()))
  WITH CHECK (public.is_ops_staff(auth.uid()));

CREATE POLICY "Assigned leasing agent manages own items"
  ON public.pm_inspection_items FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(),'leasing_agent'::public.app_role)
    AND EXISTS (SELECT 1 FROM public.pm_inspections i WHERE i.id = inspection_id AND i.assigned_to = auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(),'leasing_agent'::public.app_role)
    AND EXISTS (SELECT 1 FROM public.pm_inspections i WHERE i.id = inspection_id AND i.assigned_to = auth.uid())
  );

CREATE POLICY "Tenants view own pm_inspection_items"
  ON public.pm_inspection_items FOR SELECT TO authenticated
  USING (
    tenant_visible = true
    AND EXISTS (
      SELECT 1 FROM public.pm_inspections i
      WHERE i.id = inspection_id
        AND i.tenant_visible = true
        AND i.status IN ('completed','reviewed')
        AND (
          i.tenant_id IN (SELECT id FROM public.pm_tenants WHERE user_id = auth.uid())
          OR i.lease_id IN (
            SELECT l.id FROM public.pm_leases l
            JOIN public.pm_tenants t ON t.id = l.tenant_id
            WHERE t.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "Owners view own pm_inspection_items"
  ON public.pm_inspection_items FOR SELECT TO authenticated
  USING (
    owner_visible = true
    AND EXISTS (
      SELECT 1 FROM public.pm_inspections i
      WHERE i.id = inspection_id
        AND i.owner_visible = true
        AND i.status IN ('completed','reviewed')
        AND (
          i.owner_id IN (SELECT id FROM public.pm_property_owners WHERE user_id = auth.uid())
          OR i.property_id IN (
            SELECT op.property_id FROM public.pm_owner_properties op
            JOIN public.pm_property_owners o ON o.id = op.owner_id
            WHERE o.user_id = auth.uid()
          )
          OR i.property_id IN (
            SELECT p.id FROM public.pm_managed_properties p
            JOIN public.pm_property_owners o ON o.id = p.primary_owner_id
            WHERE o.user_id = auth.uid()
          )
        )
    )
  );

DROP TRIGGER IF EXISTS pm_insp_items_set_updated_at ON public.pm_inspection_items;
CREATE TRIGGER pm_insp_items_set_updated_at
  BEFORE UPDATE ON public.pm_inspection_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ pm_inspection_photos ============
CREATE TABLE IF NOT EXISTS public.pm_inspection_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES public.pm_inspections(id) ON DELETE CASCADE,
  item_id uuid REFERENCES public.pm_inspection_items(id) ON DELETE SET NULL,
  uploaded_by uuid,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint,
  mime_type text,
  caption text,
  tenant_visible boolean NOT NULL DEFAULT false,
  owner_visible boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pm_insp_photos_inspection_idx ON public.pm_inspection_photos(inspection_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pm_inspection_photos TO authenticated;
GRANT ALL ON public.pm_inspection_photos TO service_role;
ALTER TABLE public.pm_inspection_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ops staff manage pm_inspection_photos"
  ON public.pm_inspection_photos FOR ALL TO authenticated
  USING (public.is_ops_staff(auth.uid()))
  WITH CHECK (public.is_ops_staff(auth.uid()));

CREATE POLICY "Assigned leasing agent manages own photos"
  ON public.pm_inspection_photos FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(),'leasing_agent'::public.app_role)
    AND EXISTS (SELECT 1 FROM public.pm_inspections i WHERE i.id = inspection_id AND i.assigned_to = auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(),'leasing_agent'::public.app_role)
    AND EXISTS (SELECT 1 FROM public.pm_inspections i WHERE i.id = inspection_id AND i.assigned_to = auth.uid())
  );

CREATE POLICY "Tenants view own pm_inspection_photos"
  ON public.pm_inspection_photos FOR SELECT TO authenticated
  USING (
    tenant_visible = true
    AND EXISTS (
      SELECT 1 FROM public.pm_inspections i
      WHERE i.id = inspection_id
        AND i.tenant_visible = true
        AND i.status IN ('completed','reviewed')
        AND (
          i.tenant_id IN (SELECT id FROM public.pm_tenants WHERE user_id = auth.uid())
          OR i.lease_id IN (
            SELECT l.id FROM public.pm_leases l
            JOIN public.pm_tenants t ON t.id = l.tenant_id
            WHERE t.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "Owners view own pm_inspection_photos"
  ON public.pm_inspection_photos FOR SELECT TO authenticated
  USING (
    owner_visible = true
    AND EXISTS (
      SELECT 1 FROM public.pm_inspections i
      WHERE i.id = inspection_id
        AND i.owner_visible = true
        AND i.status IN ('completed','reviewed')
        AND (
          i.owner_id IN (SELECT id FROM public.pm_property_owners WHERE user_id = auth.uid())
          OR i.property_id IN (
            SELECT op.property_id FROM public.pm_owner_properties op
            JOIN public.pm_property_owners o ON o.id = op.owner_id
            WHERE o.user_id = auth.uid()
          )
          OR i.property_id IN (
            SELECT p.id FROM public.pm_managed_properties p
            JOIN public.pm_property_owners o ON o.id = p.primary_owner_id
            WHERE o.user_id = auth.uid()
          )
        )
    )
  );

DROP TRIGGER IF EXISTS pm_insp_photos_set_updated_at ON public.pm_inspection_photos;
CREATE TRIGGER pm_insp_photos_set_updated_at
  BEFORE UPDATE ON public.pm_inspection_photos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ pm_inspection_activity ============
CREATE TABLE IF NOT EXISTS public.pm_inspection_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES public.pm_inspections(id) ON DELETE CASCADE,
  actor_id uuid,
  action text NOT NULL,
  detail jsonb,
  visibility public.pm_inspection_visibility NOT NULL DEFAULT 'internal_only',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pm_insp_activity_inspection_idx ON public.pm_inspection_activity(inspection_id);

GRANT SELECT, INSERT ON public.pm_inspection_activity TO authenticated;
GRANT ALL ON public.pm_inspection_activity TO service_role;
ALTER TABLE public.pm_inspection_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ops staff read pm_inspection_activity"
  ON public.pm_inspection_activity FOR SELECT TO authenticated
  USING (public.is_ops_staff(auth.uid()));

CREATE POLICY "Ops staff insert pm_inspection_activity"
  ON public.pm_inspection_activity FOR INSERT TO authenticated
  WITH CHECK (public.is_ops_staff(auth.uid()));

CREATE POLICY "Assigned leasing agent reads activity"
  ON public.pm_inspection_activity FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'leasing_agent'::public.app_role)
    AND EXISTS (SELECT 1 FROM public.pm_inspections i WHERE i.id = inspection_id AND i.assigned_to = auth.uid())
  );

CREATE POLICY "Assigned leasing agent inserts activity"
  ON public.pm_inspection_activity FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(),'leasing_agent'::public.app_role)
    AND EXISTS (SELECT 1 FROM public.pm_inspections i WHERE i.id = inspection_id AND i.assigned_to = auth.uid())
    AND actor_id = auth.uid()
  );

CREATE POLICY "Tenants read shared activity"
  ON public.pm_inspection_activity FOR SELECT TO authenticated
  USING (
    visibility IN ('tenant_visible','tenant_and_owner_visible')
    AND EXISTS (
      SELECT 1 FROM public.pm_inspections i
      WHERE i.id = inspection_id
        AND i.tenant_visible = true
        AND i.status IN ('completed','reviewed')
        AND (
          i.tenant_id IN (SELECT id FROM public.pm_tenants WHERE user_id = auth.uid())
          OR i.lease_id IN (
            SELECT l.id FROM public.pm_leases l
            JOIN public.pm_tenants t ON t.id = l.tenant_id
            WHERE t.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "Owners read shared activity"
  ON public.pm_inspection_activity FOR SELECT TO authenticated
  USING (
    visibility IN ('owner_visible','tenant_and_owner_visible')
    AND EXISTS (
      SELECT 1 FROM public.pm_inspections i
      WHERE i.id = inspection_id
        AND i.owner_visible = true
        AND i.status IN ('completed','reviewed')
        AND (
          i.owner_id IN (SELECT id FROM public.pm_property_owners WHERE user_id = auth.uid())
          OR i.property_id IN (
            SELECT op.property_id FROM public.pm_owner_properties op
            JOIN public.pm_property_owners o ON o.id = op.owner_id
            WHERE o.user_id = auth.uid()
          )
          OR i.property_id IN (
            SELECT p.id FROM public.pm_managed_properties p
            JOIN public.pm_property_owners o ON o.id = p.primary_owner_id
            WHERE o.user_id = auth.uid()
          )
        )
    )
  );

-- ============ storage.objects policies for pm-inspection-photos ============
DROP POLICY IF EXISTS "Ops staff manage pm-inspection-photos" ON storage.objects;
CREATE POLICY "Ops staff manage pm-inspection-photos"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'pm-inspection-photos' AND public.is_ops_staff(auth.uid()))
  WITH CHECK (bucket_id = 'pm-inspection-photos' AND public.is_ops_staff(auth.uid()));

DROP POLICY IF EXISTS "Leasing agent read own pm-inspection-photos" ON storage.objects;
CREATE POLICY "Leasing agent read own pm-inspection-photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'pm-inspection-photos'
    AND public.has_role(auth.uid(),'leasing_agent'::public.app_role)
    AND EXISTS (
      SELECT 1 FROM public.pm_inspection_photos p
      JOIN public.pm_inspections i ON i.id = p.inspection_id
      WHERE p.file_path = storage.objects.name AND i.assigned_to = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Leasing agent upload own pm-inspection-photos" ON storage.objects;
CREATE POLICY "Leasing agent upload own pm-inspection-photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'pm-inspection-photos'
    AND public.has_role(auth.uid(),'leasing_agent'::public.app_role)
  );

DROP POLICY IF EXISTS "Tenants read own pm-inspection-photos" ON storage.objects;
CREATE POLICY "Tenants read own pm-inspection-photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'pm-inspection-photos'
    AND EXISTS (
      SELECT 1 FROM public.pm_inspection_photos p
      JOIN public.pm_inspections i ON i.id = p.inspection_id
      WHERE p.file_path = storage.objects.name
        AND p.tenant_visible = true
        AND i.tenant_visible = true
        AND i.status IN ('completed','reviewed')
        AND (
          i.tenant_id IN (SELECT id FROM public.pm_tenants WHERE user_id = auth.uid())
          OR i.lease_id IN (
            SELECT l.id FROM public.pm_leases l
            JOIN public.pm_tenants t ON t.id = l.tenant_id
            WHERE t.user_id = auth.uid()
          )
        )
    )
  );

DROP POLICY IF EXISTS "Owners read own pm-inspection-photos" ON storage.objects;
CREATE POLICY "Owners read own pm-inspection-photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'pm-inspection-photos'
    AND EXISTS (
      SELECT 1 FROM public.pm_inspection_photos p
      JOIN public.pm_inspections i ON i.id = p.inspection_id
      WHERE p.file_path = storage.objects.name
        AND p.owner_visible = true
        AND i.owner_visible = true
        AND i.status IN ('completed','reviewed')
        AND (
          i.owner_id IN (SELECT id FROM public.pm_property_owners WHERE user_id = auth.uid())
          OR i.property_id IN (
            SELECT op.property_id FROM public.pm_owner_properties op
            JOIN public.pm_property_owners o ON o.id = op.owner_id
            WHERE o.user_id = auth.uid()
          )
          OR i.property_id IN (
            SELECT p2.id FROM public.pm_managed_properties p2
            JOIN public.pm_property_owners o ON o.id = p2.primary_owner_id
            WHERE o.user_id = auth.uid()
          )
        )
    )
  );
