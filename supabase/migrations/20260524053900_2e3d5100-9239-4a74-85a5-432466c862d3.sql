
-- ============================================================
-- 1. AGREEMENTS — restrict recipient UPDATE to safe columns
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can update own or created agreements" ON public.agreements;

-- Ops/creators/senders can fully update
CREATE POLICY "Staff and creators update agreements"
ON public.agreements FOR UPDATE TO authenticated
USING (
  is_ops_staff(auth.uid())
  OR created_by = auth.uid()
  OR sent_by = auth.uid()
)
WITH CHECK (
  is_ops_staff(auth.uid())
  OR created_by = auth.uid()
  OR sent_by = auth.uid()
);
-- Recipients have NO direct UPDATE policy. Viewing/signing/declining is done
-- via SECURITY DEFINER functions: mark_agreement_viewed, sign_agreement_with_token,
-- decline_agreement_with_token.

-- ============================================================
-- 2. AGREEMENT_AUDIT_LOG — remove anon insert
-- ============================================================
DROP POLICY IF EXISTS "Can insert audit for valid agreement" ON public.agreement_audit_log;

CREATE POLICY "Authenticated insert audit for accessible agreement"
ON public.agreement_audit_log FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.agreements a
    WHERE a.id = agreement_audit_log.agreement_id
      AND (
        is_ops_staff(auth.uid())
        OR a.created_by = auth.uid()
        OR a.sent_by = auth.uid()
        OR a.recipient_user_id = auth.uid()
      )
  )
);
-- Anonymous sign/view/decline flows continue to work because the SECURITY DEFINER
-- functions (sign_agreement_with_token, mark_agreement_viewed, decline_agreement_with_token)
-- bypass RLS when inserting audit records.

-- ============================================================
-- 3. PERSONAL_ACCOUNT_OWNERS — remove self-claim INSERT
-- ============================================================
DROP POLICY IF EXISTS "Self-claim personal ownership" ON public.personal_account_owners;

CREATE POLICY "Existing personal owners may add owners"
ON public.personal_account_owners FOR INSERT TO authenticated
WITH CHECK (public.is_personal_account_owner(auth.uid()));

-- Lock out modifications/removals through the API too
DROP POLICY IF EXISTS "Personal owners manage owners" ON public.personal_account_owners;
CREATE POLICY "Personal owners manage owners"
ON public.personal_account_owners FOR DELETE TO authenticated
USING (public.is_personal_account_owner(auth.uid()));

-- ============================================================
-- 4. STORAGE: remove anon read of attachments/incident-shares/*
--    (logos remain anonymously readable; incident shares now go via signed URLs)
-- ============================================================
DROP POLICY IF EXISTS "attachments_anon_read_whitelisted_prefixes" ON storage.objects;

CREATE POLICY "attachments_anon_read_public_logos"
ON storage.objects FOR SELECT TO anon
USING (
  bucket_id = 'attachments'
  AND (
    name LIKE 'praetoria-logo-%'
    OR name LIKE 'company-logo-%'
  )
);

-- ============================================================
-- 5. STORAGE: make visit-photos bucket private with proper RLS
-- ============================================================
UPDATE storage.buckets SET public = false WHERE id = 'visit-photos';

DROP POLICY IF EXISTS "Anyone can view visit photos" ON storage.objects;

-- Path convention: `${visit_id}/...` (see useVisitPhotos.ts)
CREATE POLICY "Visit photos viewable by assigned parties"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'visit-photos'
  AND (
    is_ops_staff(auth.uid())
    OR (
      (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
      AND (
        is_worker_assigned_to_visit(auth.uid(), ((storage.foldername(name))[1])::uuid)
        OR is_sub_assigned_to_visit(auth.uid(), ((storage.foldername(name))[1])::uuid)
        OR EXISTS (
          SELECT 1 FROM public.visits v
          JOIN public.customers c ON c.id = v.customer_id
          WHERE v.id = ((storage.foldername(name))[1])::uuid
            AND c.user_id = auth.uid()
        )
      )
    )
  )
);

-- ============================================================
-- 6. REALTIME: lock down broadcast/presence channels for anon
-- ============================================================
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='realtime' AND tablename='messages' AND policyname='Authenticated users can use realtime channels') THEN
    DROP POLICY "Authenticated users can use realtime channels" ON realtime.messages;
  END IF;
END $$;

CREATE POLICY "Authenticated users can use realtime channels"
ON realtime.messages FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated users can publish to realtime channels"
ON realtime.messages FOR INSERT TO authenticated
WITH CHECK (true);
-- Anon role has no policy → no access. postgres_changes still respects
-- RLS on the underlying public.* tables.
