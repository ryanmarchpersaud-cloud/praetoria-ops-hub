
-- ─────────────────────────────────────────────────────────────
-- Phase 7: Property Owner Approval Workflow Foundation
-- ─────────────────────────────────────────────────────────────

CREATE TABLE public.pm_owner_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.pm_property_owners(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.pm_managed_properties(id) ON DELETE CASCADE,
  unit_id uuid REFERENCES public.pm_units(id) ON DELETE SET NULL,
  maintenance_request_id uuid REFERENCES public.pm_maintenance_requests(id) ON DELETE SET NULL,
  work_order_id uuid REFERENCES public.pm_work_orders(id) ON DELETE SET NULL,
  expense_id uuid REFERENCES public.pm_expenses(id) ON DELETE SET NULL,
  renewal_id uuid REFERENCES public.pm_lease_renewals(id) ON DELETE SET NULL,
  move_out_id uuid REFERENCES public.pm_move_out_checklists(id) ON DELETE SET NULL,
  estimate_reference text,
  title text NOT NULL,
  summary text,
  category text NOT NULL DEFAULT 'other'
    CHECK (category IN ('repair','maintenance','replacement','expense','estimate','lease_renewal','move_out','capital_improvement','other')),
  requested_amount numeric(12,2),
  currency text NOT NULL DEFAULT 'CAD',
  due_date date,
  priority text NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low','normal','high','urgent')),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','sent_to_owner','owner_reviewing','approved','declined','more_info_requested','cancelled','expired','completed')),
  owner_response text
    CHECK (owner_response IS NULL OR owner_response IN ('approved','declined','more_info')),
  owner_response_note text,
  owner_visible_note text,
  admin_notes text,
  sent_at timestamptz,
  owner_viewed_at timestamptz,
  decided_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX pm_owner_approvals_owner_idx    ON public.pm_owner_approvals(owner_id);
CREATE INDEX pm_owner_approvals_property_idx ON public.pm_owner_approvals(property_id);
CREATE INDEX pm_owner_approvals_status_idx   ON public.pm_owner_approvals(status);
CREATE INDEX pm_owner_approvals_due_idx      ON public.pm_owner_approvals(due_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pm_owner_approvals TO authenticated;
GRANT ALL ON public.pm_owner_approvals TO service_role;

ALTER TABLE public.pm_owner_approvals ENABLE ROW LEVEL SECURITY;

-- Staff select/manage
CREATE POLICY "pm_staff_select_owner_approvals"
  ON public.pm_owner_approvals FOR SELECT TO authenticated
  USING (
    is_ops_staff(auth.uid())
    OR is_property_manager(auth.uid())
    OR (is_leasing_agent(auth.uid()) AND created_by = auth.uid())
  );

CREATE POLICY "pm_staff_insert_owner_approvals"
  ON public.pm_owner_approvals FOR INSERT TO authenticated
  WITH CHECK (
    is_ops_staff(auth.uid()) OR is_property_manager(auth.uid())
    OR (is_leasing_agent(auth.uid()) AND created_by = auth.uid())
  );

CREATE POLICY "pm_staff_update_owner_approvals"
  ON public.pm_owner_approvals FOR UPDATE TO authenticated
  USING (
    is_ops_staff(auth.uid()) OR is_property_manager(auth.uid())
    OR (is_leasing_agent(auth.uid()) AND created_by = auth.uid())
  )
  WITH CHECK (
    is_ops_staff(auth.uid()) OR is_property_manager(auth.uid())
    OR (is_leasing_agent(auth.uid()) AND created_by = auth.uid())
  );

CREATE POLICY "pm_admin_delete_owner_approvals"
  ON public.pm_owner_approvals FOR DELETE TO authenticated
  USING (is_admin_or_owner(auth.uid()) OR is_property_manager(auth.uid()));

-- Owner select (only sent/decided approvals for their properties)
CREATE POLICY "pm_owner_select_owner_approvals"
  ON public.pm_owner_approvals FOR SELECT TO authenticated
  USING (
    is_property_owner_of(auth.uid(), property_id)
    AND status IN ('sent_to_owner','owner_reviewing','approved','declined','more_info_requested','completed','expired')
  );

-- Owners do NOT get direct UPDATE — they respond via owner_respond_to_approval() RPC below.

CREATE TRIGGER trg_pm_owner_approvals_updated
  BEFORE UPDATE ON public.pm_owner_approvals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── Activity timeline ──────────────────────────────────────────
CREATE TABLE public.pm_owner_approval_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_id uuid NOT NULL REFERENCES public.pm_owner_approvals(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  message text,
  detail jsonb,
  actor_id uuid,
  is_owner_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX pm_owner_approval_activity_approval_idx
  ON public.pm_owner_approval_activity(approval_id, created_at DESC);

GRANT SELECT, INSERT ON public.pm_owner_approval_activity TO authenticated;
GRANT ALL ON public.pm_owner_approval_activity TO service_role;

ALTER TABLE public.pm_owner_approval_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pm_staff_select_owner_approval_activity"
  ON public.pm_owner_approval_activity FOR SELECT TO authenticated
  USING (
    is_ops_staff(auth.uid())
    OR is_property_manager(auth.uid())
    OR (is_leasing_agent(auth.uid()) AND EXISTS (
      SELECT 1 FROM public.pm_owner_approvals a
      WHERE a.id = pm_owner_approval_activity.approval_id
        AND a.created_by = auth.uid()
    ))
  );

CREATE POLICY "pm_owner_select_owner_approval_activity"
  ON public.pm_owner_approval_activity FOR SELECT TO authenticated
  USING (
    is_owner_visible = true
    AND EXISTS (
      SELECT 1 FROM public.pm_owner_approvals a
      WHERE a.id = pm_owner_approval_activity.approval_id
        AND is_property_owner_of(auth.uid(), a.property_id)
        AND a.status IN ('sent_to_owner','owner_reviewing','approved','declined','more_info_requested','completed','expired')
    )
  );

CREATE POLICY "pm_staff_insert_owner_approval_activity"
  ON public.pm_owner_approval_activity FOR INSERT TO authenticated
  WITH CHECK (is_pm_staff(auth.uid()));

-- ── Owner response RPC (secure — restricts what an owner can change) ──
CREATE OR REPLACE FUNCTION public.owner_respond_to_approval(
  _approval_id uuid,
  _response text,           -- 'approved' | 'declined' | 'more_info'
  _note text DEFAULT NULL
)
RETURNS public.pm_owner_approvals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a public.pm_owner_approvals;
  new_status text;
BEGIN
  IF _response NOT IN ('approved','declined','more_info') THEN
    RAISE EXCEPTION 'invalid_response';
  END IF;

  SELECT * INTO a FROM public.pm_owner_approvals WHERE id = _approval_id;
  IF a.id IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;

  IF NOT public.is_property_owner_of(auth.uid(), a.property_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF a.status NOT IN ('sent_to_owner','owner_reviewing','more_info_requested') THEN
    RAISE EXCEPTION 'not_pending';
  END IF;

  new_status := CASE _response
    WHEN 'approved'  THEN 'approved'
    WHEN 'declined'  THEN 'declined'
    WHEN 'more_info' THEN 'more_info_requested'
  END;

  UPDATE public.pm_owner_approvals
    SET owner_response = _response,
        owner_response_note = _note,
        decided_at = now(),
        status = new_status
    WHERE id = _approval_id
    RETURNING * INTO a;

  INSERT INTO public.pm_owner_approval_activity (approval_id, event_type, message, actor_id, is_owner_visible)
  VALUES (
    _approval_id,
    CASE _response WHEN 'approved' THEN 'owner_approved'
                   WHEN 'declined' THEN 'owner_declined'
                   ELSE 'owner_requested_more_info' END,
    CASE _response WHEN 'approved' THEN 'Owner approved the request.'
                   WHEN 'declined' THEN 'Owner declined the request.'
                   ELSE 'Owner requested more information.' END,
    auth.uid(),
    true
  );

  RETURN a;
END;
$$;

REVOKE ALL ON FUNCTION public.owner_respond_to_approval(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.owner_respond_to_approval(uuid, text, text) TO authenticated;

-- ── Mark owner viewed RPC (safe metadata update by owner) ─────────────
CREATE OR REPLACE FUNCTION public.owner_mark_approval_viewed(_approval_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE a public.pm_owner_approvals;
BEGIN
  SELECT * INTO a FROM public.pm_owner_approvals WHERE id = _approval_id;
  IF a.id IS NULL THEN RETURN; END IF;
  IF NOT public.is_property_owner_of(auth.uid(), a.property_id) THEN RETURN; END IF;
  IF a.owner_viewed_at IS NOT NULL THEN RETURN; END IF;
  UPDATE public.pm_owner_approvals SET owner_viewed_at = now() WHERE id = _approval_id;
  INSERT INTO public.pm_owner_approval_activity(approval_id, event_type, message, actor_id, is_owner_visible)
  VALUES (_approval_id, 'owner_viewed', 'Owner opened the approval request.', auth.uid(), true);
END;
$$;

REVOKE ALL ON FUNCTION public.owner_mark_approval_viewed(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.owner_mark_approval_viewed(uuid) TO authenticated;
