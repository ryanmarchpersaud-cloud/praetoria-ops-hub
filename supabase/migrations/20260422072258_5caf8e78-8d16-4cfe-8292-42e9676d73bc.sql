
-- =========================================================================
-- PHASE 1 SECURITY HARDENING
-- 1. Central audit_log table (write-once via SECURITY DEFINER, admin-only read)
-- 2. Storage privacy: subcontractor-documents, invoice-attachments, worker-receipts
-- 3. Fix linter warnings: search_path on remaining functions, leaked password
-- =========================================================================

-- ---------- 1. AUDIT LOG ----------
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_user_id UUID,
  actor_role TEXT,
  actor_email TEXT,
  action TEXT NOT NULL,                    -- e.g. 'pay_stub.view', 'role.grant', 'auth.login'
  target_type TEXT,                        -- e.g. 'pay_stub', 'invoice', 'user_role'
  target_id TEXT,                          -- stringified id (uuid, number, composite)
  customer_id UUID,                        -- tenant scope when applicable
  success BOOLEAN NOT NULL DEFAULT true,
  ip_address TEXT,
  user_agent TEXT,
  before_data JSONB,
  after_data JSONB,
  metadata JSONB,
  request_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON public.audit_log (actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_target ON public.audit_log (target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public.audit_log (action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_customer ON public.audit_log (customer_id, created_at DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Deny all direct writes/deletes/updates. Inserts only via SECURITY DEFINER function.
DROP POLICY IF EXISTS "Admins read audit log" ON public.audit_log;
CREATE POLICY "Admins read audit log"
  ON public.audit_log
  FOR SELECT
  TO authenticated
  USING (public.is_admin_or_owner(auth.uid()));

-- (no INSERT/UPDATE/DELETE policies = denied for everyone via RLS)

-- ---------- 2. write_audit_log() function ----------
CREATE OR REPLACE FUNCTION public.write_audit_log(
  _action TEXT,
  _target_type TEXT DEFAULT NULL,
  _target_id TEXT DEFAULT NULL,
  _customer_id UUID DEFAULT NULL,
  _success BOOLEAN DEFAULT true,
  _before JSONB DEFAULT NULL,
  _after JSONB DEFAULT NULL,
  _metadata JSONB DEFAULT NULL,
  _ip_address TEXT DEFAULT NULL,
  _user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID;
  v_role TEXT;
  v_email TEXT;
  v_id UUID;
BEGIN
  v_actor := auth.uid();

  -- Resolve a representative role label (highest privilege seen for this user)
  SELECT role::text INTO v_role
  FROM public.user_roles
  WHERE user_id = v_actor
  ORDER BY CASE role::text
    WHEN 'owner' THEN 1
    WHEN 'admin' THEN 2
    WHEN 'ops_manager' THEN 3
    WHEN 'hr_admin' THEN 4
    WHEN 'accountant' THEN 5
    WHEN 'manager' THEN 6
    WHEN 'dispatcher' THEN 7
    WHEN 'supervisor' THEN 8
    WHEN 'lead_worker' THEN 9
    WHEN 'staff' THEN 10
    WHEN 'subcontractor' THEN 11
    WHEN 'customer' THEN 12
    ELSE 99
  END
  LIMIT 1;

  -- Best-effort email resolve (won't fail if not available)
  BEGIN
    SELECT email INTO v_email FROM auth.users WHERE id = v_actor;
  EXCEPTION WHEN OTHERS THEN
    v_email := NULL;
  END;

  INSERT INTO public.audit_log (
    actor_user_id, actor_role, actor_email,
    action, target_type, target_id, customer_id,
    success, before_data, after_data, metadata,
    ip_address, user_agent
  )
  VALUES (
    v_actor, v_role, v_email,
    _action, _target_type, _target_id, _customer_id,
    COALESCE(_success, true), _before, _after, _metadata,
    _ip_address, _user_agent
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- Allow client + service to call the writer (RLS still blocks direct insert)
GRANT EXECUTE ON FUNCTION public.write_audit_log(
  TEXT, TEXT, TEXT, UUID, BOOLEAN, JSONB, JSONB, JSONB, TEXT, TEXT
) TO authenticated, anon, service_role;

-- ---------- 3. Triggers: auto-log role grants / revocations ----------
CREATE OR REPLACE FUNCTION public.audit_user_roles_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.write_audit_log(
      'role.grant',
      'user_role',
      NEW.id::text,
      NULL,
      true,
      NULL,
      jsonb_build_object('user_id', NEW.user_id, 'role', NEW.role::text),
      NULL, NULL, NULL
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.write_audit_log(
      'role.revoke',
      'user_role',
      OLD.id::text,
      NULL,
      true,
      jsonb_build_object('user_id', OLD.user_id, 'role', OLD.role::text),
      NULL,
      NULL, NULL, NULL
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_user_roles_change ON public.user_roles;
CREATE TRIGGER trg_audit_user_roles_change
AFTER INSERT OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.audit_user_roles_change();

-- ---------- 4. Trigger: audit role_permissions changes ----------
CREATE OR REPLACE FUNCTION public.audit_role_permissions_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.write_audit_log(
      'permission.grant', 'role_permission', NEW.id::text, NULL, true,
      NULL,
      jsonb_build_object('role', NEW.role::text, 'permission_key', NEW.permission_key),
      NULL, NULL, NULL
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.write_audit_log(
      'permission.revoke', 'role_permission', OLD.id::text, NULL, true,
      jsonb_build_object('role', OLD.role::text, 'permission_key', OLD.permission_key),
      NULL,
      NULL, NULL, NULL
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_role_permissions_change ON public.role_permissions;
CREATE TRIGGER trg_audit_role_permissions_change
AFTER INSERT OR DELETE ON public.role_permissions
FOR EACH ROW EXECUTE FUNCTION public.audit_role_permissions_change();

-- ---------- 5. STORAGE PRIVACY ----------
-- Flip three buckets to private and replace permissive policies with owner/admin path-based ones.

UPDATE storage.buckets SET public = false WHERE id IN ('subcontractor-documents','invoice-attachments','worker-receipts');

-- subcontractor-documents: keep existing admin-manage policy; add owner-folder access for the subcontractor user
DROP POLICY IF EXISTS "Subs manage own documents" ON storage.objects;
CREATE POLICY "Subs manage own documents"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'subcontractor-documents'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'subcontractor-documents'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- worker-receipts: owner-folder access for workers; admin policy already exists
DROP POLICY IF EXISTS "Workers manage own receipts" ON storage.objects;
CREATE POLICY "Workers manage own receipts"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'worker-receipts'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'worker-receipts'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- invoice-attachments: replace public read with staff-only read; uploads remain authenticated
DROP POLICY IF EXISTS "Allow public reads from invoice-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Staff read invoice attachments" ON storage.objects;
CREATE POLICY "Staff read invoice attachments"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'invoice-attachments'
    AND public.is_staff_or_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Customers read own invoice attachments" ON storage.objects;
CREATE POLICY "Customers read own invoice attachments"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'invoice-attachments'
    AND EXISTS (
      SELECT 1 FROM public.invoices i
      JOIN public.customers c ON c.id = i.customer_id
      WHERE c.user_id = auth.uid()
        AND (storage.foldername(name))[1] = i.id::text
    )
  );

-- ---------- 6. Fix lingering search_path warnings on PGMQ helper functions ----------
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
